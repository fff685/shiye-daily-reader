"use client";

import { useActionState } from "react";
import {
  updatePreferencesAction,
  type PreferenceState,
} from "@/lib/actions/reading";

export function PreferenceForm({
  readingMinutes,
  autoContinue,
}: {
  readingMinutes: number;
  autoContinue: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    PreferenceState,
    FormData
  >(updatePreferencesAction, {});

  return (
    <form action={formAction} className="settings-form">
      {state.message ? <p className="form-success">{state.message}</p> : null}
      {state.ok === false ? <p className="form-error">保存失败，请再试一次。</p> : null}

      <div>
        <span className="label">默认每日阅读时长</span>
        <div className="pace-options">
          {[10, 15, 20].map((minutes) => (
            <label className="pace-option" key={minutes}>
              <input
                type="radio"
                name="readingMinutes"
                value={minutes}
                defaultChecked={readingMinutes === minutes}
              />
              <span>{minutes} 分钟</span>
            </label>
          ))}
        </div>
      </div>

      <label className="switch-row">
        <span>
          <strong>自动继续</strong>
          <span>读完一段后直接进入下一段，不再弹出询问。</span>
        </span>
        <input
          type="checkbox"
          name="autoContinue"
          className="checkbox"
          defaultChecked={autoContinue}
        />
      </label>

      <button type="submit" className="btn btn-soft" disabled={pending}>
        {pending ? "保存中…" : "保存偏好"}
      </button>
    </form>
  );
}
