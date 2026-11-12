import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { BookCard } from "@/components/book-card";
import { prisma } from "@/lib/prisma";
import { bookSummarySelect } from "@/lib/book-shape";
import { TAG_OPTIONS } from "@/lib/tags";

export const metadata: Metadata = {
  title: "发现书库",
};

const PAGE_SIZE = 24;

type SearchParams = {
  q?: string;
  tag?: string;
  lang?: string;
  page?: string;
  sort?: string;
};

function buildHref(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const text = query.toString();
  return text ? `/discover?${text}` : "/discover";
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 80);
  const tag = (params.tag ?? "").trim().slice(0, 30);
  const lang = params.lang === "zh" || params.lang === "en" ? params.lang : "";
  const sort = params.sort === "recent" ? "recent" : params.sort === "title" ? "title" : "popular";
  const requestedPage = Math.max(1, Number(params.page ?? "1") || 1);

  const where: Prisma.BookWhereInput = {
    ownerId: null,
    AND: [
      q
        ? {
            OR: [
              { title: { contains: q } },
              { author: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {},
      tag ? { tags: { contains: JSON.stringify(tag) } } : {},
      lang ? { language: lang } : {},
    ],
  };

  const orderBy: Prisma.BookOrderByWithRelationInput[] =
    sort === "recent"
      ? [{ createdAt: "desc" }, { title: "asc" }]
      : sort === "title"
        ? [{ title: "asc" }]
        : [{ popularity: "desc" }, { title: "asc" }];

  const total = await prisma.book.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const books = await prisma.book.findMany({
    where,
    select: bookSummarySelect,
    orderBy,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const visibleTags = Array.from(
    new Set([tag, ...TAG_OPTIONS.slice(0, 20)].filter(Boolean)),
  );

  return (
    <div className="container-page">
      <div className="page-head">
        <p className="eyebrow">THE LIBRARY</p>
        <h1>找到下一本想读的书</h1>
        <p>
          60,000 多本英文公版书与 400 多本中文公版书。可以按书名、作者搜索，也可以顺着标签慢慢逛。
        </p>
      </div>

      <form className="search-bar" action="/discover" method="get">
        {tag ? <input type="hidden" name="tag" value={tag} /> : null}
        {lang ? <input type="hidden" name="lang" value={lang} /> : null}
        {sort !== "popular" ? (
          <input type="hidden" name="sort" value={sort} />
        ) : null}
        <input
          className="input"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="搜索书名、作者或主题…"
          aria-label="搜索书库"
        />
        <button type="submit" className="btn btn-primary">
          搜索
        </button>
      </form>

      <div className="filters">
        <Link
          href={buildHref({ q, lang, sort })}
          className="tag"
          data-active={!tag}
        >
          全部主题
        </Link>
        {visibleTags.map((item) => (
          <Link
            key={item}
            href={buildHref({ q, tag: item, lang, sort })}
            className="tag"
            data-active={tag === item}
          >
            {item}
          </Link>
        ))}
      </div>

      <div className="filters" style={{ marginTop: 10 }}>
        <span className="tag" style={{ background: "transparent", border: 0 }}>
          语言
        </span>
        {[
          { value: "", label: "全部" },
          { value: "zh", label: "中文" },
          { value: "en", label: "英文" },
        ].map((item) => (
          <Link
            key={item.value}
            href={buildHref({ q, tag, lang: item.value, sort })}
            className="tag"
            data-active={lang === item.value}
          >
            {item.label}
          </Link>
        ))}
        <span style={{ width: 8 }} />
        <span className="tag" style={{ background: "transparent", border: 0 }}>
          排序
        </span>
        {[
          { value: "popular", label: "热门" },
          { value: "recent", label: "新收录" },
          { value: "title", label: "书名" },
        ].map((item) => (
          <Link
            key={item.value}
            href={buildHref({ q, tag, lang, sort: item.value })}
            className="tag"
            data-active={sort === item.value}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="results-meta">
        <span>
          共 <strong style={{ color: "var(--ink-soft)" }}>{total.toLocaleString("zh-CN")}</strong> 本
          {q ? ` · 搜索“${q}”` : ""}
          {tag ? ` · ${tag}` : ""}
        </span>
        <span>
          第 {page} / {totalPages} 页
        </span>
      </div>

      {books.length ? (
        <div className="book-grid book-grid-four">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>没有找到匹配的书</strong>
          换一个关键词，或清空筛选条件再试试。
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="pagination" aria-label="分页">
          {page > 1 ? (
            <Link
              href={buildHref({
                q,
                tag,
                lang,
                sort: sort === "popular" ? undefined : sort,
                page: String(page - 1),
              })}
            >
              上一页
            </Link>
          ) : null}
          {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            return start + index;
          })
            .filter((item) => item >= 1 && item <= totalPages)
            .map((item) => (
              <Link
                key={item}
                href={buildHref({
                  q,
                  tag,
                  lang,
                  sort: sort === "popular" ? undefined : sort,
                  page: item === 1 ? undefined : String(item),
                })}
                data-current={item === page}
                style={
                  item === page
                    ? {
                        color: "#fff",
                        borderColor: "var(--primary)",
                        background: "var(--primary)",
                      }
                    : undefined
                }
              >
                {item}
              </Link>
            ))}
          {page < totalPages ? (
            <Link
              href={buildHref({
                q,
                tag,
                lang,
                sort: sort === "popular" ? undefined : sort,
                page: String(page + 1),
              })}
            >
              下一页
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
