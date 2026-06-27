import env, { getApiKey } from "./env";

export async function synthesizeSpeech(
  text: string,
  voiceId: string
): Promise<Buffer> {
  const apiKey = process.env.DEEPGRAM_API_KEY || (await getApiKey("DEEPGRAM_API_KEY"));
  if (!apiKey) {
    throw new Error("Deepgram API key not configured");
  }

  if (!text.trim()) return Buffer.alloc(0);

  const response = await fetch(
    `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(voiceId)}&encoding=linear16&sample_rate=24000`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Deepgram TTS error: ${response.status} ${err}`);
  }

  const pcmBytes = Buffer.from(await response.arrayBuffer());
  return pcmToWav(pcmBytes, 24000);
}

function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.length;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}
