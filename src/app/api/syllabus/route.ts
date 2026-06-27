import { NextRequest, NextResponse } from "next/server";
import { getActiveSyllabus } from "@/lib/syllabus";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);
    const syllabus = await getActiveSyllabus(userId);
    return NextResponse.json(syllabus || { topics: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
