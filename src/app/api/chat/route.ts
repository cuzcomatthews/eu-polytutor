import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { updateStreak } from "@/lib/progress";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const conversationId = formData.get("conversationId") as string;
    const roleId = formData.get("roleId") as string;

    if (!conversationId || !roleId) {
      return NextResponse.json(
        { error: "conversationId and roleId are required" },
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

    const audioBytes = audioFile ? Buffer.from(await audioFile.arrayBuffer()) : undefined;
    const textMessage = formData.get("text") as string || undefined;

    const result = await runPipeline({
      userId,
      conversationId,
      roleId,
      userLevel,
      audioBytes,
      textMessage,
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
