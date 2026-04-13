import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ───────────────────────────────────────────────────────────
// POST /api/auth/send-verification
// ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // ── Find user by email ──────────────────────────────────
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .is('deleted_at', null)
      .maybeSingle()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // ── Generate 6-digit verification code ──────────────────
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    // ── Store code in user record ───────────────────────────
    const { error: updateError } = await supabase
      .from('users')
      .update({
        verification_code: code,
        verification_code_expires_at: expiresAt,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[send-verification] Failed to store code:', updateError)
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      )
    }

    // Return the code so the user can "see" it (simulating email delivery)
    return NextResponse.json({
      message: 'Verification code sent',
      code,
    })
  } catch (err) {
    console.error('[send-verification] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
