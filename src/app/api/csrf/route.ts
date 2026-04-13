import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// ── CSRF Token Generation Helpers ─────────────────────────────────

/** Generate a cryptographically random CSRF token */
function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Simple hash for CSRF token storage comparison (SHA-256) */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token + "-sayshop-csrf-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const CSRF_COOKIE_NAME = "sayshop_csrf_hash";
const CSRF_TOKEN_EXPIRY_MS = 3600000; // 1 hour

// GET /api/csrf - Generate and return a CSRF token
export async function GET() {
  try {
    const token = generateCSRFToken();
    const hashed = await hashToken(token);

    // Set the hashed token as an HttpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set(CSRF_COOKIE_NAME, hashed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CSRF_TOKEN_EXPIRY_MS / 1000,
    });

    return NextResponse.json({ csrfToken: token });
  } catch (error) {
    console.error("Error generating CSRF token:", error);
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 }
    );
  }
}
