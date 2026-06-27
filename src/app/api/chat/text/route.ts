import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { updateStreak } from "@/lib/progress";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, roleId, text, skipTts } = body;

    if (!conversationId || !roleId || !text) {
      return NextResponse.json(
        { error: "conversationId, roleId, and text are required" },
        { status: 400 }
      );
    }

    const progress = await prisma.userProgress.findUnique({
      where: { id: "singleton" },
    });
    const userLevel = progress?.cefrLevel || "A1.1";

    const result = await runPipeline({
      conversationId,
      roleId,
      userLevel,
      textMessage: text,
      skipTts: skipTts || false,
    });

    await updateStreak();

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Pipeline error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
