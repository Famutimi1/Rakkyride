"use client";
import {
  useId,
  useState,
  useEffect,
  type ReactNode,
  type FormHTMLAttributes,
} from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "./button";
import { FilterForm } from "./filter-toolbar";
import { RecordSearch } from "../record-search";
import { Icon } from "../icon";

export function SearchFilterBar({
  search,
  children,
  onClear,
  resetKey,
  defaultExpanded = false,
  applyLabel = "Apply filters",
  recordSearchScope,
  preview = false,
  ...props
}: FormHTMLAttributes<HTMLFormElement> & {
  search: ReactNode;
  children: ReactNode;
  onClear: () => void;
  resetKey?: string;
  defaultExpanded?: boolean;
  applyLabel?: string;
  recordSearchScope?: import("@/contracts/admin").SearchScope;
  preview?: boolean;
}) {
  const params = useSearchParams();
  const active = [...params.entries()].filter(([name, value]) => value && !["page", "limit", "cursor", "before", "order", "view"].includes(name));
  const [expanded, setExpanded] = useState(defaultExpanded || active.length > 0);
  useEffect(() => { if (active.length > 0) setExpanded(true); }, [resetKey, active.length]);
  const id = useId();
  return (
    <div>
    {recordSearchScope && <details className="panel"><summary className="button">Find by name or reference</summary><RecordSearch preview={preview} allowSafety={recordSearchScope === "safety"} initialScope={recordSearchScope}/></details>}
    <FilterForm
      {...props}
      key={resetKey}
      className={`search-filter-bar ${props.className ?? ""}`}
    >
      <div key="search" className="search-filter-header">
        {search}
        <Button
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
        >
          <Icon name="filter" />
          {expanded ? "Hide filters" : "More filters"}{active.length > 0 ? ` (${active.length})` : ""}
        </Button>
      </div>
      <div key="filters" id={id} className="filter-expanded" hidden={!expanded}>
        <div className="filter-options">{children}</div>
        <div className="filter-bar-actions">
          <Button type="submit" variant="primary">
            {applyLabel}
          </Button>
          <Button onClick={onClear}>Clear filters</Button>
        </div>
      </div>
    </FilterForm>
    </div>
  );
}
