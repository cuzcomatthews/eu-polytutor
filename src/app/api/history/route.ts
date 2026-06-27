import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        role: { select: { id: true, name: true } },
        _count: { select: { turns: true } },
      },
    });

    return NextResponse.json({
      activity: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        roleName: c.role.name,
        turnCount: c._count.turns,
        lastActive: c.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
