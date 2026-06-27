const env = {
  databaseUrl: process.env.DATABASE_URL || "",

  deepgramApiKey: process.env.DEEPGRAM_API_KEY || "",
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
  huggingfaceToken: process.env.HUGGINGFACEHUB_API_TOKEN || "",

  ttsVoiceProfessor: process.env.DEEPGRAM_TTS_VOICE_PROFESSOR || "",
  ttsVoiceTutor: process.env.DEEPGRAM_TTS_VOICE_TUTOR || "",
  ttsVoiceCompanionM: process.env.DEEPGRAM_TTS_VOICE_COMPANION_M || "",
  ttsVoiceCompanionF: process.env.DEEPGRAM_TTS_VOICE_COMPANION_F || "",

  targetLanguage: process.env.TARGET_LANGUAGE || "de",
  nativeLanguage: process.env.NATIVE_LANGUAGE || "es",

  embeddingModel: process.env.EMBEDDING_MODEL || "BAAI/bge-m3",
  embeddingDim: parseInt(process.env.EMBEDDING_DIM || "1024", 10),
  ragTopK: parseInt(process.env.RAG_TOP_K || "5", 10),
  ragSimilarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || "0.3"),
  ragChunkSize: parseInt(process.env.RAG_CHUNK_SIZE || "1500", 10),
  ragChunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP || "300", 10),

  llmMaxConversationTokens: parseInt(process.env.LLM_MAX_CONVERSATION_TOKENS || "256", 10),
  llmMaxTeachingTokens: parseInt(process.env.LLM_MAX_TEACHING_TOKENS || "768", 10),
  llmMaxSyllabusTokens: parseInt(process.env.LLM_MAX_SYLLABUS_TOKENS || "4096", 10),

  memoryMaxTurns: parseInt(process.env.MEMORY_MAX_TURNS || "16", 10),
  memorySummaryTrigger: parseInt(process.env.MEMORY_SUMMARY_TRIGGER || "24", 10),

  cacheEnabled: process.env.CACHE_ENABLED !== "false",
  cacheTtlDays: parseInt(process.env.CACHE_TTL_DAYS || "30", 10),
};

export default env;
