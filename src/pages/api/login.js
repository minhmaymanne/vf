export const prerender = false;

import { REGIONS } from "../../config/vinfast";

/**
 * Collect backup proxy URLs from env, shuffle them (Fisher-Yates).
 */
function getShuffledBackups(locals) {
  const runtimeEnv = locals?.runtime?.env || import.meta.env || {};
  const envKeys = [
    "BACKUP_PROXY_URL", "BACKUP_PROXY_URL_2", "BACKUP_PROXY_URL_3",
    "BACKUP_PROXY_URL_4", "BACKUP_PROXY_URL_5", "BACKUP_PROXY_URL_6",
    "BACKUP_PROXY_URL_7", "BACKUP_PROXY_URL_8", "BACKUP_PROXY_URL_9",
    "BACKUP_PROXY_URL_10", "BACKUP_PROXY_URL_11",
  ];
  const urls = envKeys
    .map((k) => runtimeEnv[k] || (typeof process !== "undefined" ? process.env[k] : undefined))
    .filter(Boolean);

  for (let i = urls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [urls[i], urls[j]] = [urls[j], urls[i]];
  }
  return urls;
}

function labelFromUrl(url) {
  try { return new URL(url).hostname.replace(".vercel.app", "").replace(".workers.dev", ""); }
  catch { return url; }
}

/**
 * Delay helper for retry backoff
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const GET = async () => {
  return new Response(
    JSON.stringify({ message: "Login API is active. Use POST to authenticate." }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};

export const POST = async ({ request, cookies, locals }) => {
  try {
    const { email, password, region, rememberMe } = await request.json();
    const regionConfig = REGIONS[region] || REGIONS["vn"];

    const auth0Url = `https://${regionConfig.auth0_domain}/oauth/token`;
    const auth0Payload = {
      client_id: regionConfig.auth0_client_id,
      audience: regionConfig.auth0_audience,
      grant_type: "password",
      scope: "offline_access openid profile email",
      username: email,
      password,
    };

    const authLog = [];

    // Phase 1: Direct to Auth0 with retry (1 retry after 2s for transient 429)
    let response = null;
    let data = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      const t0 = Date.now();
      console.log(`[Login] → Auth0 direct${attempt > 0 ? ` (retry ${attempt})` : ""}`);
      try {
        response = await fetch(auth0Url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(auth0Payload),
        });
        data = await response.json();
        const elapsed = Date.now() - t0;
        authLog.push({ via: attempt === 0 ? "direct" : "direct-retry", status: response.status, ms: elapsed });
        console.log(`[Login] ← direct${attempt > 0 ? " retry" : ""} ${response.status} (${elapsed}ms)`);

        // Success or client error (not rate limit) → stop
        if (response.status !== 429) break;

        // On first 429, wait 2s before retry
        if (attempt === 0) {
          console.log(`[Login] 429 from direct — waiting 2s before retry...`);
          await delay(2000);
        }
      } catch (e) {
        authLog.push({ via: attempt === 0 ? "direct" : "direct-retry", status: "error", error: e.message });
        console.warn(`[Login] Direct${attempt > 0 ? " retry" : ""} error:`, e.message);
        if (attempt === 0) await delay(1000);
      }
    }

    // Phase 2: If still 429 or no response, failover through backup proxies
    if (!response || response.status === 429) {
      const backupUrls = getShuffledBackups(locals);

      if (backupUrls.length > 0) {
        console.log(`[Login] Trying ${backupUrls.length} backup proxies...`);

        for (const backupUrl of backupUrls) {
          const label = labelFromUrl(backupUrl);
          try {
            const backupTarget = `${backupUrl.replace(/\/$/, "")}/api/vf-auth`;
            console.log(`[Login] → backup: ${label}`);

            const t0 = Date.now();
            const backupResponse = await fetch(backupTarget, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "login", email, password, region }),
            });
            const backupData = await backupResponse.json();
            const elapsed = Date.now() - t0;

            authLog.push({ via: label, status: backupResponse.status, ms: elapsed });
            console.log(`[Login] ← ${label} ${backupResponse.status} (${elapsed}ms)`);

            if (backupResponse.status !== 429) {
              response = backupResponse;
              data = backupData;
              break;
            }
          } catch (e) {
            authLog.push({ via: label, status: "error", error: e.message });
            console.warn(`[Login] Backup ${label} failed:`, e.message);
          }
        }
      } else {
        console.warn(`[Login] No backup proxies configured — cannot failover from 429`);
      }
    }

    // No response at all (network failure)
    if (!response || !data) {
      return new Response(JSON.stringify({
        error: "network_error",
        error_description: "Could not reach authentication server. Please check your connection and try again.",
        message: "Could not reach authentication server. Please check your connection and try again.",
        _authLog: authLog,
      }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return error if still not OK
    if (!response.ok) {
      // Enhance error message for known Auth0 errors
      let message = data.error_description || data.message || "Authentication failed";
      if (response.status === 429 || data.error === "too_many_attempts") {
        message = "Auth0 has temporarily blocked login from this server due to rate limiting. Please try again in a few minutes.";
      } else if (response.status === 403 && data.error === "invalid_grant") {
        message = "Incorrect email or password.";
      }

      return new Response(JSON.stringify({ ...data, message, _authLog: authLog }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Calculate token expiry from Auth0's expires_in (seconds)
    const expiresIn = data.expires_in || 3600;
    const tokenExpiresAt = Date.now() + expiresIn * 1000;

    // Set Cookies — disable `secure` on localhost (HTTP) so cookies work in dev
    const isLocalhost = new URL(request.url).hostname === "localhost";
    const cookieOptions = {
      path: "/",
      httpOnly: true,
      secure: !isLocalhost,
      sameSite: "lax",
    };

    if (rememberMe) {
      cookieOptions.maxAge = 60 * 60 * 24 * 30; // 30 days
    }

    cookies.set("access_token", data.access_token, cookieOptions);
    if (data.refresh_token) {
      cookies.set("refresh_token", data.refresh_token, cookieOptions);
    }

    cookies.set("vf_region", region, {
      path: "/",
      httpOnly: false,
      secure: !isLocalhost,
      sameSite: "lax",
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : undefined,
    });

    const servedBy = authLog.length > 1
      ? authLog[authLog.length - 1].via
      : "direct";

    return new Response(
      JSON.stringify({ success: true, region, tokenExpiresAt, _authLog: authLog }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Route": servedBy,
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
