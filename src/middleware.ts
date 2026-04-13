import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// ── Constants ─────────────────────────────────────────────────────────────────

const SESSION_COOKIE_NAME = 'sayshop_session'

// ── Simple in-memory rate limiter ─────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_POST = 10 // max 10 POST requests per minute per IP

// Clean up stale entries periodically (every 5 minutes)
let lastCleanup = Date.now()
function cleanupRateLimits() {
  const now = Date.now()
  if (now - lastCleanup > 5 * 60 * 1000) {
    lastCleanup = now
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(key)
      }
    }
  }
}

function checkRateLimit(ip: string): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  cleanupRateLimits()

  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS
    rateLimitMap.set(ip, { count: 1, resetAt })
    return { allowed: true, remaining: RATE_LIMIT_MAX_POST - 1, resetAt }
  }

  if (entry.count >= RATE_LIMIT_MAX_POST) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_POST - entry.count,
    resetAt: entry.resetAt,
  }
}

// ── Suspicious User-Agent patterns ────────────────────────────────────────────

const SUSPICIOUS_UA_PATTERNS = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /dirbuster/i,
  /gobuster/i,
  /wfuzz/i,
  /burpsuite/i,
  /zgrab/i,
  /httpx/i,
  /nuclei/i,
  /subfinder/i,
  /phantomjs/i,
  /undefined/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /python-urllib/i,
  /java\/\d/i,
  /go-http/i,
]

function isSuspiciousUserAgent(ua: string | null): boolean {
  if (!ua || ua.length < 10) return true
  return SUSPICIOUS_UA_PATTERNS.some((pattern) => pattern.test(ua))
}

// ── Middleware ────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  // ── Custom Session Validation (replaces Supabase Auth) ──
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)

  if (sessionCookie?.value) {
    // Create a Supabase client scoped to this request for data-only access.
    // We do NOT use supabase.auth — session management is fully custom.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            response = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Validate session token against session_tokens table
    const { data: session } = await supabase
      .from('session_tokens')
      .select('id, expires_at')
      .eq('token', sessionCookie.value)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (!session) {
      // Session is expired or doesn't exist — clear the cookie.
      // Also perform best-effort cleanup of stale rows.
      response.cookies.delete(SESSION_COOKIE_NAME)

      // Fire-and-forget: delete expired/invalid session rows
      supabase
        .from('session_tokens')
        .delete()
        .eq('token', sessionCookie.value)
        .then(() => {
          // Intentionally void — we don't want to block the response
        })
    }
  }

  // ── Security headers ──
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  // ── Rate limiting for POST requests to API routes ──
  if (request.method === 'POST' && request.nextUrl.pathname.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const { allowed, remaining, resetAt } = checkRateLimit(ip)

    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX_POST))
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    response.headers.set(
      'X-RateLimit-Reset',
      String(Math.ceil(resetAt / 1000))
    )

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again after ${new Date(resetAt).toLocaleTimeString()}.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(
              Math.ceil((resetAt - Date.now()) / 1000)
            ),
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX_POST),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
          },
        }
      )
    }
  }

  // ── Block suspicious User-Agent strings ──
  const ua = request.headers.get('user-agent')
  if (isSuspiciousUserAgent(ua)) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|images/).*)',
  ],
}
