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

    const ext = file.name.split(".").pop()?.toLowerCase();
    let text = "";

    if (ext === "pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      try {
        const pdfParse = (await import("pdf-parse")) as any;
        const pdfData = await pdfParse(buffer);
        text = pdfData.text;
      } catch (pdfErr: any) {
        return NextResponse.json(
          { error: `Failed to parse PDF: ${pdfErr.message}` },
          { status: 400 }
        );
      }
    } else {
      text = await file.text();
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "No text content found in file" },
        { status: 400 }
      );
    }

    const chunks = chunkText(text);

    const metadatas = chunks.map((_, i) => ({
      sourceFile: file.name,
      level,
      chunkIndex: i,
      sourceType: ext || "unknown",
    }));

    await indexDocuments(chunks, metadatas);

    return NextResponse.json({
      indexed: chunks.length,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error("RAG upload error:", error);
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
