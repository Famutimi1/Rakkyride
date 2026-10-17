import { Fragment, isValidElement, type ReactNode } from "react";
import type { PaginationInfo } from "@/contracts/admin";
import { DirectoryTableClient } from "./directory-table-client";
import { RowActions } from "./ui/row-actions";

function recordLink(node: ReactNode): string | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const href = recordLink(child);
      if (href) return href;
    }
  } else if (isValidElement<{ href?: unknown; children?: ReactNode }>(node)) {
    if (
      typeof node.props.href === "string" &&
      node.props.href.startsWith("/admin/")
    )
      return node.props.href;
    return recordLink(node.props.children);
  }
}
function actionLabel(href: string) {
  if (href.startsWith("/admin/applications/")) return "Review application";
  if (/^\/admin\/(support|safety)\//.test(href)) return "Manage case";
  if (href.startsWith("/admin/ledger/")) return "Manage account";
  return "View record";
}

// Key cells before server serialization; the client owns page navigation.
export function DirectoryTable(props: {
  headers: string[];
  rows: ReactNode[][];
  nextHref?: string;
  preview: boolean;
  rowKeys?: readonly (string | number)[];
  pagination?: PaginationInfo;
  noun?: string;
  actions?: ReactNode[];
  showActions?: boolean;
}) {
  return (
    <DirectoryTableClient
      {...props}
      actions={
        props.actions ??
        props.rows.map((row) => {
          const href = recordLink(row);
          return href ? (
            <RowActions links={[{ href, label: actionLabel(href) }]} />
          ) : undefined;
        })
      }
      rows={props.rows.map((row) =>
        row.map((cell, column) => <Fragment key={column}>{cell}</Fragment>),
      )}
    />
  );
}
