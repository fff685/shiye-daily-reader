export class TranslationUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationUnavailableError";
  }
}

const SYSTEM_PROMPT = `你是一位资深文学译者，负责把英文文学作品翻译成自然、克制、优雅的简体中文。

要求：
1. 保持原文的段落数量、顺序和语气，不增加、不删减。
2. 人名、地名、专有名词在同一译文中保持一致；首次出现可使用“中文（English）”形式。
3. 保留章节标题、诗歌分行和特殊格式的意图。
4. 不要添加解释、前言、总结或任何译者注。
5. 只输出一个 JSON 对象，格式为 {"translations": ["译文1", "译文2"]}，数组长度必须与输入段落数量完全相同。
6. 输出必须是合法 JSON，不要使用 Markdown 代码块。`;

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const MAX_CHARS_PER_REQUEST = 4200;

function splitIntoChunks(paragraphs: string[]): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentChars = 0;

  for (const paragraph of paragraphs) {
    if (current.length && currentChars + paragraph.length > MAX_CHARS_PER_REQUEST) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(paragraph);
    currentChars += paragraph.length;
  }

  if (current.length) chunks.push(current);
  return chunks;
}

async function translateChunk(
  paragraphs: string[],
  title: string,
  apiKey: string,
): Promise<string[]> {
  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            book: title,
            paragraphCount: paragraphs.length,
            paragraphs,
          }),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 8192,
      stream: false,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new TranslationUnavailableError(
      `DeepSeek 翻译请求失败（${response.status}）：${detail.slice(0, 160)}`,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new TranslationUnavailableError("DeepSeek 没有返回翻译内容。");
  }

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    parsed =
      start >= 0 && end > start
        ? JSON.parse(cleaned.slice(start, end + 1))
        : null;
  }

  const translated = Array.isArray(parsed)
    ? parsed
    : (parsed as { translations?: unknown })?.translations;

  if (
    !Array.isArray(translated) ||
    translated.length !== paragraphs.length ||
    translated.some((item) => typeof item !== "string")
  ) {
    throw new TranslationUnavailableError(
      "翻译结果格式暂时不稳定，请稍后再试一次。",
    );
  }

  return translated.map((item) => item.trim());
}

export async function translateParagraphs(
  paragraphs: string[],
  title: string,
): Promise<string[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new TranslationUnavailableError(
      "尚未配置 DEEPSEEK_API_KEY，暂时无法生成中文翻译。",
    );
  }

  const result: string[] = [];
  for (const chunk of splitIntoChunks(paragraphs)) {
    result.push(...(await translateChunk(chunk, title, apiKey)));
  }
  return result;
}
