export const prerender = false;

/**
 * GET /api/debug
 *
 * Server-side diagnostics — checks cookie presence, env vars, and connectivity.
 * Does NOT expose sensitive values, only boolean checks.
 */
export const GET = async ({ request, cookies, locals }) => {
  const checks = {};

  // 1. Check cookies
  const accessToken = cookies.get("access_token")?.value;
  const refreshToken = cookies.get("refresh_token")?.value;
  const vfRegion = cookies.get("vf_region")?.value;

  checks.hasAccessToken = !!accessToken;
  checks.hasRefreshToken = !!refreshToken;
  checks.vfRegion = vfRegion || "missing";
  checks.accessTokenLength = accessToken ? accessToken.length : 0;

  // 2. Check env vars
  const runtimeEnv = locals?.runtime?.env || {};
  const metaEnv = import.meta.env || {};

  checks.hasXHashSecret_runtime = !!runtimeEnv.VINFAST_XHASH_SECRET;
  checks.hasXHashSecret_meta = !!metaEnv.VINFAST_XHASH_SECRET;
  checks.hasXHashSecret_process = typeof process !== "undefined" && !!process.env?.VINFAST_XHASH_SECRET;

  // Check if any backup proxy URLs are set
  const backupCount = ["BACKUP_PROXY_URL", "BACKUP_PROXY_URL_2", "BACKUP_PROXY_URL_3",
    "BACKUP_PROXY_URL_4", "BACKUP_PROXY_URL_5"].filter(k =>
      runtimeEnv[k] || (typeof process !== "undefined" && process.env?.[k])
    ).length;
  checks.backupProxyCount = backupCount;

  // 3. JWT token expiry check (decode payload without verification)
  if (accessToken) {
    try {
      const parts = accessToken.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        const now = Math.floor(Date.now() / 1000);
        checks.tokenExp = payload.exp;
        checks.tokenIat = payload.iat;
        checks.tokenExpired = now > payload.exp;
        checks.tokenExpiresIn = payload.exp - now; // seconds until expiry (negative = expired)
      }
    } catch {
      checks.tokenDecodeError = true;
    }
  }

  // 4. Check cookie header raw (for debugging)
  const cookieHeader = request.headers.get("cookie") || "";
  checks.cookieHeaderLength = cookieHeader.length;
  checks.cookieNames = cookieHeader.split(";").map(c => c.trim().split("=")[0]).filter(Boolean);

  // 5. Server timestamp
  checks.serverTime = new Date().toISOString();
  checks.platform = typeof globalThis.navigator !== "undefined" ? "browser" : "server";

  return new Response(JSON.stringify(checks, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};
