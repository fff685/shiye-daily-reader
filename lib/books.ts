import "server-only";
import { prisma } from "@/lib/prisma";
import { fetchBookText } from "@/lib/book-text";

export {
  BookContentError,
  countCjkChars,
  countEnglishWords,
  countNonWhitespace,
  estimateBookMinutes,
  fetchBookText,
  normalizeBookText,
  readingUnits,
} from "@/lib/book-text";

export async function ensureBookContent(book: {
  id: string;
  sourceId: string;
  language: string;
  content: string | null;
}): Promise<string> {
  if (book.content) return book.content;

  const result = await fetchBookText(book.sourceId, book.language);
  await prisma.book.update({
    where: { id: book.id },
    data: {
      content: result.text,
      charCount: result.charCount,
    },
  });

  return result.text;
}
