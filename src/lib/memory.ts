import { prisma } from "./prisma";
import { embedText } from "./embeddings";
import { generateResponse } from "./deepseek";
import env from "./env";

export async function saveTurn(
  conversationId: string,
  role: string,
  content: string
): Promise<void> {
  if (!content.trim()) return;

  let embedding: number[] | null = null;
  try {
    embedding = await embedText(content);
  } catch {}

  const vectorStr = embedding ? `[${embedding.join(",")}]` : null;

  await prisma.$executeRawUnsafe(
    `INSERT INTO "ConversationTurn" (id, "conversationId", role, content, embedding, "createdAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, ${vectorStr ? `$4::vector` : "NULL"}, NOW())`,
    vectorStr
      ? [conversationId, role, content, vectorStr]
      : [conversationId, role, content]
  );
}

export async function getRecentTurns(
  conversationId: string,
  maxTurns: number = env.memoryMaxTurns
): Promise<{ role: string; content: string }[]> {
  const rows = await prisma.$queryRawUnsafe<{ role: string; content: string }[]>(
    `SELECT role, content FROM "ConversationTurn"
     WHERE "conversationId" = $1 AND summarized = FALSE
     ORDER BY "createdAt" DESC
     LIMIT $2`,
    conversationId,
    maxTurns * 2
  );

  return rows.reverse().map((r) => ({
    role: r.role,
    content: r.content,
  }));
}

export async function getTotalTurns(conversationId: string): Promise<number> {
  const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM "ConversationTurn" WHERE "conversationId" = $1`,
    conversationId
  );
  return Number(result[0]?.count || 0);
}

export async function generateSummary(
  conversationId: string
): Promise<string | null> {
  const rows = await prisma.$queryRawUnsafe<{ role: string; content: string }[]>(
    `SELECT role, content FROM "ConversationTurn"
     WHERE "conversationId" = $1 AND summarized = FALSE
     ORDER BY "createdAt" ASC`,
    conversationId
  );

  if (!rows.length || rows.length < 6) return null;

  const historyLines = rows
    .map((r) => `${r.role === "user" ? "User" : "Assistant"}: ${r.content}`)
    .join("\n");

  const prompt = `Summarize this conversation in 2-3 short sentences. Keep key facts and learning progress. Write ONLY the summary, no introduction.\n\n${historyLines}`;

  const response = await generateResponse(
    [{ role: "user", content: prompt }],
    300,
    0.3
  );

  const summary = response.text.trim();
  if (!summary) return null;

  await prisma.$executeRawUnsafe(
    `UPDATE "ConversationTurn" SET summarized = TRUE
     WHERE "conversationId" = $1 AND "createdAt" NOT IN (
       SELECT "createdAt" FROM "ConversationTurn"
       WHERE "conversationId" = $1
       ORDER BY "createdAt" DESC
       LIMIT $2
     )`,
    conversationId,
    env.memoryMaxTurns * 2
  );

  const startRow = await prisma.$queryRawUnsafe<{ idx: number }[]>(
    `SELECT COUNT(*) as idx FROM "ConversationTurn" WHERE "conversationId" = $1`,
    conversationId
  );

  let embedding: number[] | null = null;
  try {
    embedding = await embedText(summary);
  } catch {}

  const vectorStr = embedding ? `[${embedding.join(",")}]` : null;

  await prisma.$executeRawUnsafe(
    `INSERT INTO "ConversationSummary" (id, "summaryText", embedding, "turnRangeStart", "turnRangeEnd", "createdAt")
     VALUES (gen_random_uuid()::text, $1, ${vectorStr ? `$2::vector` : "NULL"}, $3, $4, NOW())`,
    vectorStr
      ? [summary, vectorStr, 0, Number(startRow[0]?.idx || rows.length)]
      : [summary, 0, Number(startRow[0]?.idx || rows.length)]
  );

  return summary;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await prisma.conversationTurn.deleteMany({ where: { conversationId } });
  await prisma.conversation.delete({ where: { id: conversationId } });
}

export async function getSummary(conversationId: string): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<{ summaryText: string }[]>(
    `SELECT "summaryText" FROM "ConversationSummary"
     ORDER BY "createdAt" DESC LIMIT 1`
  );
  return rows[0]?.summaryText || "";
}
