import env from "./env";

interface LLMMessage {
  role: string;
  content: string;
}

interface LLMResponse {
  text: string;
  finishReason: string;
}

export async function generateResponse(
  messages: LLMMessage[],
  maxTokens: number = env.llmMaxTeachingTokens,
  temperature: number = 0.7
): Promise<LLMResponse> {
  if (!env.deepseekApiKey) {
    throw new Error("Deepseek API key not configured");
  }

  const response = await fetch(
    "https://api.deepseek.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Deepseek error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const choice = data?.choices?.[0];

  return {
    text: choice?.message?.content || "",
    finishReason: choice?.finish_reason || "stop",
  };
}
