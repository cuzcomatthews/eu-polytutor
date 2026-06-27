import { NextRequest, NextResponse } from "next/server";
import { indexDocuments, chunkText, getRagDocuments } from "@/lib/rag";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const level = formData.get("level") as string || "";

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const text = await file.text();
    const chunks = chunkText(text);

    const metadatas = chunks.map((_, i) => ({
      sourceFile: file.name,
      level,
      chunkIndex: i,
      sourceType: file.name.split(".").pop() || "unknown",
    }));

    await indexDocuments(chunks, metadatas);

    return NextResponse.json({
      indexed: chunks.length,
      fileName: file.name,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const documents = await getRagDocuments();
    return NextResponse.json({ documents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
