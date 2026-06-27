import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { updateStreak } from "@/lib/progress";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);

    const body = await request.json();
    const { conversationId, roleId, text, skipTts } = body;

    if (!conversationId || !roleId || !text) {
      return NextResponse.json(
        { error: "conversationId, roleId, and text are required" },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true },
    });

    if (!conversation || conversation.userId !== userId) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const progress = await prisma.userProgress.findUnique({
      where: { userId },
    });
    const userLevel = progress?.cefrLevel || "A1.1";

    const result = await runPipeline({
      userId,
      conversationId,
      roleId,
      userLevel,
      textMessage: text,
      skipTts: skipTts || false,
    });

    await updateStreak(userId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Pipeline error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
