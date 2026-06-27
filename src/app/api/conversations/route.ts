import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);
    const body = await request.json();
    const { title, roleId } = body;

    if (!roleId) {
      return NextResponse.json({ error: "roleId is required" }, { status: 400 });
    }

    const conversation = await prisma.conversation.create({
      data: {
        title: title || "New Conversation",
        roleId,
        userId,
      },
      include: { role: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ conversation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        role: { select: { id: true, name: true } },
        _count: { select: { turns: true } },
      },
    });

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        roleId: c.role.id,
        roleName: c.role.name,
        turnCount: c._count.turns,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
