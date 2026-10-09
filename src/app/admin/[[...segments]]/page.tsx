import { pageSlice, paginationInput } from "@/lib/pagination";
import { Button, LinkButton } from "@/components/ui/button";
import { FilterForm, FormField } from "@/components/ui/filter-toolbar";
import { FinanceFilters } from "@/components/finance-filters";
import {
  PaymentSettingsEditor,
  type PaymentSettings,
} from "@/components/payment-settings";
import { ExtendedPage } from "@/components/extended-pages";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  adminRead,
  previewEnabled,
  requireStaff,
  InvalidStaffQuery,
} from "@/lib/server";
import {
  PageHeader,
  Panel,
  QueryState,
  Notice,
  StatusBadge,
  MoneyValue,
  Timestamp,
  DefinitionList,
} from "@/components/primitives";
import { TripDirectory } from "@/components/trip-directory";
import { TripEvidenceMap } from "@/components/trip-evidence-map";
import { OperationsMap, TripRouteMap } from "@/components/operations-map";
import { DirectoryFilters } from "@/components/directory-filters";
import { DirectoryTable } from "@/components/directory-table";
import { ApplicationReview } from "@/components/application-review";
import { RefundAction, AccountActions } from "@/components/money-actions";
import { LiveOperations } from "@/components/live-operations";
import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icon";
import { money, statusLabel } from "@/lib/format";
import type {
  Trip,
  Person,
  PaymentIntent,
  Withdrawal,
  LedgerAccount,
  Overview,
  PageResult,
  DriverApplication,
  RefundEligibility,
  LiveSnapshot,
} from "@/contracts/admin";
import * as fixtures from "@/lib/fixtures";

