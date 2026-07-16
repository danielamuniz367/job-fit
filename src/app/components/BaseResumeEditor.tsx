"use client";
import * as React from "react";
import { saveBaseResume } from "@/app/actions";

const BaseResumeEditor: React.FC<{ initial: string }> = ({ initial }) => {
  const [text, setText] = React.useState(initial);
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const dirty = text !== initial && status !== "saved";

  const save = async () => {
    setStatus("saving");
    try {
      await saveBaseResume(text);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("idle");
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
    setStatus("idle");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Your base resume
        </label>
        <label className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
          Upload .txt / .md
          <input
            type="file"
            accept=".txt,.md,.markdown,text/plain"
            onChange={onFile}
            className="hidden"
          />
        </label>
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (status === "saved") setStatus("idle");
        }}
        placeholder="Paste your resume here (plain text or Markdown). This is the source every tailored version is built from."
        className="w-full h-96 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 text-sm leading-relaxed resize-y font-mono"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={status === "saving" || !dirty}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save resume"}
        </button>
        {status === "saved" && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            Saved ✓
          </span>
        )}
      </div>
    </div>
  );
};

export default BaseResumeEditor;
