import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { createScriptPrismaClient } from "./prisma-client";
import { buildDescription, serializeTags, tagsFromMetadata } from "../lib/tags";
import { formatAuthor } from "../lib/format";
import { toSimplified } from "../lib/chinese";

try {
  process.loadEnvFile(".env");
} catch {
  // Environment variables may already be provided by the shell / host.
}

const prisma = createScriptPrismaClient();
const cacheDir = path.join(process.cwd(), ".cache");
const catalogPath = path.join(cacheDir, "pg_catalog.csv");

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, value = "true"] = argument.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const limit = Number(args.get("limit") ?? "0") || 0;
const clear = args.get("clear") === "true";
const languageFilter = args.get("language") ?? "";
const batchSize = 500;

type CatalogRow = {
  "Text#": string;
  Type: string;
  Issued: string;
  Title: string;
  Language: string;
  Authors: string;
  Subjects: string;
  Bookshelves: string;
};

async function download(url: string, destination: string) {
  console.log(`Downloading ${url}`);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(180000),
    headers: { "user-agent": "ShiyeReader/0.1 book importer" },
  });
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

async function ensureCatalog() {
  await mkdir(cacheDir, { recursive: true });
  if (!existsSync(catalogPath)) {
    await download(
      "https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv",
      catalogPath,
    );
  }
  return readFile(catalogPath, "utf8");
}

async function fetchDownloadRanks(): Promise<Map<string, number>> {
  const ranks = new Map<string, number>();
  console.log("Fetching Gutenberg download ranking…");

  for (let page = 0; page < 10; page += 1) {
    const start = page * 32 + 1;
    const url = `https://www.gutenberg.org/ebooks/search.opds/?sort_order=downloads&start_index=${start}`;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000),
        headers: { "user-agent": "ShiyeReader/0.1 book importer" },
      });
      if (!response.ok) break;
      const xml = await response.text();
      const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g));
      if (!entries.length) break;

      for (const [, entry] of entries) {
        const id = entry.match(
          /<id>https:\/\/www\.gutenberg\.org\/ebooks\/(\d+)\.opds<\/id>/,
        )?.[1];
        if (id && !ranks.has(id)) ranks.set(id, ranks.size + 1);
      }

      if (entries.length < 20) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch {
      break;
    }
  }

  console.log(`Ranked ${ranks.size} popular books.`);
  return ranks;
}

function popularityFor(
  sourceId: string,
  curatedPopularity: number | undefined,
  ranks: Map<string, number>,
): number {
  if (curatedPopularity) return curatedPopularity;
  const rank = ranks.get(sourceId);
  if (!rank) return 0;
  return Math.max(1, 10000 - rank * 5);
}

async function main() {
  const csv = await ensureCatalog();
  const ranks = await fetchDownloadRanks();

  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as CatalogRow[];

  const seen = new Set<string>();
  const books = rows
    .filter((row) => {
      if (row.Type !== "Text") return false;
      if (!row["Text#"] || !row.Title) return false;
      if (row.Language !== "en" && row.Language !== "zh") return false;
      if (languageFilter && row.Language !== languageFilter) return false;
      return true;
    })
    .map((row) => {
      const sourceId = row["Text#"];
      const displayTitle = row.Language === "zh" ? toSimplified(row.Title.trim()) : row.Title.trim();
      const formattedAuthor = formatAuthor(row.Authors || null);
      const meta = tagsFromMetadata({
        title: displayTitle,
        language: row.Language,
        subjects: row.Subjects,
        bookshelves: row.Bookshelves,
      });
      const tags = serializeTags(meta.tags);
      const popularity = popularityFor(sourceId, meta.popularity, ranks);

      return {
        id: `gutenberg-${sourceId}`,
        source: "gutenberg",
        sourceId,
        title: displayTitle,
        author: formattedAuthor,
        language: row.Language,
        description: buildDescription({
          title: displayTitle,
          author: formattedAuthor,
          tags: meta.tags,
          language: row.Language,
        }),
        subjects: (row.Subjects ?? "").slice(0, 4000),
        tags,
        popularity,
        issued: row.Issued || null,
        sourceUrl: `https://www.gutenberg.org/ebooks/${sourceId}`,
      };
    })
    .filter((book) => {
      if (seen.has(book.id)) return false;
      seen.add(book.id);
      return true;
    })
    .sort((a, b) => b.popularity - a.popularity || a.title.localeCompare(b.title));

  const seenTitles = new Set<string>();
  const uniqueBooks = books.filter((book) => {
    const key = `${book.title.toLowerCase()}|${book.author.toLowerCase()}`;
    if (seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });

  const selected = limit > 0 ? uniqueBooks.slice(0, limit) : uniqueBooks;

  console.log(
    `Prepared ${selected.length.toLocaleString()} books (${uniqueBooks.length.toLocaleString()} unique, ${books.length.toLocaleString()} catalog rows).`,
  );

  if (clear) {
    console.log("Clearing existing books and cascade-linked reading data…");
    await prisma.book.deleteMany();
  }

  const isSqlite = (process.env.DATABASE_URL ?? "").startsWith("file:");
  let inserted = 0;

  for (let index = 0; index < selected.length; index += batchSize) {
    const batch = selected.slice(index, index + batchSize);
    const createMany = prisma.book.createMany as unknown as (args: {
      data: typeof batch;
      skipDuplicates?: boolean;
    }) => Promise<unknown>;
    await createMany({
      data: batch,
      ...(isSqlite ? {} : { skipDuplicates: true }),
    });
    inserted += batch.length;
    console.log(
      `Imported ${inserted.toLocaleString()} / ${selected.length.toLocaleString()}`,
    );
  }

  console.log("Book catalog import complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
