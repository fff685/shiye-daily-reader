import { createScriptPrismaClient } from "./prisma-client";
import { getReadingSegment, splitSegmentIntoParagraphs } from "../lib/reader";
import { translateParagraphs } from "../lib/translate";

try {
  process.loadEnvFile(".env");
} catch {
  // Environment variables may already be provided by the shell / host.
}

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, value = "true"] = argument.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const minutes = Number(args.get("minutes") ?? "15") || 15;
const limit = Number(args.get("limit") ?? "5") || 5;
const bookId = args.get("book");

const prisma = createScriptPrismaClient();

async function main() {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("需要先设置 DEEPSEEK_API_KEY");
  }

  const books = await prisma.book.findMany({
    where: {
      ownerId: null,
      language: "en",
      content: { not: null },
      ...(bookId ? { id: bookId } : {}),
    },
    orderBy: { popularity: "desc" },
    take: bookId ? 1 : limit,
    select: { id: true, title: true, content: true },
  });

  for (const book of books) {
    if (!book.content) continue;
    let offset = 0;
    let day = 0;
    console.log(`\nTranslating ${book.title} at ${minutes} min/day…`);

    while (offset < book.content.length) {
      const segment = getReadingSegment(
        book.content,
        offset,
        minutes,
        "en",
      );
      if (!segment.text) break;
      day += 1;

      const existing = await prisma.translation.findUnique({
        where: {
          bookId_startOffset_endOffset_targetLang: {
            bookId: book.id,
            startOffset: segment.start,
            endOffset: segment.end,
            targetLang: "zh",
          },
        },
        select: { id: true },
      });

      if (existing) {
        console.log(`  day ${day}: cached`);
      } else {
        const paragraphs = splitSegmentIntoParagraphs(segment.text);
        const translated = await translateParagraphs(paragraphs, book.title);
        await prisma.translation.create({
          data: {
            bookId: book.id,
            startOffset: segment.start,
            endOffset: segment.end,
            targetLang: "zh",
            paragraphs: JSON.stringify(translated),
          },
        });
        console.log(`  day ${day}: translated ${paragraphs.length} paragraphs`);
      }

      offset = segment.end;
      if (segment.isEnd) break;
    }

    console.log(`Finished ${book.title}: ${day} days`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
