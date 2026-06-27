import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const targetLang = process.env.TARGET_LANGUAGE || "de";

const roleData = [
  {
    name: "Professor",
    description: "Structured grammar teacher. Explains rules with examples and exercises.",
    systemPrompt: `You are a professional language teacher specializing in grammar instruction.
You teach in a structured, classroom-like manner.

Your approach:
- Present grammar rules clearly with terminology
- Provide organized examples and structured exercises
- Give detailed corrections with explanations
- Use formal teaching language
- Break down complex topics methodically

You are knowledgeable, patient, and thorough.`,
    voiceId: process.env.DEEPGRAM_TTS_VOICE_PROFESSOR || "aura-2-nestor-es",
    responseStyle: "detailed",
  },
  {
    name: "Tutor Guide",
    description: "Practical learning guide. Gently corrects mistakes and suggests improvements.",
    systemPrompt: `You are a supportive language tutor focused on practical guidance.

Your approach:
- Guide the user step by step through language challenges
- Gently correct mistakes without discouraging
- Answer specific doubts with clear explanations
- Suggest better ways to phrase things ("You could say it like this...")
- Adapt explanations to the user's apparent understanding

You are encouraging, patient, and practical.`,
    voiceId: process.env.DEEPGRAM_TTS_VOICE_TUTOR || "aura-2-javier-es",
    responseStyle: "detailed",
  },
  {
    name: "Male Companion",
    description: "Friendly native speaker. Casual conversations about everyday topics.",
    systemPrompt: `You are a friendly native speaker having casual conversations.

Your approach:
- Chat naturally like a real friend would
- Talk about everyday topics: hobbies, interests, daily life
- Use informal, natural language
- Occasionally correct major errors gently ("by the way...")
- Keep the conversation flowing naturally

You are relaxed, friendly, and authentic.`,
    voiceId: process.env.DEEPGRAM_TTS_VOICE_COMPANION_M || "aura-2-aquila-es",
    responseStyle: "concise",
  },
  {
    name: "Female Companion",
    description: "Friendly native speaker (feminine perspective). Casual everyday conversations.",
    systemPrompt: `You are a friendly native speaker having casual conversations from a feminine perspective.

Your approach:
- Chat naturally like a real friend would
- Talk about everyday topics, relationships, culture, daily life
- Use informal, natural language with a feminine conversational style
- Occasionally correct major errors gently
- Keep the conversation flowing naturally

You are warm, friendly, and authentic.`,
    voiceId: process.env.DEEPGRAM_TTS_VOICE_COMPANION_F || "aura-2-selena-es",
    responseStyle: "concise",
  },
];

const starterSyllabus = {
  level: "A1.1",
  targetLanguage: targetLang,
  nativeLanguage: process.env.NATIVE_LANGUAGE || "es",
  topics: [
    {
      id: "a1-1-greetings",
      title: "Greetings & Introductions",
      description: "Learn basic greetings, how to introduce yourself and others",
      order: 1,
      keyPoints: [
        "Formal vs informal greetings",
        "Introducing yourself (name, where you're from)",
        "Basic phrases: hello, goodbye, please, thank you",
      ],
      relatedDocIds: [],
    },
    {
      id: "a1-2-alphabet",
      title: "Alphabet & Pronunciation",
      description: "Learn the alphabet and basic pronunciation rules",
      order: 2,
      keyPoints: [
        "Letters and their sounds",
        "Special characters (umlauts, ß)",
        "Common letter combinations (sch, ch, ei, ie)",
      ],
      relatedDocIds: [],
    },
    {
      id: "a1-3-numbers",
      title: "Numbers & Counting",
      description: "Learn numbers 0-100 and how to use them",
      order: 3,
      keyPoints: [
        "Numbers 0-20",
        "Numbers 21-100",
        "Asking for and giving phone numbers",
        "Prices and quantities",
      ],
      relatedDocIds: [],
    },
    {
      id: "a1-4-articles",
      title: "Articles & Gender",
      description: "Learn definite and indefinite articles (der/die/das)",
      order: 4,
      keyPoints: [
        "Definite articles: der (m), die (f), das (n)",
        "Indefinite articles: ein, eine",
        "Common noun endings that indicate gender",
      ],
      relatedDocIds: [],
    },
    {
      id: "a1-5-presents",
      title: "Present Tense Basics",
      description: "Learn regular verb conjugation in present tense",
      order: 5,
      keyPoints: [
        "Pronouns: ich, du, er/sie/es, wir, ihr, sie/Sie",
        "Regular verb endings (-en stem + personal endings)",
        "Common regular verbs (machen, spielen, lernen, wohnen)",
      ],
      relatedDocIds: [],
    },
    {
      id: "a1-6-sein-haben",
      title: "Sein & Haben",
      description: "Master the two most important irregular verbs",
      order: 6,
      keyPoints: [
        "Conjugation of sein (to be)",
        "Conjugation of haben (to have)",
        "Common uses and expressions",
      ],
      relatedDocIds: [],
    },
    {
      id: "a1-7-questions",
      title: "Questions",
      description: "Learn to form questions (W-Fragen and Ja/Nein Fragen)",
      order: 7,
      keyPoints: [
        "Question words: wer, was, wo, wann, warum, wie",
        "Yes/no questions (verb-first position)",
        "Asking for directions, time, and basic information",
      ],
      relatedDocIds: [],
    },
    {
      id: "a1-8-possession",
      title: "Possession & Family",
      description: "Learn possessive pronouns and family vocabulary",
      order: 8,
      keyPoints: [
        "Possessive pronouns: mein, dein, sein, ihr",
        "Family members vocabulary",
        "Saying 'my mother', 'your brother', etc.",
      ],
      relatedDocIds: [],
    },
    {
      id: "a1-9-negation",
      title: "Negation",
      description: "Learn to negate sentences with nicht and kein",
      order: 9,
      keyPoints: [
        "Using nicht (not) - placement rules",
        "Using kein (no/not any) for nouns",
        "Common negative expressions",
      ],
      relatedDocIds: [],
    },
    {
      id: "a1-10-akkusativ",
      title: "Accusative Case",
      description: "Introduction to the accusative case",
      order: 10,
      keyPoints: [
        "When to use accusative (direct object)",
        "Article changes in accusative (der→den, ein→einen)",
        "Common accusative prepositions (für, durch, ohne, um)",
      ],
      relatedDocIds: [],
    },
  ],
};

async function main() {
  console.log("Seeding database...");

  // Roles
  const existingRoles = await prisma.role.count();
  if (existingRoles === 0) {
    await prisma.role.createMany({ data: roleData });
  }
  console.log(`Seeded ${roleData.length} roles`);

  // User progress
  await prisma.userProgress.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      cefrLevel: "A1.1",
      totalTurns: 0,
      totalWords: 0,
      streakDays: 0,
    },
  });
  console.log("Seeded user progress");

  // Starter syllabus
  const existingSyllabus = await prisma.syllabus.count();
  if (existingSyllabus === 0) {
    await prisma.syllabus.create({
      data: {
        level: "A1.1",
        content: starterSyllabus,
        isActive: true,
      },
    });
    console.log("Seeded starter syllabus (A1.1)");
  }

  // App settings
  const settingsData = [
    { key: "CURRENT_CEFR_LEVEL", value: "A1.1" },
    { key: "TARGET_LANGUAGE", value: targetLang },
    { key: "NATIVE_LANGUAGE", value: process.env.NATIVE_LANGUAGE || "es" },
  ];

  for (const setting of settingsData) {
    await prisma.appSettings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log("Seeded app settings");

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
