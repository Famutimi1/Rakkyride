"use client";
import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PaginationInfo } from "@/contracts/admin";
import { paginationInfo } from "@/lib/pagination";
import { Fragment, type ReactNode } from "react";
import { DataTable } from "./ui/data-table";
import { Pagination } from "./ui/pagination";
export function DirectoryTableClient({
  headers,
  rows,
  nextHref,
  preview,
  rowKeys,
  pagination,
  actions,
  noun = "records",
  showActions,
}: {
  headers: string[];
  rows: ReactNode[][];
  nextHref?: string;
  preview: boolean;
  rowKeys?: readonly (string | number)[];
  pagination?: PaginationInfo;
  actions?: ReactNode[];
  showActions?: boolean;
  noun?: string;
}) {
  const [localPage, setLocalPage] = useState(1),
    [localSize, setLocalSize] = useState(20);
  const [pending, startTransition] = useTransition();
  const params = useSearchParams(),
    path = usePathname(),
    router = useRouter();
  const meta =
    pagination ??
    (!nextHref && !params.has("cursor") && !params.has("before")
      ? paginationInfo(rows.length, localPage, localSize)
      : undefined);
  const offset = pagination || !meta ? 0 : (meta.page - 1) * meta.pageSize;
  const visible = pagination || !meta ? rows : rows.slice(offset, meta.to);
  function navigate(page: number, size = meta?.pageSize ?? 20) {
    if (!pagination) {
      setLocalPage(page);
      setLocalSize(size);
      return;
    }
    const next = new URLSearchParams(params.toString());
    next.delete("cursor");
    next.delete("before");
    next.set("page", String(page));
    next.set("limit", String(size));
    startTransition(() => router.push(`${path}?${next}`, { scroll: false }));
  }
  return (
    <div className="directory">
      <DataTable
        showActions={showActions}
        columns={headers.map((label, index) => ({ id: String(index), label }))}
        rows={visible.map((cells, index) => ({
          id: rowKeys?.[index + offset] ?? index + offset,
          actions: actions?.[index + offset],
          cells: cells.map((cell, column) => (
            <Fragment key={column}>{cell}</Fragment>
          )),
        }))}
      />
      <Pagination
        pagination={meta}
        nextHref={nextHref}
        noun={noun}
        busy={pending}
        onPageChange={(page) => navigate(page)}
        onPageSizeChange={(size) => navigate(1, size)}
      />
    </div>
  );
}
