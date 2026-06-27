import { PrismaClient } from "@prisma/client";
import { Pool } from "@neondatabase/serverless";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();
export const pool = globalForPrisma.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

export async function ensureRagSchema() {
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "RagDocument" (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding vector(1024),
        metadata JSONB DEFAULT '{}',
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rag_embedding ON "RagDocument" USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);`);
  } finally {
    client.release();
  }
}
