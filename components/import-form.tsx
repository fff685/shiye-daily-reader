"use client";

import { useActionState } from "react";
import {
  importBookAction,
  type ImportState,
} from "@/lib/actions/import";

export function ImportForm() {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    importBookAction,
    {},
  );

  return (
    <form action={formAction} className="import-form">
      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="import-grid">
        <label>
          <span className="label">书名</span>
          <input
            className="input"
            name="title"
            placeholder="例如：流俗地"
            maxLength={120}
            required
          />
        </label>
        <label>
          <span className="label">作者</span>
          <input
            className="input"
            name="author"
            placeholder="例如：黎紫书"
            maxLength={120}
          />
        </label>
      </div>

      <div className="import-grid">
        <label>
          <span className="label">语言</span>
          <select className="input" name="language" defaultValue="zh">
            <option value="zh">中文</option>
            <option value="en">英文</option>
          </select>
        </label>
        <label>
          <span className="label">标签（可选）</span>
          <input
            className="input"
            name="tags"
            placeholder="小说，历史，随笔"
            maxLength={80}
          />
        </label>
      </div>

      <label>
        <span className="label">TXT 文件</span>
        <input
          className="input import-file"
          type="file"
          name="file"
          accept=".txt,text/plain"
          required
        />
        <span className="import-hint">
          仅自己可见。请确认你拥有该文件的阅读和使用权；最多 15MB。
        </span>
      </label>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "正在导入…" : "导入到我的书库"}
      </button>
    </form>
  );
}
