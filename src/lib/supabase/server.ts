import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import {
  SESSION_COOKIE_NAME,
  validateSession,
  type SessionUser,
} from '@/lib/auth'

// ── Supabase Server Client ────────────────────────────────────────────────────

/**
 * Create a Supabase client for server-side data access.
 * Uses cookies() from next/headers for cookie passthrough.
 * NOTE: This client is for DATA access only — NOT for Supabase Auth.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing. Check your .env file.'
    )
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}

/**
 * Create a Supabase client with SERVICE_ROLE_KEY to bypass RLS.
 * USE WITH CAUTION: Only for server-side admin operations.
 */
export async function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase SERVICE_ROLE_KEY is missing.')
  }

  // Admin client doesn't need cookie handling for its own auth 
  // because it uses the master key.
  return createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    }
  })
}

// ── Authentication Helpers ────────────────────────────────────────────────────

/**
 * Get the currently authenticated user from the request object.
 * Reads the `sayshop_session` cookie, validates it against the
 * session_tokens table, and returns full user + session info.
 *
 * Use this in API Route Handlers where you have access to `request`.
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ user: Record<string, unknown>; session: Record<string, unknown> } | null> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return null
  }

  const sessionUser = await validateSession(sessionCookie.value)

  if (!sessionUser) {
    return null
  }

  const user: Record<string, unknown> = {
    id: sessionUser.id,
    email: sessionUser.email,
    role: sessionUser.roleName,
    roleId: sessionUser.roleId,
    isVerified: sessionUser.isVerified,
    isBlocked: sessionUser.isBlocked,
    profile: sessionUser.profile,
  }

  const session: Record<string, unknown> = {
    cookieName: SESSION_COOKIE_NAME,
    authenticated: true,
  }

  return { user, session }
}

/**
 * Get the current authenticated user from cookie storage.
 * Uses `cookies()` from next/headers — suitable for Server Components,
 * Server Actions, and API Route Handlers.
 *
 * Returns a simplified user object (id, email, role) or null.
 */
export async function getCurrentUser(): Promise<{
  id: string
  email: string
  role: string
  isVerified: boolean
} | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

    if (!sessionCookie?.value) {
      return null
    }

    const sessionUser = await validateSession(sessionCookie.value)

    if (!sessionUser) {
      return null
    }

    return {
      id: sessionUser.id,
      email: sessionUser.email,
      role: sessionUser.roleName,
      isVerified: sessionUser.isVerified,
    }
  } catch (err) {
    console.error('[server] getCurrentUser error:', err)
    return null
  }
}

/**
 * Get the current authenticated user's full profile.
 * Returns user info + profile data, or null if not authenticated.
 */
export async function getCurrentUserProfile(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

    if (!sessionCookie?.value) {
      return null
    }

    const sessionUser = await validateSession(sessionCookie.value)

    if (!sessionUser) {
      return null
    }

    return sessionUser
  } catch (err) {
    console.error('[server] getCurrentUserProfile error:', err)
    return null
  }
}
