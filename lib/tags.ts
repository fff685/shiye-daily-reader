import { getCuratedBlurb } from "./blurbs";

export const TAG_OPTIONS = [
  "文学",
  "经典",
  "小说",
  "历史",
  "哲学",
  "诗歌",
  "戏剧",
  "散文",
  "科幻",
  "奇幻",
  "冒险",
  "爱情",
  "悬疑",
  "战争",
  "成长",
  "童话",
  "传记",
  "心理",
  "社会",
  "自然",
  "科学",
  "宗教",
  "艺术",
  "幽默",
  "短篇",
  "女性",
  "政治",
  "旅行",
  "儿童",
  "青春",
  "悲剧",
  "史诗",
  "侦探",
  "神话",
  "讽刺",
  "乌托邦",
] as const;

const SUBJECT_RULES: Array<[RegExp, string]> = [
  [/fiction|novel/i, "小说"],
  [/historical|history/i, "历史"],
  [/philosoph/i, "哲学"],
  [/poetry|poems|verse|sonnet/i, "诗歌"],
  [/drama|plays|theatre|tragedy/i, "戏剧"],
  [/essay|letters|speeches/i, "散文"],
  [/science fiction|sci-fi/i, "科幻"],
  [/fantasy|magic/i, "奇幻"],
  [/adventure|voyages|sea stories/i, "冒险"],
  [/love|romance|marriage|courtship/i, "爱情"],
  [/mystery|detective|crime/i, "悬疑"],
  [/war|military/i, "战争"],
  [/children|juvenile|fairy tale/i, "儿童"],
  [/biography|autobiography/i, "传记"],
  [/psycholog/i, "心理"],
  [/social|society|sociology/i, "社会"],
  [/nature|animals|plants|gardening/i, "自然"],
  [/science|mathematics|astronomy|physics|chemistry/i, "科学"],
  [/religio|bible|theology|christian/i, "宗教"],
  [/art|music|painting|architecture/i, "艺术"],
  [/humor|comic|wit/i, "幽默"],
  [/short stories/i, "短篇"],
  [/women|femin/i, "女性"],
  [/politics|government/i, "政治"],
  [/travel|description and travel/i, "旅行"],
  [/myth|legend|folklore/i, "神话"],
  [/satire|irony/i, "讽刺"],
  [/utopia|dystopia/i, "乌托邦"],
  [/epic/i, "史诗"],
  [/gothic/i, "哥特"],
  [/coming of age|youth/i, "成长"],
  [/classic|literature/i, "经典"],
];

