import { NextRequest, NextResponse } from "next/server";
import { evaluateAnswer } from "@/lib/syllabus";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAnswer, expectedAnswer, exerciseType } = body;

    if (!userAnswer || !expectedAnswer) {
      return NextResponse.json(
        { error: "userAnswer and expectedAnswer are required" },
        { status: 400 }
      );
    }

    const result = await evaluateAnswer(
      userAnswer,
      expectedAnswer,
      exerciseType || "write"
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
