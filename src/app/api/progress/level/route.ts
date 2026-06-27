import { NextRequest, NextResponse } from "next/server";
import { updateLevel, getCurrentLevel, getNextLevel, generateSyllabus } from "@/lib/syllabus";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);
    const body = await request.json();
    const { level } = body;

    if (!level) {
      const currentLevel = await getCurrentLevel(userId);
      const nextLevel = getNextLevel(currentLevel);

      if (!nextLevel) {
        return NextResponse.json({ error: "Already at max level" }, { status: 400 });
      }

      await updateLevel(userId, nextLevel);
      try {
        await generateSyllabus(nextLevel);
      } catch {}

      return NextResponse.json({ level: nextLevel });
    }

    await updateLevel(userId, level);
    try {
      await generateSyllabus(level);
    } catch {}

    return NextResponse.json({ level });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
