import type { ReactNode } from "react";
import Link from "next/link";
import { QueryState } from "./primitives";
export function DirectoryTable({
  headers,
  rows,
  nextHref,
  preview,
}: {
  headers: string[];
  rows: ReactNode[][];
  nextHref?: string;
  preview: boolean;
}) {
  return (
    <div className="directory">
      {rows.length ? (
        <div
          className="table-scroll"
          role="region"
          aria-label="Records, scroll horizontally for all columns"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <QueryState
          title="No records found"
          message="There are no records for the current query."
          icon="search"
        />
      )}
      <div className="table-footer">
        <span>
          {rows.length} {preview ? "sample records" : "records on this page"}
        </span>
        <span>
          {preview ? "Development fixtures" : "Authorized staff snapshot"}
        </span>
      </div>
      {nextHref && (
        <div className="pagination">
          <Link className="button secondary" href={nextHref}>
            Next page →
          </Link>
        </div>
      )}
    </div>
  );
}
