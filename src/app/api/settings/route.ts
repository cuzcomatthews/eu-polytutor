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

    return NextResponse.json({
      voices,
      targetLanguage: user?.targetLanguage || null,
      nativeLanguage: user?.nativeLanguage || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);
    const body = await request.json();
    const { voices, targetLanguage, nativeLanguage } = body;

    const updateData: any = {};

    if (voices && typeof voices === "object") {
      updateData.professorVoice = voices.professorVoice || null;
      updateData.tutorVoice = voices.tutorVoice || null;
      updateData.companionMVoice = voices.companionMVoice || null;
      updateData.companionFVoice = voices.companionFVoice || null;
    }
    if (targetLanguage !== undefined) updateData.targetLanguage = targetLanguage || null;
    if (nativeLanguage !== undefined) updateData.nativeLanguage = nativeLanguage || null;

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: updateData });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
