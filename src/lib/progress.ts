import { prisma } from "./prisma";

export async function getProgress(userId: string) {
  const progress = await prisma.userProgress.findUnique({
    where: { userId },
  });

  const dictCount = await prisma.dictionaryEntry.count({ where: { userId } });
  const convCount = await prisma.conversation.count({ where: { userId } });
  const activeSyllabus = await prisma.syllabus.findFirst({
    where: { isActive: true, userId },
    orderBy: { createdAt: "desc" },
  });

  return {
    cefrLevel: progress?.cefrLevel || "A1.1",
    totalTurns: progress?.totalTurns || 0,
    streakDays: progress?.streakDays || 0,
    totalWordsAdded: dictCount,
    totalConversations: convCount,
    lastActiveAt: progress?.lastActiveAt?.toISOString() || null,
    syllabusTopics: activeSyllabus
      ? (activeSyllabus.content as any)?.topics?.length || 0
      : 0,
  };
}

export async function updateStreak(userId: string) {
  const progress = await prisma.userProgress.findUnique({
    where: { userId },
  });

  if (!progress) {
    await prisma.userProgress.create({
      data: { userId, streakDays: 1, lastActiveAt: new Date() },
    });
    return;
  }

  const lastActive = progress.lastActiveAt;
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return;

  if (diffDays === 1) {
    await prisma.userProgress.update({
      where: { userId },
      data: { streakDays: { increment: 1 }, lastActiveAt: now },
    });
  } else {
    await prisma.userProgress.update({
      where: { userId },
      data: { streakDays: 1, lastActiveAt: now },
    });
  }
}
