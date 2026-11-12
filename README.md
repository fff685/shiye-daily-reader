# 拾页 · 每天读一点

一个把书拆成 **10 / 15 / 20 分钟** 每日份量的阅读应用。读完当天份量会得到一句鼓励；想继续可以顺势读下一段，也可以设置“不再询问，自动继续”。阅读进度、时长和偏好保存在账号里。

界面以蓝白配色为主，包含首页推荐、书库搜索、标签筛选、沉浸阅读器和阅读画像。

## 功能

- **每日份量**：按语言与阅读速度切分正文，默认 15 分钟，可在开始前选择 10 / 15 / 20 分钟。
- **鼓励与继续**：每完成一段，弹出鼓励语、本段字数与用时；可继续下一段，或勾选以后自动继续、不再询问。
- **进度持久化**：账号 + Postgres 保存阅读位置、阅读天数、累计时长、完成记录。
- **阅读画像**：根据读过的书自动聚合偏好标签，推荐时优先匹配相似主题。
- **推荐**：新用户从古登堡下载量靠前的公版经典开始；有阅读记录后按标签偏好推荐。
- **双语书源**：Project Gutenberg 英文 6 万余本 + 中文公版书 400 余本，支持按书名、作者、标签、语言搜索。
- **3–10 个标签**：从原始主题、书架分类和人工规则生成，中文书有经典作品的精校标签。
- **蓝白视觉**：衬线正文、无封面图片干扰的生成式书封、响应式布局。

## 技术栈

- Next.js 16（App Router / Server Actions）
- React 19 + TypeScript + Tailwind CSS 4
- Prisma 6 + Neon PostgreSQL（当前使用）
- `@prisma/adapter-neon` 通过 WebSocket 连接，适配 Vercel Serverless
- Cloudflare Pages 代理（国内网络可访问入口）
- SQLite 仍保留为可选的本地离线开发模式
- bcryptjs + jose（邮箱密码登录、HttpOnly Cookie 会话）
- OpenCC（中文公版书繁转简）
- Project Gutenberg 公版书目与正文

## 启动

当前 `.env` 使用本地 SQLite，直接运行：

```bash
npm install
npm run db:local
npm run dev
```

打开 <http://localhost:3000>，注册账号即可开始。

本地 SQLite 已包含完整书目；热门书正文已预取。Neon 生产连接保存在 `.env.neon.local`（已在 `.gitignore` 中，不提交），并且已写入 Vercel 生产环境。

### 恢复 Neon 开发环境

如果想让本地开发直接使用 Neon：

```bash
Copy-Item .env.neon.local .env
node scripts/prisma-generate.mjs
npm run dev
```

要从 Neon 切回 SQLite，恢复 SQLite 的 `.env` 后执行 `npm run db:local` 即可。

## 线上地址

- **国内网络可访问入口**：<https://shiye-proxy.pages.dev>
- **Vercel 源站**：<https://shiye-daily-reader.vercel.app>
- **GitHub 源码**：<https://github.com/fff685/shiye-daily-reader>
- 数据库：Neon PostgreSQL，独立数据库 `shiye`

访问链路：

```text
浏览器 → Cloudflare Pages 代理 → Vercel → Neon PostgreSQL
```

Cloudflare Pages 代理的代码在 `cloudflare/pages-proxy/`，它会把请求转发到 Vercel，并处理 Origin / 重定向，以兼容 Next.js Server Actions。Vercel 原域名在当前网络下不可直连，但 Pages 入口可正常使用。

## 生产部署（Vercel + Neon）

1. 在 Neon 创建项目，复制 **pooled** 和 **direct** 两个连接串。
2. 在 `.env` / Vercel Environment Variables 中配置：

```env
DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require"
DIRECT_URL="postgresql://.../neondb?sslmode=require"
AUTH_SECRET="至少 32 位的随机字符串"
```

3. 首次部署前，把 `prisma/schema.prisma` 指向 Neon 并执行：

```bash
npx prisma generate
npx prisma migrate deploy
npm run import:books -- --clear     # 只建议首次初始化时使用
npm run preload:content -- --limit=24
```

