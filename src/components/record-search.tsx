"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  SearchScope,
  StaffSearchHit,
  StaffSearchResult,
} from "@/contracts/admin";
import { SearchField } from "./ui/search-field";
import { Dropdown } from "./ui/dropdown";
import { FilterForm, FormField } from "./ui/filter-toolbar";
import { Button } from "./ui/button";
import { Pagination } from "./ui/pagination";
import { QueryState, Timestamp } from "./primitives";

export function RecordSearch({
  preview,
  allowSafety,
  previewRecords = [],
  onNavigate,
}: {
  preview: boolean;
  allowSafety: boolean;
  previewRecords?: StaffSearchHit[];
  onNavigate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [result, setResult] = useState<StaffSearchResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  function clearResults() {
    request.current?.abort();
    request.current = null;
    setResult(null);
    setCursor(null);
    setError("");
    setBusy(false);
  }
  async function search(nextScope = scope, nextCursor: string | null = null) {
    const text = query.trim();
    if (text.length < 3 || text.length > 80) {
      setError("Enter between 3 and 80 characters.");
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setResult(null);
    setScope(nextScope);
    setCursor(nextCursor);
    try {
      let data: StaffSearchResult;
      if (preview) {
        const labels = {
          people: "People",
          trips: "Trips",
          finance: "Money records",
          support: "Support cases",
          safety: "Safety incidents",
        };
        const typeScope = {
          person: "people",
          trip: "trips",
          payment: "finance",
          withdrawal: "finance",
          account: "finance",
          support: "support",
          safety: "safety",
        } as const;
        const scopes = (
          Object.keys(labels) as Exclude<SearchScope, "all">[]
        ).filter((s) => nextScope === "all" || s === nextScope);
        data = {
          groups: scopes.map((s) => ({
            scope: s,
            label: labels[s],
            items: previewRecords
              .filter(
                (r) =>
                  typeScope[r.type] === s &&
                  (r.id.toLowerCase() === text.toLowerCase() ||
                    r.title.toLowerCase().startsWith(text.toLowerCase())),
              )
              .slice(0, nextScope === "all" ? 5 : 20),
            hasMore: false,
            nextCursor: null,
          })),
          asOf: "2026-10-09T10:30:00Z",
          limitPerGroup: nextScope === "all" ? 5 : 20,
        };
      } else {
        const response = await fetch("/api/admin/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({
            query: text,
            scope: nextScope,
            cursor: nextCursor,
          }),
        });
        if (!response.ok) {
          const messages: Record<number, string> = {
            400: "Check the search text or start again from the first page.",
            401: "Your session expired. Sign in again.",
            403: "Your staff role cannot search this scope.",
            429: "Search limit reached. Wait a minute before trying again.",
          };
          throw new Error(
            messages[response.status] ??
              "Record search is unavailable. Try again shortly.",
          );
        }
        data = (await response.json()) as StaffSearchResult;
      }
      if (request.current === controller) setResult(data);
    } catch (error) {
      if (request.current === controller && !controller.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "Record search is unavailable.",
        );
    } finally {
      if (request.current === controller) setBusy(false);
    }
  }
  const total = result?.groups.reduce((sum, g) => sum + g.items.length, 0) ?? 0;
  return (
    <div className="record-search">
      <p className="muted">
        {preview
          ? "Fictional records only. No operational API is called."
          : "Search by full record ID, name prefix, exact phone, email or plate, payment reference prefix, or case subject prefix. Contacts stay masked."}
      </p>
      <FilterForm
        aria-label="Staff record search"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <FormField label="Search text">
          <SearchField
            autoFocus
            label="Search staff records"
            placeholder={
              preview ? "Ada, Chidi, DEMO…" : "Name, exact ID or reference…"
            }
            value={query}
            minLength={3}
            maxLength={80}
            required
            autoComplete="off"
            onChange={(event) => {
              clearResults();
              setQuery(event.target.value);
            }}
            onClear={() => {
              clearResults();
              setQuery("");
            }}
          />
        </FormField>
        <FormField label="Search scope">
          <Dropdown
            aria-label="Record search scope"
            value={scope}
            onValueChange={(value) => {
              clearResults();
              setScope(value as SearchScope);
            }}
            options={[
              { value: "all", label: "All permitted records" },
              { value: "people", label: "People" },
              { value: "trips", label: "Trips" },
              { value: "finance", label: "Money records" },
              { value: "support", label: "Support cases" },
              ...(allowSafety
                ? [{ value: "safety", label: "Safety incidents" }]
                : []),
            ]}
          />
        </FormField>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Searching…" : "Search records"}
        </Button>
      </FilterForm>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div aria-live="polite" aria-busy={busy}>
        {busy && <p>Searching permitted records…</p>}
        {result && (
          <>
            <p className="fine-print">
              {total} {total === 1 ? "result" : "results"} in this page · Up to{" "}
              {result.limitPerGroup} per group ·{" "}
              <Timestamp value={result.asOf} />
            </p>
            {!total && (
              <QueryState
                title="No matching records"
                message="Try an exact record ID or a different prefix."
                icon="search"
              />
            )}
            {result.groups
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <section className="search-group" key={group.scope}>
                  <h3>{group.label}</h3>
                  <ul className="record-search-results">
                    {group.items.map((item) => (
                      <li key={`${item.type}:${item.id}`}>
                        <Link href={item.href} onClick={onNavigate}>
                          <strong>{item.title}</strong>
                          <span>{item.subtitle}</span>
                          <small>
                            {item.type} · {item.id}
                          </small>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {group.hasMore && scope === "all" && (
                    <Button onClick={() => void search(group.scope)}>
                      View {group.label.toLowerCase()} results →
                    </Button>
                  )}
                  {scope !== "all" && (
                    <Pagination>
                      {cursor && (
                        <Button onClick={() => void search(scope)}>
                          First page
                        </Button>
                      )}
                      {group.nextCursor && (
                        <Button
                          onClick={() => void search(scope, group.nextCursor)}
                        >
                          Next page →
                        </Button>
                      )}
                    </Pagination>
                  )}
                </section>
              ))}
          </>
        )}
        {!result && !busy && !error && (
          <p className="fine-print">
            Enter at least three characters, then search. Search text is sent in
            the request body and is not saved in the URL or audit log.
          </p>
        )}
      </div>
    </div>
  );
}
