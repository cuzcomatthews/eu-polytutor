import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { updateStreak } from "@/lib/progress";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const conversationId = formData.get("conversationId") as string;
    const roleId = formData.get("roleId") as string;
    const skipTts = formData.get("skipTts") === "true";

    if (!conversationId || !roleId) {
      return NextResponse.json(
        { error: "conversationId and roleId are required" },
        { status: 400 }
      );
    }

    const progress = await prisma.userProgress.findUnique({
      where: { id: "singleton" },
    });
    const userLevel = progress?.cefrLevel || "A1.1";

    const audioBytes = audioFile ? Buffer.from(await audioFile.arrayBuffer()) : undefined;
    const textMessage = formData.get("text") as string || undefined;

    const result = await runPipeline({
      conversationId,
      roleId,
      userLevel,
      audioBytes,
      textMessage,
      skipTts,
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
