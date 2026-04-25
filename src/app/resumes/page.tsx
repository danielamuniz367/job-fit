import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resumes | JobFit",
};

const ResumesPage = async () => {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Resumes</h1>
    </div>
  );
};

export default ResumesPage;
