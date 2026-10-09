"use client";
import { Fragment, type ReactNode } from "react";
import { useUiStore } from "@/lib/ui-store";
import { QueryState } from "../primitives";
export interface TableColumn {
  id: string;
  label: ReactNode;
  mobileLabel?: string;
  align?: "start" | "end";
}
export interface TableRow {
  id: string | number;
  cells: ReactNode[];
  group?: ReactNode;
}
export function DataTable({
  columns,
  rows,
  label = "Records",
  emptyTitle = "No records found",
  emptyMessage = "There are no records for the current query.",
}: {
  columns: readonly TableColumn[];
  rows: readonly TableRow[];
  label?: string;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  const dense = useUiStore((state) => state.dense);
  if (!rows.length)
    return (
      <QueryState title={emptyTitle} message={emptyMessage} icon="search" />
    );
  return (
    <>
      <div
        className="table-scroll data-table data-table-scroll"
        role="region"
        aria-label={`${label}, scroll horizontally for all columns`}
        tabIndex={0}
      >
        <table className={dense ? "dense" : ""}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={column.align === "end" ? "numeric" : ""}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fragment key={row.id}>
                {row.group && (
                  <tr className="agenda-date">
                    <th colSpan={columns.length} scope="rowgroup">
                      {row.group}
                    </th>
                  </tr>
                )}
                <tr>
                  {row.cells.map((cell, index) => (
                    <td
                      key={columns[index].id}
                      data-label={
                        columns[index].mobileLabel ??
                        (typeof columns[index].label === "string"
                          ? columns[index].label
                          : columns[index].id)
                      }
                      className={
                        columns[index].align === "end" ? "numeric" : ""
                      }
                    >
                      <div className="table-cell-content">{cell}</div>
                    </td>
                  ))}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
