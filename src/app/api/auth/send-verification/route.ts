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
        { error: 'Failed to securely update session context. Please try again.' },
        { status: 500 }
      )
    }

    // ── Dispatch Email via Resend ───────────────────────────
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      console.log(`[Resend] Attempting to send verification to: ${email.toLowerCase()}`);
      const { error: emailError } = await resend.emails.send({
        from: 'onboarding@resend.dev', 
        to: email.toLowerCase(),
        subject: 'Your SayShop Verification Code',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #2563EB; padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">SayShop</h1>
            </div>
            <div style="padding: 32px; text-align: center; background-color: #ffffff;">
              <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin-top: 0;">Verify your identity</h2>
              <p style="color: #4B5563; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">
                Enter the following secure 6-digit code in the app to proceed. This code will expire in 10 minutes.
              </p>
              <div style="background-color: #F3F4F6; padding: 16px; border-radius: 12px; font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1D4ED8; margin-bottom: 24px;">
                ${code}
              </div>
              <p style="color: #9CA3AF; font-size: 13px; margin: 0;">
                If you did not request this, please ignore this email or contact support if you have concerns.
              </p>
            </div>
          </div>
        `
      });

      if (emailError) {
        console.error('[send-verification] Send error detail:', JSON.stringify(emailError, null, 2));
        return NextResponse.json(
          { error: `Email Delivery Failed: ${emailError.message || 'Unknown Reason'}` },
          { status: 500 }
        )
      } else {
        console.log(`[Resend] Successfully dispatched email to ${email}`);
      }
    } else {
      console.log(`[Development Leak] OTP Code for ${email}: ${code}`);
    }

    // Do NOT return the code to the frontend client in production workflows for security.
    return NextResponse.json({
      message: 'Verification code sent securely'
    })
  } catch (err) {
    console.error('[send-verification] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
