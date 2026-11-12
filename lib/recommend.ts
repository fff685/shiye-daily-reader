import "server-only";
import { prisma } from "@/lib/prisma";
import { parseTags } from "@/lib/tags";
import { bookSummarySelect, type BookSummary } from "@/lib/book-shape";

export type Recommendation = {
  book: BookSummary;
  reason: string;
};

export async function getPopularBooks(
  limit = 6,
  excludeIds: string[] = [],
): Promise<BookSummary[]> {
  return prisma.book.findMany({
    where: {
      popularity: { gt: 0 },
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
    },
    select: bookSummarySelect,
    orderBy: [{ popularity: "desc" }, { title: "asc" }],
    take: limit,
  });
}

export async function getRecommendations(
  userId: string | undefined,
  limit = 6,
): Promise<Recommendation[]> {
  if (!userId) {
    const books = await getPopularBooks(limit);
    return books.map((book) => ({
      book,
      reason: "很多人正在读",
    }));
  }

  const recentSessions = await prisma.readingSession.findMany({
    where: { userId },
    include: { book: { select: { id: true, tags: true } } },
    orderBy: { completedAt: "desc" },
    take: 30,
  });

  if (!recentSessions.length) {
    const books = await getPopularBooks(limit);
    return books.map((book) => ({
      book,
      reason: "从高人气作品开始",
    }));
  }

  const tagScores = new Map<string, number>();
  const readIds = new Set<string>();

  for (const session of recentSessions) {
    readIds.add(session.book.id);
    const weight = 1 + Math.min(2, session.chars / 5000);
    for (const tag of parseTags(session.book.tags)) {
      tagScores.set(tag, (tagScores.get(tag) ?? 0) + weight);
    }
  }

  const topTags = Array.from(tagScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag);

  const candidates = await prisma.book.findMany({
    where: {
      id: { notIn: Array.from(readIds) },
      ...(topTags.length
        ? {
            OR: topTags.map((tag) => ({
              tags: { contains: JSON.stringify(tag) },
            })),
          }
        : {}),
    },
    select: bookSummarySelect,
    orderBy: [{ popularity: "desc" }, { title: "asc" }],
    take: topTags.length ? 180 : 18,
  });

  const scored = candidates
    .map((book) => {
      const bookTags = parseTags(book.tags);
      const overlap = bookTags.filter((tag) => topTags.includes(tag));
      const score =
        overlap.length * 1000 +
        topTags.reduce(
          (sum, tag) =>
            sum + (bookTags.includes(tag) ? (tagScores.get(tag) ?? 0) : 0),
          0,
        ) *
          2 +
        book.popularity / 100;
      return { book, score, overlap };
    })
    .sort((a, b) => b.score - a.score);

  const picked: Recommendation[] = [];
  const pickedIds = new Set<string>();

  for (const item of scored) {
    if (picked.length >= limit) break;
    if (pickedIds.has(item.book.id)) continue;
    pickedIds.add(item.book.id);
    picked.push({
      book: item.book,
      reason: item.overlap[0]
        ? `因为你读过「${item.overlap[0]}」类作品`
        : "延续你的阅读偏好",
    });
  }

  if (picked.length < limit) {
    const fill = await getPopularBooks(limit - picked.length, [
      ...readIds,
      ...pickedIds,
    ]);
    for (const book of fill) {
      picked.push({ book, reason: "换一种口味也不错" });
    }
  }

  return picked;
}

export { parseTags };
