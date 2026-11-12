export function countEnglishWords(text: string): number {
  return (text.match(/[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g) ?? []).length;
}

export function countCjkChars(text: string): number {
  return (text.match(/[㐀-䶿一-鿿豈-﫿]/g) ?? []).length;
}

export function countNonWhitespace(text: string): number {
  return text.replace(/\s/g, "").length;
}

export function readingUnits(text: string, language: string): number {
  return language === "zh"
    ? countCjkChars(text) || countNonWhitespace(text)
    : countEnglishWords(text) || countNonWhitespace(text);
}