const ZH_CURATED: Array<{
  match: RegExp;
  tags: string[];
  popularity?: number;
}> = [
  {
    match: /補紅樓夢|补红楼梦|後紅樓夢|后红楼梦|續紅樓夢|续红楼梦/,
    tags: ["古典文学", "爱情", "家族", "续书"],
    popularity: 7200,
  },
  {
    match: /後西遊記|后西游记|續西遊記|续西游记/,
    tags: ["古典文学", "神话", "冒险", "续书"],
    popularity: 7100,
  },
  {
    match: /紅樓夢|红楼梦/,
    tags: ["古典文学", "爱情", "家族", "悲剧", "章回体"],
    popularity: 9800,
  },
  {
    match: /西遊記|西游记/,
    tags: ["古典文学", "神话", "冒险", "奇幻", "讽刺"],
    popularity: 9600,
  },
  {
    match: /三國演義|三国演义|三國志演義/,
    tags: ["古典文学", "历史", "战争", "权谋", "史诗"],
    popularity: 9500,
  },
  {
    match: /水滸傳|水浒传/,
    tags: ["古典文学", "侠义", "群像", "反抗"],
    popularity: 9300,
  },
  {
    match: /聊齋|聊斋/,
    tags: ["古典文学", "志怪", "短篇", "奇幻"],
    popularity: 8600,
  },
  {
    match: /儒林外史/,
    tags: ["古典文学", "讽刺", "社会", "科举"],
    popularity: 8200,
  },
  {
    match: /封神演義|封神演义/,
    tags: ["古典文学", "神话", "奇幻", "战争"],
    popularity: 8000,
  },
  {
    match: /鏡花緣|镜花缘/,
    tags: ["古典文学", "奇幻", "冒险", "女性"],
    popularity: 7600,
  },
  {
    match: /浮生六記|浮生六记/,
    tags: ["古典文学", "散文", "生活", "爱情"],
    popularity: 7500,
  },
  {
    match: /詩經|诗经/,
    tags: ["诗歌", "先秦", "经典"],
    popularity: 7400,
  },
  {
    match: /論語|论语/,
    tags: ["哲学", "儒家", "经典"],
    popularity: 7800,
  },
  {
    match: /道德經|道德经|老子/,
    tags: ["哲学", "道家", "经典"],
    popularity: 7900,
  },
  {
    match: /莊子|庄子/,
    tags: ["哲学", "道家", "寓言"],
    popularity: 7200,
  },
  {
    match: /唐詩|唐诗|宋詞|宋词/,
    tags: ["诗歌", "古典文学", "经典"],
    popularity: 7000,
  },
  {
    match: /古文觀止|古文观止/,
    tags: ["散文", "古典文学", "经典"],
    popularity: 6800,
  },
  {
    match: /世說新語|世说新语/,
    tags: ["笔记", "历史", "人物", "魏晋"],
    popularity: 6700,
  },
  {
    match: /吶喊|呐喊|阿Q|狂人日記|狂人日记/,
    tags: ["现代文学", "短篇", "社会", "批判"],
    popularity: 8200,
  },
  {
    match: /朝花夕拾/,
    tags: ["现代文学", "散文", "回忆"],
    popularity: 7000,
  },
  {
    match: /官場現形記|官场现形记/,
    tags: ["晚清", "讽刺", "社会", "小说"],
    popularity: 6200,
  },
  {
    match: /老殘遊記|老残游记/,
    tags: ["晚清", "游记", "社会", "小说"],
    popularity: 6100,
  },
  {
    match: /孽海花/,
    tags: ["晚清", "历史", "社会", "小说"],
    popularity: 6000,
  },
  {
    match: /東周列國志|东周列国志/,
    tags: ["历史", "战争", "古典文学"],
    popularity: 6400,
  },
  {
    match: /隋唐演義|隋唐演义/,
    tags: ["历史", "战争", "古典文学"],
    popularity: 6000,
  },
  {
    match: /說岳全傳|说岳全传/,
    tags: ["历史", "英雄", "战争"],
    popularity: 5900,
  },
  {
    match: /楊家將|杨家将/,
    tags: ["历史", "英雄", "战争"],
    popularity: 5800,
  },
  {
    match: /西廂記|西厢记/,
    tags: ["戏剧", "爱情", "古典文学"],
    popularity: 6600,
  },
  {
    match: /牡丹亭/,
    tags: ["戏剧", "爱情", "古典文学"],
    popularity: 6500,
  },
  {
    match: /桃花扇/,
    tags: ["戏剧", "历史", "爱情"],
    popularity: 6200,
  },
  {
    match: /長生殿|长生殿/,
    tags: ["戏剧", "爱情", "历史"],
    popularity: 6100,
  },
  {
    match: /竇娥冤|窦娥冤/,
    tags: ["戏剧", "悲剧", "古典文学"],
    popularity: 6000,
  },
  {
    match: /菜根譚|菜根谭/,
    tags: ["哲学", "处世", "格言"],
    popularity: 6300,
  },
  {
    match: /孫子兵法|孙子兵法/,
    tags: ["哲学", "军事", "战略"],
    popularity: 7600,
  },
  {
    match: /三十六計|三十六计/,
    tags: ["军事", "战略", "经典"],
    popularity: 6400,
  },
  {
    match: /史記|史记/,
    tags: ["历史", "传记", "经典"],
    popularity: 7300,
  },
  {
    match: /資治通鑑|资治通鉴/,
    tags: ["历史", "政治", "经典"],
    popularity: 6900,
  },
  {
    match: /本草綱目|本草纲目/,
    tags: ["科学", "医学", "自然"],
    popularity: 6000,
  },
  {
    match: /天工開物|天工开物/,
    tags: ["科学", "技术", "自然"],
    popularity: 5900,
  },
  {
    match: /徐霞客遊記|徐霞客游记/,
    tags: ["旅行", "地理", "自然"],
    popularity: 5800,
  },
  {
    match: /山海經|山海经/,
    tags: ["神话", "地理", "奇幻"],
    popularity: 7100,
  },
  {
    match: /搜神記|搜神记/,
    tags: ["志怪", "神话", "短篇"],
    popularity: 5700,
  },
  {
    match: /三字經|三字经|百家姓|千字文/,
    tags: ["启蒙", "经典", "儿童"],
    popularity: 5600,
  },
  {
    match: /顏氏家訓|颜氏家训/,
    tags: ["哲学", "教育", "经典"],
    popularity: 5500,
  },
  {
    match: /人間詞話|人间词话/,
    tags: ["文学", "美学", "诗歌"],
    popularity: 6400,
  },
  {
    match: /曾國藩家書|曾国藩家书/,
    tags: ["书信", "处世", "历史"],
    popularity: 5600,
  },
  {
    match: /魯迅|鲁迅/,
    tags: ["现代文学", "短篇", "批判"],
    popularity: 7000,
  },
];

