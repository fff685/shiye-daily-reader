"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { ensureBookContent } from "@/lib/books";
import { getReadingSegment } from "@/lib/reader";
import { pickQuote } from "@/lib/quotes";
import { clamp } from "@/lib/format";

const ALLOWED_MINUTES = [10, 15, 20];

export type CompleteReadingResult =
  | {
      ok: true;
      quote: string;
      dayIndex: number;
      minutes: number;
      chars: number;
      seconds: number;
      progress: number;
      finished: boolean;
      autoContinue: boolean;
      next: {
        text: string;
        minutes: number;
        progress: number;
        isEnd: boolean;
      } | null;
    }
  | { ok: false; error: string };

function quoteSeed(userId: string, dayIndex: number): number {
  let hash = 0;
  const input = `${userId}:${dayIndex}`;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }
  return hash;
}

export async function startReadingAction(formData: FormData): Promise<void> {
  const bookId = String(formData.get("bookId") ?? "");
  const requested = Number(formData.get("minutes") ?? 15);
  const minutes = ALLOWED_MINUTES.includes(requested) ? requested : 15;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/books/${bookId}`)}`);
  }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { id: true, ownerId: true },
  });

  if (!book) redirect("/discover");
  if (book.ownerId && book.ownerId !== user.id) redirect("/discover");

  await prisma.$transaction([
    prisma.readingProgress.upsert({
      where: { userId_bookId: { userId: user.id, bookId } },
      create: {
        userId: user.id,
        bookId,
        minutesPerSession: minutes,
        autoContinue: user.autoContinue,
      },
      update: { minutesPerSession: minutes },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { readingMinutes: minutes },
    }),
  ]);

  redirect(`/read/${bookId}`);
}

export async function completeSegmentAction(input: {
  bookId: string;
  seconds: number;
}): Promise<CompleteReadingResult> {
  const user = await requireUser();
  const bookId = String(input.bookId ?? "");

  const progress = await prisma.readingProgress.findUnique({
    where: { userId_bookId: { userId: user.id, bookId } },
    include: { book: true },
  });

  if (!progress) {
    return { ok: false, error: "还没有开始阅读这本书。" };
  }

  let content = progress.book.content;
  if (!content) {
    try {
      content = await ensureBookContent(progress.book);
    } catch {
      return { ok: false, error: "书源暂时不可用，请稍后再试。" };
    }
  }

  const segment = getReadingSegment(
    content,
    progress.offset,
    progress.minutesPerSession,
    progress.book.language,
  );

  if (!segment.text) {
    await prisma.readingProgress.update({
      where: { id: progress.id },
      data: { status: "finished" },
    });
    return {
      ok: true,
      quote: pickQuote(quoteSeed(user.id, progress.dayIndex)),
      dayIndex: progress.dayIndex,
      minutes: 0,
      chars: 0,
      seconds: 0,
      progress: 1,
      finished: true,
      autoContinue: progress.autoContinue,
      next: null,
    };
  }

  const existing = await prisma.readingSession.findUnique({
    where: {
      progressId_dayIndex: {
        progressId: progress.id,
        dayIndex: progress.dayIndex + 1,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return { ok: false, error: "这一段已经完成了，刷新页面即可继续。" };
  }

  const seconds = clamp(
    Math.round(Number(input.seconds) || 0),
    1,
    progress.minutesPerSession * 60 * 4,
  );
  const chars = segment.text.replace(/\s/g, "").length;
  const nextDayIndex = progress.dayIndex + 1;

  try {
    await prisma.$transaction([
      prisma.readingSession.create({
        data: {
          userId: user.id,
          bookId,
          progressId: progress.id,
          dayIndex: nextDayIndex,
          chars,
          seconds,
        },
      }),
      prisma.readingProgress.update({
        where: { id: progress.id },
        data: {
          offset: segment.end,
          dayIndex: nextDayIndex,
          totalChars: { increment: chars },
          totalSeconds: { increment: seconds },
          status: segment.isEnd ? "finished" : "reading",
          lastReadAt: new Date(),
        },
      }),
    ]);
  } catch {
    return { ok: false, error: "保存进度失败，请再试一次。" };
  }

  const next =
    segment.isEnd || !content
      ? null
      : getReadingSegment(
          content,
          segment.end,
          progress.minutesPerSession,
          progress.book.language,
        );

  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath(`/books/${bookId}`);

  return {
    ok: true,
    quote: pickQuote(quoteSeed(user.id, nextDayIndex)),
    dayIndex: nextDayIndex,
    minutes: segment.minutes,
    chars,
    seconds,
    progress: segment.progress,
    finished: segment.isEnd || !next?.text,
    autoContinue: progress.autoContinue,
    next:
      next && next.text
        ? {
            text: next.text,
            minutes: next.minutes,
            progress: next.progress,
            isEnd: next.isEnd,
          }
        : null,
  };
}

export async function restartBookAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const bookId = String(formData.get("bookId") ?? "");

  const progress = await prisma.readingProgress.findUnique({
    where: { userId_bookId: { userId: user.id, bookId } },
    select: { id: true },
  });

  if (!progress) redirect(`/books/${bookId}`);

  await prisma.$transaction([
    prisma.readingSession.deleteMany({ where: { progressId: progress.id } }),
    prisma.readingProgress.update({
      where: { id: progress.id },
      data: {
        offset: 0,
        dayIndex: 0,
        totalChars: 0,
        totalSeconds: 0,
        status: "reading",
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath(`/books/${bookId}`);
  redirect(`/read/${bookId}`);
}

export async function setAutoContinueAction(
  bookId: string,
  value: boolean,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await prisma.readingProgress.update({
    where: { userId_bookId: { userId: user.id, bookId } },
    data: { autoContinue: Boolean(value) },
  });
  return { ok: true };
}

export type PreferenceState = {
  ok?: boolean;
  message?: string;
};

export async function updatePreferencesAction(
  _prevState: PreferenceState,
  formData: FormData,
): Promise<PreferenceState> {
  const user = await requireUser();
  const requested = Number(formData.get("readingMinutes") ?? 15);
  const readingMinutes = ALLOWED_MINUTES.includes(requested) ? requested : 15;
  const autoContinue = formData.get("autoContinue") === "on";

  await prisma.user.update({
    where: { id: user.id },
    data: { readingMinutes, autoContinue },
  });

  revalidatePath("/me");
  return { ok: true, message: "阅读偏好已保存。" };
}
