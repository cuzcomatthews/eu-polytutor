import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const voices: Record<string, string | null> = {};
    if (user) {
      voices.professorVoice = user.professorVoice;
      voices.tutorVoice = user.tutorVoice;
      voices.companionMVoice = user.companionMVoice;
      voices.companionFVoice = user.companionFVoice;
    }

    return NextResponse.json({ voices });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);
    const body = await request.json();
    const { voices } = body;

    if (voices && typeof voices === "object") {
      await prisma.user.update({
        where: { id: userId },
        data: {
          professorVoice: voices.professorVoice || null,
          tutorVoice: voices.tutorVoice || null,
          companionMVoice: voices.companionMVoice || null,
          companionFVoice: voices.companionFVoice || null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
