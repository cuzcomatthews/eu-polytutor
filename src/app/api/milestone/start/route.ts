import { NextRequest, NextResponse } from "next/server";
import { generateMilestoneEval, getCurrentLevel } from "@/lib/syllabus";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const level = body.level || (await getCurrentLevel());
    const completedTopics = body.completedTopics || [];

    const milestone = await generateMilestoneEval(level, completedTopics);
    return NextResponse.json(milestone);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
