"use client";
import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  ColumnDef,
  Header,
  Cell,
  getPaginationRowModel,
  PaginationState,
} from "@tanstack/react-table";
import JobPanel from "./JobPanel";
import { useState } from "react";
import type { Job } from "@/lib/jobs";
import { STRENGTH_STYLES, locationLabel } from "@/lib/display";

interface TableComponentProps {
  data: Job[];
}

const columns: ColumnDef<Job>[] = [
  { accessorKey: "title", header: () => "Title", sortingFn: "alphanumeric" },
  {
    accessorKey: "company",
    header: () => "Company",
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "fit_score",
    header: () => "Fit",
    sortingFn: "basic",
    cell: (info) => {
      const job = info.row.original;
      if (!job.fit_strength) return "—";
      const s = STRENGTH_STYLES[job.fit_strength];
      return (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}
        >
          {job.fit_score ?? "?"}
        </span>
      );
    },
  },
  {
    accessorKey: "location_type",
    header: () => "Location",
    sortingFn: "alphanumeric",
    cell: (info) => locationLabel(info.row.original.location_type) ?? "—",
  },
  {
    accessorKey: "posted_date",
    header: () => "Posted",
    sortingFn: "alphanumeric",
  },
];

const HeaderElement: React.FC<{
  header: Header<Job, unknown>;
  children?: React.ReactNode;
}> = ({ header, children }) => (
  <div
    className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
    onClick={header.column.getToggleSortingHandler()}
    title={
      header.column.getCanSort()
        ? header.column.getNextSortingOrder() === "asc"
          ? "Sort ascending"
          : header.column.getNextSortingOrder() === "desc"
            ? "Sort descending"
            : "Clear sort"
        : undefined
    }
  >
    {header.column.getIsSorted() === "asc"
      ? "🔼"
      : header.column.getIsSorted() === "desc"
        ? "🔽"
        : ""}
    {children}
  </div>
);

const CellElement: React.FC<{
  cell: Cell<Job, unknown>;
}> = ({ cell }) => {
  if (cell.column.id === "title") {
    return (
      <a
        href={cell.row.original.source_link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        {String(cell.getValue())}
      </a>
    );
  }
  return <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>;
};

const TableComponent: React.FC<TableComponentProps> = ({ data }) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "fit_score", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
  });

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-medium text-zinc-500"
                  >
                    <HeaderElement header={header}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </HeaderElement>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                onClick={() => setSelectedJob(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    <CellElement cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="h-2" />
      <div className="flex items-center justify-center gap-2">
        <button
          className="border rounded p-1"
          onClick={() => table.firstPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {"<<"}
        </button>
        <button
          className="border rounded p-1"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {"<"}
        </button>
        <button
          className="border rounded p-1"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {">"}
        </button>
        <button
          className="border rounded p-1"
          onClick={() => table.lastPage()}
          disabled={!table.getCanNextPage()}
        >
          {">>"}
        </button>
        <span className="flex items-center gap-1">
          <div>Page</div>
          <strong>
            {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount().toLocaleString()}
          </strong>
        </span>
        <span className="flex items-center gap-1">
          | Go to page:
          <input
            type="number"
            min="1"
            max={table.getPageCount()}
            defaultValue={table.getState().pagination.pageIndex + 1}
            onChange={(e) => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0;
              table.setPageIndex(page);
            }}
            className="border p-1 rounded w-16"
          />
        </span>
        <select
          value={table.getState().pagination.pageSize}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
        >
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
      <JobPanel job={selectedJob} onClose={() => setSelectedJob(null)} />
    </>
  );
};

export default TableComponent;
