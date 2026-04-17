import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'
import type { SessionUser } from '@/lib/auth'

/**
 * Helper: get authenticated user from request 
 */
async function getUserFromRequest(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('sayshop_session')?.value
  if (!token) return null
  return validateSession(token)
}

/**
 * GET /api/user/rewards/history
 * Fetches the rewards transaction history for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()

    // Fetch from rewards_history table
    // Note: Assuming the table exists based on previous implementation planning
    const { data, error } = await supabase
      .from('rewards_history')
      .select('*')
      .eq('user_id', sessionUser.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      // If table doesn't exist yet, return gracefully
      if (error.code === 'PGRST116' || error.message.includes('not found')) {
        return NextResponse.json({ history: [] })
      }
      console.error('[REWARDS HISTORY] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    return NextResponse.json({ history: data || [] })
  } catch (err) {
    console.error('[REWARDS HISTORY] Server error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
