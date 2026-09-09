import type { Project, ChangeOrder, ChangeOrderStatus, Health } from "@/lib/types";

const AIRTABLE_API = "https://api.airtable.com/v0";

interface AirtableRecord<T> {
  id: string;
  fields: T;
}

interface ProjectAirtableFields {
  Name: string;
  Client: string;
  Icon: string;
  Tag: string;
  "Est Hours": number;
  "Actual Hours": number;
  "Material Budget": number;
  "Material Actual": number;
  Contract: number;
  "Target Margin": number;
  "Current Margin": number;
  Health: Health;
  "Change Orders"?: string[];
}

interface ChangeOrderAirtableFields {
  Title: string;
  Amount: number;
  Status: ChangeOrderStatus;
  "Project"?: string;
}

interface AirtableListResponse<T> {
  records: Array<AirtableRecord<T>>;
  offset?: string;
}

let cache: Map<string, { expiresAt: number; value: unknown }> | null = null;

function getCache() {
  if (!cache) {
    cache = new Map();
  }
  return cache;
}

function getServerEnv() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const projectsTable = process.env.AIRTABLE_TABLE_PROJECTS ?? "Projects";
  const changeOrdersTable = process.env.AIRTABLE_TABLE_CHANGE_ORDERS ?? "ChangeOrders";
  return { apiKey, baseId, projectsTable, changeOrdersTable };
}

function isConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.apiKey && env.baseId);
}

async function fetchAirtable<T>(
  url: string,
  ttlMs = 60_000,
): Promise<Array<AirtableRecord<T>> | null> {
  const key = `airtable:${url}`;
  const store = getCache();
  const boxed = store.get(key);
  if (boxed && Date.now() < boxed.expiresAt) {
    return boxed.value as Array<AirtableRecord<T>>;
  }

  const env = getServerEnv();
  if (!env.apiKey || !env.baseId) return null;

  let allRecords: Array<AirtableRecord<T>> = [];
  let offset: string | undefined;
  const seenUrls = new Set<string>();

  do {
    const params = new URLSearchParams();
    if (offset) params.set("offset", offset);
    const pagedUrl = params.toString() ? `${url}?${params.toString()}` : url;

    if (seenUrls.has(pagedUrl)) break;
    seenUrls.add(pagedUrl);

    const res = await fetch(pagedUrl, {
      headers: {
        Authorization: `Bearer ${env.apiKey}`,
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Airtable API error ${res.status}: ${res.statusText} ${body}`);
    }

    const data = (await res.json()) as AirtableListResponse<T>;
    allRecords = allRecords.concat(data.records);
    offset = data.offset;
  } while (offset);

  store.set(key, { expiresAt: Date.now() + ttlMs, value: allRecords });
  return allRecords;
}

function mapProject(rec: AirtableRecord<ProjectAirtableFields>, coMap: Map<string, ChangeOrder>): Project {
  const f = rec.fields;
  return {
    id: rec.id,
    name: f.Name,
    client: f.Client,
    icon: f.Icon,
    tag: f.Tag,
    estHours: f["Est Hours"] ?? 0,
    actualHours: f["Actual Hours"] ?? 0,
    materialBudget: f["Material Budget"] ?? 0,
    materialActual: f["Material Actual"] ?? 0,
    contract: f.Contract ?? 0,
    targetMargin: f["Target Margin"] ?? 0,
    currentMargin: f["Current Margin"] ?? 0,
    health: f.Health ?? "healthy",
    changeOrders: f["Change Orders"]
      ? f["Change Orders"]!.map((id) => coMap.get(id)).filter(Boolean) as ChangeOrder[]
      : [],
  };
}

function mapChangeOrder(rec: AirtableRecord<ChangeOrderAirtableFields>): ChangeOrder {
  const f = rec.fields;
  return {
    id: rec.id,
    title: f.Title,
    amount: f.Amount ?? 0,
    status: f.Status ?? "unsigned",
  };
}

export async function fetchProjects(ttlMs = 60_000): Promise<Project[]> {
  if (!isConfigured()) return [];

  const env = getServerEnv();
  try {
    const coRecords = await fetchAirtable<ChangeOrderAirtableFields>(
      `${AIRTABLE_API}/${env.baseId}/${encodeURIComponent(env.changeOrdersTable)}`,
      ttlMs,
    );
    if (!coRecords) return [];

    const coMap = new Map<string, ChangeOrder>();
    for (const rec of coRecords) {
      coMap.set(rec.id, mapChangeOrder(rec));
    }

    const projRecords = await fetchAirtable<ProjectAirtableFields>(
      `${AIRTABLE_API}/${env.baseId}/${encodeURIComponent(env.projectsTable)}`,
      ttlMs,
    );
    if (!projRecords) return [];

    return projRecords.map((rec) => mapProject(rec, coMap));
  } catch (err) {
    console.error("[margin-leak-report] Airtable fetch error:", err);
    return [];
  }
}

export async function fetchChangeOrders(ttlMs = 60_000): Promise<ChangeOrder[]> {
  if (!isConfigured()) return [];

  const env = getServerEnv();
  try {
    const records = await fetchAirtable<ChangeOrderAirtableFields>(
      `${AIRTABLE_API}/${env.baseId}/${encodeURIComponent(env.changeOrdersTable)}`,
      ttlMs,
    );
    if (!records) return [];
    return records.map(mapChangeOrder);
  } catch (err) {
    console.error("[margin-leak-report] Airtable fetch error:", err);
    return [];
  }
}

export async function updateChangeOrderStatus(
  recordId: string,
  status: ChangeOrderStatus,
): Promise<boolean> {
  const env = getServerEnv();
  if (!env.apiKey || !env.baseId) return false;

  const url = `${AIRTABLE_API}/${env.baseId}/${encodeURIComponent(env.changeOrdersTable)}/${recordId}`;
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ fields: { Status: status } }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Airtable PATCH error ${res.status}: ${res.statusText} ${body}`);
    }

    const store = getCache();
    for (const key of store.keys()) {
      if (key.startsWith("airtable:")) {
        store.delete(key);
      }
    }

    return true;
  } catch (err) {
    console.error("[margin-leak-report] Airtable update error:", err);
    return false;
  }
}

export function getIsConfigured(): boolean {
  return isConfigured();
}
