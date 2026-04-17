import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'

async function getUserFromRequest() {
  const cookieStore = await cookies()
  const token = cookieStore.get('sayshop_session')?.value
  if (!token) return null
  return validateSession(token)
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      // Graceful fallback if table doesn't exist yet
      if (error.code === 'PGRST116' || error.message.includes('not found')) {
        return NextResponse.json({ notifications: [] })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notifications: data || [] })
  } catch (err) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createSupabaseServerClient()

    // Handle 'mark all as read'
    if (request.nextUrl.pathname.endsWith('/read-all')) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)
      
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
