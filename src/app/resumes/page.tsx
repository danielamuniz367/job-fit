import type { Metadata } from "next";
import { getBaseResume, getTailoredList } from "@/lib/jobs";
import BaseResumeEditor from "../components/BaseResumeEditor";

export const metadata: Metadata = {
  title: "Resumes | JobFit",
};

export const dynamic = "force-dynamic";

const ResumesPage = async () => {
  const [baseResume, tailored] = await Promise.all([
    getBaseResume(),
    getTailoredList(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Resumes
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          One base resume, tailored per job. Every tailored draft on the Today
          page is built from this.
        </p>
        <div className="mt-6">
          <BaseResumeEditor initial={baseResume} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Tailored drafts
        </h2>
        {tailored.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            None yet. Open a job on the Today page and generate one.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {tailored.map((t) => (
              <li
                key={t.listing_id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3"
              >
                <div>
                  <a
                    href={t.source_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
                  >
                    {t.title}
                  </a>
                  <p className="text-sm text-zinc-500">{t.company}</p>
                </div>
                <span className="text-xs text-zinc-400">
                  Updated {t.updated_at}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ResumesPage;
