import { NextRequest, NextResponse } from "next/server";
import { generateSyllabus, getCurrentLevel } from "@/lib/syllabus";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const level = body.level || (await getCurrentLevel());

    const syllabus = await generateSyllabus(level);
    return NextResponse.json(syllabus);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
