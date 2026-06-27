import { HfInference } from "@huggingface/inference";
import env from "./env";

function getClient(): HfInference | null {
  const token = process.env.HUGGINGFACEHUB_API_TOKEN;
  if (!token) return null;
  return new HfInference(token);
}

export async function embedText(text: string): Promise<number[]> {
  const client = getClient();
  if (!client) {
    throw new Error("HuggingFace API token not configured");
  }

  const result = await client.featureExtraction({
    model: env.embeddingModel,
    inputs: text,
  });

  if (typeof result === "number") {
    return [result];
  }

  if (Array.isArray(result)) {
    if (result.length > 0 && Array.isArray(result[0])) {
      return result as unknown as number[];
    }
    return result as unknown as number[];
  }

  return [];
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = getClient();
  if (!client) {
    throw new Error("HuggingFace API token not configured");
  }

  const results: number[][] = [];

  for (const text of texts) {
    const result = await client.featureExtraction({
      model: env.embeddingModel,
      inputs: text,
    });

    if (typeof result === "number") {
      results.push([result]);
    } else if (Array.isArray(result)) {
      if (result.length > 0 && Array.isArray(result[0])) {
        results.push(result as unknown as number[]);
      } else {
        results.push(result as unknown as number[]);
      }
    } else {
      results.push([]);
    }
  }

  return results;
}

export function getEmbeddingDim(): number {
  return env.embeddingDim;
}
