import { toSimplified } from "./chinese";
import { countEnglishWords, countNonWhitespace } from "./text-metrics";

export {
  countCjkChars,
  countEnglishWords,
  countNonWhitespace,
  readingUnits,
} from "./text-metrics";

const START_RE =
  /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i;
const END_RE =
  /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i;

const CONTENT_URLS = (id: string) => [
  `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
  `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
  `https://www.gutenberg.org/files/${id}/${id}.txt`,
];

export class BookContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookContentError";
  }
}

function decodeBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    );
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n\n")
      .replace(/<[^>]+>/g, ""),
  );
}

function stripBoilerplate(text: string): string {
  const start = text.match(START_RE);
  if (start?.index !== undefined) {
    text = text.slice(start.index + start[0].length);
  }

  const end = text.match(END_RE);
  if (end?.index !== undefined) {
    text = text.slice(0, end.index);
  }

  return text;
}

function stripLatinFrontMatter(text: string): string {
  const paragraphs = text.split("\n\n");
  const headingRe =
    /^(chapter|book|part)\s+([ivxlcdm]+|\d+|one|first)\b[.:\]]*$/i;

  for (let index = 1; index < paragraphs.length; index += 1) {
    if (!headingRe.test(paragraphs[index].trim())) continue;
    const next = paragraphs[index + 1]?.trim() ?? "";
    if (next.length > 80 && index < paragraphs.length * 0.3) {
      return paragraphs.slice(index).join("\n\n");
    }
  }

  return text;
}

function normalizeLatin(text: string): string {
  const blocks = text
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/[ \t]{2,}/g, " ")
        .trim(),
    )
    .filter(Boolean);

  return blocks.join("\n\n");
}

function normalizeChinese(text: string): string {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed.length > 0 &&
        !/^[-_=─—]{3,}$/.test(trimmed) &&
        !/^(project gutenberg|produced by|transcriber)/i.test(trimmed)
      );
    });

  const indented = lines.filter((line) => /^[　 ]{1,}/.test(line));
  const hasIndent = indented.length >= Math.max(3, lines.length * 0.02);

  if (!hasIndent) {
    return lines.map((line) => line.trim()).join("\n\n");
  }

  const paragraphs: string[] = [];
  let current = "";
  const heading =
    /^(第.{1,14}[回章节卷篇]|[〇零一二三四五六七八九十百千]+[、.．]|[0-9]+[、.．]|序|楔子|引子|后记|附錄|附录|凡例|前言)/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const isIndented = /^[　]/.test(rawLine);
    const isHeading = heading.test(line) && line.length < 48;

    if (isHeading) {
      if (current) paragraphs.push(current);
      paragraphs.push(line);
      current = "";
      continue;
    }

    if (isIndented || !current) {
      if (current) paragraphs.push(current);
      current = line;
    } else {
      current += line;
    }
  }

  if (current) paragraphs.push(current);
  return paragraphs.join("\n\n");
}

export function normalizeBookText(raw: string, language: string): string {
  let text = stripBoilerplate(raw);
  if (/^\s*<(!doctype|html)/i.test(text) || /<body[\s>]/i.test(text)) {
    text = stripHtml(text);
  }
  if (language === "zh") {
    return normalizeChinese(toSimplified(text));
  }
  return stripLatinFrontMatter(normalizeLatin(text));
}

export async function fetchBookText(sourceId: string, language: string) {
  let lastError: unknown;

  for (const url of CONTENT_URLS(sourceId)) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000),
        headers: {
          "user-agent": "ShiyeReader/0.1 (public-domain reading project)",
        },
        cache: "no-store",
      });

      if (!response.ok) continue;

      const raw = decodeBuffer(await response.arrayBuffer());
      const text = normalizeBookText(raw, language);
      if (countNonWhitespace(text) < 500) {
        throw new BookContentError("书源返回的正文过短，可能不是可读格式。");
      }

      return {
        text,
        charCount: countNonWhitespace(text),
        words: countEnglishWords(text),
        sourceUrl: url,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new BookContentError(
    lastError instanceof Error
      ? `暂时无法从书源取回正文：${lastError.message}`
      : "暂时无法从书源取回正文。",
  );
}

export function estimateBookMinutes(language: string, charCount: number) {
  if (language === "zh") return Math.max(1, Math.round(charCount / 420));
  return Math.max(1, Math.round(charCount / 1100));
}
