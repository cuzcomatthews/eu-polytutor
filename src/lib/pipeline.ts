import { transcribeAudio } from "./deepgram-stt";
import { generateResponse } from "./deepseek";
import { queryRag } from "./rag";
import { saveTurn, getRecentTurns, getTotalTurns, generateSummary, getSummary } from "./memory";
import { buildChatMessages } from "./prompts";
import { prisma } from "./prisma";
import env from "./env";

export interface PipelineInput {
  userId: string;
  conversationId: string;
  roleId: string;
  userLevel: string;
  audioBytes?: Buffer;
  textMessage?: string;
}

export interface PipelineOutput {
  transcription: string;
  responseText: string;
  ragSources: { content: string; similarity: number }[];
  metrics: {
    sttMs: number;
    ragMs: number;
    llmMs: number;
    totalMs: number;
  };
}

export async function runPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const t0 = performance.now();
  const metrics = { sttMs: 0, ragMs: 0, llmMs: 0, totalMs: 0 };

  const role = await prisma.role.findUnique({ where: { id: input.roleId } });
  if (!role) throw new Error("Role not found");

  const conversation = await prisma.conversation.findUnique({
    where: { id: input.conversationId },
  });
  if (!conversation) throw new Error("Conversation not found");

  // 1. STT or Text
  let userText: string;
  let t1 = performance.now();

  if (input.audioBytes && input.audioBytes.length > 1000) {
    const result = await transcribeAudio(input.audioBytes);
    userText = result.text;
    metrics.sttMs = performance.now() - t1;
  } else if (input.textMessage?.trim()) {
    userText = input.textMessage.trim();
  } else {
    throw new Error("No audio or text provided");
  }

  if (!userText) throw new Error("Could not detect speech in audio");

  // 2. RAG
  const t2 = performance.now();
  const ragContext = await queryRag(userText, input.userLevel, undefined, input.userId);
  metrics.ragMs = performance.now() - t2;

  // 3. Memory
  const summary = await getSummary();

  // 4. Build prompt + LLM
  const history = await getRecentTurns(input.conversationId);

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  const targetLang = user?.targetLanguage || env.targetLanguage;
  const nativeLang = user?.nativeLanguage || env.nativeLanguage;

  const messages = await buildChatMessages(
    input.roleId,
    userText,
    input.conversationId,
    history,
    ragContext,
    summary,
    input.userLevel,
    targetLang,
    nativeLang
  );

  const t3 = performance.now();
  const isConversational =
    role.responseStyle === "concise";
  const maxTokens = isConversational
    ? env.llmMaxConversationTokens
    : env.llmMaxTeachingTokens;

  const llmResponse = await generateResponse(messages, maxTokens);
  metrics.llmMs = performance.now() - t3;

  const responseText = llmResponse.text || "I didn't understand. Could you repeat?";

  // 5. Save turns
  await saveTurn(input.conversationId, "user", userText);
  await saveTurn(input.conversationId, "assistant", responseText);

  // 6. Check if summary needed
  const totalTurns = await getTotalTurns(input.conversationId);
  if (totalTurns >= env.memorySummaryTrigger) {
    generateSummary(input.conversationId).catch(() => {});
  }

  // 7. Update user progress
  await prisma.userProgress.upsert({
    where: { userId: input.userId },
    update: {
      totalTurns: { increment: 1 },
      lastActiveAt: new Date(),
    },
    create: {
      userId: input.userId,
      totalTurns: 1,
      lastActiveAt: new Date(),
    },
  });

  metrics.totalMs = performance.now() - t0;

  return {
    transcription: userText,
    responseText,
    ragSources: ragContext.map((d) => ({
      content: d.content.slice(0, 200),
      similarity: d.similarity,
    })),
    metrics: {
      sttMs: Math.round(metrics.sttMs),
      ragMs: Math.round(metrics.ragMs),
      llmMs: Math.round(metrics.llmMs),
      totalMs: Math.round(metrics.totalMs),
    },
  };
}
