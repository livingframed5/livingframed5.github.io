import { all, run } from "../db/driver.js";
import { config } from "../config.js";
import { embedTexts } from "./embed.js";

export interface Chunk {
  id: string;
  text: string;
  region: string;
  score: number;
}

interface ChunkRow {
  id: string;
  doc_id: string;
  text: string;
  region: string;
  embedding: string;
}

export async function indexChunks(chunks: { id: string; text: string; region?: string }[]): Promise<void> {
  run("DELETE FROM doc_chunks");
  const batchSize = 16;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const vecs = await embedTexts(batch.map((c) => c.text));
    for (let k = 0; k < batch.length; k++) {
      run(
        "INSERT INTO doc_chunks (id, doc_id, text, region, embedding) VALUES (?,?,?,?,?)",
        `${batch[k].id}.${k}`,
        batch[k].id,
        batch[k].text,
        batch[k].region ?? "",
        JSON.stringify(vecs[k])
      );
    }
  }
}

export async function search(query: string, region: string | undefined, topK = config.llm.topK): Promise<Chunk[]> {
  const rows = all<ChunkRow>("SELECT id, doc_id, text, region, embedding FROM doc_chunks");
  if (rows.length === 0) return [];
  const [q] = await embedTexts([query]);
  const candidates = rows
    .filter((r) => !region || r.region === "" || r.region === region)
    .map((r) => ({
      id: r.doc_id,
      text: r.text,
      region: r.region,
      score: cosine(q, JSON.parse(r.embedding) as number[]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  return candidates;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}