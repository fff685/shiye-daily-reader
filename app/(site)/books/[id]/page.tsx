import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCard } from "@/components/book-card";
import { BookCover } from "@/components/book-cover";
import {
  restartBookAction,
  startReadingAction,
} from "@/lib/actions/reading";
import { getCurrentUser } from "@/lib/auth";
import { bookSummarySelect } from "@/lib/book-shape";
import { estimateBookMinutes } from "@/lib/books";
import { formatAuthor, formatLanguage, formatMinutes } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { parseTags } from "@/lib/tags";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const book = await prisma.book.findUnique({
    where: { id },
    select: { title: true, author: true, ownerId: true },
  });
  if (!book) return { title: "未找到书目" };
  if (book.ownerId) {
    return { title: "私人书籍", robots: { index: false, follow: false } };
  }
  return {
    title: book.title,
    description: `${book.title}${book.author ? ` · ${formatAuthor(book.author)}` : ""}，在拾页按每天十几分钟慢慢读完。`,
  };
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const [book, progress] = await Promise.all([
    prisma.book.findUnique({
      where: { id },
      select: bookSummarySelect,
    }),
    user
      ? prisma.readingProgress.findUnique({
          where: { userId_bookId: { userId: user.id, bookId: id } },
          select: {
            offset: true,
            dayIndex: true,
            minutesPerSession: true,
            totalChars: true,
            totalSeconds: true,
            status: true,
          },
        })
      : null,
  ]);

  if (!book) notFound();
  if (book.ownerId && book.ownerId !== user?.id) notFound();

  const tags = parseTags(book.tags);
  const related = tags.length
    ? await prisma.book.findMany({
        where: {
          ownerId: null,
          id: { not: book.id },
          language: book.language,
          OR: tags
            .slice(0, 4)
            .map((tag) => ({ tags: { contains: JSON.stringify(tag) } })),
        },
        select: bookSummarySelect,
        orderBy: [{ popularity: "desc" }, { title: "asc" }],
        take: 4,
      })
    : [];

  const totalMinutes =
    book.charCount && book.charCount > 0
      ? estimateBookMinutes(book.language, book.charCount)
      : null;
  const progressPercent = progress
    ? Math.min(
        100,
        Math.round(
          (progress.totalChars / Math.max(1, book.charCount ?? 1)) * 100,
        ),
      )
    : 0;
  const sourceUrl =
    book.source === "gutenberg"
      ? `https://www.gutenberg.org/ebooks/${book.sourceId}`
      : (book.sourceUrl ?? "#");

  return (
    <div className="container-page">
      <div className="book-detail">
        <div className="book-detail-cover">
          <BookCover title={book.title} author={book.author} size="lg" />
        </div>

        <div>
          <div className="tag-row">
            {tags.map((tag) => (
              <Link
                key={tag}
                href={`/discover?tag=${encodeURIComponent(tag)}`}
                className="tag tag-primary"
              >
                {tag}
              </Link>
            ))}
          </div>
          <h1>{book.title}</h1>
          <p className="book-detail-author">{formatAuthor(book.author)}</p>

          <div className="book-meta">
            <span>{formatLanguage(book.language)}</span>
            {totalMinutes ? <span>全文约 {formatMinutes(totalMinutes)}</span> : null}
            {book.issued ? <span>收录于 {book.issued}</span> : null}
            <span>公版作品</span>
          </div>

          <p className="book-detail-desc">
            {book.description ||
              `《${book.title}》是一部来自 Project Gutenberg 的公版作品。`}
          </p>

          <div className="book-start-card">
            {progress ? (
              <div className="book-progress-box" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                <div className="progress-caption" style={{ marginBottom: 8 }}>
                  <strong style={{ color: "var(--ink-soft)" }}>
                    {progress.status === "finished"
                      ? "已经读完全书"
                      : `读到了第 ${progress.dayIndex + 1} 天`}
                  </strong>
                  <span>{progressPercent}%</span>
                </div>
                <div className="progress-line">
                  <span style={{ width: `${Math.max(3, progressPercent)}%` }} />
                </div>
                <div className="progress-caption">
                  <span>
                    已读 {formatMinutes(Math.round(progress.totalSeconds / 60))} · 每日{" "}
                    {progress.minutesPerSession} 分钟
                  </span>
                  {progress.status === "finished" ? (
                    <form action={restartBookAction}>
                      <input type="hidden" name="bookId" value={book.id} />
                      <button type="submit" className="section-link" style={{ border: 0, background: "transparent" }}>
                        再读一遍 →
                      </button>
                    </form>
                  ) : (
                    <Link href={`/read/${book.id}`} className="section-link">
                      继续阅读 →
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <h3>选择每天愿意读多久</h3>
            )}

            <form
              action={
                progress?.status === "finished"
                  ? restartBookAction
                  : startReadingAction
              }
              style={{ marginTop: progress ? 20 : 0 }}
            >
              <input type="hidden" name="bookId" value={book.id} />
              <div className="pace-options">
                {[10, 15, 20].map((minutes) => (
                  <label className="pace-option" key={minutes}>
                    <input
                      type="radio"
                      name="minutes"
                      value={minutes}
                      defaultChecked={
                        (progress?.minutesPerSession ??
                          user?.readingMinutes ??
                          15) === minutes
                      }
                    />
                    <span>{minutes} 分钟 / 天</span>
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <button type="submit" className="btn btn-primary">
                  {progress
                    ? progress.status === "finished"
                      ? "重新开始"
                      : "继续阅读"
                    : user
                      ? "开始阅读"
                      : "登录后开始阅读"}
                </button>
                {progress ? (
                  <span style={{ color: "var(--muted)", fontSize: 11, alignSelf: "center" }}>
                    修改时长后会从当前进度继续
                  </span>
                ) : null}
              </div>
            </form>
          </div>

          <div className="source-note">
            {book.source === "upload" ? (
              <>私人导入 · 仅自己可见。请确认你拥有这份文件的使用权；内容不会进入公共书库。</>
            ) : (
              <>
                书源：Project Gutenberg · 公版作品。正文在第一次打开时从书源取回并缓存；若遇到取回失败，可以稍后重试，或换一本阅读。
                <br />
                <a href={sourceUrl} target="_blank" rel="noreferrer">
                  查看原始书目 →
                </a>
              </>
            )}
          </div>

          {related.length ? (
            <section style={{ marginTop: 48 }}>
              <div className="section-head">
                <div>
                  <p className="eyebrow">KEEP EXPLORING</p>
                  <h2 style={{ fontSize: 26 }}>相似的书</h2>
                </div>
              </div>
              <div className="similar-grid">
                {related.map((item) => (
                  <BookCard key={item.id} book={item} compact />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
