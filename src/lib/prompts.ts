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
  ru: "Russian",
  ar: "Arabic",
};

const NATIVE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ru: "Russian",
  ar: "Arabic",
};

export async function buildChatMessages(
  roleId: string,
  userMessage: string,
  conversationId: string,
  history: { role: string; content: string }[],
  ragContext: RagDocument[],
  summary: string,
  userLevel: string,
  targetLang: string,
  nativeLang: string
): Promise<{ role: string; content: string }[]> {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error(`Role not found: ${roleId}`);

  const systemPrompt = buildSystemPrompt(
    role.name,
    role.systemPrompt,
    ragContext,
    summary,
    userLevel,
    targetLang,
    nativeLang
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

  const levelNum = parseFloat(userLevel.replace(/[A-C]/gi, ""));
  const isBeginner = !isNaN(levelNum) && levelNum <= 2.2;
  const isIntermediate = !isNaN(levelNum) && levelNum > 2.2 && levelNum <= 4.2;
  const isAdvanced = !isNaN(levelNum) && levelNum > 4.2;

  prompt += `## Instructions\n`;
  prompt += `- Adapt all responses to the user's CEFR level (${userLevel})\n`;

  if (isCourseRole) {
    if (isBeginner) {
      prompt += `- EXPLAIN EVERYTHING in ${nativeName}. Only use ${targetName} for example words and phrases.\n`;
      prompt += `- The user is a complete beginner. All grammar explanations, instructions, and feedback MUST be in ${nativeName}.\n`;
    } else if (isIntermediate) {
      prompt += `- Explain grammar and concepts in ${nativeName}, but use ${targetName} for examples and simple instructions.\n`;
      prompt += `- Gradually increase the amount of ${targetName} in your teaching. Mix both languages naturally.\n`;
    } else if (isAdvanced) {
      prompt += `- Teach primarily in ${targetName}. Only switch to ${nativeName} to clarify complex concepts or when the user asks.\n`;
    } else {
      prompt += `- Use ${nativeName} for explaining complex grammar at beginner levels, gradually shift to ${targetName}\n`;
    }
  } else {
    if (isBeginner) {
      prompt += `- Chat in ${targetName} for simple phrases, but use ${nativeName} if the user seems confused or asks for help.\n`;
    } else if (isIntermediate) {
      prompt += `- Chat mostly in ${targetName}, but feel free to mix in ${nativeName} for clarity.\n`;
    } else if (isAdvanced) {
      prompt += `- Chat entirely in ${targetName} unless the user explicitly asks for ${nativeName}.\n`;
    }
  }

  prompt += `- If the user asks something beyond their level, still answer but keep it accessible\n`;
  prompt += `- Use the source material above as your primary teaching content\n`;
  prompt += `- IMPORTANT: Never reference external materials (CDs, tracks, audio recordings, files, pages, or appendices). If the source material mentions these, adapt and deliver the content yourself without referencing them.\n`;
  prompt += `- IMPORTANT: Do NOT create quizzes, exercises, or tests. Your job is to teach, explain, and converse. For practice exercises, tell the user to visit the Lessons section.\n`;
  prompt += `- Never use asterisks, stage directions, or parenthetical actions\n`;
  prompt += `- Your response will be converted to speech — keep it natural and speakable\n`;

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
  ragDocuments: RagDocument[],
  targetLang: string,
  nativeLang: string
): Promise<string> {
  const targetName = LANGUAGE_NAMES[targetLang] || targetLang;
  const nativeName = NATIVE_NAMES[nativeLang] || nativeLang;

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
  userLevel: string,
  targetLang: string,
  nativeLang: string
): Promise<string> {
  const targetName = LANGUAGE_NAMES[targetLang] || targetLang;
  const nativeName = NATIVE_NAMES[nativeLang] || nativeLang;

  const ragContent = ragDocuments
    .map((d) => d.content.slice(0, 400))
    .join("\n");

  return `You are a ${targetName} teacher creating Duolingo-style exercises for level ${userLevel}.

Topic: ${topicTitle}
Description: ${topicDescription}
Key points: ${keyPoints.join(", ")}

Source material from curriculum:
${ragContent}

Create 5-8 diverse exercises. Mix exercise kinds for variety: prefer 2 multiple_choice, 1-2 fill_blank, 1 match_pairs, plus 1-2 of {ordering, type_answer}.

Per-kind payload shape (must match exactly):
- multiple_choice: {"options": ["a","b","c","d"], "correct_index": 0, "hint": "${targetName} phrase this exercise tests"}
- fill_blank:     {"sentence": "${targetName} sentence with ___ for blank", "answers": ["correct"], "hint": "optional ${nativeName} hint"}
- match_pairs:    {"pairs": [{"left": "${targetName} word", "right": "${nativeName} translation"}]}  // 3-5 pairs
- ordering:       {"items": ["${targetName} word a","${targetName} word b","${targetName} word c","${targetName} word d"], "correct_order": [0,1,2,3], "hint": "Translation in ${nativeName} the user should produce"}
- type_answer:    {"answers": ["accepted answer"], "hint": "${nativeName} sentence the user must translate to ${targetName}"}

Return ONLY valid JSON (no markdown, no explanation):
{
  "teaching_notes": "2-3 sentence mini-lesson in ${nativeName} explaining the key concepts before exercises",
  "exercises": [
    {
      "kind": "multiple_choice",
      "prompt": "Instruction in ${nativeName}",
      "payload": { "options": ["a","b","c","d"], "correct_index": 0, "hint": "..." }
    },
    {
      "kind": "fill_blank",
      "prompt": "Instruction in ${nativeName}",
      "payload": { "sentence": "... ___ ...", "answers": ["..."], "hint": "..." }
    },
    {
      "kind": "match_pairs",
      "prompt": "Instruction in ${nativeName}",
      "payload": { "pairs": [{"left": "...", "right": "..."}] }
    },
    {
      "kind": "ordering",
      "prompt": "Reorder to form the correct sentence",
      "payload": { "items": [...], "correct_order": [...], "hint": "Translation in ${nativeName}" }
    },
    {
      "kind": "type_answer",
      "prompt": "Write this in ${targetName}",
      "payload": { "answers": ["..."], "hint": "${nativeName} sentence to translate" }
    }
  ]
}

All prompts, hints, and explanations must be in ${nativeName}. All ${targetName} content must be correct for ${userLevel} level.`;
}

export async function buildMilestoneEvalPrompt(
  level: string,
  ragDocuments: RagDocument[],
  completedTopics: string[],
  targetLang: string
): Promise<string> {
  const targetName = LANGUAGE_NAMES[targetLang] || targetLang;

  const ragContent = ragDocuments
    .map((d) => d.content.slice(0, 400))
    .join("\n");

  return `You are creating a milestone evaluation for CEFR level ${level} in ${targetName}.

The user has completed these topics: ${completedTopics.join(", ")}.

Source material from curriculum:
${ragContent}

Create 10-15 diverse exercises covering a representative sample of the completed topics. Use the same per-kind payload shapes as exercise generation. Return ONLY valid JSON:
{
  "exercises": [
    {
      "kind": "fill_blank|match_pairs|multiple_choice|ordering|type_answer",
      "prompt": "instruction",
      "payload": { ... per-kind shape ... }
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
