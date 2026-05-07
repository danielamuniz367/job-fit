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

export type Job = {
  id: number;
  title: string;
  status: string;
  company: string;
  industry: string;
  posted_date: string;
  source_link: string;
};

interface TableComponentProps {
  data: Job[];
}

const columns: ColumnDef<Job>[] = [
  // {
  //   id: "rowNumber",
  //   header: "#",
  //   cell: (info) =>
  //     info.table.getRowModel().rows.findIndex((r) => r.id === info.row.id) + 1,
  //   enableSorting: false,
  // },
  { accessorKey: "title", header: () => "Title", sortingFn: "alphanumeric" },
  {
    accessorKey: "company",
    header: () => "Company",
    sortingFn: "alphanumeric",
  },
  { accessorKey: "status", header: () => "Status", sortingFn: "alphanumeric" },
  {
    accessorKey: "industry",
    header: () => "Industry",
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "posted_date",
    header: () => "Posted Date",
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
        className="text-blue-600 hover:underline"
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
    { id: "posted_date", desc: true },
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
      <table className="mx-auto">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
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
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => setSelectedJob(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  <CellElement cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
