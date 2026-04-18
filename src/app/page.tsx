"use client";
import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from "@tanstack/react-table";

type Job = {
  id: number;
  title: string;
  status: string;
  company: string;
  industry: string;
  salaryMin: number;
  salaryMax: number;
  datePosted: string;
  link: string;
};

const targetSalary = 165000;

const data: Job[] = [
  {
    id: 1,
    title: "Frontend Engineer",
    status: "Interviewing",
    company: "Acme Corp",
    industry: "Tech",
    salaryMin: 120000,
    salaryMax: 170000,
    datePosted: "2026-04-10",
    link: "#",
  },
  {
    id: 2,
    title: "Backend Developer",
    status: "Applied",
    company: "Beta LLC",
    industry: "Finance",
    salaryMin: 85000,
    salaryMax: 95000,
    datePosted: "2026-04-12",
    link: "#",
  },
  {
    id: 3,
    title: "Product Manager",
    status: "Offer",
    company: "Gamma Inc",
    industry: "Healthcare",
    salaryMin: 180000,
    salaryMax: 220000,
    datePosted: "2026-04-08",
    link: "#",
  },
];

const columns: ColumnDef<Job>[] = [
  {
    header: "Role Title",
    accessorKey: "title",
    cell: ({ row }) => (
      <a href={row.original.link} className="text-blue-600 underline">
        {row.original.title}
      </a>
    ),
  },
  { header: "Status", accessorKey: "status" },
  { header: "Company", accessorKey: "company" },
  { header: "Industry", accessorKey: "industry" },
  {
    header: "Salary Fit",
    id: "salaryFitLabel",
    accessorFn: (row) => {
      if (row.salaryMax < targetSalary) return 0; // Below
      if (row.salaryMin > targetSalary) return 2; // Exceeds
      return 1; // Within
    },
    cell: ({ row }) => {
      const { salaryMin, salaryMax } = row.original;
      if (salaryMax < targetSalary)
        return <span className="text-red-600">Below</span>;
      if (salaryMin > targetSalary)
        return <span className="text-green-600">Exceeds</span>;
      return <span className="text-yellow-600">Within</span>;
    },
    sortUndefined: false,
    enableSorting: true,
    sortingFn: "basic",
  },
  {
    header: "Date Posted",
    accessorKey: "datePosted",
    sortingFn: "datetime",
  },
];

export default function HomePage() {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "salaryFitLabel", desc: false },
    { id: "datePosted", desc: true },
  ]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: false,
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black p-8">
      <h1 className="text-2xl font-bold mb-6 text-black dark:text-zinc-50">
        Filtered Jobs Table
      </h1>
      <div className="overflow-x-auto w-full max-w-4xl">
        <table className="min-w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 text-left cursor-pointer select-none"
                    onClick={
                      header.column.getCanSort()
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {header.column.getIsSorted()
                      ? header.column.getIsSorted() === "desc"
                        ? " ↓"
                        : " ↑"
                      : null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-700"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