4. 推送到 Vercel。`vercel-build` 会自动执行 `prisma generate && next build`。数据库迁移请在首次部署前手动执行 `npx prisma migrate deploy`（本项目已完成 Neon 建表）。

> `import:books --clear` 会清空 `Book` 表并级联删除阅读进度。上线后不要再次执行；日常增量导入请去掉 `--clear`（Postgres 下会跳过重复书目）。

## 数据库说明

- 当前本地开发：`prisma/schema.local.prisma` + SQLite。
- 生产：`prisma/schema.prisma` + Neon PostgreSQL，Prisma Client 自动走 `@prisma/adapter-neon`。
- 两份 schema 的模型字段保持一致。
- `npm run db:local`：推送本地 SQLite schema 并重新生成客户端。
- `npm run db:studio`：查看本地 SQLite 数据。
- 每次重新 `npm install` 后 `postinstall` 会按生产 schema 生成客户端；如果之前切过 SQLite，再执行一次 `npx prisma generate` 恢复 Neon 客户端。

Neon 同时返回 IPv4 和 IPv6 地址。项目在 `lib/prisma.ts` 中优先使用 IPv4，并通过 `ws` 打开 WebSocket，避免部分网络环境下 IPv6 不可达导致的连接超时。

## 目录

```text
app/
  (site)/                 带全站导航的页面
    page.tsx              首页 / 推荐
    discover/             书库搜索与筛选
    books/[id]/           书目详情
    me/                   阅读画像与偏好
    login/ register/      账号
  read/[bookId]/          沉浸阅读器
  api/                    预留接口
components/               书封、书卡、阅读器、表单
lib/
  actions/                服务端操作（注册、登录、阅读进度）
  book-text.ts            正文抓取、清洗、繁转简
  books.ts                正文缓存
  reader.ts               每日份量切分
  recommend.ts            热门与个性化推荐
  stats.ts                阅读统计 / 连续天数
  tags.ts                 标签规则与 JSON 序列化
prisma/
  schema.prisma           生产 Postgres
  schema.local.prisma     本地 SQLite
scripts/
  import-books.ts         古登堡目录导入
  preload-content.ts      预取正文
```

## 每日份量怎么切

- 中文按约 **420 字 / 分钟**，英文按约 **220 词 / 分钟**。
- 从上次停下的位置开始，按段落 / 句子边界累计，达到目标时长后收束，避免把句子截断。
- 改变每日时长不会丢失进度，下一次从当前 offset 按新时长继续。
- 每段完成时记录真实活跃阅读秒数（页面不可见或长时间无操作会暂停计时）。

## 推荐与画像

- 新用户：古登堡下载量排名靠前的公版书 + 中文经典加权。
- 有阅读记录：取最近 30 次完成记录聚合标签权重，召回同标签候选，按标签匹配度 + 热度排序。
- 画像仅在个人页展示，不额外建画像表；数据来自阅读记录，随阅读自动变化。

## 版权与书源

- 书源为 **Project Gutenberg** 公版作品；页面保留原始书目链接。
- 不内置仍在版权保护期内的现代畅销书全文。后续可以增加“用户导入 TXT/EPUB”能力，或接入其他公版/授权书源。
- 中文正文会通过 OpenCC 转为简体；原始书目链接仍指向古登堡页面。

## 已知限制

- 首次打开一本未缓存的英文书时，需要等待古登堡正文下载（通常几秒），失败会显示重试页。
- 阅读时长按“完成的阅读段”入账；中途退出且未完成时，当前段的秒数不会保存。后续可以加心跳续传。
- 目前没有邮箱验证码和找回密码；首版以比赛演示和本地使用为主。
- 书目元数据量大，深度分页和模糊搜索在 Neon 免费实例上可能偏慢；后续可加 pg_trgm 索引。

## 下一步

- 用户导入 TXT / EPUB，支持更多书源。
- 阅读日历、周报、目标提醒。
- 段落级收藏与笔记。
- 邮箱验证、找回密码、第三方登录。
- 用更细的标签和协同过滤优化推荐。
