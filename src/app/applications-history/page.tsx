import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application History | JobFit",
};

const ApplicationHistoryPage = async () => {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Application History
      </h1>
    </div>
  );
};

export default ApplicationHistoryPage;
