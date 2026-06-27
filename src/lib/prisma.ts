import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function ensureRagSchema() {
  await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS vector;");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RagDocument" (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      embedding vector(1024),
      metadata JSONB DEFAULT '{}',
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_rag_embedding ON "RagDocument" USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);`
  );
}
