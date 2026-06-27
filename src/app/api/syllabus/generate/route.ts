import { NextRequest, NextResponse } from "next/server";
import { generateSyllabus, getCurrentLevel } from "@/lib/syllabus";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);
    const body = await request.json();
    const level = body.level || (await getCurrentLevel(userId));

    const syllabus = await generateSyllabus(level, userId);
    return NextResponse.json(syllabus);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
