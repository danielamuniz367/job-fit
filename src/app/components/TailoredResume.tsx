"use client";
import * as React from "react";
import Link from "next/link";
import {
  loadTailoredResume,
  generateTailoredResumeAction,
  answerContextQuestions,
  type TailoredResumeData,
} from "@/app/actions";

const TailoredResume: React.FC<{ listingId: number }> = ({ listingId }) => {
  const [loading, setLoading] = React.useState(true);
  const [hasBaseResume, setHasBaseResume] = React.useState(false);
  const [data, setData] = React.useState<TailoredResumeData | null>(null);
  const [busy, setBusy] = React.useState<null | "generate" | "strengthen">(
    null,
  );
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [draft, setDraft] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  // Load any cached draft when the panel opens for this job. The panel remounts
  // per job, so `loading` starts true and only needs to be cleared here.
  React.useEffect(() => {
    let active = true;
    loadTailoredResume(listingId)
      .then((state) => {
        if (!active) return;
        setHasBaseResume(state.hasBaseResume);
        if (state.resume) {
          setData(state.resume);
          setDraft(state.resume.draft_md ?? "");
          setAnswers(state.resume.context_answers ?? {});
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [listingId]);

  const applyData = (d: TailoredResumeData) => {
    setData(d);
    setDraft(d.draft_md ?? "");
    setAnswers(d.context_answers ?? {});
  };

  const generate = async () => {
    setBusy("generate");
    try {
      applyData(await generateTailoredResumeAction(listingId));
    } finally {
      setBusy(null);
    }
  };

  const strengthen = async () => {
    setBusy("strengthen");
    try {
      applyData(await answerContextQuestions(listingId, answers));
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shell = (children: React.ReactNode) => (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
        Tailored resume
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );

  if (loading) {
    return shell(<p className="text-sm text-zinc-400">Loading…</p>);
  }

  if (!hasBaseResume) {
    return shell(
      <p className="text-sm text-zinc-500">
        Add your base resume on the{" "}
        <Link
          href="/resumes"
          className="text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Resumes
        </Link>{" "}
        page to generate a version tailored for this role.
      </p>,
    );
  }

  if (!data) {
    return shell(
      <div>
        <p className="text-sm text-zinc-500">
          Reshape your resume for this specific role — a targeted summary,
          reordered skills, and rewritten bullets.
        </p>
        <button
          onClick={generate}
          disabled={busy !== null}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {busy === "generate" ? "Generating…" : "Generate tailored resume"}
        </button>
      </div>,
    );
  }

  // Draft exists but empty → almost always a missing API key.
  const draftEmpty = !draft.trim();

  return shell(
    <div className="flex flex-col gap-4">
      {draftEmpty ? (
        <div>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            No draft yet — if this keeps failing, set ANTHROPIC_API_KEY to
            enable AI tailoring.
          </p>
          <button
            onClick={generate}
            disabled={busy !== null}
            className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {busy === "generate" ? "Generating…" : "Generate tailored resume"}
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs uppercase tracking-wide text-zinc-400">
              Draft
            </span>
            <button
              onClick={copy}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full h-64 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3 text-sm font-mono leading-relaxed resize-y"
          />
        </div>
      )}

      {data.questions.length > 0 && (
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Strengthen it — answer a few and regenerate:
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {data.questions.map((q, i) => (
              <label key={i} className="block">
                <span className="text-sm text-zinc-600 dark:text-zinc-300">
                  {q}
                </span>
                <textarea
                  value={answers[q] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q]: e.target.value }))
                  }
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-2 text-sm resize-y"
                  placeholder="Your answer…"
                />
              </label>
            ))}
          </div>
          <button
            onClick={strengthen}
            disabled={busy !== null}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {busy === "strengthen"
              ? "Strengthening…"
              : "Strengthen & regenerate"}
          </button>
        </div>
      )}

      {!draftEmpty && (
        <button
          onClick={generate}
          disabled={busy !== null}
          className="self-start text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
        >
          {busy === "generate" ? "Regenerating…" : "↺ Regenerate from scratch"}
        </button>
      )}
    </div>,
  );
};

export default TailoredResume;
