import { prisma } from "./prisma";

export async function getProgress() {
  const progress = await prisma.userProgress.findUnique({
    where: { id: "singleton" },
  });

  const dictCount = await prisma.dictionaryEntry.count();
  const convCount = await prisma.conversation.count();
  const activeSyllabus = await prisma.syllabus.findFirst({
    where: { isActive: true },
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

export async function updateStreak() {
  const progress = await prisma.userProgress.findUnique({
    where: { id: "singleton" },
  });

  if (!progress) {
    await prisma.userProgress.create({
      data: { id: "singleton", streakDays: 1, lastActiveAt: new Date() },
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
      where: { id: "singleton" },
      data: { streakDays: { increment: 1 }, lastActiveAt: now },
    });
  } else {
    await prisma.userProgress.update({
      where: { id: "singleton" },
      data: { streakDays: 1, lastActiveAt: now },
    });
  }
}
