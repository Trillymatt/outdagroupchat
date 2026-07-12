const DEFAULT_LOCAL_ORIGIN = "http://localhost:3000";

/**
 * Accept either a full site URL or a bare production hostname. Keeping this
 * normalization in one place ensures metadata and auth callbacks agree.
 */
export function normalizeSiteOrigin(value?: string | null, fallback = DEFAULT_LOCAL_ORIGIN): string {
  const configured = value?.trim().replace(/\/+$/, "");
  if (!configured) return fallback;

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(configured) ? configured : `https://${configured}`;

  try {
    return new URL(candidate).origin;
  } catch {
    return fallback;
  }
}
