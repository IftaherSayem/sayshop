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

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const params = await props.params;
    const { id } = params;
    const supabase = await createSupabaseServerClient()

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', user.id) // Ensure security by checking ownership

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
