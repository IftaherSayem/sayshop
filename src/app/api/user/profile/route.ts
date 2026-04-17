import { NextRequest, NextResponse } from 'next/server'
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * GET /api/user/profile
 * Get full profile details for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessionUser = await validateSession(sessionCookie.value)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.profile?.fullName || sessionUser.email,
        phone: sessionUser.profile?.phone || null,
        avatar: sessionUser.profile?.avatar || null,
        address: sessionUser.profile?.address || {},
        points: (sessionUser.profile as any)?.points || 0,
        loyaltyTier: (sessionUser.profile as any)?.loyalty_tier || 'Bronze',
        twoFactorEnabled: (sessionUser.profile?.address as any)?.settings?.twoFactorEnabled || false,
      },
    })
  } catch (err) {
    console.error('[profile get] Unexpected error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

/**
 * PUT /api/user/profile
 * Update profile fields for the current user
 */
export async function PUT(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessionUser = await validateSession(sessionCookie.value)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { fullName, phone, avatar, address, twoFactorEnabled } = body

    const supabase = await createSupabaseServerClient()
    
    // 1. Fetch existing address/settings to merge
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('address')
      .eq('user_id', sessionUser.id)
      .maybeSingle()

    const currentAddress = existingProfile?.address as any || {}
    const newAddress = address || currentAddress
    
    // 2. Merge settings
    if (twoFactorEnabled !== undefined) {
      newAddress.settings = {
        ...(newAddress.settings || {}),
        twoFactorEnabled: twoFactorEnabled
      }
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: sessionUser.id,
        full_name: fullName,
        phone: phone,
        avatar: avatar,
        address: newAddress, 
        points: body.points !== undefined ? body.points : undefined,
        loyalty_tier: body.loyaltyTier || undefined,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) {
      console.error('[profile update] DB error:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      profile: {
        fullName: profile.full_name,
        phone: profile.phone,
        avatar: profile.avatar,
        address: profile.address,
        points: profile.points,
        loyaltyTier: profile.loyalty_tier,
        twoFactorEnabled: (profile.address as any)?.settings?.twoFactorEnabled || false
      }
    })
  } catch (err) {
    console.error('[profile update] Unexpected error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
