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
    if (!sessionUser) {
      return { error: NextResponse.json({ error: 'Session invalid' }, { status: 401 }), user: null }
    }

    const role = sessionUser.roleName.toLowerCase()
    const email = (sessionUser.email || '').toLowerCase()
    const allowedRoles = ['admin', 'manager', 'support']
    
    // Explicitly allow master admin email
    if (email === 'admin@sayshop.com') {
      return { error: null, user: sessionUser }
    }

    if (!allowedRoles.includes(role)) {
      return { error: NextResponse.json({ error: 'Access denied. Privileged access only.' }, { status: 403 }), user: null }
    }
    return { error: null, user: sessionUser }
  } catch {
    return { error: NextResponse.json({ error: 'Server error' }, { status: 500 }), user: null }
  }
}
