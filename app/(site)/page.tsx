import Link from "next/link";
import { BookCard } from "@/components/book-card";
import { BookCover } from "@/components/book-cover";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserStats } from "@/lib/stats";
import { getPopularBooks, getRecommendations } from "@/lib/recommend";
import { bookSummarySelect } from "@/lib/book-shape";
import {
  formatAuthor,
  formatCount,
  formatMinutes,
} from "@/lib/format";
import { parseTags } from "@/lib/tags";
import { TAG_OPTIONS } from "@/lib/tags";

export default async function HomePage() {
  const user = await getCurrentUser();

  const [
    latestProgress,
    stats,
    recommendations,
    popular,
    chineseClassics,
    modernChinese,
  ] = await Promise.all([
      user
        ? prisma.readingProgress.findFirst({
            where: { userId: user.id, status: "reading" },
            orderBy: { lastReadAt: "desc" },
            include: { book: { select: bookSummarySelect } },
          })
        : null,
      user ? getUserStats(user.id) : null,
      getRecommendations(user?.id, 6),
      getPopularBooks(5),
      prisma.book.findMany({
        where: { ownerId: null, language: "zh", popularity: { gt: 0 } },
        select: bookSummarySelect,
        orderBy: [{ popularity: "desc" }, { title: "asc" }],
        take: 5,
      }),
      prisma.book.findMany({
        where: {
          ownerId: null,
          language: "zh",
          tags: { contains: '"现代文学"' },
        },
        select: bookSummarySelect,
        orderBy: [{ popularity: "desc" }, { title: "asc" }],
        take: 5,
      }),
    ]);

  const featured = recommendations[0]?.book ?? popular[0];
  const progressPercent = latestProgress
    ? Math.min(
        100,
        Math.round(
          (latestProgress.totalChars /
            Math.max(1, latestProgress.book.charCount ?? 1)) *
            100,
        ),
      )
    : 0;

  return (
    <>
      <div className="container-page">
        <section className="hero">
          <div>
            <p className="eyebrow">
              {user ? `WELCOME BACK, ${user.name}` : "DAILY READING · 15 MINUTES"}
            </p>
            <h1>
              每天十几分钟，
              <br />
              把一本书<em>读进生活</em>。
            </h1>
            <p className="hero-lead">
              拾页会把一本书拆成刚刚好的每日份量。读完今天的部分，会有一句只属于此刻的鼓励；如果还想继续，下一段也已经在等你。
            </p>
            <div className="hero-actions">
              <Link
                href={latestProgress ? `/read/${latestProgress.bookId}` : "/discover"}
                className="btn btn-primary"
              >
                {latestProgress ? "继续今天的阅读" : "选一本书开始"}
              </Link>
              <Link href="/discover" className="btn btn-ghost">
                逛逛书库
              </Link>
            </div>
            <div className="hero-meta">
              {stats ? (
                <>
                  <div className="hero-meta-item">
                    <strong>{stats.streak}</strong>
                    <span>连续阅读天数</span>
                  </div>
                  <div className="hero-meta-item">
                    <strong>{formatMinutes(stats.totalMinutes)}</strong>
                    <span>累计阅读时长</span>
                  </div>
                  <div className="hero-meta-item">
                    <strong>{stats.booksFinished}</strong>
                    <span>读完成的书</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="hero-meta-item">
                    <strong>60,000+</strong>
                    <span>英文公版书</span>
                  </div>
                  <div className="hero-meta-item">
                    <strong>400+</strong>
                    <span>中文公版书</span>
                  </div>
                  <div className="hero-meta-item">
                    <strong>10–20</strong>
                    <span>分钟 / 每日份量</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <aside className="hero-panel">
            <div className="hero-panel-top">
              <span>{latestProgress ? "正在阅读" : "今日开始"}</span>
              <strong>{latestProgress ? `第 ${latestProgress.dayIndex + 1} 天` : "15 MIN"}</strong>
            </div>

            {latestProgress ? (
              <>
                <div className="continue-book">
                  <BookCover
                    title={latestProgress.book.title}
                    author={latestProgress.book.author}
                    size="sm"
                  />
                  <div>
                    <h3>{latestProgress.book.title}</h3>
                    <p>{formatAuthor(latestProgress.book.author)}</p>
                    <div className="tag-row" style={{ marginTop: 8 }}>
                      {parseTags(latestProgress.book.tags)
                        .slice(0, 2)
                        .map((tag) => (
                          <span className="tag tag-primary" key={tag}>
                            {tag}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="hero-progress">
                  <span style={{ width: `${Math.max(4, progressPercent)}%` }} />
                </div>
                <div className="hero-panel-foot">
                  <span>已完成 {progressPercent}% · 每日 {latestProgress.minutesPerSession} 分钟</span>
                  <Link href={`/read/${latestProgress.bookId}`} className="btn btn-primary">
                    继续阅读
                  </Link>
                </div>
              </>
            ) : featured ? (
              <>
                <div className="continue-book">
                  <BookCover
                    title={featured.title}
                    author={featured.author}
                    size="sm"
                  />
                  <div>
                    <h3>{featured.title}</h3>
                    <p>{recommendations[0]?.reason ?? "很多人正在读"}</p>
                    <div className="tag-row" style={{ marginTop: 8 }}>
                      {parseTags(featured.tags)
                        .slice(0, 2)
                        .map((tag) => (
                          <span className="tag tag-primary" key={tag}>
                            {tag}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="hero-panel-foot">
                  <span>从公版经典开始，读多久由你决定</span>
                  <Link href={`/books/${featured.id}`} className="btn btn-primary">
                    看看这本
                  </Link>
                </div>
              </>
            ) : (
              <div className="quote-card" style={{ padding: 0 }}>
                <blockquote>“一天一页，时间会替你把它变成一座书房。”</blockquote>
                <footer>拾页 · 每日阅读</footer>
              </div>
            )}
          </aside>
        </section>

        {stats ? (
          <div className="stats-strip">
            <div className="stat-card">
              <span>今日阅读</span>
              <strong>
                {stats.todayMinutes}
                <small>分钟</small>
              </strong>
            </div>
            <div className="stat-card">
              <span>累计阅读</span>
              <strong>
                {formatMinutes(stats.totalMinutes)}
              </strong>
            </div>
            <div className="stat-card">
              <span>连续天数</span>
              <strong>
                {stats.streak}
                <small>天</small>
              </strong>
            </div>
            <div className="stat-card">
              <span>读过的书</span>
              <strong>
                {stats.booksStarted}
                <small>本</small>
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
        ) : null}

        <section className="section">
          <div className="section-head">
            <div>
              <p className="eyebrow">
                {user ? "MADE FOR YOUR TASTE" : "START WITH THE CLASSICS"}
              </p>
              <h2>{user ? "为你推荐" : "从高人气作品开始"}</h2>
              <p>
                {user
                  ? "根据你读过的书和偏好的标签，为你挑出下一本。"
                  : "第一次来，先从大家都在读的公版经典里挑一本。"}
              </p>
            </div>
            <Link href="/discover" className="section-link">
              查看全部 →
            </Link>
          </div>
          <div className="book-grid">
            {recommendations.map(({ book, reason }) => (
              <BookCard key={book.id} book={book} reason={reason} />
            ))}
          </div>
        </section>

        <section className="section-tight">
          <div className="section-head">
            <div>
              <p className="eyebrow">FIND BY MOOD</p>
              <h2>按一点心情，找一本书</h2>
            </div>
          </div>
          <div className="tag-cloud">
            {TAG_OPTIONS.slice(0, 12).map((tag) => (
              <Link
                key={tag}
                href={`/discover?tag=${encodeURIComponent(tag)}`}
              >
                {tag}
                <span>→</span>
              </Link>
            ))}
          </div>
        </section>

        {chineseClassics.length ? (
          <section className="section">
            <div className="section-head">
              <div>
                <p className="eyebrow">CHINESE CLASSICS</p>
                <h2>从熟悉的文字开始</h2>
                <p>红楼梦、西游记、三国演义……这些书，值得用十五分钟重新读一遍。</p>
              </div>
              <Link href="/discover?lang=zh" className="section-link">
                更多中文书 →
              </Link>
            </div>
            <div className="book-grid book-grid-five">
              {chineseClassics.map((book) => (
                <BookCard key={book.id} book={book} compact />
              ))}
            </div>
          </section>
        ) : null}

        {modernChinese.length ? (
          <section className="section">
            <div className="section-head">
              <div>
                <p className="eyebrow">MODERN CHINESE</p>
                <h2>近现代中文作品</h2>
                <p>鲁迅的呐喊、彷徨、野草、朝花夕拾……在短篇里重新听见那个时代。</p>
              </div>
              <Link
                href="/discover?tag=%E7%8E%B0%E4%BB%A3%E6%96%87%E5%AD%A6"
                className="section-link"
              >
                更多近现代 →
              </Link>
            </div>
            <div className="book-grid book-grid-five">
              {modernChinese.map((book) => (
                <BookCard key={book.id} book={book} compact />
              ))}
            </div>
          </section>
        ) : null}

        {user && popular.length ? (
          <section className="section">
            <div className="section-head">
              <div>
                <p className="eyebrow">POPULAR ON THE SHELF</p>
                <h2>书架上被翻开得最多</h2>
                <p>来自 Project Gutenberg 的公版作品，下载量长期靠前。</p>
              </div>
              <Link href="/discover?sort=popular" className="section-link">
                更多热门 →
              </Link>
            </div>
            <div className="book-grid book-grid-five">
              {popular.map((book) => (
                <BookCard key={book.id} book={book} compact />
              ))}
            </div>
          </section>
        ) : null}

        <section className="section-tight" style={{ paddingBottom: 72 }}>
          <div className="cta-band">
            <div>
              <h2>今晚，留十五分钟给自己。</h2>
              <p>不必读完一整本，只要把今天这一页读完。</p>
            </div>
            <Link href={user ? "/discover" : "/register"} className="btn btn-primary">
              {user ? "去选下一本" : "创建我的阅读账号"}
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
