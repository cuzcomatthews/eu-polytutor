import { NextRequest, NextResponse } from "next/server";
import { getProgress, updateStreak } from "@/lib/progress";
import { tryGetUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = tryGetUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    await updateStreak(auth.userId);
    const progress = await getProgress(auth.userId);
    return NextResponse.json(progress);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
