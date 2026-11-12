"use server";

import { requireUser } from "@/lib/auth";
import { ensureBookContent } from "@/lib/books";
import { prisma } from "@/lib/prisma";
import { getReadingSegment, splitSegmentIntoParagraphs } from "@/lib/reader";
import {
  translateParagraphs,
  TranslationUnavailableError,
} from "@/lib/translate";

export type TranslationResult =
  | { ok: true; paragraphs: string[]; cached: boolean }
  | { ok: false; error: string };

export async function translateSegmentAction(input: {
  bookId: string;
}): Promise<TranslationResult> {
  const user = await requireUser();
  const bookId = String(input.bookId ?? "");

  const progress = await prisma.readingProgress.findUnique({
    where: { userId_bookId: { userId: user.id, bookId } },
    include: { book: true },
  });

  if (!progress) {
    return { ok: false, error: "还没有开始阅读这本书。" };
  }
  if (progress.book.ownerId && progress.book.ownerId !== user.id) {
    return { ok: false, error: "没有权限翻译这本书。" };
  }
  if (progress.book.language !== "en") {
    return { ok: false, error: "只有英文书需要生成中文翻译。" };
  }

  let content = progress.book.content;
  if (!content) {
    try {
      content = await ensureBookContent(progress.book);
    } catch {
      return { ok: false, error: "正文暂时不可用，请稍后再试。" };
    }
  }

  const segment = getReadingSegment(
    content,
    progress.offset,
    progress.minutesPerSession,
    progress.book.language,
  );

  if (!segment.text) {
    return { ok: false, error: "当前没有可翻译的正文。" };
  }

  const cached = await prisma.translation.findUnique({
    where: {
      bookId_startOffset_endOffset_targetLang: {
        bookId,
        startOffset: segment.start,
        endOffset: segment.end,
        targetLang: "zh",
      },
    },
    select: { paragraphs: true },
  });

  if (cached) {
    try {
      const paragraphs = JSON.parse(cached.paragraphs) as unknown;
      if (Array.isArray(paragraphs)) {
        return {
          ok: true,
          paragraphs: paragraphs.filter(
            (item): item is string => typeof item === "string",
          ),
          cached: true,
        };
      }
    } catch {
      // Fall through and regenerate if the cached payload is malformed.
    }
  }

  const paragraphs = splitSegmentIntoParagraphs(segment.text);

  try {
    const translated = await translateParagraphs(
      paragraphs,
      progress.book.title,
    );

    await prisma.translation.upsert({
      where: {
        bookId_startOffset_endOffset_targetLang: {
          bookId,
          startOffset: segment.start,
          endOffset: segment.end,
          targetLang: "zh",
        },
      },
      create: {
        bookId,
        startOffset: segment.start,
        endOffset: segment.end,
        targetLang: "zh",
        paragraphs: JSON.stringify(translated),
      },
      update: { paragraphs: JSON.stringify(translated) },
    });

    return { ok: true, paragraphs: translated, cached: false };
  } catch (error) {
    if (error instanceof TranslationUnavailableError) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "翻译暂时没有成功，请稍后再试。" };
  }
}
