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

  let vectorStr = "NULL";
  try {
    const embedding = await embedText(content);
    vectorStr = `'[${embedding.join(",")}]'::vector`;
  } catch {}

  const escaped = content.replace(/'/g, "''");

  await prisma.$executeRawUnsafe(`
    INSERT INTO "ConversationTurn" (id, "conversationId", role, content, embedding, "createdAt")
    VALUES (gen_random_uuid()::text, '${conversationId}', '${role}', '${escaped}', ${vectorStr}, NOW())
  `);
}

export async function getRecentTurns(
  conversationId: string,
  maxTurns: number = env.memoryMaxTurns
): Promise<{ role: string; content: string }[]> {
  const rows = await prisma.$queryRawUnsafe<{ role: string; content: string }[]>(
    `SELECT role, content FROM "ConversationTurn"
     WHERE "conversationId" = '${conversationId}' AND summarized = FALSE
     ORDER BY "createdAt" DESC
     LIMIT ${maxTurns * 2}`
  );

  return rows.reverse().map((r) => ({
    role: r.role,
    content: r.content,
  }));
}

export async function getTotalTurns(conversationId: string): Promise<number> {
  const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM "ConversationTurn" WHERE "conversationId" = '${conversationId}'`
  );
  return Number(result[0]?.count || 0);
}

export async function generateSummary(
  conversationId: string
): Promise<string | null> {
  const rows = await prisma.$queryRawUnsafe<{ role: string; content: string }[]>(
    `SELECT role, content FROM "ConversationTurn"
     WHERE "conversationId" = '${conversationId}' AND summarized = FALSE
     ORDER BY "createdAt" ASC`
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

  const recentLimit = env.memoryMaxTurns * 2;

  await prisma.$executeRawUnsafe(`
    UPDATE "ConversationTurn" SET summarized = TRUE
    WHERE "conversationId" = '${conversationId}'
    AND "createdAt" NOT IN (
      SELECT "createdAt" FROM "ConversationTurn"
      WHERE "conversationId" = '${conversationId}'
      ORDER BY "createdAt" DESC
      LIMIT ${recentLimit}
    )
  `);

  let vectorStr = "NULL";
  try {
    const embedding = await embedText(summary);
    vectorStr = `'[${embedding.join(",")}]'::vector`;
  } catch {}

  const escapedSummary = summary.replace(/'/g, "''");

  const countResult = await prisma.$queryRawUnsafe<{ idx: bigint }[]>(
    `SELECT COUNT(*) as idx FROM "ConversationTurn" WHERE "conversationId" = '${conversationId}'`
  );
  const totalCount = Number(countResult[0]?.idx || rows.length);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "ConversationSummary" (id, "summaryText", embedding, "turnRangeStart", "turnRangeEnd", "createdAt")
    VALUES (gen_random_uuid()::text, '${escapedSummary}', ${vectorStr}, 0, ${totalCount}, NOW())
  `);

  return summary;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `DELETE FROM "ConversationTurn" WHERE "conversationId" = '${conversationId}'`
  );
  await prisma.conversation.delete({ where: { id: conversationId } });
}

export async function getSummary(): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<{ summaryText: string }[]>(
    `SELECT "summaryText" FROM "ConversationSummary" ORDER BY "createdAt" DESC LIMIT 1`
  );
  return rows[0]?.summaryText || "";
}
