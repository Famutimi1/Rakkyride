"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useState } from "react";
import { tripStatuses, type Trip } from "@/contracts/admin";
import { statusLabel } from "@/lib/format";
import { useUiStore } from "@/lib/ui-store";
import { Icon } from "./icon";
import { MoneyValue, StatusBadge, Timestamp, QueryState } from "./primitives";
export function TripDirectory({
  trips,
  preview,
  nextCursor = null,
  mode = "all",
  showFilters = true,
}: {
  trips: Trip[];
  preview: boolean;
  nextCursor?: string | null;
  showFilters?: boolean;
  mode?: "all" | "live" | "scheduled" | "courier";
}) {
  const params = useSearchParams(),
    pathname = usePathname(),
    router = useRouter();
  const status = params.get("status") ?? "",
    service = params.get("service") ?? "",
    order = params.get("order") ?? "desc";
  const [query, setQuery] = useState(params.get("id") ?? "");
  const dense = useUiStore((s) => s.dense),
    setDense = useUiStore((s) => s.setDense);
  function filter(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.delete("cursor");
    if (value) next.set(name, value);
    else next.delete(name);
    router.replace(`${pathname}?${next}`, { scroll: false });
  }
  const rows = preview
    ? trips
        .filter(
          (t) =>
            (mode !== "scheduled" ||
              (Boolean(t.scheduledAt) &&
                (params.get("view") === "history" ||
                  ![
                    "completed",
                    "cancelled",
                    "returned",
                    "no_drivers_found",
                  ].includes(t.status)))) &&
            (mode !== "courier" || t.service === "courier") &&
            (mode !== "live" ||
              [
                "searching",
                "driver_assigned",
                "driver_arrived",
                "in_progress",
                "returning",
              ].includes(t.status)) &&
            (!status || t.status === status) &&
            (!service || t.service === service) &&
            (!query || t.id.toLowerCase().includes(query.toLowerCase())),
        )
        .sort(
          (a, b) =>
            (mode === "scheduled" && params.get("view") !== "history"
              ? 1
              : order === "asc"
                ? 1
                : -1) *
            ((mode === "scheduled"
              ? (a.scheduledAt ?? a.requestedAt)
              : a.requestedAt
            ).localeCompare(
              mode === "scheduled"
                ? (b.scheduledAt ?? b.requestedAt)
                : b.requestedAt,
            ) || a.id.localeCompare(b.id)),
        )
    : trips;
  return (
    <div className="directory">
      {showFilters && (
        <div className="filter-bar">
          <div className="search-input">
            <Icon name="search" />
            <input
              aria-label="Find a trip by exact ID"
              placeholder="Find a trip ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !preview) filter("id", query);
              }}
            />
          </div>
          <select
            aria-label="Trip status"
            value={status}
            onChange={(e) => filter("status", e.target.value)}
          >
            <option value="">All statuses</option>
            {tripStatuses.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s, mode === "courier" ? "courier" : undefined)}
              </option>
            ))}
          </select>
          {mode !== "courier" && (
            <select
              aria-label="Service"
              value={service}
              onChange={(e) => filter("service", e.target.value)}
            >
              <option value="">All services</option>
              <option value="ride">Passenger</option>
              <option value="courier">Courier</option>
            </select>
          )}
          <button className="button secondary" onClick={() => setDense(!dense)}>
            {dense ? "Comfortable" : "Compact"} rows
          </button>
          {(status || service || query) && (
            <button
              className="text-link"
              onClick={() => {
                setQuery("");
                router.replace(pathname);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
      {showFilters && !preview && (
        <details className="advanced-filters">
          <summary>More filters · date, payment, rider, driver</summary>
          <form
            className="report-filters"
            onSubmit={(event) => {
              event.preventDefault();
              const next = new URLSearchParams(params.toString());
              next.delete("cursor");
              for (const [key, entry] of new FormData(event.currentTarget)) {
                const value = String(entry);
                if (value) next.set(key, value);
                else next.delete(key);
              }
              router.replace(`${pathname}?${next}`, { scroll: false });
            }}
          >
            <label className="form-label">
              Date basis
              <select
                name="dateBasis"
                defaultValue={params.get("dateBasis") ?? "requested"}
              >
                <option value="requested">Requested</option>
                <option value="scheduled">Scheduled pickup</option>
                <option value="fulfilled">Completed / returned</option>
              </select>
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
            <label className="form-label">
              Payment method
              <select
                name="paymentMethod"
                defaultValue={params.get("paymentMethod") ?? ""}
              >
                <option value="">All</option>
                <option value="cash">Cash</option>
                <option value="wallet">Wallet</option>
              </select>
            </label>
            <label className="form-label">
              Payment state
              <select
                name="paymentStatus"
                defaultValue={params.get("paymentStatus") ?? ""}
              >
                <option value="">All</option>
                {["unpaid", "held", "settled", "released"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="form-label">
              Rider UUID
              <input
                name="riderId"
                defaultValue={params.get("riderId") ?? ""}
                pattern="[0-9a-fA-F-]{36}"
              />
            </label>
            <label className="form-label">
              Driver UUID
              <input
                name="driverId"
                defaultValue={params.get("driverId") ?? ""}
                pattern="[0-9a-fA-F-]{36}"
              />
            </label>
            <button className="button secondary">Apply filters</button>
            <Link className="text-link" href={pathname}>
              Clear all
            </Link>
          </form>
        </details>
      )}
      {rows.length === 0 ? (
        <QueryState
          title="No matching trips"
          message="Try another trip ID or clear your filters."
          icon="search"
        />
      ) : (
        <div
          className="table-scroll"
          role="region"
          aria-label="Trips, scroll horizontally for all columns"
          tabIndex={0}
        >
          <table className={dense ? "dense" : ""}>
            <thead>
              <tr>
                <th>Trip / service</th>
                <th>
                  <button
                    className="sort-button"
                    disabled={!preview}
                    onClick={() =>
                      filter("order", order === "desc" ? "asc" : "desc")
                    }
                  >
                    {mode === "scheduled"
                      ? `Scheduled pickup ${params.get("view") === "history" ? "↓" : "↑"}`
                      : `Requested ${order === "desc" ? "↓" : "↑"}`}
                  </button>
                </th>
                <th>Route</th>
                <th>People</th>
                <th>Trip status</th>
                <th>Payment</th>
                <th className="numeric">Fare · NGN</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, index) => (
                <Fragment key={t.id}>
                  {mode === "scheduled" &&
                    (index === 0 ||
                      new Date(
                        rows[index - 1].scheduledAt ??
                          rows[index - 1].requestedAt,
                      ).toLocaleDateString("en-CA", {
                        timeZone: "Africa/Lagos",
                      }) !==
                        new Date(
                          t.scheduledAt ?? t.requestedAt,
                        ).toLocaleDateString("en-CA", {
                          timeZone: "Africa/Lagos",
                        })) && (
                      <tr className="agenda-date">
                        <th colSpan={7} scope="rowgroup">
                          {new Date(
                            t.scheduledAt ?? t.requestedAt,
                          ).toLocaleDateString("en-NG", {
                            timeZone: "Africa/Lagos",
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}{" "}
                          · WAT
                        </th>
                      </tr>
                    )}
                  <tr>
                    <td>
                      <Link
                        className="record-link"
                        href={`/admin/trips/${t.id}`}
                      >
                        {t.id}
                      </Link>
                      <small>
                        {t.service === "courier"
                          ? "Courier delivery"
                          : "Passenger ride"}
                      </small>
                    </td>
                    <td>
                      <Timestamp value={t.scheduledAt ?? t.requestedAt} />
                      {t.scheduledAt && <small>Scheduled pickup</small>}
                    </td>
                    <td>
                      <div className="route-summary">
                        <span>
                          <i />
                          {t.pickup}
                        </span>
                        <span>
                          <i />
                          {t.destination}
                        </span>
                      </div>
                    </td>
                    <td>
                      {t.riderName}
                      <small>{t.driverName ?? "Awaiting driver"}</small>
                    </td>
                    <td>
                      <StatusBadge status={t.status} service={t.service} />
                    </td>
                    <td>
                      <StatusBadge status={t.paymentStatus} />
                      <small>
                        {t.paymentMethod === "wallet" ? "Wallet" : "Cash"}
                        {t.status === "scheduled"
                          ? " · Checked at dispatch"
                          : ""}
                      </small>
                    </td>
                    <td className="numeric">
                      <MoneyValue value={t.fareKobo} />
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="table-footer">
        <span>
          {preview
            ? `${rows.length} sample records · Complete fixture set`
            : `${rows.length} records on this page`}
        </span>
        <span>
          {preview ? "Local fixture filtering" : "Server pagination"} ·
          {mode === "scheduled"
            ? "Pickup agenda · WAT"
            : "Requested time in WAT"}
        </span>
      </div>
      {!preview && (
        <div className="pagination">
          {params.get("cursor") && (
            <button
              className="button secondary"
              onClick={() => filter("cursor", "")}
            >
              First page
            </button>
          )}
          {nextCursor && (
            <button
              className="button secondary"
              onClick={() => {
                const next = new URLSearchParams(params.toString());
                next.set("cursor", nextCursor);
                router.push(`${pathname}?${next}`);
              }}
            >
              Next page →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
