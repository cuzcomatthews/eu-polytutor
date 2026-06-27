import { NextRequest, NextResponse } from "next/server";
import { generateMilestoneEval, getCurrentLevel } from "@/lib/syllabus";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);
    const body = await request.json();
    const level = body.level || (await getCurrentLevel(userId));
    const completedTopics = body.completedTopics || [];

    const milestone = await generateMilestoneEval(level, completedTopics, userId);
    return NextResponse.json(milestone);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
