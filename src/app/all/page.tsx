import type { Metadata } from "next";
import { getAllJobs } from "@/lib/jobs";
import TableComponent from "../components/TableComponent";

export const metadata: Metadata = {
  title: "All jobs | JobFit",
};

export const dynamic = "force-dynamic";

const AllJobsPage = async () => {
  const data = await getAllJobs();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          All jobs
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          The full enriched list, ranked by fit. Your daily focus lives on the{" "}
          Today page.
        </p>
      </div>
      <TableComponent data={data} />
    </div>
  );
};

export default AllJobsPage;
