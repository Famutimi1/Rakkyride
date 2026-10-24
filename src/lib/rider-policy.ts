/** Only participant-facing operations are reachable through the passenger proxy. */
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const rules: Record<string, RegExp[]> = {
  GET: [/^notifications\/browser\/config$/, /^location\/nearby$/, /^auth\/me$/, /^wallet(?:\/transactions)?$/, /^trips\/(active|scheduled|history)$/, new RegExp(`^trips/${uuid}(?:/(delivery-code|messages))?$`, "i"), /^care\/settings$/, /^care\/support$/, new RegExp(`^care/support/${uuid}$`,"i"), /^notifications(?:\/(unread-count|preferences))?$/, /^payments\/topups\/tu_[a-f0-9]{32}$/i],
  POST: [/^notifications\/browser\/(status|subscriptions)$/, /^auth\/phone-change\/(initiate|verify)$/, /^care\/support$/, new RegExp(`^care/support/${uuid}/messages$`,"i"), /^places\/(autocomplete|details)$/, /^geocode\/reverse$/, /^trips(?:\/(estimate|route))?$/, new RegExp(`^trips/${uuid}/(cancel|rating|messages|delivery-code/rotate)$`, "i"), /^payments\/topups$/, /^notifications\/read-all$/, new RegExp(`^notifications/${uuid}/(read|opened)$`, "i")],
  DELETE:[new RegExp(`^notifications/browser/subscriptions/${uuid}$`,"i")],
  PATCH: [/^auth\/(profile|active-role)$/, /^notifications\/preferences$/],
};
export function riderOperationAllowed(method: string, path: string) { return (rules[method] ?? []).some(rule => rule.test(path)); }
export function riderQuery(path: string, input: URLSearchParams) {
  const output = new URLSearchParams();
  const keys = path === "trips/history" ? ["cursor", "limit", "status", "serviceType"] : path === "wallet/transactions" || path === "notifications" || path === "care/support" ? ["cursor", "limit"] : (path.startsWith("care/support/")||/^trips\/[0-9a-f-]+\/messages$/i.test(path)) ? ["before"] : [];
  for (const key of keys) { const value = input.get(key); if (value && value.length <= 512) output.set(key, value); }
  if (path === "wallet/transactions") output.set("account", "wallet");
  if (path.startsWith("notifications")) output.set("role", "rider");
  return output.size ? `?${output}` : "";
}
export function validCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "checkout.paystack.com" && !url.port && !url.username && !url.password; } catch { return false; }
}
