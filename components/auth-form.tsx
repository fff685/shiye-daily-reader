"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "@/lib/actions/auth";

export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: "login" | "register";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  next: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const isRegister = mode === "register";

  return (
    <form action={formAction} className="auth-form">
      <input type="hidden" name="next" value={next} />
      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}

      {isRegister ? (
        <label>
          <span className="label">昵称</span>
          <input
            className="input"
            type="text"
            name="name"
            defaultValue={state.name}
            placeholder="想被怎么称呼"
            autoComplete="nickname"
            maxLength={24}
            required
          />
        </label>
      ) : null}

      <label>
        <span className="label">邮箱</span>
        <input
          className="input"
          type="email"
          name="email"
          defaultValue={state.email}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </label>

      <label>
        <span className="label">密码</span>
        <input
          className="input"
          type="password"
          name="password"
          placeholder={isRegister ? "至少 8 位字符" : "输入密码"}
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={isRegister ? 8 : undefined}
          required
        />
      </label>

      {isRegister ? (
        <label>
          <span className="label">确认密码</span>
          <input
            className="input"
            type="password"
            name="confirm"
            placeholder="再输入一次"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending
          ? "请稍候…"
          : isRegister
            ? "创建账号，开始阅读"
            : "登录"}
      </button>

      <p className="auth-switch">
        {isRegister ? "已经有账号了？" : "第一次来拾页？"}{" "}
        <Link
          href={
            isRegister
              ? `/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`
              : `/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`
          }
        >
          {isRegister ? "直接登录" : "免费注册"}
        </Link>
      </p>
    </form>
  );
}
