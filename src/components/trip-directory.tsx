"use client";
import { Button } from "./ui/button";
import { FilterForm, FormField, FilterToolbar } from "./ui/filter-toolbar";
import { Dropdown } from "./ui/dropdown";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { tripStatuses, type Trip } from "@/contracts/admin";
import { statusLabel } from "@/lib/format";
import { useUiStore } from "@/lib/ui-store";
import { SearchField } from "./ui/search-field";
import { DataTable } from "./ui/data-table";
import { Pagination } from "./ui/pagination";
import { MoneyValue, StatusBadge, Timestamp } from "./primitives";
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
        <FilterToolbar label="Trip filters">
          <SearchField
            label="Find a trip by exact ID"
            placeholder="Find a trip ID…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onSearch={(value) => {
              if (!preview) filter("id", value);
            }}
            onClear={() => {
              setQuery("");
              if (!preview) filter("id", "");
            }}
          />
          <Dropdown
            aria-label="Trip status"
            value={status}
            onValueChange={(value) => filter("status", value)}
          >
            <option value="">All statuses</option>
            {tripStatuses.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s, mode === "courier" ? "courier" : undefined)}
              </option>
            ))}
          </Dropdown>
          {mode !== "courier" && (
            <Dropdown
              aria-label="Service"
              value={service}
              onValueChange={(value) => filter("service", value)}
            >
              <option value="">All services</option>
              <option value="ride">Passenger</option>
              <option value="courier">Courier</option>
            </Dropdown>
          )}
          <Button
            type="submit"
            variant="secondary"
            onClick={() => setDense(!dense)}
          >
            {dense ? "Comfortable" : "Compact"} rows
          </Button>
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
        </FilterToolbar>
      )}
      {showFilters && !preview && (
        <details className="advanced-filters">
          <summary>More filters · date, payment, rider, driver</summary>
          <FilterForm
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
            <FormField>
              Date basis
              <Dropdown
                aria-label="Date basis"
                name="dateBasis"
                defaultValue={params.get("dateBasis") ?? "requested"}
              >
                <option value="requested">Requested</option>
                <option value="scheduled">Scheduled pickup</option>
                <option value="fulfilled">Completed / returned</option>
              </Dropdown>
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
            <FormField>
              Payment method
              <Dropdown
                aria-label="Payment method"
                name="paymentMethod"
                defaultValue={params.get("paymentMethod") ?? ""}
              >
                <option value="">All</option>
                <option value="cash">Cash</option>
                <option value="wallet">Wallet</option>
              </Dropdown>
            </FormField>
            <FormField>
              Payment state
              <Dropdown
                aria-label="Payment state"
                name="paymentStatus"
                defaultValue={params.get("paymentStatus") ?? ""}
              >
                <option value="">All</option>
                {["unpaid", "held", "settled", "released"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Dropdown>
            </FormField>
            <FormField>
              Rider UUID
              <input
                name="riderId"
                defaultValue={params.get("riderId") ?? ""}
                pattern="[0-9a-fA-F-]{36}"
              />
            </FormField>
            <FormField>
              Driver UUID
              <input
                name="driverId"
                defaultValue={params.get("driverId") ?? ""}
                pattern="[0-9a-fA-F-]{36}"
              />
            </FormField>
            <Button type="submit" variant="secondary">
              Apply filters
            </Button>
            <Link className="text-link" href={pathname}>
              Clear all
            </Link>
          </FilterForm>
        </details>
      )}
      <DataTable
        label="Trips"
        emptyTitle="No matching trips"
        emptyMessage="Try another trip ID or clear your filters."
        columns={[
          { id: "trip", label: "Trip / service" },
          {
            id: "time",
            mobileLabel:
              mode === "scheduled" ? "Scheduled pickup" : "Requested",
            label: (
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
            ),
          },
          { id: "route", label: "Route" },
          { id: "people", label: "People" },
          { id: "status", label: "Trip status" },
          { id: "payment", label: "Payment" },
          { id: "fare", label: "Fare · NGN", align: "end" },
        ]}
        rows={rows.map((trip, index) => ({
          id: trip.id,
          group:
            mode === "scheduled" &&
            (index === 0 ||
              new Date(
                rows[index - 1].scheduledAt ?? rows[index - 1].requestedAt,
              ).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }) !==
                new Date(
                  trip.scheduledAt ?? trip.requestedAt,
                ).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }))
              ? `${new Date(trip.scheduledAt ?? trip.requestedAt).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", weekday: "long", month: "long", day: "numeric" })} · WAT`
              : undefined,
          cells: [
            <>
              <Link className="record-link" href={`/admin/trips/${trip.id}`}>
                {trip.id}
              </Link>
              <small>
                {trip.service === "courier"
                  ? "Courier delivery"
                  : "Passenger ride"}
              </small>
            </>,
            <>
              <Timestamp value={trip.scheduledAt ?? trip.requestedAt} />
              {trip.scheduledAt && <small>Scheduled pickup</small>}
            </>,
            <div className="route-summary">
              <span>
                <i />
                {trip.pickup}
              </span>
              <span>
                <i />
                {trip.destination}
              </span>
            </div>,
            <>
              {trip.riderName}
              <small>{trip.driverName ?? "Awaiting driver"}</small>
            </>,
            <StatusBadge status={trip.status} service={trip.service} />,
            <>
              <StatusBadge status={trip.paymentStatus} />
              <small>
                {trip.paymentMethod === "wallet" ? "Wallet" : "Cash"}
                {trip.status === "scheduled" ? " · Checked at dispatch" : ""}
              </small>
            </>,
            <MoneyValue value={trip.fareKobo} />,
          ],
        }))}
      />
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
        <Pagination>
          {params.get("cursor") && (
            <Button
              type="submit"
              variant="secondary"
              onClick={() => filter("cursor", "")}
            >
              First page
            </Button>
          )}
          {nextCursor && (
            <Button
              type="submit"
              variant="secondary"
              onClick={() => {
                const next = new URLSearchParams(params.toString());
                next.set("cursor", nextCursor);
                router.push(`${pathname}?${next}`);
              }}
            >
              Next page →
            </Button>
          )}
        </Pagination>
      )}
    </div>
  );
}
