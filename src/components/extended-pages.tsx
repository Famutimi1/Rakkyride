import Link from "next/link";
import { notFound } from "next/navigation";
import { adminRead } from "@/lib/server";
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
                  <div className="pagination">
                    <Link
                      className="button secondary"
                      href={`/admin/${kind}/${id}?before=${data.nextActivityId}`}
                    >
                      Older activity →
                    </Link>
                  </div>
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
    for (const k of ["status", "cursor", "id"])
      if (value(search, k)) qs.set(k, value(search, k)!);
    const data = preview
      ? { items: [] as Case[], nextCursor: null }
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
          <Link className="button primary" href={`/admin/${kind}/new`}>
            New record
          </Link>
        </PageHeader>
        <Notice>
          {kind === "safety"
            ? "Super_admin access only. Customer intake and emergency response promises remain pending a staff response policy."
            : "Internal staff workflow. Customer reply delivery, attachments, and response SLAs are not configured."}
        </Notice>
        <form className="report-filters" action={`/admin/${kind}`}>
          <label className="form-label">
            State
            <select name="status" defaultValue={value(search, "status") ?? ""}>
              <option value="">All states</option>
              {(kind === "support"
                ? [
                    "new",
                    "assigned",
                    "waiting_customer",
                    "waiting_internal",
                    "resolved",
                    "reopened",
                  ]
                : ["open", "acknowledged", "responding", "resolved", "reviewed"]
              ).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button className="button secondary">Apply</button>
        </form>
        <DirectoryTable
          preview={preview}
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
    if (!["topups", "withdrawals", "escrow"].includes(id)) notFound();
    type Exception = {
      id: string;
      status: string;
      reference?: string;
      amountKobo: string;
      createdAt: string;
    };
    const qs = new URLSearchParams(
      value(search, "cursor") ? { cursor: value(search, "cursor")! } : {},
    );
    const data = preview
      ? { items: [] as Exception[], nextCursor: null }
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
          headers={["Record", "State", "Amount · NGN", "Created"]}
          nextHref={
            data.nextCursor
              ? `/admin/reconciliation/${id}?cursor=${data.nextCursor}`
              : undefined
          }
          rows={data.items.map((r) => [
            <Link
              href={`/admin/${id === "topups" ? "payments" : id === "escrow" ? "trips" : "withdrawals"}/${r.id}`}
            >
              {r.reference ?? r.id}
            </Link>,
            <StatusBadge status={r.status} />,
            <MoneyValue value={r.amountKobo} />,
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
      }[];
      coverage: string;
    };
    const data = preview
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
          headers={["Dependency", "State", "Latency", "Observed"]}
          rows={data.checks.map((c) => [
            c.name,
            <StatusBadge status={c.state} />,
            c.latencyMs === null ? "Unknown" : `${c.latencyMs} ms`,
            c.observedAt ? (
              <Timestamp value={c.observedAt} />
            ) : (
              "No observation"
            ),
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
    };
    const data = preview ? null : await adminRead<Team>("team");
    return (
      <>
        <PageHeader
          eyebrow="SYSTEM"
          title="Team access"
          description="Existing staff accounts and current platform roles."
        />
        <Notice>
          {data?.coverage ??
            "Provisioning, scoped permissions, and step-up policy need owner decisions. This view does not grant access."}
        </Notice>
        {data ? (
          <DirectoryTable
            preview={false}
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
    type Fare = {
      vehicleType: string;
      baseFareKobo: string;
      perKmKobo: string;
      perMinuteKobo: string;
      minimumFareKobo: string;
      commissionBps: number;
      active: boolean;
      updatedAt: string;
    };
    const data = preview
      ? { items: [] as Fare[] }
      : await adminRead<{ items: Fare[] }>("pricing");
    return (
      <>
        <PageHeader
          eyebrow="CONFIGURATION"
          title="Pricing"
          description="Current fare configuration, NGN. Read-only until commercial change controls are approved."
        />
        <DirectoryTable
          preview={preview}
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
    for (const k of ["cursor", "service"])
      if (value(search, k)) qs.set(k, value(search, k)!);
    const data = preview
      ? { items: [] as Rating[], nextCursor: null }
      : await adminRead<PageResult<Rating>>(`ratings?${qs}`);
    return (
      <>
        <PageHeader
          eyebrow="CARE"
          title="Ratings & feedback"
          description="Recorded trip feedback. Feedback changes do not overwrite historical ratings."
        />
        <form className="report-filters" action="/admin/ratings">
          <label className="form-label">
            Service
            <select
              name="service"
              defaultValue={value(search, "service") ?? ""}
            >
              <option value="">All services</option>
              <option value="ride">Passenger rides</option>
              <option value="courier">Courier</option>
            </select>
          </label>
          <button className="button secondary">Apply</button>
        </form>
        <DirectoryTable
          preview={preview}
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
          <form className="report-filters" action="/admin/reports">
            <label className="form-label">
              Start · WAT
              <input type="date" name="from" defaultValue={fromDate} required />
            </label>
            <label className="form-label">
              End · WAT (exclusive)
              <input type="date" name="to" defaultValue={toDate} required />
            </label>
            <label className="form-label">
              Service
              <select name="service" defaultValue={service}>
                <option value="">All</option>
                <option value="ride">Passenger rides</option>
                <option value="courier">Courier</option>
              </select>
            </label>
            <button className="button primary">Run report</button>
          </form>
        </Panel>
        <Notice>
          Outcomes use request time. Settled fare uses completion or return
          time. Ledger amounts use posting time across all services, including
          when a service filter is selected. Returned couriers are counted
          separately from delivered parcels.
        </Notice>
        {data ? (
          <>
            <Panel title="Request cohort outcomes">
              <DirectoryTable
                preview={false}
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
