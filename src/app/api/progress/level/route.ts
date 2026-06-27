import { NextRequest, NextResponse } from "next/server";
import { updateLevel, getNextLevel, generateSyllabus } from "@/lib/syllabus";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level } = body;

    if (!level) {
      const currentLevel = await (await import("@/lib/syllabus")).getCurrentLevel();
      const nextLevel = getNextLevel(currentLevel);

      if (!nextLevel) {
        return NextResponse.json({ error: "Already at max level" }, { status: 400 });
      }

      await updateLevel(nextLevel);
      try {
        await generateSyllabus(nextLevel);
      } catch {}

      return NextResponse.json({ level: nextLevel });
    }

    await updateLevel(level);
    try {
      await generateSyllabus(level);
    } catch {}

    return NextResponse.json({ level });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
