/** Dashboard contracts; availability and rollout gates are recorded in routeInventory. */
export const tripStatuses = [
  "scheduled",
  "searching",
  "driver_assigned",
  "driver_arrived",
  "in_progress",
  "completed",
  "cancelled",
  "no_drivers_found",
  "returning",
  "returned",
] as const;
export type TripStatus = (typeof tripStatuses)[number];
export type ServiceType = "ride" | "courier";
export type StaffRole = "admin" | "super_admin";
export type Kobo = string;
export interface Scope {
  service?: ServiceType;
  status?: string;
  dateBasis: string;
  from?: string;
  to?: string;
}
export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
  asOf: string;
  scope: Scope;
  count?: { value: number; exact: boolean };
}
export interface TripPosition {
  location: { latitude: number; longitude: number; at: string } | null;
  state: "fresh" | "unavailable" | "not_applicable";
  asOf: string;
}
export interface SampledPositions {
  items: { latitude: number; longitude: number; at: string }[];
  total: number;
  limit: number;
}
export interface Trip {
  currentPosition?: TripPosition;
  sampledPositions?: SampledPositions;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  estimatedDistanceM?: number;
  estimatedDurationS?: number;
  cancelReason?: string | null;
  commissionKobo?: string | null;
  driverEarningKobo?: string | null;
  holdTransactionId?: string | null;
  settleTransactionId?: string | null;
  offers?: {
    id: string;
    status: string;
    driver: string;
    sentAt: string;
    respondedAt: string | null;
    expiresAt: string;
  }[];
  feedback?: {
    id: string;
    rating: number;
    comment: string | null;
    rater: string;
    createdAt: string;
  }[];
  supportCases?: { id: string; subject: string; status: string }[];
  refunds?: { id: string; createdAt: string }[];
  id: string;
  service: ServiceType;
  status: TripStatus;
  pickup: string;
  destination: string;
  riderId: string;
  riderName: string;
  driverId: string | null;
  driverName: string | null;
  requestedAt: string;
  scheduledAt?: string;
  updatedAt: string;
  paymentMethod: "cash" | "wallet";
  paymentStatus: "pending" | "unpaid" | "held" | "settled" | "released";
  fareKobo: Kobo;
  currency: "NGN";
  locationAt: string | null;
  courier?: {
    recipientMasked: string;
    weightKg: number;
    failedAttempts: number;
    resets: number;
    returnReason?: string;
  };
  timeline: {
    status: TripStatus;
    at: string;
    actor: string;
    reason?: string;
  }[];
  allowedActions: readonly string[];
}
export interface Person {
  accounts?: {
    id: string;
    kind: string;
    balanceKobo: string;
    frozen: boolean;
  }[];
  id: string;
  name: string;
  phoneMasked: string;
  emailMasked: string;
  joinedAt: string;
  active: boolean;
  trips: number;
  driver?: {
    status: "pending" | "approved" | "rejected";
    vehicle: string;
    plate: string;
    courierOptIn: boolean;
    availability: "offline" | "available" | "busy" | "unknown";
    locationAt: string | null;
    rating: number | null;
    ratingCount: number;
  };
}
export interface PaymentIntent {
  id: string;
  reference: string;
  userId: string;
  customer: string;
  target: "wallet" | "earnings";
  amountKobo: Kobo;
  status: "pending" | "succeeded" | "failed" | "abandoned" | "mismatch";
  createdAt: string;
  paidAt: string | null;
}
export interface Withdrawal {
  id: string;
  driver: string;
  amountKobo: Kobo;
  feeKobo: Kobo;
  bank: string;
  accountLastFour: string;
  status: "pending" | "processing" | "success" | "failed" | "reversed";
  createdAt: string;
  reference: string;
  attempts: number;
}
export interface LedgerAccount {
  id: string;
  owner: string;
  kind: "wallet" | "earnings" | "system";
  balanceKobo: Kobo;
  frozen: boolean;
  updatedAt: string;
}
export interface AttentionItem {
  id: string;
  title: string;
  detail: string;
  severity: "warning" | "danger" | "neutral";
  href: string;
  observedAt: string;
}
export interface Overview {
  hourly?: {
    hour: string;
    rideCompleted: string;
    courierDelivered: string;
    courierReturned: string;
  }[];
  attentionAvailable?: boolean;
  activeTrips: number | null;
  availableDrivers: number | null;
  completedRides: number | null;
  commissionKobo: Kobo | null;
  asOf: string;
  attention: AttentionItem[];
  scope: Scope;
}
export interface MoneyAction {
  amountKobo: Kobo;
  reason: string;
  requestKey: string;
}
export interface WalletRefund extends MoneyAction {
  tripId: string;
}
export interface BalanceAdjustment extends MoneyAction {
  userId: string;
  account: "wallet" | "earnings";
  direction: "credit" | "debit";
}
export interface ApplicationDecision {
  userId: string;
  expectedUpdatedAt: string;
  decision: "approved" | "rejected";
  reason: string;
  requestKey: string;
}
export type QueryState<T> =
  | { state: "ready"; data: T; asOf: string }
  | {
      state: "loading" | "unavailable" | "forbidden" | "error";
      message: string;
    }
  | { state: "stale"; data: T; asOf: string; message: string };
