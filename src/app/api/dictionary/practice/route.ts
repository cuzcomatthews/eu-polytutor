import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResponse } from "@/lib/deepseek";
import env from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wordIds } = body;

    if (!wordIds || !wordIds.length) {
      return NextResponse.json({ error: "wordIds array is required" }, { status: 400 });
    }

    const entries = await prisma.dictionaryEntry.findMany({
      where: { id: { in: wordIds } },
    });

    const targetName = env.targetLanguage;
    const nativeName = env.nativeLanguage;

    const wordList = entries.map((e) => `${e.word} (${e.translation})`).join(", ");

    const prompt = `Create a 5-exercise practice session using ONLY these ${targetName} words: ${wordList}.

The user's native language is ${nativeName}.

Return ONLY valid JSON:
{
  "exercises": [
    {"type": "fill_blank", "sentence": "___ with gap", "answer": "correct word", "options": ["opt1","opt2","opt3","opt4"]},
    {"type": "match_pairs", "pairs": [{"left": "${targetName}", "right": "${nativeName}"}]},
    {"type": "reorder", "words": ["w1","w2","w3"], "answer": "correct sentence"},
    {"type": "pick_translation", "sentence": "${targetName}", "answer": "correct", "options": ["opt1","opt2","opt3","opt4"]}
  ]
}`;

    const response = await generateResponse(
      [{ role: "user", content: prompt }],
      2000,
      0.5
    );

    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to generate exercises" }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
