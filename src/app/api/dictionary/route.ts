import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResponse } from "@/lib/deepseek";
import { buildDictionaryEntryPrompt } from "@/lib/prompts";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const difficulty = url.searchParams.get("difficulty");
    const tag = url.searchParams.get("tag");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);

    let where: any = { userId };

    if (search) {
      where.OR = [
        { word: { contains: search, mode: "insensitive" } },
        { translation: { contains: search, mode: "insensitive" } },
      ];
    }

    if (difficulty) {
      where.difficulty = parseInt(difficulty, 10);
    }

    if (tag) {
      where.tags = { has: tag };
    }

    const [entries, total] = await Promise.all([
      prisma.dictionaryEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dictionaryEntry.count({ where }),
    ]);

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = getUserFromRequest(request);
    const body = await request.json();
    const { word: rawWord } = body;

    if (!rawWord) {
      return NextResponse.json({ error: "word is required" }, { status: 400 });
    }

    const word = rawWord.trim();

    let translation = "";
    let gender: string | null = null;
    let exampleSentence: string | null = null;
    let difficulty = 1;

    try {
      const prompt = await buildDictionaryEntryPrompt(word);
      const response = await generateResponse(
        [{ role: "user", content: prompt }],
        300,
        0.3
      );
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        translation = parsed.translation || "";
        gender = parsed.gender || null;
        exampleSentence = parsed.exampleSentence || null;
        difficulty = parsed.difficulty || 1;
      }
    } catch {}

    if (!translation) {
      translation = body.translation || "";
    }

    const entry = await prisma.dictionaryEntry.create({
      data: {
        userId,
        word,
        translation,
        gender,
        exampleSentence,
        difficulty,
        tags: body.tags || [],
      },
    });

    await prisma.userProgress.upsert({
      where: { userId },
      update: { totalWords: { increment: 1 } },
      create: { userId, totalWords: 1 },
    });

    return NextResponse.json({ entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
