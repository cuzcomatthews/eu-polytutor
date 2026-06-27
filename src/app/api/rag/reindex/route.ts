import { NextRequest, NextResponse } from "next/server";
import { deleteAllRagDocuments } from "@/lib/rag";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);
    await deleteAllRagDocuments(userId);
    return NextResponse.json({ success: true, message: "All RAG documents deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
