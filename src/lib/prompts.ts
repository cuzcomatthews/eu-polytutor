import { prisma } from "./prisma";
import env from "./env";
import type { RagDocument } from "./rag";

const LANGUAGE_NAMES: Record<string, string> = {
  de: "German",
  fr: "French",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  en: "English",
  es: "Spanish",
};

const NATIVE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
};

export async function buildChatMessages(
  roleId: string,
  userMessage: string,
  conversationId: string,
  history: { role: string; content: string }[],
  ragContext: RagDocument[],
  summary: string,
  userLevel: string
): Promise<{ role: string; content: string }[]> {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error(`Role not found: ${roleId}`);

  const systemPrompt = buildSystemPrompt(
    role.name,
    role.systemPrompt,
    ragContext,
    summary,
    userLevel,
    env.targetLanguage,
    env.nativeLanguage
  );

  const messages: { role: string; content: string }[] = [
    { role: "system", content: systemPrompt },
  ];

  const recentHistory = history.slice(-(env.memoryMaxTurns * 2));
  for (const turn of recentHistory) {
    messages.push({
      role: turn.role === "user" ? "user" : "assistant",
      content: turn.content,
    });
  }

  messages.push({ role: "user", content: userMessage });

  return messages;
}

function buildSystemPrompt(
  roleName: string,
  rolePrompt: string,
  ragContext: RagDocument[],
  summary: string,
  userLevel: string,
  targetLang: string,
  nativeLang: string
): string {
  const targetName = LANGUAGE_NAMES[targetLang] || targetLang;
  const nativeName = NATIVE_NAMES[nativeLang] || nativeLang;
  const isCourseRole = roleName.includes("Professor") || roleName.includes("Tutor");

  let prompt = `${rolePrompt}\n\n`;

  prompt += `## Language Context\n`;
  prompt += `You are teaching ${targetName}. The user's native language is ${nativeName}.\n`;
  prompt += `User's current CEFR level: ${userLevel}.\n`;
  prompt += `\n`;

  if (summary) {
    prompt += `## Previous Conversation Summary\n${summary}\n\n`;
  }

  if (ragContext.length) {
    prompt += `## Source Material (use this as your curriculum)\n`;
    for (const doc of ragContext) {
      const text = doc.content.slice(0, 400);
      prompt += `[${doc.similarity}] ${text}\n\n`;
    }
  }

  prompt += `## Instructions\n`;
  prompt += `- Adapt your language to the user's CEFR level (${userLevel})\n`;
  prompt += `- Use ${nativeName} for explaining complex grammar at beginner levels, gradually shift to ${targetName}\n`;
  prompt += `- If the user asks something beyond their level, still answer but keep it accessible\n`;
  prompt += `- Use the source material above as your primary teaching content\n`;
  prompt += `- Never use asterisks, stage directions, or parenthetical actions\n`;
  prompt += `- Your response will be converted to speech\n`;

  if (!isCourseRole) {
    prompt += `- Keep responses concise (1-3 sentences) for natural conversation\n`;
    prompt += `- Act like a native ${targetName} speaker having a casual chat\n`;
  } else {
    prompt += `- You may provide detailed explanations and examples\n`;
  }

  return prompt;
}

export async function buildSyllabusPrompt(
  level: string,
  ragDocuments: RagDocument[]
): Promise<string> {
  const targetName = LANGUAGE_NAMES[env.targetLanguage] || env.targetLanguage;
  const nativeName = NATIVE_NAMES[env.nativeLanguage] || env.nativeLanguage;

  const ragContent = ragDocuments
    .map((d) => d.content.slice(0, 500))
    .join("\n---\n");

  return `You are a ${targetName} curriculum designer. Create a structured syllabus for CEFR level ${level}.

Below is the available teaching material from the RAG knowledge base. Create 8-15 topics ordered logically, based on this content.

${ragContent}

Return ONLY valid JSON (no markdown, no explanation):
{
  "level": "${level}",
  "targetLanguage": "${targetName}",
  "nativeLanguage": "${nativeName}",
  "topics": [
    {
      "id": "topic-1",
      "title": "Topic title in ${nativeName}",
      "description": "Brief description",
      "order": 1,
      "keyPoints": ["point 1", "point 2"],
      "relatedDocIds": []
    }
  ]
}`;
}

