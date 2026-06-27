import { NextResponse } from "next/server";
import { deleteAllRagDocuments } from "@/lib/rag";

export async function POST() {
  try {
    await deleteAllRagDocuments();
    return NextResponse.json({ success: true, message: "All RAG documents deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
