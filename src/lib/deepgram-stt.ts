import env from "./env";

interface STTResult {
  text: string;
  confidence: number;
  duration: number;
}

export async function transcribeAudio(audioBytes: Buffer): Promise<STTResult> {
  if (!env.deepgramApiKey) {
    throw new Error("Deepgram API key not configured");
  }

  const t0 = performance.now();

  const blob = new Blob([new Uint8Array(audioBytes)], { type: "audio/wav" });

  const response = await fetch(
    `https://api.deepgram.com/v1/listen?model=nova-3&detect_language=true&smart_format=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${env.deepgramApiKey}`,
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
