import Link from "next/link";

export default function NotFound() {
  return (
    <main className="site-shell">
      <div className="reader-error">
        <p className="eyebrow">404 · PAGE NOT FOUND</p>
        <h1>这一页，暂时不在书里。</h1>
        <p>可能是链接过期了，也可能这本书已经被移出书架。回到首页，重新挑一本吧。</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
          <Link href="/" className="btn btn-primary">
            回到首页
          </Link>
          <Link href="/discover" className="btn btn-ghost">
            逛逛书库
          </Link>
        </div>
      </div>
    </main>
  );
}
