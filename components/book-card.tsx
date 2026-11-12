import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { formatAuthor } from "@/lib/format";
import { parseTags } from "@/lib/tags";
import type { BookSummary } from "@/lib/book-shape";

export function BookCard({
  book,
  reason,
  compact = false,
}: {
  book: BookSummary;
  reason?: string;
  compact?: boolean;
}) {
  const tags = parseTags(book.tags).slice(0, compact ? 2 : 3);

  return (
    <Link href={`/books/${book.id}`} className="book-card card-hover">
      <BookCover
        title={book.title}
        author={book.author}
        size={compact ? "sm" : "md"}
      />
      <div className="book-card-body">
        <h3>{book.title}</h3>
        <p className="book-card-author">{formatAuthor(book.author)}</p>
        <div className="tag-row">
          {tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        {reason ? <p className="book-card-reason">{reason}</p> : null}
      </div>
    </Link>
  );
}
