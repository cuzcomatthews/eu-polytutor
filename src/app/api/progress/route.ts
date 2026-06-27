import { NextResponse } from "next/server";
import { getProgress } from "@/lib/progress";

export async function GET() {
  try {
    const progress = await getProgress();
    return NextResponse.json(progress);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
