import type { Metadata } from "next";
import Link from "next/link";
import { BookCard } from "@/components/book-card";
import { ImportForm } from "@/components/import-form";
import { requireUser } from "@/lib/auth";
import { bookSummarySelect } from "@/lib/book-shape";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "导入书籍",
};

export default async function ImportPage() {
  const user = await requireUser("/import");
  const imports = await prisma.book.findMany({
    where: { ownerId: user.id },
    select: bookSummarySelect,
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return (
    <div className="container-page">
      <div className="page-head">
        <p className="eyebrow">PRIVATE LIBRARY</p>
        <h1>导入你自己的书</h1>
        <p>
          把已经拥有的 TXT 电子书放进拾页，仍然按每日份量阅读。
          导入内容只属于你的账号，不会出现在公共书库，也不会被其他用户搜索到。
        </p>
      </div>

      <div className="import-layout">
        <section className="profile-card card">
          <h2>导入 TXT</h2>
          <p>
            目前支持 UTF-8 / GB18030 编码的 TXT。EPUB 正在接入；你也可以先转换为
            TXT 再导入。
          </p>
          <ImportForm />
        </section>

        <aside className="profile-card card">
          <h2>关于版权</h2>
          <p>
            《明朝那些事儿》《流俗地》等仍在版权保护期的作品，系统不会公开发布全文。
            你可以导入自己合法拥有的电子书，仅限个人阅读。
          </p>
          <p style={{ marginTop: 14 }}>
            公版作品会继续进入公共书库；私人导入不会参与公共推荐，也不会被其他用户看到。
          </p>
          <div style={{ marginTop: 18 }}>
            <Link href="/me" className="section-link">
              返回我的阅读 →
            </Link>
          </div>
        </aside>
      </div>

      <section className="section-tight" style={{ paddingBottom: 72 }}>
        <div className="section-head">
          <div>
            <p className="eyebrow">MY IMPORTS</p>
            <h2>我的导入</h2>
            <p>这些书只有你自己能看到。</p>
          </div>
        </div>

        {imports.length ? (
          <div className="book-grid">
            {imports.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>还没有导入的书</strong>
            选择一本你拥有的 TXT，开始建立私人书架。
          </div>
        )}
      </section>
    </div>
  );
}
