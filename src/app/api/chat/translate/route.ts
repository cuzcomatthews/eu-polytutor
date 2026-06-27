import { NextRequest, NextResponse } from "next/server";
import { generateResponse } from "@/lib/deepseek";
import env from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const targetName =
      env.targetLanguage === "de" ? "German" :
      env.targetLanguage === "fr" ? "French" :
      env.targetLanguage === "it" ? "Italian" :
      env.targetLanguage === "pt" ? "Portuguese" :
      env.targetLanguage === "ja" ? "Japanese" :
      env.targetLanguage === "ko" ? "Korean" :
      env.targetLanguage === "zh" ? "Chinese" :
      env.targetLanguage === "es" ? "Spanish" :
      env.targetLanguage;

    const nativeName =
      env.nativeLanguage === "de" ? "German" :
      env.nativeLanguage === "fr" ? "French" :
      env.nativeLanguage === "it" ? "Italian" :
      env.nativeLanguage === "pt" ? "Portuguese" :
      env.nativeLanguage === "ja" ? "Japanese" :
      env.nativeLanguage === "ko" ? "Korean" :
      env.nativeLanguage === "zh" ? "Chinese" :
      env.nativeLanguage === "es" ? "Spanish" :
      env.nativeLanguage === "en" ? "English" :
      env.nativeLanguage;

    const llmResponse = await generateResponse(
      [
        {
          role: "user",
          content: `Translate this ${targetName} text to ${nativeName}. Only return the translation, no explanations:\n\n${text}`,
        },
      ],
      512,
      0.3
    );

    return NextResponse.json({ translation: llmResponse.text.trim() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
