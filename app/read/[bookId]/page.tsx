import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Reader } from "@/components/reader";
import { requireUser } from "@/lib/auth";
import { ensureBookContent } from "@/lib/books";
import { prisma } from "@/lib/prisma";
import { getReadingSegment } from "@/lib/reader";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "阅读",
};

export default async function ReadPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const user = await requireUser(`/read/${bookId}`);

  const progress = await prisma.readingProgress.findUnique({
    where: { userId_bookId: { userId: user.id, bookId } },
    include: { book: true },
  });

  if (!progress) redirect(`/books/${bookId}`);
  if (progress.book.ownerId && progress.book.ownerId !== user.id) notFound();

  let content = progress.book.content;
  if (!content) {
    try {
      content = await ensureBookContent(progress.book);
    } catch (error) {
      return (
        <main className="reader-shell">
          <div className="reader-error">
            <p className="eyebrow">SOURCE UNAVAILABLE</p>
            <h1>这一页暂时没有取回来</h1>
            <p>
              {error instanceof Error
                ? error.message
                : "书源暂时不可用，请稍后再试。"}
            </p>
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "center",
                marginTop: 24,
              }}
            >
              <Link href={`/books/${bookId}`} className="btn btn-ghost">
                回到书目
              </Link>
              <Link href={`/read/${bookId}`} className="btn btn-primary">
                再试一次
              </Link>
            </div>
          </div>
        </main>
      );
    }
  }

  const segment = getReadingSegment(
    content,
    progress.offset,
    progress.minutesPerSession,
    progress.book.language,
  );

  const cachedTranslation =
    progress.book.language === "en" && segment.text
      ? await prisma.translation.findUnique({
          where: {
            bookId_startOffset_endOffset_targetLang: {
              bookId,
              startOffset: segment.start,
              endOffset: segment.end,
              targetLang: "zh",
            },
          },
          select: { paragraphs: true },
        })
      : null;

  let initialTranslation: string[] | null = null;
  if (cachedTranslation) {
    try {
      const parsed = JSON.parse(cachedTranslation.paragraphs) as unknown;
      if (Array.isArray(parsed)) {
        initialTranslation = parsed.filter(
          (item): item is string => typeof item === "string",
        );
      }
    } catch {
      initialTranslation = null;
    }
  }

  return (
    <Reader
      bookId={bookId}
      title={progress.book.title}
      author={progress.book.author}
      language={progress.book.language}
      dayIndex={progress.dayIndex + 1}
      minutes={progress.minutesPerSession}
      autoContinue={progress.autoContinue}
      initialTranslation={initialTranslation}
      initialSegment={{
        text: segment.text,
        minutes: segment.minutes,
        progress: segment.progress,
        isEnd: segment.isEnd,
      }}
    />
  );
}
