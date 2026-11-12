export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}

const CHINESE_AUTHORS: Record<string, string> = {
  "Cao, Xueqin": "曹雪芹",
  "Luo, Guanzhong": "罗贯中",
  "Wu, Cheng'en": "吴承恩",
  "Wu, Chengen": "吴承恩",
  "Shi, Nai'an": "施耐庵",
  "Shi, Naian": "施耐庵",
  "Pu, Songling": "蒲松龄",
  "Wu, Jingzi": "吴敬梓",
  "Li, Ruzhen": "李汝珍",
  "Shen, Fu": "沈复",
  "Liu, E": "刘鹗",
  "Lu, Xun": "鲁迅",
  "Fei, Yue": "岳飞",
  "Qian, Sima": "司马迁",
  "Kong, Qiu": "孔子",
  "Meng, Ke": "孟子",
  "Li, Er": "老子",
  "Zhuang, Zhou": "庄子",
  "Sun, Wu": "孙武",
  "Xun, Kuang": "荀子",
  "Mo, Di": "墨子",
  "Qu, Ping": "屈原",
  "Tao, Qian": "陶渊明",
  "Li, Bo": "李白",
  "Du, Fu": "杜甫",
  "Su, Shi": "苏轼",
  "Cao, Pi": "曹丕",
  "Cao, Zhi": "曹植",
  "Cai, Yuanpei": "蔡元培",
  "Confucius": "孔子",
  "Mencius": "孟子",
  "Laozi": "老子",
  "Zhuangzi": "庄子",
  "Sunzi": "孙子",
  "Mozi": "墨子",
  "Xunzi": "荀子",
  "Han, Fei": "韩非",
  "Sima, Qian": "司马迁",
  "Xu, Hongzu": "徐霞客",
  "Li, Shizhen": "李时珍",
  "Song, Yingxing": "宋应星",
  "Wang, Guowei": "王国维",
  "Liang, Qichao": "梁启超",
  "Hu, Shi": "胡适",
  "Zhu, Xi": "朱熹",
  "Qu, Yuan": "屈原",
  "Tao, Yuanming": "陶渊明",
  "Li, Bai": "李白",
  "Li, Qingzhao": "李清照",
  "Liu, Yiqing": "刘义庆",
  "Gan, Bao": "干宝",
  "Li, Yu": "李渔",
  "Tang, Xianzu": "汤显祖",
  "Kong, Shangren": "孔尚任",
  "Hong, Sheng": "洪昇",
  "Guan, Hanqing": "关汉卿",
  "Wang, Shifu": "王实甫",
  "Zhang, Dai": "张岱",
  "Shen, Kuo": "沈括",
  "Zeng, Guofan": "曾国藩",
  "Wei, Yuan": "魏源",
  "Lin, Zexu": "林则徐",
  "Kang, Youwei": "康有为",
  "Yan, Fu": "严复",
  Anonymous: "佚名",
};

export function formatAuthor(author: string | null): string {
  if (!author) return "佚名";

  const first = author.split(";")[0]?.trim();
  if (!first) return "佚名";

  const withoutDates = first.replace(/,\s*\d.*$/g, "").trim();
  if (CHINESE_AUTHORS[withoutDates]) return CHINESE_AUTHORS[withoutDates];
  if (CHINESE_AUTHORS[first]) return CHINESE_AUTHORS[first];
  if (/^anonymous$/i.test(first)) return "佚名";
  if (/^active\b|\bcentury\b/i.test(first)) return "佚名";

  const match = first.match(/^(.+?),\s*(.+?)(?:,\s*\d.*)?$/);
  if (!match) return first.replace(/\s*\(.*?\)\s*/g, "").trim();

  const [, last, firstNames] = match;
  if (/[㐀-鿿]/.test(last)) {
    return `${last}${firstNames}`.replace(/[，,]\s*\d.*/g, "").trim();
  }

  return `${firstNames} ${last}`.replace(/\s*\(.*?\)\s*/g, "").trim();
}

export function formatLanguage(language: string): string {
  if (language === "zh") return "中文";
  if (language === "en") return "英文";
  return language.toUpperCase();
}

export function formatCount(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(1)} 万`;
  return value.toLocaleString("zh-CN");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
