import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/verify-reset-code
 * Checks if the reset code is valid and not expired before showing the update form.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code || code.length !== 6) {
      return NextResponse.json({ error: 'Missing information' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, verification_code, verification_code_expires_at')
      .eq('email', email.toLowerCase())
      .is('deleted_at', null)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.verification_code !== code) {
      return NextResponse.json({ error: 'Invalid security code' }, { status: 401 })
    }

    if (new Date(user.verification_code_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Security code has expired' }, { status: 401 })
    }

    return NextResponse.json({ success: true, message: 'Code verified' })
  } catch (err) {
    console.error('[verify-reset-code] Unexpected error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
