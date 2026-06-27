import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResponse } from "@/lib/deepseek";
import env from "@/lib/env";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);
    const body = await request.json();
    const { wordIds } = body;

    if (!wordIds || !wordIds.length) {
      return NextResponse.json({ error: "wordIds array is required" }, { status: 400 });
    }

    const entries = await prisma.dictionaryEntry.findMany({
      where: { id: { in: wordIds.slice(0, 20) }, userId },
    });

    const targetName = env.targetLanguage === "de" ? "German" : env.targetLanguage;
    const nativeName = env.nativeLanguage === "es" ? "Spanish" : env.nativeLanguage;

    const wordList = entries.map((e) => `${e.word} (${e.translation})`).join(", ");
    const exerciseCount = entries.length <= 3 ? 3 : Math.min(15, entries.length * 2);

    const prompt = `Create ${exerciseCount} practice exercises using these ${targetName} words: ${wordList}.

The user's native language is ${nativeName}.

Return ONLY valid JSON following this exact shape:
{
  "teaching_notes": "Brief ${nativeName} introduction",
  "exercises": [
    {
      "kind": "multiple_choice",
      "prompt": "Instruction in ${nativeName}",
      "payload": { "options": ["a","b","c","d"], "correct_index": 0, "hint": "${targetName} word or phrase" }
    },
    {
      "kind": "fill_blank",
      "prompt": "Instruction in ${nativeName}",
      "payload": { "sentence": "${targetName} sentence with ___", "answers": ["correct"], "hint": "optional ${nativeName} hint" }
    },
    {
      "kind": "match_pairs",
      "prompt": "Match words to translations",
      "payload": { "pairs": [{"left": "${targetName}", "right": "${nativeName}"}] }
    },
    {
      "kind": "type_answer",
      "prompt": "Write this in ${targetName}",
      "payload": { "answers": ["correct answer"], "hint": "${nativeName} phrase to translate" }
    }
  ]
}

Use exactly ${exerciseCount} exercises mixing the kinds above. For 1-3 words, test every word. For more words, sample randomly. All prompts and hints in ${nativeName}.`;

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
