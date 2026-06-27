import env from "./env";

const MAX_CHARS = 1900;

export async function synthesizeSpeech(
  text: string,
  voiceId: string
): Promise<Buffer> {
  if (!env.deepgramApiKey) {
    throw new Error("Deepgram API key not configured");
  }

  if (!text.trim()) return Buffer.alloc(0);

  const response = await fetch(
    `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(voiceId)}&encoding=linear16&sample_rate=24000`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${env.deepgramApiKey}`,
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

export async function synthesizeSpeechLong(
  text: string,
  voiceId: string
): Promise<Buffer> {
  if (text.length <= MAX_CHARS) {
    return synthesizeSpeech(text, voiceId);
  }

  // Split at sentence boundaries
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > MAX_CHARS) {
    const cutPoint = remaining.lastIndexOf(".", MAX_CHARS);
    const idx = cutPoint > MAX_CHARS / 2 ? cutPoint + 1 : MAX_CHARS;
    chunks.push(remaining.slice(0, idx).trim());
    remaining = remaining.slice(idx).trim();
  }
  if (remaining.trim()) chunks.push(remaining.trim());

  const wavs: Buffer[] = [];
  for (const chunk of chunks) {
    const wav = await synthesizeSpeech(chunk, voiceId);
    wavs.push(wav);
  }

  return concatWavs(wavs);
}

function concatWavs(wavs: Buffer[]): Buffer {
  if (wavs.length === 0) return Buffer.alloc(0);
  if (wavs.length === 1) return wavs[0];

  // Strip WAV headers from all but first, concatenate PCM data
  const first = wavs[0];
  let totalData = 0;
  const dataBuffers: Buffer[] = [];

  for (let i = 0; i < wavs.length; i++) {
    if (i === 0) {
      dataBuffers.push(first.subarray(44));
      totalData += first.length - 44;
    } else {
      const data = wavs[i].subarray(44);
      dataBuffers.push(data);
      totalData += data.length;
    }
  }

  // Update total size in first header
  const result = Buffer.alloc(44 + totalData);
  first.copy(result, 0, 0, 44);
  result.writeUInt32LE(36 + totalData, 4);
  result.writeUInt32LE(totalData, 40);

  let offset = 44;
  for (const buf of dataBuffers) {
    buf.copy(result, offset);
    offset += buf.length;
  }

  return result;
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
