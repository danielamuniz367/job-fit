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
    cell: (info) => info.row.index + 1,
  },
  { accessorKey: "title", header: "Title" },
  { accessorKey: "company", header: "Company" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "industry", header: "Industry" },
  { accessorKey: "posted_date", header: "Posted Date" },
  { accessorKey: "source_link", header: "Source" },
];

const TableComponent: React.FC<TableComponentProps> = ({ data }) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
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
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )}
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
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TableComponent;
