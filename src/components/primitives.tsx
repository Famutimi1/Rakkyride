import Link from "next/link";
import type { ReactNode } from "react";
import { statusLabel, timestamp, money } from "@/lib/format";
import { Icon } from "./icon";
export function StatusBadge({
  status,
  service,
  label,
}: {
  status: string;
  service?: "ride" | "courier";
  label?: string;
}) {
  const success = [
    "completed",
    "succeeded",
    "success",
    "approved",
    "settled",
    "available",
    "reachable",
    "delivered",
  ].includes(status);
  const danger = [
    "cancelled",
    "no_drivers_found",
    "failed",
    "mismatch",
    "rejected",
    "reversed",
    "unavailable",
    "suspended",
    "bounced",
    "complained",
    "suppressed",
  ].includes(status);
  const warning = [
    "pending",
    "processing",
    "held",
    "searching",
    "returning",
    "stale",
    "degraded",
    "waiting_email",
    "waiting_admin",
    "blocked",
    "queued",
    "sending",
    "delayed",
    "uncertain",
  ].includes(status);
  return (
    <span
      className={`badge ${success ? "success" : danger ? "danger" : warning ? "warning" : "neutral"}`}
    >
      <span aria-hidden="true">
        {success ? "✓" : danger ? "!" : warning ? "◷" : "•"}
      </span>
      {label ?? statusLabel(status, service)}
    </span>
  );
}
export function MoneyValue({
  value,
  direction = false,
}: {
  value: string;
  direction?: boolean;
}) {
  return (
    <span
      className={`money ${direction ? (BigInt(value) < 0n ? "text-danger" : "text-success") : ""}`}
    >
      {money(value)}
    </span>
  );
}
export function Timestamp({ value }: { value: string }) {
  return <time dateTime={value}>{timestamp(value)}</time>;
}
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="header-actions">{children}</div>}
    </div>
  );
}
export function QueryState({
  title = "Data is not connected",
  message = "This view needs an authorized staff API. No operational records have been loaded.",
  icon = "lock",
}: {
  title?: string;
  message?: string;
  icon?: string;
}) {
  return (
    <div className="query-state" role="status">
      <span className="state-icon">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}
export function Panel({
  title,
  detail,
  children,
  href,
  label = "View all",
}: {
  title: string;
  detail?: string;
  children: ReactNode;
  href?: string;
  label?: string;
}) {
  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>{title}</h2>
          {detail && <p>{detail}</p>}
        </div>
        {href && (
          <Link className="text-link" href={href}>
            {label} <Icon name="arrow" size={15} />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <Icon name="alert" />
      <span>{children}</span>
    </div>
  );
}
export function DefinitionList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="definition-list">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
