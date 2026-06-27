import { NextRequest, NextResponse } from "next/server";
import { deleteRagDocument } from "@/lib/rag";
import { getUserFromRequest } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = getUserFromRequest(request);
    const { id } = await params;
    await deleteRagDocument(id, userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
