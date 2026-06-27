const env = {
  get databaseUrl() { return process.env.DATABASE_URL || ""; },

  get deepgramApiKey() { return process.env.DEEPGRAM_API_KEY || ""; },
  get deepseekApiKey() { return process.env.DEEPSEEK_API_KEY || ""; },
  get huggingfaceToken() { return process.env.HUGGINGFACEHUB_API_TOKEN || ""; },

  get ttsVoiceProfessor() { return process.env.DEEPGRAM_TTS_VOICE_PROFESSOR || ""; },
  get ttsVoiceTutor() { return process.env.DEEPGRAM_TTS_VOICE_TUTOR || ""; },
  get ttsVoiceCompanionM() { return process.env.DEEPGRAM_TTS_VOICE_COMPANION_M || ""; },
  get ttsVoiceCompanionF() { return process.env.DEEPGRAM_TTS_VOICE_COMPANION_F || ""; },

  get targetLanguage() { return process.env.TARGET_LANGUAGE || "de"; },
  get nativeLanguage() { return process.env.NATIVE_LANGUAGE || "es"; },

  get embeddingModel() { return process.env.EMBEDDING_MODEL || "BAAI/bge-m3"; },
  get embeddingDim() { return parseInt(process.env.EMBEDDING_DIM || "1024", 10); },
  get ragTopK() { return parseInt(process.env.RAG_TOP_K || "5", 10); },
  get ragSimilarityThreshold() { return parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || "0.3"); },
  get ragChunkSize() { return parseInt(process.env.RAG_CHUNK_SIZE || "1500", 10); },
  get ragChunkOverlap() { return parseInt(process.env.RAG_CHUNK_OVERLAP || "300", 10); },

  get llmMaxConversationTokens() { return parseInt(process.env.LLM_MAX_CONVERSATION_TOKENS || "256", 10); },
  get llmMaxTeachingTokens() { return parseInt(process.env.LLM_MAX_TEACHING_TOKENS || "768", 10); },
  get llmMaxSyllabusTokens() { return parseInt(process.env.LLM_MAX_SYLLABUS_TOKENS || "4096", 10); },

  get memoryMaxTurns() { return parseInt(process.env.MEMORY_MAX_TURNS || "16", 10); },
  get memorySummaryTrigger() { return parseInt(process.env.MEMORY_SUMMARY_TRIGGER || "24", 10); },

  get cacheEnabled() { return process.env.CACHE_ENABLED !== "false"; },
  get cacheTtlDays() { return parseInt(process.env.CACHE_TTL_DAYS || "30", 10); },
};

export default env;
