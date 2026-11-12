"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { normalizeBookText, countNonWhitespace } from "@/lib/book-text";
import { prisma } from "@/lib/prisma";
import { normalizeTags, serializeTags } from "@/lib/tags";

export type ImportState = {
  error?: string;
};

function decodeText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("gb18030").decode(bytes);
  }
}

function parseTags(value: string): string[] {
  const extra = normalizeTags(value.split(/[,，、\s]+/));
  return normalizeTags(["我的导入", "私人书库", ...extra]).slice(0, 10);
}

export async function importBookAction(
  _prevState: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const user = await requireUser("/import");

  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const author = String(formData.get("author") ?? "").trim().slice(0, 120);
  const requestedLanguage = String(formData.get("language") ?? "zh");
  const language = requestedLanguage === "en" ? "en" : "zh";
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const file = formData.get("file");

  if (!title) return { error: "请填写书名。" };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "请选择要导入的 TXT 文件。" };
  }
  if (!/\.txt$/i.test(file.name)) {
    return { error: "目前支持 TXT 导入；EPUB/PDF 请先转换为 TXT。" };
  }
  if (file.size > 15 * 1024 * 1024) {
    return { error: "文件超过 15MB，请拆分后再导入。" };
  }

  const raw = decodeText(await file.arrayBuffer());
  const content = normalizeBookText(raw, language);
  const charCount = countNonWhitespace(content);

  if (charCount < 500) {
    return { error: "正文太短，或文件编码无法识别。" };
  }

  const book = await prisma.book.create({
    data: {
      source: "upload",
      sourceId: `upload-${user.id}-${randomUUID()}`,
      title,
      author: author || "佚名",
      language,
      description: "你导入的私人书籍。仅自己可见，不会出现在公共书库。",
      tags: serializeTags(tags),
      popularity: 0,
      charCount,
      content,
      ownerId: user.id,
    },
    select: { id: true },
  });

  revalidatePath("/me");
  revalidatePath("/import");
  redirect(`/books/${book.id}`);
}
