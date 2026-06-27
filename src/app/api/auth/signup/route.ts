import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    if (username.length < 3 || password.length < 4) {
      return NextResponse.json({ error: "Username must be 3+ chars, password 4+ chars" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username: username.trim(), passwordHash },
    });

    await prisma.userProgress.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    const token = signToken(user.id);

    return NextResponse.json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
