export const navigation: readonly {
  label: string;
  items: readonly (readonly [string, string, string])[];
}[] = [
  { label: "Workspace", items: [["Overview", "/admin", "grid"]] },
  {
    label: "Operations",
    items: [
      ["Live operations", "/admin/live", "map"],
      ["All trips", "/admin/trips", "route"],
      ["Scheduled rides", "/admin/scheduled", "calendar"],
      ["Courier deliveries", "/admin/courier", "box"],
    ],
  },
  {
    label: "People",
    items: [
      ["Riders & customers", "/admin/riders", "users"],
      ["Drivers", "/admin/drivers", "car"],
      ["Applications", "/admin/applications", "file"],
    ],
  },
  {
    label: "Money",
    items: [
      ["Payments", "/admin/payments", "card"],
      ["Wallets & ledger", "/admin/ledger", "wallet"],
      ["Withdrawals", "/admin/withdrawals", "arrow"],
      ["Reconciliation", "/admin/reconciliation", "check"],
    ],
  },
  {
    label: "Care",
    items: [
      ["Support cases", "/admin/support", "users"],
      ["Safety incidents", "/admin/safety", "alert"],
      ["Ratings & feedback", "/admin/ratings", "star"],
    ],
  },
  {
    label: "Insights",
    items: [
      ["Reports", "/admin/reports", "grid"],
      ["Pricing", "/admin/pricing", "card"],
    ],
  },
  {
    label: "System",
    items: [
      ["Payment settings", "/admin/settings/payments", "settings"],
      ["Audit log", "/admin/audit", "file"],
      ["Service health", "/admin/health", "pulse"],
      ["Team access", "/admin/team", "lock"],
    ],
  },
] as const;
export const pageNames: Record<string, string> = Object.fromEntries(
  navigation.flatMap((group) =>
    group.items.map(([label, path]) => [path, label]),
  ),
);
