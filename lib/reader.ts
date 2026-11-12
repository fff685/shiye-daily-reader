import { readingUnits } from "@/lib/text-metrics";

export type ReadingSegment = {
  text: string;
  start: number;
  end: number;
  units: number;
  minutes: number;
  isEnd: boolean;
  progress: number;
};

type Block = {
  start: number;
  end: number;
  text: string;
};

const CLOSERS = new Set(["”", "’", '"', "'", "」", "』", "）", ")", "】", "]"]);
const SENTENCE_END = new Set(["。", "！", "？", "!", "?", "；", ";"]);

function unitsFor(text: string, language: string) {
  return readingUnits(text, language);
}

function sentenceRanges(text: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let start = 0;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    let isEnd = SENTENCE_END.has(char);

    if (char === ".") {
      const prev = text[i - 1] ?? "";
      const next = text[i + 1] ?? "";
      isEnd = !/\d/.test(prev) && (next === "" || /\s/.test(next));
    }

    if (!isEnd) continue;

    let end = i + 1;
    while (end < text.length && CLOSERS.has(text[end])) end += 1;
    while (end < text.length && /\s/.test(text[end])) end += 1;

    ranges.push({ start, end });
    start = end;
    i = end - 1;
  }

  if (start < text.length) ranges.push({ start, end: text.length });
  return ranges;
}

function blocksFromParagraphs(content: string, language: string): Block[] {
  const blocks: Block[] = [];
  const paragraphRe = /[^\n]+(?:\n(?!\n)[^\n]*)*/g;
  let match: RegExpExecArray | null;

  while ((match = paragraphRe.exec(content)) !== null) {
    const raw = match[0];
    const start = match.index + (raw.length - raw.trimStart().length);
    const end = match.index + raw.trimEnd().length;
    if (end <= start) continue;

    const text = content.slice(start, end);
    const units = unitsFor(text, language);
    const paragraphLimit = language === "zh" ? 2600 : 950;

    if (units <= paragraphLimit) {
      blocks.push({ start, end, text });
      continue;
    }

    for (const range of sentenceRanges(text)) {
      const sentenceStart = start + range.start;
      const sentenceEnd = start + range.end;
      const sentenceText = content
        .slice(sentenceStart, sentenceEnd)
        .replace(/^\s+|\s+$/g, "");
      if (!sentenceText) continue;
      blocks.push({
        start: sentenceStart,
        end: sentenceEnd,
        text: sentenceText,
      });
    }
  }

  return blocks;
}

export function getReadingSegment(
  content: string,
  offset: number,
  minutes: number,
  language: string,
): ReadingSegment {
  const safeMinutes = [10, 15, 20].includes(minutes) ? minutes : 15;
  const unitsPerMinute = language === "zh" ? 420 : 220;
  const target = safeMinutes * unitsPerMinute;
  const blocks = blocksFromParagraphs(content, language);

  const startOffset = Math.max(0, Math.min(offset, content.length));
  let chosenStart = startOffset;
  let chosenEnd = startOffset;
  let chosenUnits = 0;
  let collected = false;

  for (const block of blocks) {
    if (block.end <= startOffset) continue;

    const blockText =
      block.start < startOffset
        ? content.slice(startOffset, block.end)
        : block.text;
    const units = unitsFor(blockText, language);
    if (!blockText.trim()) continue;

    if (
      collected &&
      chosenUnits >= target * 0.65 &&
      chosenUnits + units > target * 1.35
    ) {
      break;
    }

    if (!collected) {
      chosenStart = block.start < startOffset ? startOffset : block.start;
    }

    chosenEnd = block.end;
    chosenUnits += units;
    collected = true;

    if (chosenUnits >= target) break;
  }

  if (!collected) {
    return {
      text: "",
      start: content.length,
      end: content.length,
      units: 0,
      minutes: 0,
      isEnd: true,
      progress: 1,
    };
  }

  // Trim surrounding whitespace so the reader never opens with blank lines.
  while (chosenStart < chosenEnd && /\s/.test(content[chosenStart])) {
    chosenStart += 1;
  }
  while (chosenEnd > chosenStart && /\s/.test(content[chosenEnd - 1])) {
    chosenEnd -= 1;
  }

  const text = content.slice(chosenStart, chosenEnd);
  const isEnd = content.slice(chosenEnd).trim().length === 0;

  return {
    text,
    start: chosenStart,
    end: chosenEnd,
    units: chosenUnits,
    minutes: Math.max(1, Math.round((chosenUnits / unitsPerMinute) * 10) / 10),
    isEnd,
    progress:
      content.length === 0
        ? 1
        : Math.min(1, Math.round((chosenEnd / content.length) * 10000) / 10000),
  };
}

export function splitSegmentIntoParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function isHeading(paragraph: string): boolean {
  if (paragraph.length > 42) return false;
  return /^(第.{1,14}[回章节卷篇]|chapter\s+[ivxlcdm\d]+|part\s+[ivxlcdm\d]+|[〇零一二三四五六七八九十]+[、.．]|[0-9]+[、.．]|序|楔子|引子|后记|附录|前言|prologue|epilogue)/i.test(
    paragraph,
  );
}
