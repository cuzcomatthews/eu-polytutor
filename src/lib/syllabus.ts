import { prisma } from "./prisma";
import { queryRag } from "./rag";
import { generateResponse } from "./deepseek";
import { buildSyllabusPrompt, buildExercisePrompt, buildMilestoneEvalPrompt } from "./prompts";
import env from "./env";

export async function generateSyllabus(level: string, userId: string): Promise<Record<string, any>> {
  const ragDocs = await queryRag(level, undefined, 20, userId);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const targetLang = user?.targetLanguage || env.targetLanguage;
  const nativeLang = user?.nativeLanguage || env.nativeLanguage;

  const prompt = await buildSyllabusPrompt(level, ragDocs, targetLang, nativeLang);

  const response = await generateResponse(
    [{ role: "user", content: prompt }],
    env.llmMaxSyllabusTokens,
    0.3
  );

  const jsonMatch = response.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse syllabus JSON");

  const syllabusData = JSON.parse(jsonMatch[0]);

  await prisma.syllabus.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });

  await prisma.syllabus.create({
    data: {
      userId,
      level,
      content: syllabusData,
      isActive: true,
    },
  });

  return syllabusData;
}

export async function getActiveSyllabus(userId: string): Promise<Record<string, any> | null> {
  const syllabus = await prisma.syllabus.findFirst({
    where: { isActive: true, userId },
    orderBy: { createdAt: "desc" },
  });

  return syllabus ? (syllabus.content as Record<string, any>) : null;
}

export async function getCurrentLevel(userId: string): Promise<string> {
  const progress = await prisma.userProgress.findUnique({ where: { userId } });
  return progress?.cefrLevel || "A1.1";
}

export async function updateLevel(userId: string, newLevel: string): Promise<void> {
  await prisma.userProgress.upsert({
    where: { userId },
    update: { cefrLevel: newLevel },
    create: { userId, cefrLevel: newLevel },
  });
}

export async function generateExercises(
  userId: string,
  topicId: string,
  topicTitle: string,
  topicDescription: string,
  keyPoints: string[]
): Promise<Record<string, any>> {
  const userLevel = await getCurrentLevel(userId);
  const ragDocs = await queryRag(topicTitle, userLevel, 10, userId);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const targetLang = user?.targetLanguage || env.targetLanguage;
  const nativeLang = user?.nativeLanguage || env.nativeLanguage;

  const prompt = await buildExercisePrompt(
    topicTitle,
    topicDescription,
    keyPoints,
    ragDocs,
    userLevel,
    targetLang,
    nativeLang
  );

  const response = await generateResponse(
    [{ role: "user", content: prompt }],
    env.llmMaxSyllabusTokens,
    0.5
  );

  const jsonMatch = response.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse exercises JSON");

  return JSON.parse(jsonMatch[0]);
}

export async function evaluateAnswer(
  userAnswer: string,
  expectedAnswer: string,
  exerciseType: string,
  userId: string
): Promise<{ correct: boolean; feedback: string }> {
  const nativeLang = env.nativeLanguage;
  const nativeName =
    nativeLang === "de" ? "German" :
    nativeLang === "fr" ? "French" :
    nativeLang === "it" ? "Italian" :
    nativeLang === "pt" ? "Portuguese" :
    nativeLang === "ja" ? "Japanese" :
    nativeLang === "ko" ? "Korean" :
    nativeLang === "zh" ? "Chinese" :
    nativeLang === "es" ? "Spanish" :
    nativeLang === "en" ? "English" :
    nativeLang;

  if (exerciseType === "match_pairs") {
    return { correct: userAnswer === "all_matched", feedback: "All pairs matched!" };
  }

  if (exerciseType === "multiple_choice" || exerciseType === "fill_blank") {
    const userLower = userAnswer.toLowerCase().trim();
    const expectedLower = expectedAnswer.toLowerCase().trim();
    const correct = userLower === expectedLower;
    return {
      correct,
      feedback: correct
        ? `Correct! ✓`
        : `Incorrect. The correct answer is: ${expectedAnswer}`
    };
  }

  const prompt = `You are evaluating a language exercise answer. Exercise type: ${exerciseType}

Expected answer: "${expectedAnswer}"
User's answer: "${userAnswer}"

For type_answer: accept minor typos and alternative phrasings, evaluate grammar and meaning.
For ordering: the items must be in the correct order.

Respond ONLY in ${nativeName}. Return ONLY valid JSON:
{ "correct": true/false, "feedback": "brief feedback in ${nativeName}" }`;

  const response = await generateResponse(
    [{ role: "user", content: prompt }],
    200,
    0.1
  );

  const jsonMatch = response.text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  const userLower = userAnswer.toLowerCase().trim();
  const expectedLower = expectedAnswer.toLowerCase().trim();
  return {
    correct: userLower === expectedLower,
    feedback: userLower === expectedLower ? "Correct!" : "Not quite right.",
  };
}

export async function generateMilestoneEval(
  level: string,
  completedTopics: string[],
  userId: string
): Promise<Record<string, any>> {
  const ragDocs = await queryRag(level, undefined, 20, userId);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const targetLang = user?.targetLanguage || env.targetLanguage;

  const prompt = await buildMilestoneEvalPrompt(level, ragDocs, completedTopics, targetLang);

  const response = await generateResponse(
    [{ role: "user", content: prompt }],
    env.llmMaxSyllabusTokens,
    0.5
  );

  const jsonMatch = response.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse milestone JSON");

  return JSON.parse(jsonMatch[0]);
}

const LEVEL_ORDER = [
  "A1.1", "A1.2",
  "A2.1", "A2.2",
  "B1.1", "B1.2",
  "B2.1", "B2.2",
  "C1", "C2",
];

export function getNextLevel(current: string): string | null {
  const idx = LEVEL_ORDER.indexOf(current);
  if (idx === -1 || idx >= LEVEL_ORDER.length - 1) return null;
  return LEVEL_ORDER[idx + 1];
}
