import { pageSlice } from "@/lib/pagination";
import { Button, LinkButton } from "./ui/button";
import { Pagination } from "./ui/pagination";
import { FilterForm, FormField } from "./ui/filter-toolbar";
import { Dropdown } from "./ui/dropdown";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminRead, requireStaff } from "@/lib/server";
import { PricingEditor, type FareSettings } from "./record-editors";
import { RowActions } from "./ui/row-actions";
import {
  PageHeader,
  Panel,
  Notice,
  QueryState,
  DefinitionList,
  Timestamp,
  StatusBadge,
  MoneyValue,
} from "./primitives";
import { DirectoryFilters } from "./directory-filters";
import { DirectoryTable } from "./directory-table";
import { CreateCare, CareActions } from "./care-actions";
import { statusLabel } from "@/lib/format";
import type { PageResult } from "@/contracts/admin";
type Search = Record<string, string | string[] | undefined>;
const value = (search: Search, key: string) =>
  typeof search[key] === "string" ? (search[key] as string) : undefined;
const beforeQuery = (search: Search) =>
  value(search, "before")
    ? `?before=${encodeURIComponent(value(search, "before")!)}`
    : "";
interface Case {
  id: string;
  subject: string;
  status: string;
  severity: string;
  version: number;
  createdAt: string;
  assignedStaff: string | null;
  tripId: string | null;
}
interface Detail {
  record: {
    id: string;
    subject: string;
    status: string;
    severity: string;
    version: number;
    customer_id: string | null;
    trip_id: string | null;
    payment_id?: string | null;
    assigned_staff: string | null;
    next_action?: string;
    response_due_at?: string | null;
    created_at: string;
    updated_at: string;
  };
  activity: {
    id: string;
    kind: string;
    body: string;
    actor: string;
    createdAt: string;
    deliveryStatus: string;
    visibility: string;
  }[];
  allowedStates: string[];
  nextActivityId: string | null;
  asOf: string;
}
export async function ExtendedPage({
  section,
  id,
  search,
  preview,
}: {
  section: string;
  id?: string;
  search: Search;
  preview: boolean;
}) {
  if (section === "support" || section === "safety") {
    const kind = section;
    if (id === "new")
      return (
        <>
          <Link className="back-link" href={`/admin/${kind}`}>
            ← {statusLabel(kind)} queue
          </Link>
          <PageHeader
            eyebrow="CARE"
            title={`New ${kind} record`}
            description="Record an issue for staff follow-up."
          />
          {kind === "safety" && (
            <Notice>
              This staff intake is restricted to super_admin. It does not
              dispatch emergency services. Customer SOS intake awaits a named
              staff response policy.
            </Notice>
          )}
          <Panel title="Record details">
            <CreateCare kind={kind} disabled={preview} />
          </Panel>
        </>
      );
    if (id) {
      if (preview)
        return (
          <QueryState
            title="No care records simulated"
            message="Staff case details are available after signing into the shared backend."
          />
        );
      const data = await adminRead<Detail>(
          `${kind}/${encodeURIComponent(id)}${beforeQuery(search)}`,
        ),
        r = data.record;
      return (
        <>
          <Link className="back-link" href={`/admin/${kind}`}>
            ← {statusLabel(kind)} queue
          </Link>
          <PageHeader
            eyebrow={`${kind.toUpperCase()} · VERSION ${r.version}`}
            title={r.subject}
            description={r.id}
          />
          <div className="detail-grid">
            <div>
              <Panel title="Case context">
                <DefinitionList
                  items={[
                    ["State", <StatusBadge key="state" status={r.status} />],
                    ["Severity", statusLabel(r.severity)],
                    ["Assigned", r.assigned_staff ?? "Unassigned"],
                    [
                      "Customer",
                      r.customer_id ? (
                        <Link href={`/admin/riders/${r.customer_id}`}>
                          {r.customer_id}
                        </Link>
                      ) : (
                        "Not linked"
                      ),
                    ],
                    [
                      "Trip",
                      r.trip_id ? (
                        <Link href={`/admin/trips/${r.trip_id}`}>
                          {r.trip_id}
                        </Link>
                      ) : (
                        "Not linked"
                      ),
                    ],
                    ["Next action", r.next_action ?? "Not specified"],
                    [
                      "Response due",
                      r.response_due_at ? (
                        <Timestamp value={r.response_due_at} />
                      ) : (
                        "No SLA configured"
                      ),
                    ],
                    ["Updated", <Timestamp value={r.updated_at} />],
                  ]}
                />
              </Panel>
              <Panel
                title="Activity"
                detail="Append-only staff activity; newest first"
              >
                <ol className="care-activity">
                  {data.activity.map((a) => (
                    <li key={a.id}>
                      <strong>
                        {a.actor} · {statusLabel(a.kind)}
                      </strong>
                      <p>{a.body}</p>
                      <small className="muted">
                        <Timestamp value={a.createdAt} /> · {a.visibility} ·{" "}
                        {statusLabel(a.deliveryStatus)}
                      </small>
                    </li>
                  ))}
                </ol>
                {data.nextActivityId && (
                  <Pagination
                    nextHref={`/admin/${kind}/${id}?before=${data.nextActivityId}`}
                    nextLabel="Older activity →"
                  />
                )}
              </Panel>
            </div>
            <Panel title="Staff actions">
              <CareActions
                key={r.version}
                kind={kind}
                id={id}
                version={r.version}
                status={r.status}
                states={data.allowedStates}
                disabled={false}
              />
            </Panel>
          </div>
        </>
      );
    }
    const qs = new URLSearchParams();
    for (const k of ["page", "limit", "status", "cursor", "id"])
      if (value(search, k)) qs.set(k, value(search, k)!);
    if (!qs.has("cursor")) {
      qs.set("page", qs.get("page") ?? "1");
      qs.set("limit", qs.get("limit") ?? "20");
    }
    const data = preview
      ? {
          ...pageSlice(
            [] as Case[],
            value(search, "page"),
            value(search, "limit"),
          ),
          nextCursor: null,
        }
      : await adminRead<PageResult<Case>>(`${kind}?${qs}`);
    return (
      <>
        <PageHeader
          eyebrow="CARE"
          title={kind === "support" ? "Support cases" : "Safety incidents"}
          description={
            kind === "support"
              ? "Persisted cases with ownership, state, and an internal activity trail."
              : "Restricted incident records. Trip completion does not resolve an incident."
          }
        >
          <LinkButton variant="primary" href={`/admin/${kind}/new`}>
            New record
          </LinkButton>
        </PageHeader>
        <Notice>
          {kind === "safety"
            ? "Super_admin access only. Customer intake and emergency response promises remain pending a staff response policy."
            : "Internal staff workflow. Customer reply delivery, attachments, and response SLAs are not configured."}
        </Notice>
        <DirectoryFilters
          preview={preview}
          statuses={(kind === "support"
            ? [
                "new",
                "assigned",
                "waiting_customer",
                "waiting_internal",
                "resolved",
                "reopened",
              ]
            : ["open", "acknowledged", "responding", "resolved", "reviewed"]
          ).map((value) => ({ value, label: statusLabel(value) }))}
        />
        <DirectoryTable
          preview={preview}
          pagination={data.pagination}
          noun="cases"
          headers={["Subject", "State", "Severity", "Assigned", "Created"]}
          nextHref={
            data.nextCursor
              ? `/admin/${kind}?${new URLSearchParams({ ...Object.fromEntries(qs), cursor: data.nextCursor })}`
              : undefined
          }
          rows={data.items.map((r) => [
            <Link href={`/admin/${kind}/${r.id}`} className="record-link">
              {r.subject}
            </Link>,
            <StatusBadge status={r.status} />,
            statusLabel(r.severity),
            r.assignedStaff ?? "Unassigned",
            <Timestamp value={r.createdAt} />,
          ])}
        />
      </>
    );
  }

  if ((section === "payments" || section === "withdrawals") && id) {
    if (preview)
      return (
        <QueryState
          title="No provider detail simulated"
          message="Sign in to inspect recorded intents, withdrawals, and ledger links."
        />
      );
    type Payment = {
      id: string;
      userId: string;
      customer?: string;
      driver?: string;
      target?: string;
      amountKobo: string;
      feeKobo: string | null;
      status: string;
      reference: string;
      provider?: string;
      channel?: string | null;
      bank?: string;
      accountLastFour?: string;
      attempts?: number;
      failureReason: string | null;
      createdAt: string;
      updatedAt: string;
      paidAt?: string | null;
      completedAt?: string | null;
      transactionId?: string | null;
      requestTransactionId?: string | null;
      finalTransactionId?: string | null;
      webhooks?: {
        id: string;
        type: string;
        status: string;
        receivedAt: string;
        processedAt: string | null;
      }[];
      webhookHistoryLimited?: boolean;
    };
    const r = await adminRead<Payment>(
        `${section === "payments" ? "payment-intents" : "withdrawals"}/${encodeURIComponent(id)}`,
      ),
      txs = [
        ["Funding", r.transactionId],
        ["Withdrawal request", r.requestTransactionId],
        ["Final outcome", r.finalTransactionId],
      ].filter(([, tx]) => tx);
    return (
      <>
        <Link className="back-link" href={`/admin/${section}`}>
          ← {statusLabel(section)}
        </Link>
        <PageHeader
          eyebrow="FINANCE INVESTIGATION"
          title={
            section === "payments" ? "Payment intent" : "Withdrawal detail"
          }
          description={r.id}
        />
        <Notice>
          Internal status is separate from provider observation. No retained
          provider-status observation is available. Unresolved withdrawals must
          not be resent manually.
        </Notice>
        <div className="detail-grid">
          <Panel title="Record">
            <DefinitionList
              items={[
                [
                  "Customer",
                  <Link href={`/admin/riders/${r.userId}`}>
                    {r.customer ?? r.driver}
                  </Link>,
                ],
                ["Internal state", <StatusBadge status={r.status} />],
                ["Provider reference", r.reference],
                ["Amount · NGN", <MoneyValue value={r.amountKobo} />],
                [
                  "Fee · NGN",
                  r.feeKobo ? <MoneyValue value={r.feeKobo} /> : "Not recorded",
                ],
                ["Target", r.target ?? "Driver earnings"],
                [
                  "Provider / bank",
                  r.provider ?? `${r.bank} · •••• ${r.accountLastFour}`,
                ],
                ["Channel", r.channel ?? "Not recorded"],
                ["Attempts", r.attempts ?? "Not applicable"],
                ["Failure", r.failureReason ?? "Not recorded"],
                ["Created", <Timestamp value={r.createdAt} />],
                ["Updated", <Timestamp value={r.updatedAt} />],
                [
                  "Paid / completed",
                  r.paidAt || r.completedAt ? (
                    <Timestamp value={(r.paidAt ?? r.completedAt)!} />
                  ) : (
                    "Not completed"
                  ),
                ],
              ]}
            />
          </Panel>
          <Panel title="Ledger trace">
            <DefinitionList
              items={txs.map(([label, tx]) => [
                label!,
                <Link className="text-link" href={`/admin/transactions/${tx}`}>
                  {tx}
                </Link>,
              ])}
            />
            {!txs.length && (
              <QueryState
                title="No posting recorded"
                message="A pending provider transaction does not establish a ledger posting."
              />
            )}
          </Panel>
        </div>
        {r.webhooks && (
          <Panel
            title="Recorded webhook processing"
            detail="Authenticated provider events; raw payloads and checkout secrets are hidden"
          >
            <DirectoryTable
              preview={false}
              headers={["Event", "State", "Received", "Processed"]}
              rows={r.webhooks.map((e) => [
                e.type,
                <StatusBadge status={e.status} />,
                <Timestamp value={e.receivedAt} />,
                e.processedAt ? (
                  <Timestamp value={e.processedAt} />
                ) : (
                  "Not processed"
                ),
              ])}
            />
            {r.webhookHistoryLimited && (
              <Notice>Showing the latest 50 matching webhook events.</Notice>
            )}
          </Panel>
        )}
      </>
    );
  }
  if (section === "reconciliation" && id) {
    if (!["topups", "withdrawals", "escrow", "unsettled", "webhooks"].includes(id)) notFound();
    type Exception = {
      id: string;
      status: string;
      reference?: string;
      amountKobo?: string;
      eventType?: string;
      provider?: string;
      hasError?: boolean;
      evidenceClass?: string;
      paymentStatus?: string;
      createdAt: string;
    };
    const qs = new URLSearchParams(
      value(search, id === "webhooks" ? "before" : "cursor")
        ? { [id === "webhooks" ? "before" : "cursor"]: value(search, id === "webhooks" ? "before" : "cursor")! }
        : {
            page: value(search, "page") ?? "1",
            limit: value(search, "limit") ?? "20",
          },
    );
    const data = preview
      ? {
          ...pageSlice(
            [] as Exception[],
            value(search, "page"),
            value(search, "limit"),
          ),
          nextCursor: null,
        }
      : await adminRead<PageResult<Exception>>(`reconciliation/${id}?${qs}`);
    return (
      <>
        <Link href="/admin/reconciliation" className="back-link">
          ← Reconciliation
        </Link>
        <PageHeader
          eyebrow="DERIVED EXCEPTION QUEUE"
          title={statusLabel(id)}
          description="Current unresolved records. Assignment and resolution are recorded through care cases."
        />
        <DirectoryTable
          preview={preview}
          pagination={data.pagination}
          headers={["Record", "State", id === "webhooks" ? "Processing" : "Amount · NGN", ...(id === "unsettled" ? ["Evidence"] : []), "Created"]}
          nextHref={
            data.nextCursor
              ? `/admin/reconciliation/${id}?${id === "webhooks" ? "before" : "cursor"}=${data.nextCursor}`
              : undefined
          }
          actions={data.items.map((r) => id === "webhooks" ? <span>Worker retries automatically</span> : <Link href={`/admin/${id === "topups" ? "payments" : ["escrow", "unsettled"].includes(id) ? "trips" : "withdrawals"}/${r.id}`}>View record</Link>)}
          rows={data.items.map((r) => [
            id === "webhooks" ? `${r.provider} · ${r.eventType} · #${r.id}` : <Link
              href={`/admin/${id === "topups" ? "payments" : ["escrow", "unsettled"].includes(id) ? "trips" : "withdrawals"}/${r.id}`}
            >
              {r.reference ?? r.id}
            </Link>,
            <StatusBadge status={r.status} />,
            id === "webhooks" ? (r.hasError ? "Processing failed; awaiting retry" : "Awaiting processing") : <MoneyValue value={r.amountKobo ?? "0"} />,
            ...(id === "unsettled" ? [r.evidenceClass === "legacy_cash_commission_entries" ? "Legacy commission entries exist · investigate migration; do not charge again" : r.evidenceClass === "zero_commission_cash_no_posting" ? "Zero commission cash · no money posting expected" : "Settlement evidence missing"] : []),
            <Timestamp value={r.createdAt} />,
          ])}
        />
      </>
    );
  }
  if (id) notFound();
  if (section === "health") {
    type Health = {
      checks: {
        name: string;
        state: string;
        latencyMs: number | null;
        observedAt: string | null;
        details?: string;
        lastSuccessAt?: string | null;
        lastFailureAt?: string | null;
      }[];
      coverage: string;
    };
    const data: Health = preview
      ? {
          checks: [
            "PostgreSQL",
            "Redis",
            "Trip worker",
            "Payment worker",
            "Reconciliation",
            "Paystack",
            "Staff sockets",
          ].map((name) => ({
            name,
            state: "unknown",
            latencyMs: null,
            observedAt: null,
          })),
          coverage: "Preview does not check operational dependencies.",
        }
      : await adminRead<Health>("health");
    return (
      <>
        <PageHeader
          eyebrow="SYSTEM"
          title="Service health"
          description="Point-in-time checks and explicit instrumentation gaps."
        />
        <DirectoryTable
          preview={preview}
          showActions={false}
          headers={["Dependency", "State", "Latency", "Observed", "Queue / provider basis", "Last success", "Last failure"]}
          rows={data.checks.map((c) => [
            c.name,
            <StatusBadge status={c.state} />,
            c.latencyMs === null ? "Unknown" : `${c.latencyMs} ms`,
            c.observedAt ? (
              <Timestamp value={c.observedAt} />
            ) : (
              "No observation"
            ),
            c.details ?? "Dependency point check",
            c.lastSuccessAt ? <Timestamp value={c.lastSuccessAt}/> : "No retained successful job",
            c.lastFailureAt ? <Timestamp value={c.lastFailureAt}/> : "No retained failed job",
          ])}
        />
        <Notice>{data.coverage}</Notice>
      </>
    );
  }
  if (section === "team") {
    type Team = {
      items: { id: string; name: string; role: string; active: boolean }[];
      coverage: string;
      nextCursor: string | null;
      pagination?: import("@/contracts/admin").PaginationInfo;
    };
    const qs = new URLSearchParams();
    for (const key of ["page", "limit", "id", "status", "cursor"])
      if (value(search, key)) qs.set(key, value(search, key)!);
    if (!qs.has("cursor")) {
      qs.set("page", qs.get("page") ?? "1");
      qs.set("limit", qs.get("limit") ?? "20");
    }
    const data = preview ? null : await adminRead<Team>(`team?${qs}`);
    return (
      <>
        <PageHeader
          eyebrow="SYSTEM"
          title="Team access"
          description="Existing staff accounts and current platform roles."
        />
        <DirectoryFilters
          preview={preview}
          searchLabel="Exact staff ID"
          statusLabel="Role"
          allLabel="All staff roles"
          statuses={[
            { value: "admin", label: "Admin" },
            { value: "super_admin", label: "Super admin" },
          ]}
        />
        <Notice>
          {data?.coverage ??
            "Provisioning, scoped permissions, and step-up policy need owner decisions. This view does not grant access."}
        </Notice>
        {data ? (
          <DirectoryTable
            preview={false}
            rowKeys={data.items.map((row) => row.id)}
            pagination={data.pagination}
            nextHref={
              data.nextCursor
                ? `/admin/team?${new URLSearchParams({ ...Object.fromEntries(qs), cursor: data.nextCursor })}`
                : undefined
            }
            headers={["Staff", "ID", "Role", "Account"]}
            rows={data.items.map((r) => [
              r.name,
              r.id,
              statusLabel(r.role),
              r.active ? "Active" : "Inactive",
            ])}
          />
        ) : (
          <QueryState title="No staff accounts simulated" />
        )}
      </>
    );
  }
  if (section === "pricing") {
    type Fare = FareSettings;
    const staff = preview ? null : await requireStaff();
    const data = preview
      ? { items: [] as Fare[] }
      : await adminRead<{ items: Fare[] }>("pricing");
    return (
      <>
        <PageHeader
          eyebrow="CONFIGURATION"
          title="Pricing"
          description="Fare configuration in NGN. Super admins can update rates, commission and service availability."
        />
        <DirectoryTable
          preview={preview}
          actions={
            staff?.platformRole === "super_admin"
              ? data.items.map((fare) => (
                  <RowActions>
                    <PricingEditor key={fare.version} fare={fare} />
                  </RowActions>
                ))
              : undefined
          }
          headers={[
            "Vehicle",
            "Base",
            "Per km",
            "Per minute",
            "Minimum",
            "Commission",
            "State",
            "Updated",
          ]}
          rows={data.items.map((r) => [
            statusLabel(r.vehicleType),
            <MoneyValue value={r.baseFareKobo} />,
            <MoneyValue value={r.perKmKobo} />,
            <MoneyValue value={r.perMinuteKobo} />,
            <MoneyValue value={r.minimumFareKobo} />,
            `${r.commissionBps / 100}%`,
            r.active ? "Active" : "Inactive",
            <Timestamp value={r.updatedAt} />,
          ])}
        />
      </>
    );
  }
  if (section === "ratings") {
    type Rating = {
      id: string;
      tripId: string;
      service: "ride" | "courier";
      rating: number;
      comment: string | null;
      rater: string;
      ratee: string;
      createdAt: string;
    };
    const qs = new URLSearchParams();
    for (const k of ["page", "limit", "cursor", "service", "id"])
      if (value(search, k)) qs.set(k, value(search, k)!);
    if (!qs.has("cursor")) {
      qs.set("page", qs.get("page") ?? "1");
      qs.set("limit", qs.get("limit") ?? "20");
    }
    const data = preview
      ? {
          ...pageSlice(
            [] as Rating[],
            value(search, "page"),
            value(search, "limit"),
          ),
          nextCursor: null,
        }
      : await adminRead<PageResult<Rating>>(`ratings?${qs}`);
    return (
      <>
        <PageHeader
          eyebrow="CARE"
          title="Ratings & feedback"
          description="Recorded trip feedback. Feedback changes do not overwrite historical ratings."
        />
        <DirectoryFilters
          preview={preview}
          searchLabel="Exact rating ID"
          statusName="service"
          statusLabel="Service"
          allLabel="All services"
          statuses={[
            { value: "ride", label: "Passenger rides" },
            { value: "courier", label: "Courier" },
          ]}
        />
        <DirectoryTable
          preview={preview}
          pagination={data.pagination}
          noun="ratings"
          headers={[
            "Trip",
            "Service",
            "Rating",
            "From",
            "To",
            "Comment",
            "Recorded",
          ]}
          nextHref={
            data.nextCursor
              ? `/admin/ratings?${new URLSearchParams({ ...Object.fromEntries(qs), cursor: data.nextCursor })}`
              : undefined
          }
          rows={data.items.map((r) => [
            <Link href={`/admin/trips/${r.tripId}`}>
              {r.tripId.slice(0, 8)}
            </Link>,
            r.service,
            `${r.rating} / 5`,
            r.rater,
            r.ratee,
            r.comment ?? "No comment",
            <Timestamp value={r.createdAt} />,
          ])}
        />
      </>
    );
  }
  if (section === "reports") {
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Africa/Lagos",
    });
    const fromDate = value(search, "from") ?? today,
      toDate =
        value(search, "to") ??
        new Date(
          Date.parse(`${today}T00:00:00+01:00`) + 86400000,
        ).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }),
      service = value(search, "service") ?? "";
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(toDate) ||
      !["", "ride", "courier"].includes(service)
    )
      return (
        <QueryState
          title="Invalid report filters"
          message="Use valid dates and a supported service."
        />
      );
    const from = `${fromDate}T00:00:00+01:00`,
      to = `${toDate}T00:00:00+01:00`;
    if (
      !Number.isFinite(Date.parse(from)) ||
      !Number.isFinite(Date.parse(to)) ||
      Date.parse(to) <= Date.parse(from) ||
      Date.parse(to) - Date.parse(from) > 90 * 86400000
    )
      return (
        <QueryState
          title="Invalid date range"
          message="Choose an exclusive end after the start, with at most 90 days."
        />
      );
    const qs = new URLSearchParams({
      from,
      to,
      ...(service ? { service } : {}),
    });
    type Report = {
      operations:{requests:number;noDriver:number;completed:number;cancelled:number;assigned:number;meanAssignmentSeconds:string|null;offers:number};
      ratings:{count:number;average:string|null;lowRatings:number};
      paymentOutcomes:{status:string;count:number}[];
      outcomes: { service: string; status: string; count: string }[];
      settlement: {
        settledValueKobo: string;
        delivered: string;
        returned: string;
      };
      ledger: { code: string; amountKobo: string }[];
      asOf: string;
    };
    const data = preview ? null : await adminRead<Report>(`reports?${qs}`);
    return (
      <>
        <PageHeader
          eyebrow="INSIGHTS"
          title="Reports"
          description="Separate request cohorts, settled trip value, and posted ledger amounts."
        >
          {data && (
            <a
              href={`/api/admin/reports/export?${qs}`}
              className="button secondary"
            >
              Export scoped CSV
            </a>
          )}
        </PageHeader>
        <Panel title="Report scope">
          <FilterForm action="/admin/reports">
            <FormField>
              Start · WAT
              <input type="date" name="from" defaultValue={fromDate} required />
            </FormField>
            <FormField>
              End · WAT (exclusive)
              <input type="date" name="to" defaultValue={toDate} required />
            </FormField>
            <FormField>
              Service
              <Dropdown
                aria-label="Report service"
                name="service"
                defaultValue={service}
              >
                <option value="">All</option>
                <option value="ride">Passenger rides</option>
                <option value="courier">Courier</option>
              </Dropdown>
            </FormField>
            <Button type="submit" variant="primary">
              Run report
            </Button>
          </FilterForm>
        </Panel>
        <Notice>
          Outcomes use request time. Settled fare uses completion or return
          time. Ledger amounts use posting time across all services, including
          when a service filter is selected. Returned couriers are counted
          separately from delivered parcels.
        </Notice>
        {data ? (
          <>
            <Panel title="Operational indicators" detail="Request cohort, including requests still in progress. Assignment time excludes scheduled requests accepted before search starts.">
              <DefinitionList items={[
                ["Requests",data.operations.requests],
                ["No driver found",`${data.operations.noDriver} · ${data.operations.requests ? (100*data.operations.noDriver/data.operations.requests).toFixed(1)+"%" : "No requests"}`],
                ["Completion",`${data.operations.completed} · ${data.operations.requests ? (100*data.operations.completed/data.operations.requests).toFixed(1)+"%" : "No requests"}`],
                ["Cancellation",`${data.operations.cancelled} · ${data.operations.requests ? (100*data.operations.cancelled/data.operations.requests).toFixed(1)+"%" : "No requests"}`],
                ["Assigned requests",data.operations.assigned],
                ["Mean assignment time",data.operations.meanAssignmentSeconds ? `${data.operations.meanAssignmentSeconds} seconds` : "No measured assignments"],
                ["Driver offers",data.operations.offers],
              ]}/>
            </Panel>
            <Panel title="Ratings recorded in this period"><DefinitionList items={[["Ratings",data.ratings.count],["Average",data.ratings.average ?? "Not yet rated"],["1–2 star ratings",data.ratings.lowRatings]]}/></Panel>
            <Panel title="Payment intent outcomes · all services" detail="Created in the report period; current outcome. Service filter does not change payment intent counts."><DirectoryTable preview={false} showActions={false} headers={["Outcome","Count"]} rows={data.paymentOutcomes.map(r=>[<StatusBadge status={r.status}/>,r.count])}/></Panel>
            <Panel title="Request cohort outcomes">
              <DirectoryTable
                preview={false}
                showActions={false}
                headers={["Service", "Outcome", "Count"]}
                rows={data.outcomes.map((r) => [
                  r.service,
                  <StatusBadge
                    status={r.status}
                    service={r.service as "ride" | "courier"}
                  />,
                  r.count,
                ])}
              />
            </Panel>
            <Panel title="Settled value">
              <DefinitionList
                items={[
                  [
                    "Trip fare · NGN",
                    <MoneyValue value={data.settlement.settledValueKobo} />,
                  ],
                  ["Delivered couriers", data.settlement.delivered],
                  ["Returned couriers", data.settlement.returned],
                  ["Observed", <Timestamp value={data.asOf} />],
                ]}
              />
            </Panel>
            <Panel title="Net ledger postings · all services">
              <DirectoryTable
                preview={false}
                showActions={false}
                headers={["Account", "Net amount · NGN"]}
                rows={data.ledger.map((r) => [
                  statusLabel(r.code),
                  <MoneyValue value={r.amountKobo} direction />,
                ])}
              />
            </Panel>
          </>
        ) : (
          <QueryState
            title="No financial report simulated"
            message="Sign in to run an aggregate report against the shared PostgreSQL ledger."
          />
        )}
      </>
    );
  }
  notFound();
}
