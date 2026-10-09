import { Fragment, type ReactNode } from "react";
import type { PaginationInfo } from "@/contracts/admin";
import { DirectoryTableClient } from "./directory-table-client";

// Key cells before server serialization; the client owns page navigation.
export function DirectoryTable(props: {
  headers: string[];
  rows: ReactNode[][];
  nextHref?: string;
  preview: boolean;
  rowKeys?: readonly (string | number)[];
  pagination?: PaginationInfo;
  noun?: string;
}) {
  return (
    <DirectoryTableClient
      {...props}
      rows={props.rows.map((row) =>
        row.map((cell, column) => <Fragment key={column}>{cell}</Fragment>),
      )}
    />
  );
}
