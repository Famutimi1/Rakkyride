// Keep local login on the exact configured origin without widening CSRF access.
export function localLoginRedirect(
  host: string | null,
  configuredOrigin: string | undefined,
  development: boolean,
): string | null {
  if (!development || !host || !configuredOrigin) return null;
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) return null;
  try {
    const current = new URL(`http://${host}`);
    const configured = new URL(configuredOrigin);
    if (
      configured.protocol !== "http:" ||
      !["localhost", "127.0.0.1"].includes(configured.hostname) ||
      configured.username ||
      configured.password ||
      configured.pathname !== "/" ||
      configured.search ||
      configured.hash ||
      current.port !== configured.port ||
      current.host === configured.host
    )
      return null;
    return `${configured.origin}/login`;
  } catch {
    return null;
  }
}
