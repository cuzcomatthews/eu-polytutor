import { prisma } from "./prisma";
import { queryRag } from "./rag";
import { generateResponse } from "./deepseek";
import { buildSyllabusPrompt, buildExercisePrompt, buildMilestoneEvalPrompt } from "./prompts";
import env from "./env";

export async function generateSyllabus(level: string): Promise<Record<string, any>> {
  const ragDocs = await queryRag(level, undefined, 20);

  const prompt = await buildSyllabusPrompt(level, ragDocs);

  const response = await generateResponse(
    [{ role: "user", content: prompt }],
    env.llmMaxSyllabusTokens,
    0.3
  );

  const jsonMatch = response.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse syllabus JSON");

  const syllabusData = JSON.parse(jsonMatch[0]);

  await prisma.syllabus.updateMany({ where: { isActive: true }, data: { isActive: false } });

  await prisma.syllabus.create({
    data: {
      level,
      content: syllabusData,
      isActive: true,
    },
  });

  return syllabusData;
}

export async function getActiveSyllabus(): Promise<Record<string, any> | null> {
  const syllabus = await prisma.syllabus.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return syllabus ? (syllabus.content as Record<string, any>) : null;
}

export async function getCurrentLevel(): Promise<string> {
  const progress = await prisma.userProgress.findUnique({ where: { id: "singleton" } });
  return progress?.cefrLevel || "A1.1";
}

export async function updateLevel(newLevel: string): Promise<void> {
  await prisma.userProgress.upsert({
    where: { id: "singleton" },
    update: { cefrLevel: newLevel },
    create: { id: "singleton", cefrLevel: newLevel },
  });
}

export async function generateExercises(
  topicId: string,
  topicTitle: string,
  topicDescription: string,
  keyPoints: string[]
): Promise<Record<string, any>> {
  const userLevel = await getCurrentLevel();
  const ragDocs = await queryRag(topicTitle, userLevel, 10);

  const prompt = await buildExercisePrompt(
    topicTitle,
    topicDescription,
    keyPoints,
    ragDocs,
    userLevel
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
  exerciseType: string
): Promise<{ correct: boolean; feedback: string }> {
  const prompt = `You are evaluating a language exercise answer. Exercise type: ${exerciseType}

Expected answer: "${expectedAnswer}"
User's answer: "${userAnswer}"

For fill_blank, pick_translation: the answer must match exactly or be a valid alternative.
For reorder: the words must be in the correct order.
For write: accept minor typos, evaluate grammar and meaning.
For match_pairs: already evaluated client-side.

Return ONLY valid JSON: { "correct": true/false, "feedback": "brief feedback in the user's native language" }`;

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
  completedTopics: string[]
): Promise<Record<string, any>> {
  const ragDocs = await queryRag(level, undefined, 20);

  const prompt = await buildMilestoneEvalPrompt(level, ragDocs, completedTopics);

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
