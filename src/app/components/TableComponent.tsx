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
} from "@tanstack/react-table";

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
  {
    id: "rowNumber",
    header: "#",
    cell: (info) =>
      info.table.getRowModel().rows.findIndex((r) => r.id === info.row.id) + 1,
    enableSorting: false,
  },
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
      >
        {String(cell.getValue())}
      </a>
    );
  }
  return <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>;
};

const TableComponent: React.FC<TableComponentProps> = ({ data }) => {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "posted_date", desc: true },
  ]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
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
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                <CellElement cell={cell} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TableComponent;
