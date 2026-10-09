"use client";
import { Button, LinkButton } from "./button";
import { Dropdown } from "./dropdown";
import type { PaginationInfo } from "@/contracts/admin";
import type { ReactNode } from "react";
export function Pagination({
  nextHref,
  firstHref,
  children,
  nextLabel = "Next page →",
  pagination,
  onPageChange,
  onPageSizeChange,
  noun = "records",
  busy = false,
}: {
  nextHref?: string;
  firstHref?: string;
  children?: ReactNode;
  nextLabel?: string;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  noun?: string;
  busy?: boolean;
}) {
  if (pagination) {
    const p = pagination;
    const sizes = Array.from(new Set([10, 20, 50, 100, p.pageSize])).sort(
      (a, b) => a - b,
    );
    return (
      <nav
        className="page-pagination"
        aria-label={`${noun} pagination`}
        aria-busy={busy}
      >
        <div className="pagination-summary">
          <span className="pagination-range">
            Showing {p.from}–{p.to} of {p.total} {noun}
          </span>
          <label className="pagination-size">
            <span>Rows</span>
            <Dropdown
              aria-label="Rows per page"
              value={String(p.pageSize)}
              disabled={busy}
              onValueChange={(value) => onPageSizeChange?.(Number(value))}
              options={sizes.map((size) => ({
                value: String(size),
                label: String(size),
              }))}
            />
          </label>
        </div>
        <div className="pagination-controls">
          <Button
            disabled={busy || !p.hasPrevious}
            onClick={() => onPageChange?.(p.page - 1)}
          >
            Previous
          </Button>
          <span className="pagination-page" aria-live="polite">
            Page {p.page} of {p.totalPages}
          </span>
          <Button
            disabled={busy || !p.hasNext}
            onClick={() => onPageChange?.(p.page + 1)}
          >
            Next
          </Button>
        </div>
      </nav>
    );
  }
  if (!nextHref && !firstHref && !children) return null;
  return (
    <nav className="pagination" aria-label="Record pages">
      {firstHref && <LinkButton href={firstHref}>First page</LinkButton>}
      {children}
      {nextHref && <LinkButton href={nextHref}>{nextLabel}</LinkButton>}
    </nav>
  );
}
