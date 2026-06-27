import { NextResponse } from "next/server";
import { getActiveSyllabus } from "@/lib/syllabus";

export async function GET() {
  try {
    const syllabus = await getActiveSyllabus();
    return NextResponse.json(syllabus || { topics: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
