import { formatAuthor } from "@/lib/format";

const PALETTES = [
  { bg: "linear-gradient(150deg, #173f9e 0%, #2c63df 58%, #4c7eea 100%)" },
  { bg: "linear-gradient(150deg, #0e4f78 0%, #1d6e9d 60%, #4e98bd 100%)" },
  { bg: "linear-gradient(150deg, #253b7d 0%, #4059a9 58%, #7186c4 100%)" },
  { bg: "linear-gradient(150deg, #1d3557 0%, #315c82 58%, #6c94b3 100%)" },
  { bg: "linear-gradient(150deg, #304c89 0%, #5477b8 58%, #8aa6d3 100%)" },
  { bg: "linear-gradient(150deg, #153b63 0%, #2a5b86 56%, #5f8eaf 100%)" },
  { bg: "linear-gradient(150deg, #3a3f7d 0%, #5c63a9 58%, #8d92c8 100%)" },
  { bg: "linear-gradient(150deg, #0d4966 0%, #1b6b86 58%, #5a9caf 100%)" },
];

function hashText(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function BookCover({
  title,
  author,
  size = "md",
}: {
  title: string;
  author: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const palette = PALETTES[hashText(title) % PALETTES.length];
  const className = [
    "book-cover",
    size === "sm" ? "book-cover-sm" : "",
    size === "lg" ? "book-cover-lg" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} style={{ background: palette.bg }} aria-hidden>
      <div className="book-cover-inner">
        <span className="book-cover-kicker">SHIYE · PUBLIC DOMAIN</span>
        <span className="book-cover-title">{title}</span>
        <span className="book-cover-author">{formatAuthor(author)}</span>
      </div>
    </div>
  );
}
