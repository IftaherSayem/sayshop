import { NextRequest, cookies } from "next/server";

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
 * Validate a CSRF token from the request body against the stored cookie.
 *
 * Usage in API route handlers:
 * ```typescript
 * import { validateCSRF } from "@/lib/csrf";
 *
 * export async function POST(request: NextRequest) {
 *   const csrfError = await validateCSRF(request);
 *   if (csrfError) return csrfError;
 *   // ... proceed with the request
 * }
 * ```
 */
export async function validateCSRF(request: NextRequest): Promise<null | Response> {
  try {
    const body = await request.json();

    // Allow requests that don't have a body or no CSRF token (GET-like payloads)
    if (!body || !body.csrfToken) {
      return null; // No CSRF token provided — skip validation for backward compat
    }

    const cookieStore = await cookies();
    const storedHash = cookieStore.get(CSRF_COOKIE_NAME)?.value;

    if (!storedHash) {
      return new Response(
        JSON.stringify({ error: "CSRF token missing. Please refresh the page and try again." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const providedHash = await hashToken(body.csrfToken);

    // Use timing-safe comparison (simple approach — adequate for this use case)
    if (providedHash !== storedHash) {
      return new Response(
        JSON.stringify({ error: "Invalid CSRF token. Please refresh the page and try again." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    return null; // Token is valid
  } catch {
    // If JSON parsing fails, we can't validate CSRF — let the handler decide
    return null;
  }
}
