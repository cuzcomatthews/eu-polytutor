import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { updateStreak } from "@/lib/progress";

export async function POST(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);
    const body = await request.json();
    const { topicId } = body;

    if (!topicId) {
      return NextResponse.json({ error: "topicId required" }, { status: 400 });
    }

    const syllabus = await prisma.syllabus.findFirst({
      where: { isActive: true, userId },
      orderBy: { createdAt: "desc" },
    });

    if (!syllabus) {
      return NextResponse.json({ error: "No active syllabus" }, { status: 404 });
    }

    const content = syllabus.content as any;
    const topics = content.topics || [];

    const topic = topics.find((t: any) => t.id === topicId);
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    topic.status = "completed";

    // Unlock next topic
    for (let i = 0; i < topics.length; i++) {
      if (topics[i].id === topicId && i + 1 < topics.length) {
        const next = topics[i + 1];
        if (next.status === "locked") {
          next.status = "unlocked";
        }
        break;
      }
    }

    await prisma.syllabus.update({
      where: { id: syllabus.id },
      data: { content },
    });

    await updateStreak(userId);

    return NextResponse.json({ success: true, topics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
