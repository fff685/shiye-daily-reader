import type { Prisma } from "@prisma/client";

export const bookSummarySelect = {
  id: true,
  source: true,
  sourceId: true,
  title: true,
  author: true,
  language: true,
  description: true,
  subjects: true,
  tags: true,
  popularity: true,
  charCount: true,
  issued: true,
  sourceUrl: true,
  createdAt: true,
} satisfies Prisma.BookSelect;

export type BookSummary = Prisma.BookGetPayload<{
  select: typeof bookSummarySelect;
}>;
