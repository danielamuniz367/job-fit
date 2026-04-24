"use server";
import { ReactNode } from "react";
import { neon } from "@neondatabase/serverless";

type TableServerWrapperProps = {
  children: (props: { data: any }) => ReactNode;
};

async function getData() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const sql = neon(process.env.DATABASE_URL);
  const response = await sql`SELECT * FROM job_listing`;
  return response;
}

const TableServerWrapper = async ({ children }: TableServerWrapperProps) => {
  const data = await getData();
  return <>{children({ data })}</>;
};

export default TableServerWrapper;