export function isKnownTag(tag: string): boolean {
  return (TAG_OPTIONS as readonly string[]).includes(tag);
}

export function tagsFromMetadata(input: {
  title: string;
  language: string;
  subjects?: string | null;
  bookshelves?: string | null;
}): { tags: string[]; popularity?: number } {
  const source = `${input.subjects ?? ""} ${input.bookshelves ?? ""}`;
  const curated = ZH_CURATED.find((item) => item.match.test(input.title));

  if (curated) {
    return {
      tags: curated.tags.slice(0, 10),
      popularity: curated.popularity,
    };
  }

  const tags: string[] = [];
  for (const [pattern, tag] of SUBJECT_RULES) {
    if (pattern.test(source) && !tags.includes(tag)) tags.push(tag);
    if (tags.length >= 8) break;
  }

  if (tags.length < 3) {
    if (/fiction|novel/i.test(source) && !tags.includes("小说")) tags.push("小说");
    if (!tags.includes("文学")) tags.push("文学");
    if (!tags.includes("经典")) tags.push("经典");
  }

  tags.push(input.language === "zh" ? "中文经典" : "英文原版");

  return { tags: Array.from(new Set(tags)).slice(0, 10) };
}

export function normalizeTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).slice(
    0,
    10,
  );
}

export function parseTags(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return normalizeTags(value);
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return normalizeTags(parsed.filter((item): item is string => typeof item === "string"));
    }
  } catch {
    // Older seeded rows may contain comma-separated tags.
  }
  return normalizeTags(value.split(/[,，、]/));
}

export function serializeTags(tags: string[]): string {
  return JSON.stringify(normalizeTags(tags));
}

export function buildDescription(input: {
  title: string;
  author: string | null;
  tags: string[];
  language: string;
}): string {
  const curated = getCuratedBlurb(input.title);
  const author = input.author ? `，${input.author}` : "";
  if (curated) {
    return `《${input.title}》${author}。${curated}`;
  }

  const tagText = input.tags
    .filter((tag) => tag !== "英文原版" && tag !== "中文经典")
    .slice(0, 3)
    .join("、");
  return `《${input.title}》${author}。这是一部关于${tagText || "文字与生活"}的公版作品，适合在安静的片刻里慢慢读下去。`;
}
