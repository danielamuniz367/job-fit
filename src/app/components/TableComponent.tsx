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
  role_name: string;
  status: string;
  company_name: string;
  industry: string;
  salary_min: string;
  salary_max: string;
  date_posted: string;
  source: string;
};

interface TableComponentProps {
  data: Job[];
}

const columns: ColumnDef<Job>[] = [
  { accessorKey: "role_name", header: "Title" },
  { accessorKey: "company_name", header: "Company" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "industry", header: "Industry" },
  { accessorKey: "salary_min", header: "Salary Min" },
  { accessorKey: "salary_max", header: "Salary Max" },
  { accessorKey: "date_posted", header: "Date Posted" },
  { accessorKey: "source", header: "Source" },
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
    <table>
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
