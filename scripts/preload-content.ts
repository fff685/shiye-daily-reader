import { createScriptPrismaClient } from "./prisma-client";
import { fetchBookText } from "../lib/book-text";

try {
  process.loadEnvFile(".env");
} catch {
  // Environment variables may already be provided by the shell / host.
}

const prisma = createScriptPrismaClient();

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, value = "true"] = argument.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const limit = Math.max(1, Number(args.get("limit") ?? "24") || 24);
const delayMs = Math.max(0, Number(args.get("delay") ?? "350") || 350);

async function preload() {
  const half = Math.ceil(limit / 2);
  const [chinese, english] = await Promise.all([
    prisma.book.findMany({
      where: { language: "zh", content: null },
      orderBy: { popularity: "desc" },
      take: half,
      select: { id: true, title: true, sourceId: true, language: true },
    }),
    prisma.book.findMany({
      where: { language: "en", content: null },
      orderBy: { popularity: "desc" },
      take: limit - half,
      select: { id: true, title: true, sourceId: true, language: true },
    }),
  ]);

  const books = [...chinese, ...english];
  console.log(`Preloading ${books.length} books…`);

  let done = 0;
  let failed = 0;

  for (const book of books) {
    try {
      const result = await fetchBookText(book.sourceId, book.language);
      await prisma.book.update({
        where: { id: book.id },
        data: {
          content: result.text,
          charCount: result.charCount,
        },
      });
      done += 1;
      console.log(
        `[${done + failed}/${books.length}] ${book.title} — ${result.charCount.toLocaleString()} chars`,
      );
    } catch (error) {
      failed += 1;
      console.warn(
        `[skip] ${book.title}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (delayMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log(`Preload complete. ${done} succeeded, ${failed} skipped.`);
}

preload()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
