import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { indexDocuments, chunkText } from "@/lib/rag";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);

    const settings = await prisma.appSettings.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return NextResponse.json(map);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      await prisma.appSettings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
