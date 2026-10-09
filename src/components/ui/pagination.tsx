import { LinkButton } from "./button";
import type { ReactNode } from "react";
export function Pagination({
  nextHref,
  firstHref,
  children,
  nextLabel = "Next page →",
}: {
  nextHref?: string;
  firstHref?: string;
  children?: ReactNode;
  nextLabel?: string;
}) {
  if (!nextHref && !firstHref && !children) return null;
  return (
    <nav className="pagination" aria-label="Record pages">
      {firstHref && <LinkButton href={firstHref}>First page</LinkButton>}
      {children}
      {nextHref && <LinkButton href={nextHref}>{nextLabel}</LinkButton>}
    </nav>
  );
}
