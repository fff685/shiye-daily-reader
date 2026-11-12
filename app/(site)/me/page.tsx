import type { Metadata } from "next";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { PreferenceForm } from "@/components/preference-form";
import { logoutAction } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth";
import { bookSummarySelect } from "@/lib/book-shape";
import { formatCount, formatMinutes } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getUserStats } from "@/lib/stats";
import { parseTags } from "@/lib/tags";

export const metadata: Metadata = {
  title: "我的阅读",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function MePage() {
  const user = await requireUser("/me");

  const [stats, progresses, sessions, imports] = await Promise.all([
    getUserStats(user.id),
    prisma.readingProgress.findMany({
      where: { userId: user.id },
      orderBy: { lastReadAt: "desc" },
      take: 8,
      include: { book: { select: bookSummarySelect } },
    }),
    prisma.readingSession.findMany({
      where: { userId: user.id },
      orderBy: { completedAt: "desc" },
      take: 12,
      include: { book: { select: { id: true, title: true, tags: true } } },
    }),
    prisma.book.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: bookSummarySelect,
    }),
  ]);

  const tagCounts = new Map<string, number>();
  for (const session of sessions) {
    for (const tag of parseTags(session.book.tags)) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const portrait = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxTag = Math.max(1, ...portrait.map(([, count]) => count));

  return (
    <div className="container-page">
      <div className="page-head">
        <p className="eyebrow">YOUR READING LIFE</p>
        <h1>{user.name}，今天也读一点。</h1>
        <p>
          这里保存着你的阅读进度、阅读时间和阅读画像。换一台设备登录，也能从上次的地方继续。
        </p>
      </div>

      <div className="stats-strip" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <span>累计阅读</span>
          <strong>{formatMinutes(stats.totalMinutes)}</strong>
        </div>
        <div className="stat-card">
          <span>连续阅读</span>
          <strong>
            {stats.streak}
            <small>天</small>
          </strong>
        </div>
        <div className="stat-card">
          <span>读完成</span>
          <strong>
            {stats.booksFinished}
            <small>本</small>
          </strong>
        </div>
        <div className="stat-card">
          <span>阅读日</span>
          <strong>
            {stats.daysRead}
            <small>天</small>
          </strong>
        </div>
        <div className="stat-card">
          <span>累计字数</span>
          <strong>
            {formatCount(stats.totalChars)}
            <small>字</small>
          </strong>
        </div>
      </div>

      <div className="profile-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <section className="profile-card card">
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <h2>正在读的书</h2>
                <p>每天的分量已经替你留好，接着上次停下的地方读。</p>
              </div>
              <Link href="/discover" className="section-link">
                添加新书 →
              </Link>
            </div>

            {progresses.length ? (
              <div className="progress-list">
                {progresses.map((progress) => {
                  const percent = Math.min(
                    100,
                    Math.round(
                      (progress.totalChars /
                        Math.max(1, progress.book.charCount ?? 1)) *
                        100,
                    ),
                  );
                  return (
                    <div className="progress-item" key={progress.id}>
                      <BookCover
                        title={progress.book.title}
                        author={progress.book.author}
                        size="sm"
                      />
                      <div style={{ minWidth: 0 }}>
                        <h3>{progress.book.title}</h3>
                        <p>
                          第 {progress.dayIndex + 1} 天 · 每日{" "}
                          {progress.minutesPerSession} 分钟 · 已读{" "}
                          {formatMinutes(Math.round(progress.totalSeconds / 60))}
                        </p>
                        <div className="progress-line">
                          <span style={{ width: `${Math.max(3, percent)}%` }} />
                        </div>
                      </div>
                      <div className="progress-item-side">
                        {percent}%
                        <br />
                        <Link
                          href={
                            progress.status === "finished"
                              ? `/books/${progress.bookId}`
                              : `/read/${progress.bookId}`
                          }
                          style={{ color: "var(--primary-strong)", fontWeight: 600 }}
                        >
                          {progress.status === "finished" ? "再读" : "继续"}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ marginTop: 18 }}>
                <strong>书架还是空的</strong>
                去挑一本，让今天多十五分钟。
                <div style={{ marginTop: 16 }}>
                  <Link href="/discover" className="btn btn-primary">
                    去发现书库
                  </Link>
                </div>
              </div>
            )}
          </section>

          <section className="profile-card card">
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <h2>我的导入</h2>
                <p>私人 TXT 书籍，只有你自己能看到。</p>
              </div>
              <Link href="/import" className="section-link">
                导入新书 →
              </Link>
            </div>
            {imports.length ? (
              <div className="progress-list">
                {imports.map((book) => (
                  <div className="progress-item" key={book.id}>
                    <BookCover
                      title={book.title}
                      author={book.author}
                      size="sm"
                    />
                    <div style={{ minWidth: 0 }}>
                      <h3>{book.title}</h3>
                      <p>{book.author || "佚名"} · 私人书库</p>
                    </div>
                    <div className="progress-item-side">
                      <Link
                        href={`/books/${book.id}`}
                        style={{ color: "var(--primary-strong)", fontWeight: 600 }}
                      >
                        打开
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ marginTop: 18 }}>
                还没有导入的书。可以导入自己拥有的 TXT 电子书。
              </p>
            )}
          </section>

          <section className="profile-card card">
            <h2>最近完成</h2>
            <p>每一次读完，都会留在这里。</p>
            {sessions.length ? (
              <div className="history-list">
                {sessions.map((session) => (
                  <div className="history-item" key={session.id}>
                    <Link href={`/books/${session.book.id}`} style={{ fontWeight: 500 }}>
                      {session.book.title}
                    </Link>
                    <span>
                      {formatDate(session.completedAt)} ·{" "}
                      {Math.max(1, Math.round(session.seconds / 60))} 分钟
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ marginTop: 18 }}>还没有完成的阅读段。今天就可以开始。</p>
            )}
          </section>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <section className="profile-card card">
            <h2>你的阅读画像</h2>
            <p>根据你完成过的阅读段自动形成，会随着阅读慢慢变化。</p>

            {portrait.length ? (
              <div className="portrait-list">
                {portrait.map(([tag, count]) => (
                  <div className="portrait-item" key={tag}>
                    <span>{tag}</span>
                    <div className="portrait-bar">
                      <span style={{ width: `${Math.max(8, (count / maxTag) * 100)}%` }} />
                    </div>
                    <em>{count}</em>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ marginTop: 18, padding: "28px 16px" }}>
                <strong>画像还在等待第一笔</strong>
                读完第一段后，这里会出现你的偏好标签。
              </div>
            )}
          </section>

          <section className="profile-card card">
            <h2>阅读偏好</h2>
            <p>这些设置会用于你下一次开始阅读时。</p>
            <PreferenceForm
              readingMinutes={user.readingMinutes}
              autoContinue={user.autoContinue}
            />
          </section>

          <section className="profile-card card">
            <h2>账号</h2>
            <p>{user.email}</p>
            <form action={logoutAction} style={{ marginTop: 18 }}>
              <button type="submit" className="btn btn-ghost">
                退出登录
              </button>
            </form>
          </section>
        </div>
      </div>

      <div style={{ paddingBottom: 72 }} />
    </div>
  );
}
