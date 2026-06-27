import { NextRequest, NextResponse } from "next/server";
import { evaluateAnswer, getCurrentLevel, getNextLevel, updateLevel, generateSyllabus } from "@/lib/syllabus";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);
    const body = await request.json();
    const { answers } = body;

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "answers array is required with [{userAnswer, expectedAnswer, exerciseType}]" },
        { status: 400 }
      );
    }

    const results = [];
    let correctCount = 0;

    for (const ans of answers) {
      const result = await evaluateAnswer(
        ans.userAnswer,
        ans.expectedAnswer,
        ans.exerciseType || "type_answer",
        userId
      );
      results.push(result);
      if (result.correct) correctCount++;
    }

    const score = Math.round((correctCount / answers.length) * 100);
    const passed = score >= 70;

    if (passed) {
      const currentLevel = await getCurrentLevel(userId);
      const next = getNextLevel(currentLevel);
      if (next) {
        await updateLevel(userId, next);
        try {
          await generateSyllabus(next, userId);
        } catch {}
      }
    }

    return NextResponse.json({
      results,
      score,
      passed,
      correctCount,
      totalQuestions: answers.length,
      levelAdvanced: passed,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