export const routeInventory = [
  ["POST", "/api/admin/search", "implemented-masked-audited-rate-limited"],
  ["GET", "/api/admin/environment", "implemented-configured-mode-only"],
  ["GET", "/api/admin/overview", "implemented"],
  ["GET", "/api/admin/live", "implemented"],
  ["GET", "/api/admin/trips", "implemented"],
  ["GET", "/api/admin/trips/:id", "implemented"],
  ["GET", "/api/admin/trips/:id/location", "implemented-audited-redis-only"],
  ["GET", "/api/admin/users", "implemented"],
  ["GET", "/api/admin/drivers", "implemented"],
  ["GET", "/api/admin/driver-applications", "implemented"],
  ["POST", "/api/admin/driver-applications/:id/review", "implemented"],
  ["GET", "/api/admin/payment-intents", "implemented"],
  ["GET", "/api/admin/withdrawals", "implemented"],
  ["GET", "/api/admin/accounts", "implemented"],
  ["GET", "/api/admin/reconciliation", "implemented"],
  ["GET", "/api/admin/audit", "implemented"],
  ["GET", "/api/admin/health", "implemented"],
  ["GET", "/api/admin/driver-applications/:id", "implemented"],
  [
    "GET",
    "/api/admin/driver-applications/:id/documents/:kind",
    "implemented-audited",
  ],
  ["GET", "/api/admin/payment-intents/:id", "implemented"],
  ["GET", "/api/admin/withdrawals/:id", "implemented"],
  ["GET", "/api/admin/accounts/:id", "implemented"],
  ["GET", "/api/admin/transactions/:id", "implemented"],
  ["GET", "/api/admin/refund-eligibility/:id", "implemented"],
  ["GET", "/api/admin/operations/:key", "implemented-own-actor-only"],
  ["GET", "/api/admin/reconciliation/:kind", "implemented-derived"],
  ["GET", "/api/admin/reports", "implemented-bounded"],
  ["GET", "/api/admin/reports/export", "implemented-audited-aggregate"],
  ["GET", "/api/admin/pricing", "implemented-read-only"],
  ["GET", "/api/admin/ratings", "implemented-read-only"],
  ["GET", "/api/admin/team", "implemented-super-admin-read-only"],
  ["GET", "/api/admin/support", "implemented"],
  ["GET", "/api/admin/support/:id", "implemented-audited"],
  ["POST", "/api/admin/support", "implemented-internal"],
  ["POST", "/api/admin/support/:id/activity", "implemented-internal"],
  ["GET", "/api/admin/safety", "implemented-super-admin-only"],
  ["GET", "/api/admin/safety/:id", "implemented-super-admin-audited"],
  ["POST", "/api/admin/safety", "implemented-staff-intake-only"],
  ["POST", "/api/admin/safety/:id/activity", "implemented-super-admin-only"],
  ["GET", "/api/admin/payments/users/:userId", "existing"],
  ["GET", "/api/admin/payments/settings", "existing"],
  ["POST", "/api/admin/payments/refunds", "existing"],
  ["POST", "/api/admin/payments/adjustments", "existing"],
  ["POST", "/api/admin/payments/accounts/:userId/freeze", "existing"],
  ["PATCH", "/api/admin/payments/settings", "existing"],
  ["POST", "/api/admin/payments/sweeps", "existing-policy-gated"],
] as const;

export type SearchScope =
  | "all"
  | "people"
  | "trips"
  | "finance"
  | "support"
  | "safety";
export interface StaffSearchHit {
  id: string;
  type:
    | "person"
    | "trip"
    | "payment"
    | "withdrawal"
    | "account"
    | "support"
    | "safety";
  title: string;
  subtitle: string;
  href: string;
}
export interface StaffSearchResult {
  groups: {
    scope: Exclude<SearchScope, "all">;
    label: string;
    items: StaffSearchHit[];
    hasMore: boolean;
    nextCursor: string | null;
  }[];
  asOf: string;
  limitPerGroup: number;
}

export interface DriverApplication {
  userId: string;
  name: string;
  status: "none" | "pending" | "approved" | "rejected";
  version: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  address: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  plate: string | null;
  rejectionReason: string | null;
  documents: {
    kind: "license" | "registration" | "insurance";
    available: boolean;
  }[];
  allowedActions: string[];
  asOf: string;
}
export interface LiveDriver {
  id: string;
  name: string;
  approval: string;
  vehicle: string;
  plate: string;
  courierOptIn: boolean;
  activeTripId: string | null;
  availability: string;
  location: { latitude: number; longitude: number; at: string } | null;
}
export interface LiveSnapshot {
  drivers: LiveDriver[];
  asOf: string;
  capped: boolean;
  locationState: "ready" | "unavailable";
  availableDriversInSnapshot: number | null;
  scope: {
    south: number;
    north: number;
    west: number;
    east: number;
    service: "ride" | "courier";
    limit: number;
  };
}
export interface RefundEligibility {
  id: string;
  riderId: string;
  riderName: string;
  status: string;
  fareKobo: string;
  refundedKobo: string;
  remainingKobo: string;
  eligible: boolean;
  destination: string;
  asOf: string;
}