export async function buildExercisePrompt(
  topicTitle: string,
  topicDescription: string,
  keyPoints: string[],
  ragDocuments: RagDocument[],
  userLevel: string
): Promise<string> {
  const targetName = LANGUAGE_NAMES[env.targetLanguage] || env.targetLanguage;
  const nativeName = NATIVE_NAMES[env.nativeLanguage] || env.nativeLanguage;

  const ragContent = ragDocuments
    .map((d) => d.content.slice(0, 400))
    .join("\n");

  return `You are a ${targetName} teacher creating exercises for level ${userLevel}.

Topic: ${topicTitle}
Description: ${topicDescription}
Key points: ${keyPoints.join(", ")}

Source material from curriculum:
${ragContent}

Create 5-8 diverse exercises. Return ONLY valid JSON:
{
  "exercises": [
    {
      "type": "fill_blank",
      "prompt": "Complete the sentence (instruction in ${nativeName})",
      "sentence": "Sentence with ___ for the blank",
      "answer": "the correct word",
      "options": ["option1", "option2", "option3", "option4"],
      "explanation": "Short explanation in ${nativeName}"
    },
    {
      "type": "match_pairs",
      "prompt": "Match the pairs",
      "pairs": [
        {"left": "${targetName} word", "right": "${nativeName} translation"}
      ]
    },
    {
      "type": "reorder",
      "prompt": "Put the words in correct order",
      "words": ["word1", "word2", "word3"],
      "answer": "The correct sentence"
    },
    {
      "type": "pick_translation",
      "prompt": "Choose the correct translation",
      "sentence": "${targetName} sentence",
      "answer": "correct ${nativeName} translation",
      "options": ["option1", "option2", "option3", "option4"]
    },
    {
      "type": "write",
      "prompt": "Write this in ${targetName}",
      "sentence": "${nativeName} sentence to translate",
      "expectedAnswer": "Expected ${targetName} answer"
    }
  ]
}

Mix exercise types. Ensure all content matches ${userLevel} level.`;
}

export async function buildMilestoneEvalPrompt(
  level: string,
  ragDocuments: RagDocument[],
  completedTopics: string[]
): Promise<string> {
  const targetName = LANGUAGE_NAMES[env.targetLanguage] || env.targetLanguage;

  const ragContent = ragDocuments
    .map((d) => d.content.slice(0, 400))
    .join("\n");

  return `You are creating a milestone evaluation for CEFR level ${level} in ${targetName}.

The user has completed these topics: ${completedTopics.join(", ")}.

Source material from curriculum:
${ragContent}

Create 10-15 diverse exercises covering a representative sample of the completed topics. Return ONLY valid JSON:
{
  "exercises": [
    {
      "type": "fill_blank|match_pairs|reorder|pick_translation|write",
      ... (same structure as exercise generation)
    }
  ]
}`;
}

export async function buildDictionaryEntryPrompt(
  word: string
): Promise<string> {
  const targetName = LANGUAGE_NAMES[env.targetLanguage] || env.targetLanguage;
  const nativeName = NATIVE_NAMES[env.nativeLanguage] || env.nativeLanguage;

  return `Translate the following word and provide a short example. Return ONLY valid JSON:
{
  "word": "${word}",
  "translation": "${nativeName} translation",
  "gender": "der/die/das (or null if not applicable)",
  "exampleSentence": "Simple ${targetName} example sentence",
  "difficulty": 1-5
}`;
}

export async function buildPronunciationFeedbackPrompt(
  userText: string,
  context: { role: string; content: string }[]
): Promise<string> {
  const targetName = LANGUAGE_NAMES[env.targetLanguage] || env.targetLanguage;
  const nativeName = NATIVE_NAMES[env.nativeLanguage] || env.nativeLanguage;

  return `The user said the following in ${targetName}: "${userText}"

If there are pronunciation or grammar errors, gently correct them. If it's correct, acknowledge it naturally. Keep it brief (1-2 sentences). Respond in ${nativeName} for lower levels, mix with ${targetName} for higher levels.`;
}
