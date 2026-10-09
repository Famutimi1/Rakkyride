/** Proposed read contracts. These are not claims that Express exposes these endpoints. */
export const tripStatuses = ['scheduled', 'searching', 'driver_assigned', 'driver_arrived', 'in_progress', 'completed', 'cancelled', 'no_drivers_found', 'returning', 'returned'] as const;
export type TripStatus = typeof tripStatuses[number];
export type ServiceType = 'ride' | 'courier';
export type StaffRole = 'admin' | 'super_admin';
export type Kobo = string;
export interface Scope { service?: ServiceType; status?: string; dateBasis: string; from?: string; to?: string }
export interface PageResult<T> { items: T[]; nextCursor: string | null; asOf: string; scope: Scope; count?: { value: number; exact: boolean } }
export interface Trip {
  id: string; service: ServiceType; status: TripStatus; pickup: string; destination: string;
  riderId: string; riderName: string; driverId: string | null; driverName: string | null;
  requestedAt: string; scheduledAt?: string; updatedAt: string;
  paymentMethod: 'cash' | 'wallet'; paymentStatus: 'pending' | 'held' | 'settled' | 'released';
  fareKobo: Kobo; currency: 'NGN'; locationAt: string | null;
  courier?: { recipientMasked: string; weightKg: number; failedAttempts: number; resets: number; returnReason?: string };
  timeline: { status: TripStatus; at: string; actor: string; reason?: string }[];
  allowedActions: readonly string[];
}
export interface Person {
  id: string; name: string; phoneMasked: string; emailMasked: string; joinedAt: string;
  active: boolean; trips: number; driver?: { status: 'pending' | 'approved' | 'rejected'; vehicle: string; plate: string; courierOptIn: boolean; availability: 'offline' | 'available' | 'busy' | 'unknown'; locationAt: string | null; rating: number | null; ratingCount: number };
}
export interface PaymentIntent { id: string; reference: string; userId: string; customer: string; target: 'wallet' | 'earnings'; amountKobo: Kobo; status: 'pending' | 'succeeded' | 'failed' | 'abandoned' | 'mismatch'; createdAt: string; paidAt: string | null }
export interface Withdrawal { id: string; driver: string; amountKobo: Kobo; feeKobo: Kobo; bank: string; accountLastFour: string; status: 'pending' | 'processing' | 'success' | 'failed' | 'reversed'; createdAt: string; reference: string; attempts: number }
export interface LedgerAccount { id: string; owner: string; kind: 'wallet' | 'earnings' | 'system'; balanceKobo: Kobo; frozen: boolean; updatedAt: string }
export interface AttentionItem { id: string; title: string; detail: string; severity: 'warning' | 'danger' | 'neutral'; href: string; observedAt: string }
export interface Overview { activeTrips: number | null; availableDrivers: number | null; completedRides: number | null; commissionKobo: Kobo | null; asOf: string; attention: AttentionItem[]; scope: Scope }
export interface MoneyAction { amountKobo: Kobo; reason: string; requestKey: string }
export interface WalletRefund extends MoneyAction { tripId: string }
export interface BalanceAdjustment extends MoneyAction { userId: string; account: 'wallet' | 'earnings'; direction: 'credit' | 'debit' }
export interface ApplicationDecision { userId: string; expectedUpdatedAt: string; decision: 'approved' | 'rejected'; reason: string; requestKey: string }
export type QueryState<T> = { state: 'ready'; data: T; asOf: string } | { state: 'loading' | 'unavailable' | 'forbidden' | 'error'; message: string } | { state: 'stale'; data: T; asOf: string; message: string };
export const routeInventory = [
  ['GET', '/api/admin/overview', 'proposed'], ['GET', '/api/admin/live', 'proposed'],
  ['GET', '/api/admin/trips', 'proposed'], ['GET', '/api/admin/trips/:id', 'proposed'],
  ['GET', '/api/admin/users', 'proposed'], ['GET', '/api/admin/drivers', 'proposed'],
  ['GET', '/api/admin/driver-applications', 'proposed'], ['POST', '/api/admin/driver-applications/:id/review', 'proposed'],
  ['GET', '/api/admin/payment-intents', 'proposed'], ['GET', '/api/admin/withdrawals', 'proposed'],
  ['GET', '/api/admin/accounts', 'proposed'], ['GET', '/api/admin/reconciliation', 'proposed'],
  ['GET', '/api/admin/audit', 'proposed'], ['GET', '/api/admin/health', 'proposed'],
  ['GET', '/api/admin/payments/users/:userId', 'existing'], ['GET', '/api/admin/payments/settings', 'existing'],
  ['POST', '/api/admin/payments/refunds', 'existing'], ['POST', '/api/admin/payments/adjustments', 'existing'],
  ['POST', '/api/admin/payments/accounts/:userId/freeze', 'existing'], ['PATCH', '/api/admin/payments/settings', 'existing'],
  ['POST', '/api/admin/payments/sweeps', 'existing-policy-gated'],
] as const;
