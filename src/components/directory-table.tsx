import { Fragment, type ReactNode } from "react";
import { DataTable } from "./ui/data-table";
import { Pagination } from "./ui/pagination";
export function DirectoryTable({
  headers,
  rows,
  nextHref,
  preview,
  rowKeys,
}: {
  headers: string[];
  rows: ReactNode[][];
  nextHref?: string;
  preview: boolean;
  rowKeys?: readonly (string | number)[];
}) {
  return (
    <div className="directory">
      <DataTable
        columns={headers.map((label, index) => ({ id: String(index), label }))}
        rows={rows.map((cells, index) => ({
          id: rowKeys?.[index] ?? index,
          cells: cells.map((cell, column) => (
            <Fragment key={column}>{cell}</Fragment>
          )),
        }))}
      />
      <div className="table-footer">
        <span>
          {rows.length} {preview ? "sample " : ""}
          {rows.length === 1 ? "record" : "records"}
          {preview ? "" : " on this page"}
        </span>
        <span>
          {preview ? "Development fixtures" : "Authorized staff snapshot"}
        </span>
      </div>
      <Pagination nextHref={nextHref} />
    </div>
  );
}
