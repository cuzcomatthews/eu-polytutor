import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);

    const roles = await prisma.role.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        responseStyle: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ roles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
