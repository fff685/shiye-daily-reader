import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { registerAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "注册",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const params = await searchParams;
  const next =
    typeof params.next === "string" && params.next.startsWith("/")
      ? params.next
      : "/";

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div>
          <p className="auth-aside-kicker">START YOUR READING RHYTHM</p>
          <h2>每天十几分钟，读完一本书。</h2>
          <p>
            拾页会把书拆成刚刚好的每日份量。读完了，给你一句鼓励；想继续，也有下一段在等你。
          </p>
        </div>
        <p className="auth-quote">
          “你不需要读得很快，只需要让阅读成为生活里稳定的一小块。”
        </p>
      </aside>

      <section className="auth-form-wrap">
        <div className="auth-form-card">
          <h1>创建阅读账号</h1>
          <p>注册只需一分钟。你的进度、时长和阅读画像会自动保存。</p>
          <AuthForm mode="register" action={registerAction} next={next} />
        </div>
      </section>
    </div>
  );
}
