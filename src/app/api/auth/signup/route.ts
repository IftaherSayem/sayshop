import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/auth'

// ───────────────────────────────────────────────────────────
// POST /api/auth/signup
// ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    // ── Validation ──────────────────────────────────────────
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // ── Check if email already exists ───────────────────────
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .is('deleted_at', null)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // ── Get customer role ───────────────────────────────────
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'customer')
      .maybeSingle()

    if (roleError || !role) {
      console.error('[signup] Failed to fetch customer role:', roleError)
      return NextResponse.json(
        { error: 'Failed to create account. Please try again later.' },
        { status: 500 }
      )
    }

    // ── Hash password ───────────────────────────────────────
    const passwordHash = await hashPassword(password)

    // ── Insert user (trigger auto-creates profile) ──────────
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role_id: role.id,
        is_verified: false,
        is_blocked: false,
      })
      .select('id, email')
      .single()

    if (insertError) {
      console.error('[signup] Failed to create user:', insertError)
      return NextResponse.json(
        { error: 'Failed to create account. Please try again later.' },
        { status: 500 }
      )
    }

    // ── Update profile with full_name ───────────────────────
    await supabase
      .from('profiles')
      .update({ full_name: name.trim() })
      .eq('user_id', newUser.id)

    // ── Generate verification code ──────────────────────────
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    await supabase
      .from('users')
      .update({
        verification_code: verificationCode,
        verification_code_expires_at: expiresAt,
      })
      .eq('id', newUser.id)

    // ── Return user without session (verification required) ─
    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: name.trim(),
        },
        verificationCode,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[signup] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
