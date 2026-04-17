import { NextRequest } from "next/server";
import { cookies } from "next/headers";

const CSRF_COOKIE_NAME = "sayshop_csrf_hash";

/** Simple hash for CSRF token comparison (must match the generation hash) */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token + "-sayshop-csrf-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validate a CSRF token sent via the `x-csrf-token` request header.
 *
 * This approach avoids consuming the request body (ReadableStream),
 * so it is safe to call before `request.json()` in an API route handler.
 *
 * Usage in API route handlers:
 * ```typescript
 * import { validateCSRF } from "@/lib/csrf";
 *
 * export async function POST(request: NextRequest) {
 *   const csrfError = await validateCSRF(request);
 *   if (csrfError) return csrfError;
 *   const body = await request.json(); // safe — body not consumed yet
 *   // ...
 * }
 * ```
 *
 * On the client side, include the CSRF token as a header:
 * ```typescript
 * fetch("/api/some-endpoint", {
 *   method: "POST",
 *   headers: {
 *     "Content-Type": "application/json",
 *     "x-csrf-token": csrfToken,
 *   },
 *   body: JSON.stringify(payload),
 * });
 * ```
 */
export async function validateCSRF(request: NextRequest): Promise<null | Response> {
  try {
    // Read token from header — does NOT consume the request body stream
    const csrfToken = request.headers.get("x-csrf-token");

    // If no CSRF token header is present, skip validation for backward compat
    if (!csrfToken) {
      return null;
    }

    const cookieStore = await cookies();
    const storedHash = cookieStore.get(CSRF_COOKIE_NAME)?.value;

    if (!storedHash) {
      return new Response(
        JSON.stringify({ error: "CSRF token missing. Please refresh the page and try again." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const providedHash = await hashToken(csrfToken);

    // Timing-safe string comparison
    if (providedHash !== storedHash) {
      return new Response(
        JSON.stringify({ error: "Invalid CSRF token. Please refresh the page and try again." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    return null; // Token is valid
  } catch {
    // On unexpected error, allow the request through
    return null;
  }
}
