import { prisma } from "./prisma";
import { embedText, embedTexts, getEmbeddingDim } from "./embeddings";
import env from "./env";
import { v4 as uuid } from "uuid";

export interface RagDocument {
  id: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
}

export async function queryRag(
  query: string,
  level?: string,
  topK?: number
): Promise<RagDocument[]> {
  const k = topK || env.ragTopK;
  const threshold = env.ragSimilarityThreshold;

  const queryEmbedding = await embedText(query);
  if (queryEmbedding.length !== getEmbeddingDim()) {
    throw new Error(
      `Embedding dimension mismatch: expected ${getEmbeddingDim()}, got ${queryEmbedding.length}`
    );
  }

  const vectorStr = `[${queryEmbedding.join(",")}]`;

  let sql: string;

  if (level) {
    sql = `
      SELECT id, content, metadata, 1 - (embedding <=> '${vectorStr}'::vector) AS similarity
      FROM "RagDocument"
      WHERE metadata->>'level' <= '${level}'
      ORDER BY embedding <=> '${vectorStr}'::vector
      LIMIT ${k}
    `;
  } else {
    sql = `
      SELECT id, content, metadata, 1 - (embedding <=> '${vectorStr}'::vector) AS similarity
      FROM "RagDocument"
      ORDER BY embedding <=> '${vectorStr}'::vector
      LIMIT ${k}
    `;
  }

  const rows = await prisma.$queryRawUnsafe<{
    id: string;
    content: string;
    metadata: Record<string, any>;
    similarity: number;
  }[]>(sql);

  const docs: RagDocument[] = [];

  for (const row of rows) {
    const similarity = Math.max(0, Number(row.similarity) || 0);
    docs.push({
      id: row.id,
      content: row.content,
      similarity: Math.round(similarity * 1000) / 1000,
      metadata: row.metadata || {},
    });
  }

  return docs.filter((d) => d.similarity >= threshold);
}

export async function indexDocuments(
  texts: string[],
  metadatas: Record<string, any>[],
  ids?: string[]
): Promise<void> {
  if (!texts.length) return;

  const docIds = ids || texts.map(() => uuid().slice(0, 16));
  const metaList = metadatas ||
    texts.map(() => ({ source: "manual" }));

  const embeddings = await embedTexts(texts);
  if (!embeddings.length) return;

  for (let i = 0; i < texts.length; i++) {
    const vectorStr = `[${embeddings[i].join(",")}]`;
    const escapedContent = texts[i].replace(/'/g, "''");
    const escapedMeta = JSON.stringify(metaList[i]).replace(/'/g, "''");

    await prisma.$executeRawUnsafe(`
      INSERT INTO "RagDocument" (id, content, embedding, metadata, "createdAt")
      VALUES ('${docIds[i]}', '${escapedContent}', '${vectorStr}'::vector, '${escapedMeta}'::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata
    `);
  }
}

export async function deleteRagDocument(id: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `DELETE FROM "RagDocument" WHERE id = '${id}'`
  );
}

export async function getRagDocuments(): Promise<{
  id: string;
  metadata: Record<string, any>;
  createdAt: string;
}[]> {
  const rows = await prisma.$queryRawUnsafe<{
    id: string;
    metadata: Record<string, any>;
    createdAt: Date;
  }[]>(`SELECT id, metadata, "createdAt" FROM "RagDocument" ORDER BY "createdAt" DESC`);

  return rows.map((r) => ({
    id: r.id,
    metadata: r.metadata || {},
    createdAt: r.createdAt?.toISOString() || "",
  }));
}

export async function deleteAllRagDocuments(): Promise<void> {
  await prisma.$executeRawUnsafe(`DELETE FROM "RagDocument"`);
}

export function chunkText(text: string): string[] {
  const size = env.ragChunkSize;
  const overlap = env.ragChunkOverlap;

  if (text.length <= size) return [text.trim()];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + size;
    if (end < text.length) {
      for (const sep of [". ", ".\n", "? ", "?\n", "! ", "!\n", "\n\n", "\n"]) {
        const lastSep = text.lastIndexOf(sep, end);
        if (lastSep > start) {
          end = lastSep + sep.length;
          break;
        }
      }
    }
    chunks.push(text.slice(start, end).trim());
    const nextStart = end - overlap;
    start = nextStart <= start ? end : nextStart;
  }

  return chunks;
}
