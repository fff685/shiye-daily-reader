import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { loginAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "登录",
};

export default async function LoginPage({
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
          <p className="auth-aside-kicker">WELCOME BACK TO SHIYE</p>
          <h2>把中断的那一页，重新接上。</h2>
          <p>
            你的阅读进度、阅读时间和偏好都保存在账号里。换一台设备，也能从上次停下的地方继续。
          </p>
        </div>
        <p className="auth-quote">
          “阅读不是为了抵达终点，而是为了在路上遇见更开阔的自己。”
        </p>
      </aside>

      <section className="auth-form-wrap">
        <div className="auth-form-card">
          <h1>欢迎回来</h1>
          <p>登录后继续你的每日阅读。今天也只需要一点点时间。</p>
          <AuthForm mode="login" action={loginAction} next={next} />
        </div>
      </section>
    </div>
  );
}
