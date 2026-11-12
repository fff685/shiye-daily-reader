# Cloudflare Pages 代理

用于在无法直连 `vercel.app` 的网络下访问拾页。Pages 会把请求代理到：

```text
https://shiye-daily-reader.vercel.app
```

线上地址：

```text
https://shiye-proxy.pages.dev
```

## 部署

需要已登录 Cloudflare 的 Wrangler：

```bash
npx --yes wrangler@4 login
npx --yes wrangler@4 pages deploy cloudflare/pages-proxy --project-name shiye-proxy --branch main
```

## 说明

- `_worker.js` 会把 `Origin` 改写成 Vercel 域名，否则 Next.js 会拒绝 Server Actions。
- 回源到 Vercel 后会把重定向地址改写回 Pages 域名，避免浏览器跳转到被阻断的 `vercel.app`。
- 登录 Cookie 由浏览器按 Pages 域名保存，服务端通过代理转发。
- 这是访问层代理，应用数据仍然存在 Neon；代理不存业务数据。
