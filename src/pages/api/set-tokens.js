export const prerender = false;

/**
 * POST /api/set-tokens
 *
 * Receives tokens obtained directly by the browser (Auth0 direct call)
 * and stores them as HttpOnly cookies for subsequent API requests.
 *
 * This endpoint is the fallback when server-side Auth0 calls get 429'd
 * (Cloudflare IP blocked by Auth0 Brute Force Protection).
 * The browser calls Auth0 from the user's own IP, then passes tokens here.
 */
export const POST = async ({ request, cookies }) => {
  try {
    const { access_token, refresh_token, expires_in, region, rememberMe } = await request.json();

    if (!access_token) {
      return new Response(JSON.stringify({ error: "Missing access_token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const expiresIn = expires_in || 3600;
    const tokenExpiresAt = Date.now() + expiresIn * 1000;

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

    cookies.set("access_token", access_token, cookieOptions);
    if (refresh_token) {
      cookies.set("refresh_token", refresh_token, cookieOptions);
    }

    if (region) {
      cookies.set("vf_region", region, {
        path: "/",
        httpOnly: false,
        secure: !isLocalhost,
        sameSite: "lax",
        maxAge: rememberMe ? 60 * 60 * 24 * 30 : undefined,
      });
    }

    return new Response(JSON.stringify({ success: true, tokenExpiresAt }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
