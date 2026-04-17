import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/forgot-password
 * Initiates the password reset process by sending a 6-digit code.
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // 1. Find the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, is_verified')
      .eq('email', email.toLowerCase())
      .is('deleted_at', null)
      .maybeSingle()

    if (!user) {
      return NextResponse.json({ 
        error: 'No account found with this email address. Please check for typos or sign up.' 
      }, { status: 404 })
    }

    if (!user.is_verified) {
      return NextResponse.json({ 
        error: 'This account is not verified yet. Please verify your email or contact support.' 
      }, { status: 403 })
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 mins

    // 3. Store in DB (Reusing verification fields for simplicity as they are context-aware)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        verification_code: resetCode,
        verification_code_expires_at: expiresAt
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[forgot-password] DB Error:', updateError)
      return NextResponse.json({ error: 'Failed to initiate reset' }, { status: 500 })
    }

    // 4. Send Email via Resend
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      const { Resend } = await import('resend')
      const resend = new Resend(resendApiKey)

      const { error: emailError } = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: user.email,
        subject: 'Reset Your SayShop Password',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #000000; padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">SayShop</h1>
            </div>
            <div style="padding: 32px; text-align: center; background-color: #ffffff;">
              <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin-top: 0;">Password Reset Request</h2>
              <p style="color: #4B5563; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">
                We received a request to reset your password. Use the following secure 6-digit code to complete the process. This code expires in 15 minutes.
              </p>
              <div style="background-color: #F3F4F6; padding: 16px; border-radius: 12px; font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #000000; margin-bottom: 24px;">
                ${resetCode}
              </div>
              <p style="color: #9CA3AF; font-size: 13px; margin: 0;">
                If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </div>
          </div>
        `
      })

      if (emailError) {
        console.error('[forgot-password] Resend Error:', emailError)
        return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
      }
    } else {
      console.log(`[Dev Mode] Password Reset Code for ${user.email}: ${resetCode}`)
    }

    return NextResponse.json({ message: 'Reset code sent successfully' })
  } catch (err) {
    console.error('[forgot-password] Unexpected error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
