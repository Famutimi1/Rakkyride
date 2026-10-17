import type { DriverServiceStatus } from "@/contracts/admin";
import { StatusBadge } from "./primitives";

export function DriverServiceState({ status, enabled, availability }: { status?: DriverServiceStatus; enabled?: boolean; availability?: string }) {
  return <div className="service-state">
    <StatusBadge status={status ?? "unknown"} label={status === "none" ? "Not requested" : status === undefined ? "Not reported" : undefined} />
    <small>{enabled === undefined ? "Preference not reported" : enabled ? "Requests on" : "Requests off"}</small>
    {availability && <small>Supply: {availability.replaceAll("_", " ")}</small>}
  </div>;
}
