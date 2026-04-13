/**
 * Custom authentication helpers for SayShop.
 *
 * Uses bcryptjs for password hashing and Supabase PostgreSQL
 * for session token storage. Does NOT use Supabase Auth.
 */

import bcrypt from 'bcryptjs'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ── Constants ─────────────────────────────────────────────────────────────────

export const SESSION_COOKIE_NAME = 'sayshop_session'
const SESSION_DURATION_DAYS = 7
const BCRYPT_ROUNDS = 12

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string
  email: string
  roleId: string
  roleName: string
  isVerified: boolean
  isBlocked: boolean
  profile: {
    id: string
    fullName: string | null
    phone: string | null
    avatar: string | null
    address: Record<string, unknown> | null
  } | null
}

export interface SessionCookieOptions {
  name: string
  httpOnly: boolean
  secure: boolean
  sameSite: 'lax' | 'strict' | 'none'
  path: string
  maxAge: number
}

export interface SessionData {
  id: string
  userId: string
  token: string
  ip: string | null
  userAgent: string | null
  expiresAt: string
  createdAt: string
}

// ── Password helpers ──────────────────────────────────────────────────────────

/**
 * Hash a plain-text password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Verify a plain-text password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ── Session helpers ───────────────────────────────────────────────────────────

/**
 * Create a new session token for a user and persist it in the database.
 * Returns the generated token string.
 */
export async function createSession(
  userId: string,
  ip?: string,
  userAgent?: string
): Promise<string> {
  const supabase = await createSupabaseServerClient()
  const token = crypto.randomUUID()
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  const { error } = await supabase.from('session_tokens').insert({
    user_id: userId,
    token,
    ip: ip ?? null,
    user_agent: userAgent ?? null,
    expires_at: expiresAt,
  })

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`)
  }

  return token
}

/**
 * Validate an existing session token.
 * Returns the full SessionUser (with role and profile) if valid, null otherwise.
 *
 * Also performs cleanup: if the session is expired, it is deleted from the database.
 */
export async function validateSession(token: string): Promise<SessionUser | null> {
  try {
    const supabase = await createSupabaseServerClient()

    // 1. Look up the session token
    const { data: session, error: sessionError } = await supabase
      .from('session_tokens')
      .select('id, user_id, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (sessionError || !session) {
      return null
    }

    // 2. Check expiration — delete if expired
    const now = new Date()
    if (new Date(session.expires_at) <= now) {
      await supabase.from('session_tokens').delete().eq('id', session.id)
      return null
    }

    // 3. Fetch the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role_id, is_verified, is_blocked')
      .eq('id', session.user_id)
      .maybeSingle()

    if (userError || !user || user.is_blocked) {
      return null
    }

    // 4. Fetch the role name
    const { data: role } = await supabase
      .from('roles')
      .select('name')
      .eq('id', user.role_id)
      .maybeSingle()

    const roleName = role?.name ?? 'user'

    // 5. Fetch the profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, phone, avatar, address')
      .eq('user_id', user.id)
      .maybeSingle()

    return {
      id: user.id,
      email: user.email,
      roleId: user.role_id,
      roleName,
      isVerified: user.is_verified,
      isBlocked: user.is_blocked,
      profile: profile
        ? {
            id: profile.id,
            fullName: profile.full_name,
            phone: profile.phone,
            avatar: profile.avatar,
            address: profile.address as Record<string, unknown> | null,
          }
        : null,
    }
  } catch (err) {
    console.error('[auth] validateSession error:', err)
    return null
  }
}

/**
 * Destroy (delete) a session token from the database.
 */
export async function destroySession(token: string): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.from('session_tokens').delete().eq('token', token)
}

/**
 * Destroy all session tokens for a given user.
 * Useful for logout-all or password reset scenarios.
 */
export async function destroyAllUserSessions(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.from('session_tokens').delete().eq('user_id', userId)
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

/**
 * Get the standard cookie options for setting the session cookie.
 * Uses HttpOnly + Secure (in production) + SameSite=lax.
 */
export function getSessionCookieOptions(): SessionCookieOptions {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60, // 7 days in seconds
  }
}
