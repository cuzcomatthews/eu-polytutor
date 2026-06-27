import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const entry = await prisma.dictionaryEntry.update({
      where: { id },
      data: {
        ...(body.word && { word: body.word }),
        ...(body.translation && { translation: body.translation }),
        ...(body.gender !== undefined && { gender: body.gender }),
        ...(body.exampleSentence !== undefined && { exampleSentence: body.exampleSentence }),
        ...(body.difficulty && { difficulty: body.difficulty }),
        ...(body.tags && { tags: body.tags }),
      },
    });

    return NextResponse.json({ entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.dictionaryEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
