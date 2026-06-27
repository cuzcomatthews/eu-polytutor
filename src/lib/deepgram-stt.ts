import env, { getApiKey } from "./env";

interface STTResult {
  text: string;
  confidence: number;
  duration: number;
}

export async function transcribeAudio(audioBytes: Buffer): Promise<STTResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY || (await getApiKey("DEEPGRAM_API_KEY"));
  if (!apiKey) {
    throw new Error("Deepgram API key not configured");
  }

  const language =
    env.targetLanguage === "de" ? "de" :
    env.targetLanguage === "fr" ? "fr" :
    env.targetLanguage === "it" ? "it" :
    env.targetLanguage === "pt" ? "pt" :
    env.targetLanguage === "ja" ? "ja" :
    env.targetLanguage === "ko" ? "ko" :
    "en";

  const t0 = performance.now();

  const blob = new Blob([new Uint8Array(audioBytes)], { type: "audio/wav" });

  const response = await fetch(
    `https://api.deepgram.com/v1/listen?model=nova-3&language=${language}&smart_format=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "audio/wav",
      },
      body: blob as any,
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Deepgram STT error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const channel = data?.results?.channels?.[0];
  const transcript = channel?.alternatives?.[0]?.transcript || "";
  const confidence = channel?.alternatives?.[0]?.confidence || 0;

  const duration = (performance.now() - t0) / 1000;

  return {
    text: transcript,
    confidence,
    duration,
  };
}
