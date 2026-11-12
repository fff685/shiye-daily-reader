import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { MainNav } from "@/components/main-nav";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="site-header">
      <div className="container-page header-inner">
        <Link href="/" className="brand" aria-label="拾页首页">
          <span className="brand-mark">拾</span>
          <span className="brand-word">
            <strong>拾页</strong>
            <small>READ A LITTLE DAILY</small>
          </span>
        </Link>

        <MainNav />

        <div className="header-actions">
          {user ? (
            <>
              <Link href="/me" className="user-chip">
                <span className="user-avatar">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span>{user.name}</span>
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="btn btn-quiet">
                  退出
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-quiet">
                登录
              </Link>
              <Link href="/register" className="btn btn-primary">
                免费注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
