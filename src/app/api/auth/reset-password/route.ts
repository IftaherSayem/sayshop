import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/auth'

/**
 * POST /api/auth/reset-password
 * Verifies code and updates the user password.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json()

    if (!email || !code || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // 1. Validate code and user
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

    // 2. Hash new password
    const passwordHash = await hashPassword(newPassword)

    // 3. Update password and clear codes
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        verification_code: null,
        verification_code_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[reset-password] Update Error:', updateError)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (err) {
    console.error('[reset-password] Unexpected error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
