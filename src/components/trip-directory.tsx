"use client";
import { SearchFilterBar } from "./ui/search-filter-bar";
import { paginationInfo } from "@/lib/pagination";
import type { PaginationInfo } from "@/contracts/admin";
import { Button } from "./ui/button";
import { FormField } from "./ui/filter-toolbar";
import { Dropdown } from "./ui/dropdown";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
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
  pagination,
  mode = "all",
  showFilters = true,
}: {
  trips: Trip[];
  preview: boolean;
  nextCursor?: string | null;
  pagination?: PaginationInfo;
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
  const [pending, startTransition] = useTransition();
  const idQuery = params.get("id") ?? "";
  useEffect(() => setQuery(idQuery), [idQuery]);
  function dateOf(trip: Trip) {
    if (params.get("dateBasis") === "scheduled") return trip.scheduledAt;
    if (params.get("dateBasis") === "fulfilled")
      return trip.timeline.find((event) =>
        ["completed", "returned"].includes(event.status),
      )?.at;
    return trip.requestedAt;
  }
  function filter(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.delete("cursor");
    next.set("page", "1");
    if (value) next.set(name, value);
    else next.delete(name);
    router.replace(`${pathname}?${next}`, { scroll: false });
  }
  const allRows = preview
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
            (!idQuery || t.id === idQuery) &&
            (!params.get("riderId") || t.riderId === params.get("riderId")) &&
            (!params.get("driverId") ||
              t.driverId === params.get("driverId")) &&
            (!params.get("paymentMethod") ||
              t.paymentMethod === params.get("paymentMethod")) &&
            (!params.get("paymentStatus") ||
              t.paymentStatus === params.get("paymentStatus")) &&
            (!params.get("from") ||
              Date.parse(dateOf(t) ?? "") >= Date.parse(params.get("from")!)) &&
            (!params.get("to") ||
              Date.parse(dateOf(t) ?? "") < Date.parse(params.get("to")!)),
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
  const meta =
    preview && showFilters
      ? paginationInfo(
          allRows.length,
          Number(params.get("page") ?? 1),
          Number(params.get("limit") ?? 20),
        )
      : pagination;
  const rows =
    preview && meta
      ? allRows.slice((meta.page - 1) * meta.pageSize, meta.to)
      : allRows;
  function navigate(page: number, size = meta?.pageSize ?? 20) {
    const next = new URLSearchParams(params.toString());
    next.delete("cursor");
    next.set("page", String(page));
    next.set("limit", String(size));
    startTransition(() =>
      router.push(`${pathname}?${next}`, { scroll: false }),
    );
  }
  return (
    <div className="directory">
      {showFilters && (
        <SearchFilterBar
          resetKey={params.toString()}
          aria-label="Trip filters"
          search={
            <SearchField
              label="Find a trip by exact ID"
              name="id"
              placeholder="Search by trip ID…"
              pattern={preview ? undefined : "[0-9a-fA-F-]{36}"}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          }
          onClear={() => {
            setQuery("");
            const next = new URLSearchParams();
            for (const key of ["view", "limit"])
              if (params.get(key)) next.set(key, params.get(key)!);
            next.set("page", "1");
            router.replace(`${pathname}?${next}`, { scroll: false });
          }}
          onSubmit={(event) => {
            event.preventDefault();
            const next = new URLSearchParams(params.toString());
            next.delete("cursor");
            next.set("page", "1");
            for (const [name, entry] of new FormData(event.currentTarget)) {
              let text = String(entry).trim();
              if (text && ["from", "to"].includes(name))
                text = `${text}T00:00:00+01:00`;
              if (text) next.set(name, text);
              else next.delete(name);
            }
            startTransition(() =>
              router.replace(`${pathname}?${next}`, { scroll: false }),
            );
          }}
        >
          <FormField label="Trip status">
            <Dropdown
              aria-label="Trip status"
              name="status"
              defaultValue={status}
              options={[
                { value: "", label: "All statuses" },
                ...tripStatuses.map((value) => ({
                  value,
                  label: statusLabel(
                    value,
                    mode === "courier" ? "courier" : undefined,
                  ),
                })),
              ]}
            />
          </FormField>
          {mode !== "courier" && (
            <FormField label="Service">
              <Dropdown
                aria-label="Service"
                name="service"
                defaultValue={service}
                options={[
                  { value: "", label: "All services" },
                  { value: "ride", label: "Passenger" },
                  { value: "courier", label: "Courier" },
                ]}
              />
            </FormField>
          )}
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
              pattern={preview ? undefined : "[0-9a-fA-F-]{36}"}
            />
          </FormField>
          <FormField>
            Driver UUID
            <input
              name="driverId"
              defaultValue={params.get("driverId") ?? ""}
              pattern={preview ? undefined : "[0-9a-fA-F-]{36}"}
            />
          </FormField>
          <Button onClick={() => setDense(!dense)}>
            {dense ? "Comfortable" : "Compact"} rows
          </Button>
        </SearchFilterBar>
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
      <Pagination
        pagination={meta}
        noun="trips"
        busy={pending}
        onPageChange={(page) => navigate(page)}
        onPageSizeChange={(size) => navigate(1, size)}
      >
        {!meta && nextCursor && (
          <Button
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
    </div>
  );
}