type Search = Record<string, string | string[] | undefined>;
function queryString(params: Search, extras: Record<string, string> = {}) {
  const result = new URLSearchParams();
  for (const key of [
    "page",
    "limit",
    "mode",
    "status",
    "service",
    "cursor",
    "id",
    "riderId",
    "driverId",
    "paymentMethod",
    "paymentStatus",
    "dateBasis",
    "from",
    "to",
    "target",
    "reference",
    "minKobo",
    "maxKobo",
    "userId",
    "kind",
    "ownerUserId",
  ])
    if (typeof params[key] === "string")
      result.set(
        key,
        ["from", "to"].includes(key) && /^\d{4}-\d{2}-\d{2}$/.test(params[key])
          ? `${params[key]}T00:00:00+01:00`
          : params[key],
      );
  for (const [k, v] of Object.entries(extras)) result.set(k, v);
  return result.toString();
}
function nextLink(path: string, params: Search, cursor: string | null) {
  return cursor ? `${path}?${queryString(params, { cursor })}` : undefined;
}
async function records<T>(
  path: string,
  samples: T[],
  preview: boolean,
): Promise<PageResult<T>> {
  const [endpoint, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  if (!params.has("cursor")) {
    params.set("page", params.get("page") ?? "1");
    params.set("limit", params.get("limit") ?? "20");
  }
  if (!preview) return adminRead<PageResult<T>>(`${endpoint}?${params}`);
  if (endpoint === "trips")
    return {
      items: samples,
      nextCursor: null,
      asOf: fixtures.fixtureAsOf,
      scope: { dateBasis: "fixture" },
    };
  const filtered = samples.filter((item) => {
    const record = item as Record<string, unknown>;
    const keys = ["id", "target", "reference", "kind", "userId", "ownerUserId"];
    if (!["users", "drivers", "driver-applications"].includes(endpoint))
      keys.push("status");
    if (
      !keys.every(
        (key) => !params.get(key) || String(record[key]) === params.get(key),
      )
    )
      return false;
    const at = Date.parse(String(record.createdAt ?? ""));
    if (params.get("from") && !(at >= Date.parse(params.get("from")!)))
      return false;
    if (params.get("to") && !(at < Date.parse(params.get("to")!))) return false;
    const amount = String(record.amountKobo ?? "0");
    if (
      params.get("minKobo") &&
      BigInt(amount) < BigInt(params.get("minKobo")!)
    )
      return false;
    if (
      params.get("maxKobo") &&
      BigInt(amount) > BigInt(params.get("maxKobo")!)
    )
      return false;
    return true;
  });
  const sliced = pageSlice(filtered, params.get("page"), params.get("limit"));
  return {
    ...sliced,
    nextCursor: null,
    asOf: fixtures.fixtureAsOf,
    scope: { dateBasis: "fixture" },
    count: { value: filtered.length, exact: true },
  };
}
async function RenderAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ segments?: string[] }>;
  searchParams: Promise<Search>;
}) {
  const { segments = [] } = await params;
  const search = await searchParams;
  const section = segments[0] ?? "overview";
  const id = segments[1];
  const preview = previewEnabled();
  try {
    if (Array.isArray(search.page) || Array.isArray(search.limit))
      throw new RangeError("Repeated pagination fields");
    if (
      search.page !== undefined &&
      (search.cursor !== undefined || search.before !== undefined)
    )
      throw new RangeError("Mixed pagination modes");
    paginationInput(
      typeof search.page === "string" ? search.page : undefined,
      typeof search.limit === "string" ? search.limit : undefined,
    );
  } catch {
    throw new InvalidStaffQuery("Invalid pagination");
  }
  if (segments.length > 2) notFound();
  if (id && ["payments", "withdrawals", "reconciliation"].includes(section))
    return await ExtendedPage({ section, id, search, preview });
  if (
    [
      "support",
      "safety",
      "ratings",
      "reports",
      "pricing",
      "team",
      "health",
    ].includes(section)
  )
    return await ExtendedPage({ section, id, search, preview });
  if (section === "applications" && id) {
    const application = preview
      ? ({
          userId: id,
          name:
            fixtures.people.find((p) => p.id === id)?.name ??
            "Example applicant",
          status: "pending",
          version: fixtures.fixtureAsOf,
          submittedAt: fixtures.fixtureAsOf,
          reviewedAt: null,
          address: null,
          make: "Toyota",
          model: "Camry",
          year: 2020,
          plate: "DEMO-103",
          rejectionReason: null,
          documents: [
            { kind: "license", available: false },
            { kind: "registration", available: false },
            { kind: "insurance", available: false },
          ],
          allowedActions: [],
          asOf: fixtures.fixtureAsOf,
        } as DriverApplication)
      : await adminRead<DriverApplication>(
          `driver-applications/${encodeURIComponent(id)}`,
        );
    return (
      <>
        <Link className="back-link" href="/admin/applications">
          ← Application queue
        </Link>
        <PageHeader
          eyebrow="APPLICATION REVIEW"
          title={application.name}
          description="Review the current document set before making a decision."
        />
        <ApplicationReview application={application} preview={preview} />
      </>
    );
  }
  if (section === "ledger" && id) {
    type Account = {
      id: string;
      ownerUserId: string | null;
      owner: string;
      kind: string;
      type: string;
      normalSide: string;
      balanceKobo: string;
      frozen: boolean;
      nextEntryId?: string | null;
      pagination?: import("@/contracts/admin").PaginationInfo;
      entries: {
        id: string;
        transactionId: string;
        type: string;
        direction: string;
        amountKobo: string;
        balanceAfterKobo: string;
        createdAt: string;
      }[];
    };
    const fixture = fixtures.accounts.find((a) => a.id === id);
    if (preview && !fixture) notFound();
    const account = preview
      ? ({
          ...fixture!,
          ownerUserId: null,
          kind: fixture!.kind,
          type: "liability",
          normalSide: "credit",
          entries: [],
        } as Account)
      : await adminRead<Account>(
          `accounts/${encodeURIComponent(id)}?${new URLSearchParams(typeof search.before === "string" ? { before: search.before } : { page: typeof search.page === "string" ? search.page : "1", limit: typeof search.limit === "string" ? search.limit : "20" })}`,
        );
    return (
      <>
        <Link className="back-link" href="/admin/ledger">
          ← Wallets & ledger
        </Link>
        <PageHeader
          eyebrow="ACCOUNT DETAIL"
          title={account.owner}
          description={account.id}
        />
        <div className="detail-grid">
          <Panel
            title="Recent ledger postings"
            detail="Immutable postings, newest first"
          >
            <DirectoryTable
              preview={preview}
              headers={[
                "Transaction",
                "Side",
                "Amount · NGN",
                "Resulting balance",
                "Posted",
              ]}
              nextHref={
                account.nextEntryId
                  ? `/admin/ledger/${id}?before=${account.nextEntryId}`
                  : undefined
              }
              pagination={account.pagination}
              noun="postings"
              rows={account.entries.map((e) => [
                <Link
                  className="record-link"
                  href={`/admin/transactions/${e.transactionId}`}
                >
                  {statusLabel(e.type)}
                </Link>,
                statusLabel(e.direction),
                <MoneyValue value={e.amountKobo} />,
                <MoneyValue value={e.balanceAfterKobo} />,
                <Timestamp value={e.createdAt} />,
              ])}
            />
          </Panel>
          <Panel title="Account state">
            <DefinitionList
              items={[
                ["Kind", statusLabel(account.kind)],
                ["Account type", statusLabel(account.type)],
                ["Normal side", statusLabel(account.normalSide)],
                [
                  "Balance",
                  <MoneyValue key="amount" value={account.balanceKobo} />,
                ],
                [
                  "Restriction",
                  <StatusBadge
                    key="freeze"
                    status={account.frozen ? "frozen" : "not_frozen"}
                  />,
                ],
              ]}
            />
            {account.ownerUserId && account.kind !== "system" && (
              <AccountActions
                userId={account.ownerUserId}
                owner={account.owner}
                kind={account.kind === "user_wallet" ? "wallet" : "earnings"}
                balanceKobo={account.balanceKobo}
                frozen={account.frozen}
                enabled={
                  process.env.ENABLE_ADMIN_MONEY_ACTIONS === "true" && !preview
                }
              />
            )}
          </Panel>
        </div>
      </>
    );
  }
  if (section === "transactions" && id) {
    type Transaction = {
      id: string;
      type: string;
      description: string;
      createdAt: string;
      actorId: string | null;
      referenceType: string | null;
      referenceId: string | null;
      entries: {
        id: string;
        code: string;
        type: string;
        normalSide: string;
        direction: string;
        amountKobo: string;
        balanceAfterKobo: string;
      }[];
    };
    if (preview)
      return (
        <QueryState
          title="No transactions simulated"
          message="Open a real ledger posting to inspect all balanced entries."
        />
      );
    const transaction = await adminRead<Transaction>(
      `transactions/${encodeURIComponent(id)}`,
    );
    return (
      <>
        <PageHeader
          eyebrow="LEDGER TRANSACTION"
          title={transaction.id}
          description={transaction.description ?? statusLabel(transaction.type)}
        />
        <DefinitionList
          items={[
            ["Posted", <Timestamp value={transaction.createdAt} />],
            ["Actor", transaction.actorId ?? "System"],
            [
              "Reference",
              `${transaction.referenceType ?? "None"} · ${transaction.referenceId ?? "None"}`,
            ],
          ]}
        />
        <DirectoryTable
          preview={false}
          headers={[
            "Account",
            "Type / normal side",
            "Posting side",
            "Amount · NGN",
            "Balance effect",
            "Resulting balance",
          ]}
          rows={transaction.entries.map((e) => [
            e.code,
            `${e.type} · ${e.normalSide}`,
            statusLabel(e.direction),
            <MoneyValue value={e.amountKobo} />,
            <MoneyValue
              value={(e.direction === e.normalSide ? "" : "-") + e.amountKobo}
              direction
            />,
            <MoneyValue value={e.balanceAfterKobo} />,
          ])}
        />
        <Notice>
          These are the linked entries of one transaction. Do not sum both sides
          as money moved.
        </Notice>
      </>
    );
  }
  if (section === "trips" && id) {
    const trip = preview
      ? fixtures.trips.find((t) => t.id === id)
      : await adminRead<Trip>(`trips/${encodeURIComponent(id)}`);
    if (!trip) notFound();
    const refund = preview
      ? null
      : await adminRead<RefundEligibility>(
          `refund-eligibility/${encodeURIComponent(id)}`,
        );
    return (
      <>
        <Link className="back-link" href="/admin/trips">
          ← All trips
        </Link>
        <PageHeader
          eyebrow={
            trip.service === "courier" ? "COURIER DELIVERY" : "PASSENGER RIDE"
          }
          title={trip.id}
          description={`Last changed ${new Date(trip.updatedAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} WAT`}
        >
          <CopyButton value={trip.id} />
          <StatusBadge status={trip.status} service={trip.service} />
        </PageHeader>
        <div className="detail-grid">
          <div>
            <Panel
              title="Journey"
              detail="Pickup and destination recorded for this trip"
            >
              <div className="journey">
                <div>
                  <span className="journey-dot" />
                  <small>PICKUP</small>
                  <h3>{trip.pickup}</h3>
                </div>
                <div>
                  <span className="journey-dot destination" />
                  <small>DESTINATION</small>
                  <h3>{trip.destination}</h3>
                </div>
              </div>
              <TripRouteMap
                origin={
                  trip.pickupLat !== undefined
                    ? `${trip.pickupLat},${trip.pickupLng}`
                    : trip.pickup
                }
                destination={
                  trip.dropoffLat !== undefined
                    ? `${trip.dropoffLat},${trip.dropoffLng}`
                    : trip.destination
                }
              />
              <TripEvidenceMap
                tripId={trip.id}
                preview={preview}
                initial={
                  trip.currentPosition ?? {
                    location: null,
                    state:
                      trip.driverId &&
                      [
                        "driver_assigned",
                        "driver_arrived",
                        "in_progress",
                        "returning",
                      ].includes(trip.status)
                        ? "unavailable"
                        : "not_applicable",
                    asOf: fixtures.fixtureAsOf,
                  }
                }
                samples={
                  trip.sampledPositions ?? { items: [], total: 0, limit: 200 }
                }
              />
              <DefinitionList
                items={[
                  [
                    "Saved estimate distance",
                    trip.estimatedDistanceM
                      ? `${(trip.estimatedDistanceM / 1000).toFixed(1)} km`
                      : "Not loaded",
                  ],
                  [
                    "Saved estimate duration",
                    trip.estimatedDurationS
                      ? `${Math.round(trip.estimatedDurationS / 60)} minutes`
                      : "Not loaded",
                  ],
                  [
                    "Cancellation / activation failure",
                    trip.cancelReason ?? "Not recorded",
                  ],
                ]}
              />
            </Panel>
            <Panel
              title="Trip timeline"
              detail="Recorded state changes and actors"
            >
              <ol className="timeline">
                {trip.timeline.map((event, i) => (
                  <li key={`${event.at}-${i}`}>
                    <span className="timeline-dot" />
                    <div>
                      <strong>{statusLabel(event.status, trip.service)}</strong>
                      <p>
                        {event.actor}
                        {event.reason ? ` · ${event.reason}` : ""}
                      </p>
                      <small>
                        <Timestamp value={event.at} />
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
            {trip.offers && (
              <Panel title="Dispatch offers">
                <DirectoryTable
                  preview={preview}
                  headers={["Driver", "Outcome", "Sent", "Response"]}
                  rows={trip.offers.map((o) => [
                    o.driver,
                    <StatusBadge status={o.status} />,
                    <Timestamp value={o.sentAt} />,
                    o.respondedAt ? (
                      <Timestamp value={o.respondedAt} />
                    ) : (
                      "No response"
                    ),
                  ])}
                />
              </Panel>
            )}
            {trip.feedback && (
              <Panel
                title={`Feedback · ${trip.feedback.length} recorded ratings`}
              >
                <DirectoryTable
                  preview={preview}
                  headers={["From", "Rating", "Comment", "Recorded"]}
                  rows={trip.feedback.map((r) => [
                    r.rater,
                    `${r.rating} / 5`,
                    r.comment ?? "No comment",
                    <Timestamp value={r.createdAt} />,
                  ])}
                />
              </Panel>
            )}
            {trip.supportCases && (
              <Panel title="Linked support cases">
                <DirectoryTable
                  preview={preview}
                  headers={["Case", "State"]}
                  rows={trip.supportCases.map((c) => [
                    <Link href={`/admin/support/${c.id}`}>{c.subject}</Link>,
                    <StatusBadge status={c.status} />,
                  ])}
                />
              </Panel>
            )}
            {trip.courier && (
              <Panel title="Courier handoff">
                <DefinitionList
                  items={[
                    ["Recipient", trip.courier.recipientMasked],
                    ["Parcel weight", `${trip.courier.weightKg} kg`],
                    ["Failed attempts", `${trip.courier.failedAttempts} / 5`],
                    ["Sender resets", `${trip.courier.resets} / 2`],
                    [
                      "Return reason",
                      trip.courier.returnReason ?? "Not applicable",
                    ],
                  ]}
                />
                <Notice>
                  Verification codes are never shown in the dashboard. Staff
                  overrides are not available.
                </Notice>
              </Panel>
            )}
          </div>
          <aside>
            <Panel title="Fare & payment">
              <div className="fare-total">
                <MoneyValue value={trip.fareKobo} />
                <small>Original fare · NGN</small>
              </div>
              <DefinitionList
                items={[
                  ["Method", statusLabel(trip.paymentMethod)],
                  [
                    "Commission",
                    trip.commissionKobo ? (
                      <MoneyValue value={trip.commissionKobo} />
                    ) : (
                      "Not settled"
                    ),
                  ],
                  [
                    "Driver earning",
                    trip.driverEarningKobo ? (
                      <MoneyValue value={trip.driverEarningKobo} />
                    ) : (
                      "Not settled"
                    ),
                  ],
                  [
                    "Hold transaction",
                    trip.holdTransactionId ? (
                      <Link
                        href={`/admin/transactions/${trip.holdTransactionId}`}
                      >
                        Inspect hold →
                      </Link>
                    ) : (
                      "None"
                    ),
                  ],
                  [
                    "Settlement transaction",
                    trip.settleTransactionId ? (
                      <Link
                        href={`/admin/transactions/${trip.settleTransactionId}`}
                      >
                        Inspect settlement →
                      </Link>
                    ) : (
                      "None"
                    ),
                  ],
                  [
                    "Prior wallet refunds",
                    refund ? (
                      <MoneyValue value={refund.refundedKobo} />
                    ) : (
                      "Not loaded"
                    ),
                  ],
                  [
                    "Refundable remainder",
                    refund?.eligible ? (
                      <MoneyValue value={refund.remainingKobo} />
                    ) : (
                      "Not eligible"
                    ),
                  ],
                  [
                    "Payment state",
                    <StatusBadge key="pay" status={trip.paymentStatus} />,
                  ],
                  [
                    "Service outcome",
                    <StatusBadge
                      key="trip"
                      status={trip.status}
                      service={trip.service}
                    />,
                  ],
                ]}
              />
              {trip.status === "returned" &&
                trip.paymentStatus === "settled" && (
                  <Notice>
                    Original fare settled. This is a returned delivery.
                  </Notice>
                )}
              <p className="panel-note">
                Wallet refunds credit internal wallet value. They do not return
                funds to a card or bank. Financial actions are pending rollout
                checks and policy approval.
              </p>
            </Panel>
            {trip.refunds && trip.refunds.length > 0 && (
              <Panel title="Refund postings">
                <ul className="care-activity">
                  {trip.refunds.map((r) => (
                    <li key={r.id}>
                      <Link href={`/admin/transactions/${r.id}`}>{r.id}</Link> ·{" "}
                      <Timestamp value={r.createdAt} />
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
            {refund?.eligible && (
              <Panel title="Wallet correction">
                <RefundAction
                  tripId={trip.id}
                  recipient={refund.riderName}
                  remainingKobo={refund.remainingKobo}
                  enabled={
                    process.env.ENABLE_ADMIN_MONEY_ACTIONS === "true" &&
                    !preview
                  }
                />
              </Panel>
            )}
            <Panel title="People">
              <DefinitionList
                items={[
                  [
                    "Customer",
                    <Link
                      key="rider"
                      className="text-link"
                      href={`/admin/riders/${trip.riderId}`}
                    >
                      {trip.riderName}
                    </Link>,
                  ],
                  [
                    "Driver",
                    trip.driverId ? (
                      <Link
                        key="driver"
                        className="text-link"
                        href={`/admin/drivers/${trip.driverId}`}
                      >
                        {trip.driverName}
                      </Link>
                    ) : (
                      "Not assigned"
                    ),
                  ],
                  [
                    "Driver location",
                    "See timestamped position evidence in Journey",
                  ],
                ]}
              />
            </Panel>
            {trip.scheduledAt && (
              <Notice>
                Pickup: <Timestamp value={trip.scheduledAt} />. Funds checked at
                dispatch; a booking does not reserve a driver.
              </Notice>
            )}
          </aside>
        </div>
      </>
    );
  }
  if ((section === "drivers" || section === "riders") && id) {
    const person = preview
      ? fixtures.people.find((p) => p.id === id)
      : await adminRead<Person>(
          `${section === "drivers" ? "drivers" : "users"}/${encodeURIComponent(id)}`,
        );
    if (!person) notFound();
    const history = await records<Trip>(
      `trips?${queryString(search, { [section === "drivers" ? "driverId" : "riderId"]: id })}`,
      fixtures.trips.filter((t) =>
        section === "drivers" ? t.driverId === id : t.riderId === id,
      ),
      preview,
    );
    return (
      <>
        <Link className="back-link" href={`/admin/${section}`}>
          ← Back to directory
        </Link>
        <PageHeader
          eyebrow="PEOPLE"
          title={person.name}
          description={person.id}
        >
          <StatusBadge status={person.active ? "active" : "inactive"} />
        </PageHeader>
        <div className="detail-grid">
          <Panel title="Profile">
            <DefinitionList
              items={[
                ["Phone", person.phoneMasked],
                ["Email", person.emailMasked],
                ["Joined", <Timestamp key="joined" value={person.joinedAt} />],
                ["Recorded trips", person.trips],
              ]}
            />
            <Notice>
              Contact details are masked. Audited contact reveal is not enabled.
            </Notice>
          </Panel>
          {person.driver && (
            <Panel title="Driver profile">
              <DefinitionList
                items={[
                  [
                    "Application",
                    <StatusBadge key="status" status={person.driver.status} />,
                  ],
                  ["Vehicle", person.driver.vehicle],
                  ["Plate", person.driver.plate],
                  [
                    "Courier opted in",
                    person.driver.courierOptIn ? "Yes" : "No",
                  ],
                  [
                    "Rating",
                    person.driver.ratingCount
                      ? `${person.driver.rating} · ${person.driver.ratingCount} ratings`
                      : "Not yet rated",
                  ],
                  ["Availability", statusLabel(person.driver.availability)],
                ]}
              />
            </Panel>
          )}
        </div>
        {person.accounts && (
          <Panel title="Linked accounts">
            <DirectoryTable
              preview={preview}
              headers={["Account", "Balance · NGN", "Restriction"]}
              rows={person.accounts.map((a) => [
                <Link href={`/admin/ledger/${a.id}`}>
                  {statusLabel(a.kind)}
                </Link>,
                <MoneyValue value={a.balanceKobo} direction />,
                a.frozen ? "Frozen" : "Not frozen",
              ])}
            />
          </Panel>
        )}
        <Panel title="Linked trip history">
          <TripDirectory
            preview={preview}
            showFilters={false}
            trips={history.items}
            nextCursor={history.nextCursor}
            pagination={history.pagination}
          />
        </Panel>
      </>
    );
  }
  if (id && !(section === "settings" && id === "payments")) notFound();
  if (section === "overview") {
    const [data, tripPage] = await Promise.all([
      preview
        ? Promise.resolve(fixtures.overview)
        : adminRead<Overview>(
            `overview${typeof search.day === "string" ? `?day=${encodeURIComponent(search.day)}` : ""}`,
          ),
      records<Trip>(
        `trips?mode=live&limit=5`,
        fixtures.trips.filter((t) =>
          ["searching", "in_progress", "returning"].includes(t.status),
        ),
        preview,
      ),
    ]);
    const metrics = [
      ["Active trips", data.activeTrips, "Live snapshot", "route"],
      ["Available drivers", data.availableDrivers, "Live snapshot", "car"],
      [
        "Completed rides",
        data.completedRides,
        "Passenger · Selected day WAT",
        "check",
      ],
      [
        "Recognized commission",
        data.commissionKobo === null ? null : money(data.commissionKobo),
        "Ledger postings · Selected day WAT",
        "wallet",
      ],
    ];
    return (
      <>
        <PageHeader
          eyebrow="YOUR OPERATIONS, AT A GLANCE"
          title="Operations overview"
          description="A clear view of the trips, people and payments that need you."
        >
          <span className="date-chip">
            <Icon name="calendar" />
            {preview
              ? "09 October 2026"
              : new Date().toLocaleDateString("en-NG", {
                  timeZone: "Africa/Lagos",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
          </span>
        </PageHeader>
        <FilterForm action="/admin">
          <FormField>
            Reporting day · WAT
            <input
              type="date"
              name="day"
              defaultValue={
                typeof search.day === "string"
                  ? search.day
                  : new Date().toLocaleDateString("en-CA", {
                      timeZone: "Africa/Lagos",
                    })
              }
            />
          </FormField>
          <Button type="submit" variant="secondary" disabled={preview}>
            Apply day
          </Button>
          <span className="muted">
            Active trips and availability remain live snapshots.
          </span>
        </FilterForm>
        <div className="metric-band">
          {metrics.map(([label, value, caption, icon]) => (
            <div className="metric" key={String(label)}>
              <div>
                <span>{label}</span>
                <Icon name={String(icon)} />
              </div>
              <strong>{value ?? "—"}</strong>
              <small>{value === null ? "Not instrumented" : caption}</small>
            </div>
          ))}
        </div>
        <div className="overview-grid">
          <Panel
            title="On the road"
            detail="Lagos · A textual trip queue remains available"
            href="/admin/live"
            label="Open operations"
          >
            <OperationsMap />
          </Panel>
          <Panel
            title="Requires attention"
            detail={
              preview
                ? "Observed in the sample snapshot"
                : "Observed · severity, then oldest first"
            }
          >
            <div className="attention-list">
              {data.attention.length ? (
                data.attention.map((item) => (
                  <Link
                    href={item.href}
                    key={item.id}
                    className="attention-item"
                  >
                    <span className={`attention-icon ${item.severity}`}>
                      <Icon
                        name={item.severity === "danger" ? "alert" : "clock"}
                      />
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <small>
                        Observed <Timestamp value={item.observedAt} />
                      </small>
                    </div>
                    <Icon name="arrow" size={16} />
                  </Link>
                ))
              ) : (
                <QueryState
                  title={
                    data.attentionAvailable
                      ? "No observed exceptions"
                      : "Queue not connected"
                  }
                  message={
                    data.attentionAvailable
                      ? "No records matched the attention rules at this observation."
                      : "Use individual application, courier and reconciliation views to investigate."
                  }
                  icon="clock"
                />
              )}
            </div>
            <Link className="rail-link" href="/admin/reconciliation">
              Open reconciliation <Icon name="arrow" size={16} />
            </Link>
          </Panel>
        </div>
        <Panel
          title="Active trip preview"
          detail={`Snapshot · ${new Date(data.asOf).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos" })} WAT`}
          href="/admin/trips"
        >
          <TripDirectory
            preview={preview}
            showFilters={false}
            trips={tripPage.items}
            mode="live"
          />
        </Panel>
        {data.hourly && (
          <Panel
            title="Fulfilled trips by hour"
            detail="Selected day · WAT · completed passenger rides, delivered parcels, and returned parcels separately"
          >
            <DirectoryTable
              preview={preview}
              headers={[
                "Hour · WAT",
                "Passenger completed",
                "Courier delivered",
                "Courier returned",
              ]}
              rows={data.hourly.map((h) => [
                h.hour,
                h.rideCompleted,
                h.courierDelivered,
                h.courierReturned,
              ])}
            />
          </Panel>
        )}
        <div className="bottom-notes">
          <span>
            <Icon name="lock" size={16} /> Staff access is checked by the
            backend
          </span>
          <span>Trip status and payment status are tracked separately</span>
        </div>
      </>
    );
  }
  if (["trips", "live", "scheduled", "courier"].includes(section)) {
    const config: Record<string, [string, string, string]> = {
      trips: [
        "All trips",
        "OPERATIONS",
        "Passenger rides and courier deliveries, with their payment states kept distinct.",
      ],
      live: [
        "Live operations",
        "OPERATIONS",
        "Active trips from an authorized snapshot. Fleet map subscriptions are pending.",
      ],
      scheduled: [
        "Scheduled rides",
        "OPERATIONS",
        "Upcoming bookings and dispatch outcomes, in Lagos time.",
      ],
      courier: [
        "Courier deliveries",
        "OPERATIONS",
        "Follow handoffs, returns and delivery exceptions.",
      ],
    };
    const [title, eyebrow, description] = config[section];
    const extras: Record<string, string> =
      section === "courier"
        ? {
            service: "courier",
            ...(search.view === "exceptions"
              ? { mode: "courier_exceptions" }
              : search.view === "active"
                ? { mode: "live" }
                : {}),
          }
        : section === "scheduled" || section === "live"
          ? {
              mode:
                section === "scheduled" && search.view === "history"
                  ? "scheduled_history"
                  : section,
            }
          : {};
    const live =
      section === "live"
        ? preview
          ? ({
              drivers: [],
              asOf: fixtures.fixtureAsOf,
              capped: false,
              locationState: "ready",
              availableDriversInSnapshot: null,
              scope: {
                south: 6.2,
                north: 6.8,
                west: 3.1,
                east: 3.8,
                service: "ride",
                limit: 100,
              },
            } as LiveSnapshot)
          : await adminRead<LiveSnapshot>("live")
        : null;
    const data = await records<Trip>(
      `trips?${queryString(search, extras)}`,
      fixtures.trips,
      preview,
    );
    return (
      <>
        <PageHeader eyebrow={eyebrow} title={title} description={description}>
          <span className="date-chip">
            <Icon name="clock" />
            <Timestamp value={data.asOf} />
          </span>
        </PageHeader>
        {section === "scheduled" && (
          <nav className="section-tabs" aria-label="Schedule views">
            <Link href="/admin/scheduled">Upcoming & overdue</Link>
            <Link href="/admin/scheduled?view=history">History</Link>
          </nav>
        )}
        {section === "courier" && (
          <nav className="section-tabs" aria-label="Courier views">
            <Link href="/admin/courier?view=active">Active</Link>
            <Link href="/admin/courier?status=returning">Returning</Link>
            <Link href="/admin/courier?status=completed">Delivered</Link>
            <Link href="/admin/courier?status=returned">Returned</Link>
            <Link href="/admin/courier?view=exceptions">Exceptions</Link>
            <Link href="/admin/courier">History</Link>
          </nav>
        )}
        {section === "scheduled" && (
          <Notice>
            Bookings are not driver reservations. Wallet funds are checked at
            dispatch, normally starting five minutes before pickup.
          </Notice>
        )}
        {section === "courier" && (
          <Notice>
            Wallet-only · Maximum 5 kg · Five handoff attempts · Two sender
            resets. Returned deliveries are distinct from successful deliveries.
          </Notice>
        )}
        {section === "live" && (
          <LiveOperations initial={live!} preview={preview} />
        )}
        <TripDirectory
          preview={preview}
          trips={data.items}
          nextCursor={data.nextCursor}
          pagination={data.pagination}
          mode={
            section === "trips"
              ? "all"
              : (section as "live" | "scheduled" | "courier")
          }
        />
      </>
    );
  }
  if (["riders", "drivers", "applications"].includes(section)) {
    const drivers = section !== "riders";
    const samples = fixtures.people
      .filter((p) => !drivers || Boolean(p.driver))
      .filter(
        (p) =>
          (section !== "applications" ||
            p.driver?.status ===
              (typeof search.status === "string" ? search.status : "pending") ||
            search.status === "") &&
          (!search.id ||
            p.id.toLowerCase() === String(search.id).toLowerCase()) &&
          (!search.status || p.driver?.status === search.status) &&
          (!search.mode || p.active === (search.mode === "active")),
      );
    const path =
      section === "riders"
        ? "users"
        : section === "drivers"
          ? "drivers"
          : "driver-applications";
    const data = await records<Person>(
      `${path}?${queryString(search, section === "applications" && search.status === undefined ? { status: "pending" } : {})}`,
      samples,
      preview,
    );
    return (
      <>
        <PageHeader
          eyebrow="PEOPLE"
          title={
            section === "riders"
              ? "Riders & customers"
              : section === "drivers"
                ? "Drivers"
                : "Driver applications"
          }
          description={
            section === "applications"
              ? "Pending applications with authenticated documents and audited decisions."
              : "One user identity, with separate account, application and availability states."
          }
        />
        {section === "applications" && (
          <Notice>
            Select an applicant to inspect private documents and review the
            current submission. Decisions require a reason and reject stale
            document versions.
          </Notice>
        )}
        <DirectoryFilters
          preview={preview}
          searchLabel="Exact user ID"
          defaultStatus={section === "applications" ? "pending" : ""}
          statuses={
            drivers
              ? ["pending", "approved", "rejected"].map((value) => ({
                  value,
                  label: statusLabel(value),
                }))
              : undefined
          }
        />
        <DirectoryTable
          rowKeys={data.items.map((person) => person.id)}
          preview={preview}
          pagination={data.pagination}
          noun={
            section === "applications"
              ? "applications"
              : section === "drivers"
                ? "drivers"
                : "users"
          }
          nextHref={nextLink(`/admin/${section}`, search, data.nextCursor)}
          headers={[
            "Name / ID",
            "Contact",
            "Account",
            ...(drivers
              ? ["Application", "Vehicle", "Courier"]
              : ["Joined", "Trips"]),
          ]}
          rows={data.items.map((p) => [
            <>
              <Link
                className="record-link"
                href={`/admin/${section === "applications" ? "applications" : drivers ? "drivers" : "riders"}/${p.id}`}
              >
                {p.name}
              </Link>
              <small>{p.id}</small>
            </>,
            <>
              {p.phoneMasked}
              <small>{p.emailMasked}</small>
            </>,
            <StatusBadge status={p.active ? "active" : "inactive"} />,
            ...(drivers
              ? [
                  <StatusBadge
                    key="status"
                    status={p.driver?.status ?? "none"}
                  />,
                  <>
                    {p.driver?.vehicle}
                    <small>{p.driver?.plate}</small>
                  </>,
                  p.driver?.courierOptIn ? "Opted in" : "Not opted in",
                ]
              : [<Timestamp key="joined" value={p.joinedAt} />, p.trips]),
          ])}
        />
      </>
    );
  }
  if (section === "payments") {
    const data = await records<PaymentIntent>(
      `payment-intents?${queryString(search)}`,
      fixtures.intents.filter(
        (p) => !search.status || p.status === search.status,
      ),
      preview,
    );
    return (
      <>
        <PageHeader
          eyebrow="MONEY"
          title="Payments"
          description="Trace wallet and earnings funding from checkout to the ledger."
        />
        <Notice>
          A successful top-up is wallet funding, not trip revenue. Browser
          callbacks never establish payment success.
        </Notice>
        <FinanceFilters kind="payments" preview={preview} />
        <DirectoryTable
          preview={preview}
          pagination={data.pagination}
          noun="payments"
          nextHref={nextLink("/admin/payments", search, data.nextCursor)}
          headers={[
            "Reference",
            "Customer",
            "Target",
            "Amount · NGN",
            "Intent status",
            "Created",
            "Paid",
          ]}
          rows={data.items.map((p) => [
            <Link className="record-link" href={`/admin/payments/${p.id}`}>
              {p.reference}
            </Link>,
            p.customer,
            statusLabel(p.target),
            <MoneyValue value={p.amountKobo} />,
            <StatusBadge status={p.status} />,
            <Timestamp value={p.createdAt} />,
            p.paidAt ? <Timestamp value={p.paidAt} /> : "Not confirmed",
          ])}
        />
      </>
    );
  }
  if (section === "withdrawals") {
    const data = await records<Withdrawal>(
      `withdrawals?${queryString(search)}`,
      fixtures.withdrawals,
      preview,
    );
    return (
      <>
        <PageHeader
          eyebrow="MONEY"
          title="Withdrawals"
          description="Follow driver payouts through provider confirmation and reconciliation."
        />
        <Notice>
          Pending means unresolved. Do not resend a payout while its original
          outcome is uncertain. Withdrawals are automatic, with no manual
          approval state.
        </Notice>
        <FinanceFilters kind="withdrawals" preview={preview} />
        <DirectoryTable
          preview={preview}
          pagination={data.pagination}
          noun="withdrawals"
          nextHref={nextLink("/admin/withdrawals", search, data.nextCursor)}
          headers={[
            "Reference / Driver",
            "Destination",
            "Amount · NGN",
            "Fee · NGN",
            "Status",
            "Requested",
            "Attempts",
          ]}
          rows={data.items.map((p) => [
            <>
              <Link className="record-link" href={`/admin/withdrawals/${p.id}`}>
                {p.reference}
              </Link>
              <small>{p.driver}</small>
            </>,
            <>
              {p.bank}
              <small>•••• {p.accountLastFour}</small>
            </>,
            <MoneyValue value={p.amountKobo} />,
            <MoneyValue value={p.feeKobo} />,
            <StatusBadge status={p.status} />,
            <Timestamp value={p.createdAt} />,
            p.attempts,
          ])}
        />
      </>
    );
  }
  if (section === "ledger") {
    const data = await records<LedgerAccount>(
      `accounts?${queryString(search)}`,
      fixtures.accounts,
      preview,
    );
    return (
      <>
        <PageHeader
          eyebrow="MONEY"
          title="Wallets & ledger"
          description="Balances with provenance. Every correction is a new ledger posting."
        />
        <Notice>
          Ledger entries are append-only. Negative driver earnings represent
          cash commission debt. Debit and credit do not universally mean loss
          and gain.
        </Notice>
        <FinanceFilters kind="ledger" preview={preview} />
        <DirectoryTable
          preview={preview}
          pagination={data.pagination}
          noun="accounts"
          nextHref={nextLink("/admin/ledger", search, data.nextCursor)}
          headers={[
            "Owner / Account",
            "Account kind",
            "Balance · NGN",
            "Restrictions",
            "Last changed",
          ]}
          rows={data.items.map((a) => [
            <>
              <Link className="record-link" href={`/admin/ledger/${a.id}`}>
                {a.owner}
              </Link>
              <small>{a.id}</small>
            </>,
            statusLabel(a.kind),
            <MoneyValue
              value={a.balanceKobo}
              direction={a.kind !== "system"}
            />,
            <StatusBadge status={a.frozen ? "frozen" : "not_frozen"} />,
            <Timestamp value={a.updatedAt} />,
          ])}
        />
        <Panel
          title="Financial controls"
          detail="Not enabled in this implementation"
        >
          <p className="panel-note">
            Refund eligibility, complete transaction detail, idempotent
            adjustments and freeze-impact verification must be completed before
            enabling money actions. Accounting sweeps remain policy-gated.
          </p>
        </Panel>
      </>
    );
  }
  if (section === "reconciliation") {
    type Reconciliation = {
      accounts: { code: string; balanceKobo: string; updatedAt: string }[];
      exceptions: { kind: string; count: string }[];
      coverage: string;
      asOf: string;
    };
    const data = preview
      ? null
      : await adminRead<Reconciliation>("reconciliation");
    return (
      <>
        <PageHeader
          eyebrow="MONEY"
          title="Reconciliation"
          description="Compare obligations and observed outcomes without conflating them with bank cash."
        />
        <div className="metric-band">
          {[
            "gateway_balance",
            "payout_in_transit",
            "escrow_trips",
            "suspense",
          ].map((code) => {
            const account = data?.accounts.find((a) => a.code === code);
            return (
              <div className="metric" key={code}>
                <span>{statusLabel(code)}</span>
                <strong className="small-metric">
                  {account ? money(account.balanceKobo) : "—"}
                </strong>
                <small>
                  {account ? (
                    <Timestamp value={account.updatedAt} />
                  ) : (
                    "No observation"
                  )}
                </small>
              </div>
            );
          })}
        </div>
        <Panel
          title="Derived exception queues"
          detail={data?.coverage ?? "No provider observations are simulated"}
        >
          {data ? (
            <DirectoryTable
              preview={false}
              headers={["Exception group", "Records"]}
              rows={data.exceptions.map((e) => {
                const queues: Record<string, string> = {
                  "Top-up mismatches": "topups",
                  "Unresolved withdrawals": "withdrawals",
                  "Terminal trips with held funds": "escrow",
                };
                return [
                  queues[e.kind] ? (
                    <Link
                      className="record-link"
                      href={`/admin/reconciliation/${queues[e.kind]}`}
                    >
                      {e.kind}
                    </Link>
                  ) : (
                    e.kind
                  ),
                  e.count,
                ];
              })}
            />
          ) : (
            <QueryState
              title="Reconciliation is not simulated"
              message="Connect the staff API to inspect real ledger balances and unresolved records."
            />
          )}
        </Panel>
        <Notice>
          Provider balance, worker heartbeats and last-success observations are
          not yet instrumented. Eligibility thresholds are not customer service
          guarantees.
        </Notice>
      </>
    );
  }
  if (section === "settings") {
    const settings = preview
      ? null
      : await adminRead<PaymentSettings>("payments/settings");
    const settingsStaff = preview ? null : await requireStaff();
    const labels: Record<string, string> = {
      min_topup_kobo: "Minimum top-up",
      max_topup_kobo: "Maximum top-up",
      min_withdrawal_kobo: "Minimum withdrawal",
      max_daily_withdrawal_kobo: "Daily withdrawal maximum",
      withdrawal_fee_kobo: "Withdrawal fee",
      cash_debt_limit_kobo: "Cash debt limit",
      paystack_balance_alert_kobo: "Paystack balance alert",
      admin_adjustment_approval_kobo: "Adjustment approval threshold",
    };
    return (
      <>
        <PageHeader
          eyebrow="SYSTEM"
          title="Payment settings"
          description="Read-only inspection of current payment configuration."
        />
        <Notice>
          Migration values are development placeholders. Commercial values and
          edit safeguards require owner approval before live rollout.
        </Notice>
        <Panel title="Limits and controls">
          {settings ? (
            <DefinitionList
              items={[
                ...Object.entries(labels).map(
                  ([key, label]): [string, React.ReactNode] => [
                    label,
                    settings[key as keyof PaymentSettings] !== undefined
                      ? money(String(settings[key as keyof PaymentSettings]))
                      : "Unknown",
                  ],
                ),
                [
                  "New payout account cooldown",
                  `${settings.new_payout_account_cooldown_hours ?? "Unknown"} hours`,
                ],
                [
                  "Payout name matching",
                  String(settings.payout_name_match ?? "Unknown"),
                ],
                [
                  "Transfer fee tiers",
                  JSON.stringify(settings.transfer_fee_tiers ?? []),
                ],
              ]}
            />
          ) : (
            <QueryState
              title="No settings loaded"
              message="Preview mode does not invent commercial limits."
            />
          )}
        </Panel>
        {settings && settingsStaff?.platformRole === "super_admin" && (
          <Panel title="Super admin configuration">
            <PaymentSettingsEditor
              key={settings.version}
              settings={settings}
              enabled={process.env.ENABLE_ADMIN_SETTINGS_ACTIONS === "true"}
            />
          </Panel>
        )}
      </>
    );
  }
  if (section === "audit") {
    type Audit = {
      items: {
        id: string;
        actor: string;
        action: string;
        reason: string;
        createdAt: string;
        transactionId: string | null;
      }[];
      coverage: string;
      nextCursor: string | null;
      pagination?: import("@/contracts/admin").PaginationInfo;
    };
    const qs = new URLSearchParams();
    for (const key of [
      "page",
      "limit",
      "before",
      "action",
      "objectId",
      "actorId",
    ])
      if (typeof search[key] === "string" && search[key])
        qs.set(key, search[key] as string);
    if (!qs.has("before")) {
      qs.set("page", qs.get("page") ?? "1");
      qs.set("limit", qs.get("limit") ?? "20");
    }
    const data = preview ? null : await adminRead<Audit>(`audit?${qs}`);
    return (
      <>
        <PageHeader
          eyebrow="SYSTEM"
          title="Audit log"
          description="Actor-attributed decisions, care activity, exports, and sensitive document reads."
        />
        <DirectoryFilters
          preview={preview}
          searchName="objectId"
          searchLabel="Exact audited object UUID"
          statusName="action"
          statusLabel="Action"
          allLabel="All actions"
          statuses={[
            "staff_record_search",
            "trip_context_read",
            "person_context_read",
            "support_created",
            "support_note",
            "support_transition",
            "safety_created",
            "safety_transition",
            "driver_application_review",
            "driver_document_view",
            "report_export",
            "adjustment",
            "refund",
            "freeze",
            "unfreeze",
            "settings_update",
          ].map((action) => ({ value: action, label: statusLabel(action) }))}
        />
        <Notice>
          {data?.coverage ??
            "Staff reads, exports, financial actions, reviews, configuration changes, and care activity are audited. Preview does not simulate audit history."}
        </Notice>
        {data ? (
          <DirectoryTable
            preview={false}
            rowKeys={data.items.map((row) => row.id)}
            pagination={data.pagination}
            nextHref={
              data.nextCursor
                ? `/admin/audit?${new URLSearchParams({ ...Object.fromEntries(qs), before: data.nextCursor })}`
                : undefined
            }
            headers={["Actor", "Action", "Reason", "Time", "Transaction"]}
            rows={data.items.map((a) => [
              a.actor,
              statusLabel(a.action),
              a.reason,
              <Timestamp value={a.createdAt} />,
              a.transactionId ?? "Not applicable",
            ])}
          />
        ) : (
          <QueryState
            title="No audit records simulated"
            message="Connect the staff API to inspect actual recorded actions."
          />
        )}
      </>
    );
  }
  notFound();
}

export default async function AdminPage(
  props: Parameters<typeof RenderAdminPage>[0],
) {
  try {
    return await RenderAdminPage(props);
  } catch (error) {
    if (error instanceof InvalidStaffQuery) {
      const { segments = [] } = await props.params;
      return (
        <>
          <PageHeader
            eyebrow="QUERY"
            title="Check the filters"
            description="The record ID or filter values were rejected."
          />
          <QueryState
            title="Invalid query"
            message="Clear the filters or check the record ID before trying again."
          />
          <LinkButton
            href={
              segments[0]
                ? `/admin/${encodeURIComponent(segments[0])}`
                : "/admin"
            }
          >
            Clear filters and return to the list
          </LinkButton>
        </>
      );
    }
    throw error;
  }
}
