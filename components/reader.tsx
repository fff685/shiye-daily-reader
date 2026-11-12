"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import {
  completeSegmentAction,
  setAutoContinueAction,
  type CompleteReadingResult,
} from "@/lib/actions/reading";
import { translateSegmentAction } from "@/lib/actions/translation";
import { isHeading, splitSegmentIntoParagraphs } from "@/lib/reader";

type SegmentView = {
  text: string;
  minutes: number;
  progress: number;
  isEnd: boolean;
};

function formatTimer(total: number): string {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pair = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pair(minutes)}:${pair(seconds)}`
    : `${pair(minutes)}:${pair(seconds)}`;
}

function segmentStats(result: CompleteReadingResult) {
  if (!result.ok) return null;
  return result;
}

export function Reader({
  bookId,
  title,
  language,
  dayIndex,
  minutes,
  autoContinue: initialAutoContinue,
  initialSegment,
  initialTranslation,
}: {
  bookId: string;
  title: string;
  author: string | null;
  language: string;
  dayIndex: number;
  minutes: number;
  autoContinue: boolean;
  initialSegment: SegmentView;
  initialTranslation: string[] | null;
}) {
  const [segment, setSegment] = useState(initialSegment);
  const [currentDay, setCurrentDay] = useState(dayIndex);
  const [seconds, setSeconds] = useState(0);
  const [autoContinue, setAutoContinue] = useState(initialAutoContinue);
  const [result, setResult] = useState<CompleteReadingResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(19);
  const [translation, setTranslation] = useState<string[] | null>(
    initialTranslation,
  );
  const [translationMode, setTranslationMode] = useState<
    "original" | "translation" | "bilingual"
  >("original");
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const lastActivity = useRef(0);

  useEffect(() => {
    lastActivity.current = Date.now();

    const bump = () => {
      lastActivity.current = Date.now();
    };

    window.addEventListener("scroll", bump, { passive: true });
    window.addEventListener("pointerdown", bump, { passive: true });
    window.addEventListener("keydown", bump);

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActivity.current > 120000) return;
      setSeconds((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("scroll", bump);
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 5200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function advance(next: SegmentView, quote?: string) {
    setSegment(next);
    setCurrentDay((value) => value + 1);
    setSeconds(0);
    setResult(null);
    setShowModal(false);
    setError(null);
    setTranslation(null);
    setTranslationMode("original");
    setTranslationError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (quote) setToast(quote);
  }

  function complete() {
    if (pending) return;
    setError(null);

    startTransition(async () => {
      const response = await completeSegmentAction({ bookId, seconds });
      if (!response.ok) {
        setError(response.error);
        return;
      }

      setResult(response);

      if (response.finished || !response.next) {
        setShowModal(true);
        return;
      }

      if (autoContinue) {
        advance(
          {
            text: response.next.text,
            minutes: response.next.minutes,
            progress: response.next.progress,
            isEnd: response.next.isEnd,
          },
          response.quote,
        );
      } else {
        setShowModal(true);
      }
    });
  }

  function continueNext() {
    if (!result?.ok || !result.next) return;
    advance(
      {
        text: result.next.text,
        minutes: result.next.minutes,
        progress: result.next.progress,
        isEnd: result.next.isEnd,
      },
      result.quote,
    );
  }

  function toggleAutoContinue() {
    const next = !autoContinue;
    setAutoContinue(next);
    startTransition(async () => {
      await setAutoContinueAction(bookId, next);
    });
  }

  async function ensureTranslation(mode: "translation" | "bilingual") {
    if (language !== "en") return;
    setTranslationMode(mode);
    setTranslationError(null);
    if (translation || translationLoading) return;

    setTranslationLoading(true);
    try {
      const response = await translateSegmentAction({ bookId });
      if (!response.ok) {
        setTranslationError(response.error);
        setTranslationMode("original");
        return;
      }
      setTranslation(response.paragraphs);
    } catch {
      setTranslationError("翻译暂时没有成功，请稍后再试。");
      setTranslationMode("original");
    } finally {
      setTranslationLoading(false);
    }
  }

  const paragraphs = splitSegmentIntoParagraphs(segment.text);
  const stats = result ? segmentStats(result) : null;
  const progressPercent = Math.max(0, Math.min(100, segment.progress * 100));

  if (!segment.text) {
    return (
      <main className="reader-shell">
        <div className="reader-error">
          <p className="eyebrow">THE END</p>
          <h1>这本书，你已经读完了。</h1>
          <p>合上书，去过一会儿没有字的生活。下一本书随时在这里。</p>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              marginTop: 24,
            }}
          >
            <Link href="/" className="btn btn-ghost">
              回到首页
            </Link>
            <Link href="/discover" className="btn btn-primary">
              去找下一本
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="reader-shell">
      <header className="reader-topbar">
        <div className="reader-topbar-inner">
          <Link href={`/books/${bookId}`} className="reader-icon-btn" aria-label="返回书目">
            ←
          </Link>
          <div className="reader-book-meta">
            <strong>{title}</strong>
            <span>
              第 {currentDay} 天 · 每日 {minutes} 分钟
            </span>
          </div>
          <div className="reader-tools">
            <button
              type="button"
              className="reader-toggle"
              data-on={autoContinue}
              onClick={toggleAutoContinue}
              aria-pressed={autoContinue}
              title="读完后自动进入下一段，不再询问"
            >
              <span style={{ fontSize: 14 }}>↻</span>
              <span>自动继续</span>
            </button>
            <button
              type="button"
              className="reader-icon-btn"
              onClick={() => setFontSize((value) => Math.max(16, value - 1))}
              aria-label="缩小字号"
              title="缩小字号"
            >
              A−
            </button>
            <button
              type="button"
              className="reader-icon-btn"
              onClick={() => setFontSize((value) => Math.min(26, value + 1))}
              aria-label="放大字号"
              title="放大字号"
            >
              A+
            </button>
          </div>
        </div>
        <div className="reader-progress">
          <span style={{ width: `${Math.max(1, progressPercent)}%` }} />
        </div>
      </header>

      {toast ? <div className="reader-toast">{toast}</div> : null}

      <div className="reader-main">
        <div className="reader-day">
          <span>DAY {String(currentDay).padStart(2, "0")}</span>
          <span>约 {segment.minutes} 分钟</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <h1 className="reader-title">{title}</h1>
        <p className="reader-subtitle">读到这里，刚好是今天的分量。</p>

        {language === "en" ? (
          <>
            <div className="reader-modes" role="group" aria-label="翻译模式">
              <button
                type="button"
                data-active={translationMode === "original"}
                onClick={() => setTranslationMode("original")}
              >
                原文
              </button>
              <button
                type="button"
                data-active={translationMode === "bilingual"}
                onClick={() => ensureTranslation("bilingual")}
                disabled={translationLoading}
              >
                中英对照
              </button>
              <button
                type="button"
                data-active={translationMode === "translation"}
                onClick={() => ensureTranslation("translation")}
                disabled={translationLoading}
              >
                只看中译
              </button>
              {translationLoading ? (
                <span className="reader-mode-status">正在生成中译…</span>
              ) : null}
            </div>
            {translationMode !== "original" && translation ? (
              <p className="translation-note">
                由 DeepSeek 生成的机器翻译，仅供阅读参考。
              </p>
            ) : null}
            {translationError ? (
              <p className="form-error" style={{ marginBottom: 18 }} role="alert">
                {translationError}
              </p>
            ) : null}
          </>
        ) : null}

        <article
          className={`reader-content ${language === "en" ? "reader-content-en" : ""}`}
          style={{ "--reader-font-size": `${fontSize}px` } as React.CSSProperties}
        >
          {translationMode === "translation" && translation
            ? translation.map((paragraph, index) => (
                <p
                  className="reader-translation reader-translation-only"
                  key={`zh-${index}-${paragraph.slice(0, 12)}`}
                >
                  {paragraph}
                </p>
              ))
            : paragraphs.map((paragraph, index) => (
                <Fragment key={`${index}-${paragraph.slice(0, 12)}`}>
                  {isHeading(paragraph) ? (
                    <h2>{paragraph}</h2>
                  ) : (
                    <p>{paragraph}</p>
                  )}
                  {translationMode === "bilingual" && translation?.[index] ? (
                    <p className="reader-translation">
                      {translation[index]}
                    </p>
                  ) : null}
                </Fragment>
              ))}
        </article>

        <div className="reader-end-mark">
          <span>{segment.isEnd ? "BOOK END" : "TODAY'S PAGE"}</span>
        </div>

        {error ? (
          <p className="form-error" style={{ marginTop: 18 }} role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="reader-bottom">
        <div className="reader-bottom-inner">
          <div className="reader-timer">
            <strong>{formatTimer(seconds)}</strong>
            <span>专注阅读中</span>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={complete}
            disabled={pending}
          >
            {pending ? "正在保存…" : "我读完了"}
          </button>
        </div>
      </div>

      {showModal && stats ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reading-complete-title"
          >
            <p className="modal-kicker">
              {stats.finished ? "BOOK COMPLETE" : "TODAY COMPLETE"}
            </p>
            <h2 id="reading-complete-title">
              {stats.finished ? "这本书，你读完了。" : "今天的份量，完成了。"}
            </h2>
            <blockquote className="modal-quote">{stats.quote}</blockquote>

            <div className="modal-stats">
              <div className="modal-stat">
                <strong>{stats.minutes}</strong>
                <span>分钟</span>
              </div>
              <div className="modal-stat">
                <strong>{stats.chars.toLocaleString("zh-CN")}</strong>
                <span>字</span>
              </div>
              <div className="modal-stat">
                <strong>第 {stats.dayIndex} 天</strong>
                <span>阅读日</span>
              </div>
            </div>

            {!stats.finished && stats.next ? (
              <label className="modal-check">
                <input
                  type="checkbox"
                  checked={autoContinue}
                  onChange={toggleAutoContinue}
                />
                <span>
                  以后读完自动继续，不再询问。你也可以随时在阅读页顶部关闭。
                </span>
              </label>
            ) : null}

            <div className="modal-actions">
              {!stats.finished && stats.next ? (
                <button type="button" className="btn btn-primary" onClick={continueNext}>
                  继续读下一段
                </button>
              ) : (
                <Link href="/discover" className="btn btn-primary">
                  去找下一本
                </Link>
              )}
              <Link href="/" className="btn btn-ghost">
                今天到这里
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
