import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'

export async function verifyAdmin(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('sayshop_session')?.value
    if (!token) {
      return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null }
    }
    const sessionUser = await validateSession(token)
    if (!sessionUser || sessionUser.roleName !== 'admin') {
      return { error: NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 }), user: null }
    }
    return { error: null, user: sessionUser }
  } catch {
    return { error: NextResponse.json({ error: 'Server error' }, { status: 500 }), user: null }
  }
}
