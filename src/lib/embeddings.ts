import env from "./env";

export async function embedText(text: string): Promise<number[]> {
  if (!env.huggingfaceToken) {
    throw new Error("HuggingFace API token not configured");
  }

  const modelUrl = `https://api-inference.huggingface.co/models/${env.embeddingModel}`;

  const response = await fetch(modelUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.huggingfaceToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: text }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HuggingFace embedding error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data[0] || [];
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!env.huggingfaceToken) {
    throw new Error("HuggingFace API token not configured");
  }

  const modelUrl = `https://api-inference.huggingface.co/models/${env.embeddingModel}`;

  const response = await fetch(modelUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.huggingfaceToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: texts }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HuggingFace embedding error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export function getEmbeddingDim(): number {
  return env.embeddingDim;
}
