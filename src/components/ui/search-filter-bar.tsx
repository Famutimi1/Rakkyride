"use client";
import {
  useId,
  useState,
  type ReactNode,
  type FormHTMLAttributes,
} from "react";
import { Button } from "./button";
import { FilterForm } from "./filter-toolbar";
import { Icon } from "../icon";

export function SearchFilterBar({
  search,
  children,
  onClear,
  resetKey,
  defaultExpanded = false,
  applyLabel = "Apply filters",
  ...props
}: FormHTMLAttributes<HTMLFormElement> & {
  search: ReactNode;
  children: ReactNode;
  onClear: () => void;
  resetKey?: string;
  defaultExpanded?: boolean;
  applyLabel?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const id = useId();
  return (
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
          {expanded ? "Hide filters" : "More filters"}
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
  );
}
