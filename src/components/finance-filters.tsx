"use client";
import { FormField } from "./ui/filter-toolbar";
import { SearchField } from "./ui/search-field";
import { Dropdown } from "./ui/dropdown";
import { useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { SearchFilterBar } from "./ui/search-filter-bar";
import { toKobo } from "@/lib/format";
const naira = (value: string | null) =>
  value && /^\d{1,19}$/.test(value)
    ? `${BigInt(value) / 100n}.${String(BigInt(value) % 100n).padStart(2, "0")}`
    : "";
export function FinanceFilters({
  kind,
  preview,
}: {
  kind: "payments" | "withdrawals" | "ledger";
  preview: boolean;
}) {
  const params = useSearchParams(),
    path = usePathname(),
    router = useRouter();
  const [error, setError] = useState("");
  return (
    <SearchFilterBar
      resetKey={params.toString()}
      aria-label="Financial filters"
      search={
        <SearchField
          label={
            kind === "ledger" ? "Exact account ID" : "Exact provider reference"
          }
          name={kind === "ledger" ? "id" : "reference"}
          pattern={
            kind === "ledger" && !preview ? "[0-9a-fA-F-]{36}" : undefined
          }
          placeholder={
            kind === "ledger"
              ? "Search by account ID…"
              : "Search by provider reference…"
          }
          defaultValue={
            params.get(kind === "ledger" ? "id" : "reference") ?? ""
          }
        />
      }
      onClear={() => {
        setError("");
        const next = new URLSearchParams({
          page: "1",
          limit: params.get("limit") ?? "20",
        });
        router.replace(`${path}?${next}`, { scroll: false });
      }}
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        try {
          const next = new URLSearchParams({
            page: "1",
            limit: params.get("limit") ?? "20",
          });
          for (const [key, entry] of new FormData(e.currentTarget)) {
            let value = String(entry);
            if (!value) continue;
            let field = key;
            if (key === "minAmount" || key === "maxAmount") {
              field = key === "minAmount" ? "minKobo" : "maxKobo";
              value = /^0+(\.0{1,2})?$/.test(value) ? "0" : toKobo(value);
            }
            if (key === "from" || key === "to")
              value = `${value}T00:00:00+01:00`;
            next.set(field, value);
          }
          router.replace(`${path}?${next}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Review the filters.");
        }
      }}
    >
      <fieldset className="filter-fields">
        {kind === "ledger" ? (
          <>
            <FormField>
              Account kind
              <Dropdown
                aria-label="Account kind"
                name="kind"
                defaultValue={params.get("kind") ?? ""}
              >
                <option value="">All</option>
                <option value="wallet">Rider wallets</option>
                <option value="earnings">Driver earnings</option>
                <option value="system">System accounts</option>
              </Dropdown>
            </FormField>
            <FormField>
              Owner UUID
              <input
                name="ownerUserId"
                defaultValue={params.get("ownerUserId") ?? ""}
                pattern={preview ? undefined : "[0-9a-fA-F-]{36}"}
              />
            </FormField>
          </>
        ) : (
          <>
            <FormField>
              State
              <Dropdown
                aria-label="Payment or withdrawal state"
                name="status"
                defaultValue={params.get("status") ?? ""}
              >
                <option value="">All</option>
                {(kind === "payments"
                  ? ["pending", "succeeded", "failed", "abandoned", "mismatch"]
                  : ["pending", "processing", "success", "failed", "reversed"]
                ).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Dropdown>
            </FormField>
            {kind === "payments" && (
              <FormField>
                Target
                <Dropdown
                  aria-label="Funding target"
                  name="target"
                  defaultValue={params.get("target") ?? ""}
                >
                  <option value="">All</option>
                  <option value="wallet">Wallet</option>
                  <option value="earnings">Earnings</option>
                </Dropdown>
              </FormField>
            )}
            <FormField>
              User UUID
              <input
                name="userId"
                defaultValue={params.get("userId") ?? ""}
                pattern={preview ? undefined : "[0-9a-fA-F-]{36}"}
              />
            </FormField>
            <FormField>
              Minimum amount · NGN
              <input
                name="minAmount"
                inputMode="decimal"
                defaultValue={naira(params.get("minKobo"))}
              />
            </FormField>
            <FormField>
              Maximum amount · NGN
              <input
                name="maxAmount"
                inputMode="decimal"
                defaultValue={naira(params.get("maxKobo"))}
              />
            </FormField>
            <FormField>
              From · WAT
              <input
                type="date"
                name="from"
                defaultValue={params.get("from")?.slice(0, 10) ?? ""}
              />
            </FormField>
            <FormField>
              To · WAT (exclusive)
              <input
                type="date"
                name="to"
                defaultValue={params.get("to")?.slice(0, 10) ?? ""}
              />
            </FormField>
          </>
        )}
        {kind !== "ledger" && (
          <>
            <FormField>
              Record UUID
              <input
                name="id"
                defaultValue={params.get("id") ?? ""}
                pattern={preview ? undefined : "[0-9a-fA-F-]{36}"}
              />
            </FormField>
          </>
        )}
      </fieldset>
      {preview && (
        <small className="muted">
          Preview filters apply only to fictional records.
        </small>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </SearchFilterBar>
  );
}
