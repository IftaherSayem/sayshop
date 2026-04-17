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

    // ── Dispatch Email via Resend ───────────────────────────
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      console.log(`[Resend] Dispatching signup verification to: ${email.toLowerCase()}`);
      const { error: emailError } = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email.toLowerCase(),
        subject: 'Welcome to SayShop - Verify Your Email',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #2563EB; padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">SayShop</h1>
            </div>
            <div style="padding: 32px; text-align: center; background-color: #ffffff;">
              <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin-top: 0;">Welcome!</h2>
              <p style="color: #4B5563; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">
                Thanks for joining SayShop. To complete your registration, please enter the following secure 6-digit verification code.
              </p>
              <div style="background-color: #F3F4F6; padding: 16px; border-radius: 12px; font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1D4ED8; margin-bottom: 24px;">
                ${verificationCode}
              </div>
              <p style="color: #9CA3AF; font-size: 13px; margin: 0;">
                If you did not sign up for this account, you can safely ignore this email.
              </p>
            </div>
          </div>
        `
      });

      if (emailError) {
        console.error('[signup] Send error detail:', JSON.stringify(emailError, null, 2));
        // We allow the signup to proceed but the user will have to click "Resend" if this fails
      } else {
        console.log(`[Resend] Successfully dispatched signup email to ${email}`);
      }
    } else {
      console.log(`[Development Leak] Signup OTP Code for ${email}: ${verificationCode}`);
    }

    // ── Return user without session (verification required) ─
    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: name.trim(),
        },
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
