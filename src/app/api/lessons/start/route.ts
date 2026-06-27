import { NextRequest, NextResponse } from "next/server";
import { generateExercises } from "@/lib/syllabus";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topicId, topicTitle, topicDescription, keyPoints } = body;

    if (!topicId || !topicTitle) {
      return NextResponse.json(
        { error: "topicId and topicTitle are required" },
        { status: 400 }
      );
    }

    const exercises = await generateExercises(
      topicId,
      topicTitle,
      topicDescription || "",
      keyPoints || []
    );

    return NextResponse.json(exercises);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
