import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { indexChunks } from "./vector-store.js";
import { requireApiKey } from "./embed.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(here, "..", "..", "data", "docs");

export async function indexDocs(): Promise<number> {
  requireApiKey();
  const files = readdirSync(docsDir).filter((f) => f.endsWith(".txt"));
  const chunks: { id: string; text: string; region?: string }[] = [];
  for (const file of files) {
    const text = readFileSync(path.join(docsDir, file), "utf-8");
    const region = file.includes("-EU") ? "EU" : file.includes("-NA") ? "NA" : file.includes("-APAC") ? "APAC" : undefined;
    const pieces = text.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length >= 40);
    pieces.forEach((p, i) => chunks.push({ id: file.replace(/\.txt$/, ""), text: p, region }));
  }
  await indexChunks(chunks);
  return chunks.length;
}

const isMain = fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "");

if (isMain) {
  const count = await indexDocs();
  console.log(`Indexed ${count} chunks from doc corpus`);
}