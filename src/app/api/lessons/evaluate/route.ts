import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { evaluateAnswer } from "@/lib/syllabus";

export async function POST(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);
    const body = await request.json();
    const { userAnswer, expectedAnswer, exerciseType } = body;

    if (exerciseType === "match_pairs") {
      const result = await evaluateAnswer(userAnswer || "", "", exerciseType, userId);
      return NextResponse.json(result);
    }

    if (!userAnswer || !expectedAnswer) {
      return NextResponse.json(
        { error: "userAnswer and expectedAnswer are required" },
        { status: 400 }
      );
    }

    const result = await evaluateAnswer(
      userAnswer,
      expectedAnswer,
      exerciseType || "type_answer",
      userId
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
