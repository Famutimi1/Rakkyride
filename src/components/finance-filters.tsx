"use client";
import { useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
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
    <details className="advanced-filters">
      <summary>
        Filter records ·{" "}
        {kind === "ledger"
          ? "account kind and owner"
          : "status, reference, amount, date"}
      </summary>
      <form
        className="report-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          try {
            const next = new URLSearchParams();
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
            setError(
              err instanceof Error ? err.message : "Review the filters.",
            );
          }
        }}
      >
        <fieldset disabled={preview} className="filter-fields">
          {kind === "ledger" ? (
            <>
              <label className="form-label">
                Account kind
                <select name="kind" defaultValue={params.get("kind") ?? ""}>
                  <option value="">All</option>
                  <option value="wallet">Rider wallets</option>
                  <option value="earnings">Driver earnings</option>
                  <option value="system">System accounts</option>
                </select>
              </label>
              <label className="form-label">
                Owner UUID
                <input
                  name="ownerUserId"
                  defaultValue={params.get("ownerUserId") ?? ""}
                  pattern="[0-9a-fA-F-]{36}"
                />
              </label>
            </>
          ) : (
            <>
              <label className="form-label">
                State
                <select name="status" defaultValue={params.get("status") ?? ""}>
                  <option value="">All</option>
                  {(kind === "payments"
                    ? [
                        "pending",
                        "succeeded",
                        "failed",
                        "abandoned",
                        "mismatch",
                      ]
                    : ["pending", "processing", "success", "failed", "reversed"]
                  ).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              {kind === "payments" && (
                <label className="form-label">
                  Target
                  <select
                    name="target"
                    defaultValue={params.get("target") ?? ""}
                  >
                    <option value="">All</option>
                    <option value="wallet">Wallet</option>
                    <option value="earnings">Earnings</option>
                  </select>
                </label>
              )}
              <label className="form-label">
                Exact provider reference
                <input
                  name="reference"
                  maxLength={80}
                  defaultValue={params.get("reference") ?? ""}
                />
              </label>
              <label className="form-label">
                User UUID
                <input
                  name="userId"
                  defaultValue={params.get("userId") ?? ""}
                  pattern="[0-9a-fA-F-]{36}"
                />
              </label>
              <label className="form-label">
                Minimum amount · NGN
                <input
                  name="minAmount"
                  inputMode="decimal"
                  defaultValue={naira(params.get("minKobo"))}
                />
              </label>
              <label className="form-label">
                Maximum amount · NGN
                <input
                  name="maxAmount"
                  inputMode="decimal"
                  defaultValue={naira(params.get("maxKobo"))}
                />
              </label>
              <label className="form-label">
                From · WAT
                <input
                  type="date"
                  name="from"
                  defaultValue={params.get("from")?.slice(0, 10) ?? ""}
                />
              </label>
              <label className="form-label">
                To · WAT (exclusive)
                <input
                  type="date"
                  name="to"
                  defaultValue={params.get("to")?.slice(0, 10) ?? ""}
                />
              </label>
            </>
          )}
          <label className="form-label">
            Record UUID
            <input
              name="id"
              defaultValue={params.get("id") ?? ""}
              pattern="[0-9a-fA-F-]{36}"
            />
          </label>
          <button className="button secondary">Apply</button>
        </fieldset>
        <Link className="text-link" href={path}>
          Clear filters
        </Link>
        {preview && (
          <small className="muted">
            Server filters are available with real staff data.
          </small>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </details>
  );
}
