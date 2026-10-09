import type { TripStatus, ServiceType } from "../contracts/admin.ts";
/** Decimal-string arithmetic preserves money above Number.MAX_SAFE_INTEGER. */
export function money(kobo: string): string {
  if (!/^-?\d+$/.test(kobo)) throw new Error("Invalid kobo amount");
  const value = BigInt(kobo);
  const absolute = value < 0n ? -value : value;
  return `${value < 0n ? "−" : ""}₦${(absolute / 100n).toLocaleString("en-NG")}.${String(absolute % 100n).padStart(2, "0")}`;
}
export function toKobo(input: string): string {
  if (!/^\d+(\.\d{1,2})?$/.test(input.trim()))
    throw new Error("Enter a positive amount with up to two decimal places.");
  const [whole, fraction = ""] = input.trim().split(".");
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (amount <= 0n || amount > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("Amount is outside the supported range.");
  return amount.toString();
}
export function timestamp(value: string): string {
  return (
    new Intl.DateTimeFormat("en-NG", {
      timeZone: "Africa/Lagos",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value)) + " WAT"
  );
}
export function watDayRange(date: string): { from: string; to: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
  const start = new Date(`${date}T00:00:00+01:00`);
  if (
    !Number.isFinite(start.getTime()) ||
    new Date(start.getTime() + 3600000).toISOString().slice(0, 10) !== date
  )
    throw new Error("Invalid date");
  return {
    from: start.toISOString(),
    to: new Date(start.getTime() + 86400000).toISOString(),
  };
}
const labels: Record<TripStatus, string> = {
  scheduled: "Scheduled",
  searching: "Searching",
  driver_assigned: "Driver assigned",
  driver_arrived: "Driver arrived",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_drivers_found: "No drivers found",
  returning: "Returning",
  returned: "Returned",
};
export function statusLabel(status: string, service?: ServiceType): string {
  if (status === "completed" && service === "courier") return "Delivered";
  return (
    labels[status as TripStatus] ??
    status.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())
  );
}
export function locationState(
  at: string | null,
  asOf: string,
): "unavailable" | "fresh" | "stale" {
  if (!at) return "unavailable";
  const age = Date.parse(asOf) - Date.parse(at);
  return age >= 0 && age < 30000 ? "fresh" : "stale";
}
