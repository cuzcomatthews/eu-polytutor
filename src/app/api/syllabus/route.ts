import { NextRequest, NextResponse } from "next/server";
import { getActiveSyllabus } from "@/lib/syllabus";
import { tryGetUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = tryGetUserFromRequest(request);
    if (!auth) return NextResponse.json({ topics: [] });
    const syllabus = await getActiveSyllabus(auth.userId);
    return NextResponse.json(syllabus || { topics: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
