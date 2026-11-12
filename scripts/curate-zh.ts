import { PrismaClient } from "@prisma/client";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const curated: Array<{
  sourceId: string;
  title: string;
  author: string;
  tags: string[];
  popularity: number;
}> = [
  {
    sourceId: "24042",
    title: "彷徨",
    author: "鲁迅",
    tags: ["现代文学", "短篇", "社会", "批判"],
    popularity: 8400,
  },
  {
    sourceId: "25242",
    title: "野草",
    author: "鲁迅",
    tags: ["现代文学", "散文诗", "哲思"],
    popularity: 8300,
  },
  {
    sourceId: "25271",
    title: "朝花夕拾",
    author: "鲁迅",
    tags: ["现代文学", "散文", "回忆"],
    popularity: 7000,
  },
  {
    sourceId: "25297",
    title: "狂人日记",
    author: "鲁迅",
    tags: ["现代文学", "短篇", "社会", "批判"],
    popularity: 8600,
  },
  {
    sourceId: "25332",
    title: "阿Q正传",
    author: "鲁迅",
    tags: ["现代文学", "讽刺", "国民性", "短篇"],
    popularity: 8450,
  },
  {
    sourceId: "27166",
    title: "呐喊",
    author: "鲁迅",
    tags: ["现代文学", "短篇", "社会", "批判"],
    popularity: 8600,
  },
];

async function main() {
  if (process.argv.includes("--remote")) {
    const env = readFileSync(".env.neon.local", "utf8").split(/\r?\n/);
    const urlLine = env.find((line) => line.startsWith("DATABASE_URL="));
    if (!urlLine) throw new Error("DATABASE_URL missing from .env.neon.local");
    const url = urlLine.replace("DATABASE_URL=", "").replace(/^"|"$/g, "");
    const sql = neon(url);
    for (const item of curated) {
      await sql.query(
        `UPDATE "Book" SET "title" = $1, "author" = $2, "tags" = $3, "popularity" = $4 WHERE "sourceId" = $5`,
        [
          item.title,
          item.author,
          JSON.stringify(item.tags),
          item.popularity,
          item.sourceId,
        ],
      );
    }
    console.log("Updated Neon modern Chinese works.");
    return;
  }

  const prisma = new PrismaClient();
  for (const item of curated) {
    await prisma.book.updateMany({
      where: { sourceId: item.sourceId },
      data: {
        title: item.title,
        author: item.author,
        tags: JSON.stringify(item.tags),
        popularity: item.popularity,
      },
    });
  }
  console.log("Updated local modern Chinese works.");
  await prisma.$disconnect();
}

void main();
