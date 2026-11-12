import "server-only";
import { prisma } from "@/lib/prisma";

function dateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shiftDateKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export async function getUserStats(userId: string) {
  const [progressAgg, finishedCount, sessions] = await Promise.all([
    prisma.readingProgress.aggregate({
      where: { userId },
      _sum: { totalSeconds: true, totalChars: true },
      _count: { id: true },
    }),
    prisma.readingProgress.count({
      where: { userId, status: "finished" },
    }),
    prisma.readingSession.findMany({
      where: { userId },
      select: { completedAt: true, seconds: true, chars: true },
      orderBy: { completedAt: "desc" },
      take: 1200,
    }),
  ]);

  const today = dateKey(new Date());
  const readDays = new Set(sessions.map((session) => dateKey(session.completedAt)));
  const readToday = readDays.has(today);
  let cursor = readToday ? today : shiftDateKey(today, -1);
  let streak = 0;

  while (readDays.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  const todaySessions = sessions.filter(
    (session) => dateKey(session.completedAt) === today,
  );

  const totalSeconds = progressAgg._sum.totalSeconds ?? 0;

  return {
    totalSeconds,
    totalMinutes: Math.round(totalSeconds / 60),
    totalChars: progressAgg._sum.totalChars ?? 0,
    booksStarted: progressAgg._count.id,
    booksFinished: finishedCount,
    daysRead: readDays.size,
    streak,
    readToday,
    todayMinutes: Math.round(
      todaySessions.reduce((sum, session) => sum + session.seconds, 0) / 60,
    ),
    sessionCount: sessions.length,
  };
}

export type UserStats = Awaited<ReturnType<typeof getUserStats>>;
