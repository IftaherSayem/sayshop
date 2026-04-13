import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '../_auth'

// ── Constants ──────────────────────────────────────────────────────────────────

const VALID_ROLES = ['admin', 'customer', 'manager', 'support']

/** Normalize role to lowercase for DB comparison */
function normalizeRole(role: string): string {
  return role.toLowerCase()
}

// ── GET: List users with pagination, search, role filter ───────────────────────

export async function GET(request: NextRequest) {
  const { error } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''

    let query = supabase
      .from('users')
      .select(`
        id, email, is_verified, is_blocked, last_login, created_at, updated_at, deleted_at,
        profiles(full_name, phone, avatar),
        roles(name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Exclude soft-deleted users
    query = query.is('deleted_at', null)

    if (search) {
      query = query.or(`email.ilike.%${search}%`)
    }

    if (role && VALID_ROLES.includes(normalizeRole(role))) {
      query = query.eq('roles.name', normalizeRole(role))
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: users, count, error: queryError } = await query

    if (queryError) {
      console.error('Admin users GET error:', queryError)
      return NextResponse.json({ error: 'Failed to fetch users', details: queryError.message }, { status: 500 })
    }

    // Transform to frontend format
    let transformed = (users || []).map((u: Record<string, unknown>) => {
      const profile = u.profiles as Record<string, unknown> | null
      const roleObj = u.roles as Record<string, unknown> | null
      return {
        id: u.id,
        email: u.email,
        name: profile?.full_name || null,
        role: (roleObj?.name || 'customer').toUpperCase(),
        isVerified: u.is_verified ?? false,
        isBlocked: u.is_blocked ?? false,
        lastLogin: u.last_login || null,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      }
    })

    // Client-side search on full_name if search term is provided
    if (search) {
      const lowerSearch = search.toLowerCase()
      transformed = transformed.filter((u) =>
        (u.name?.toLowerCase() || '').includes(lowerSearch) ||
        (u.email?.toLowerCase() || '').includes(lowerSearch)
      )
    }

    return NextResponse.json({
      users: transformed,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// ── PUT: Update user (role, isBlocked) ─────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const { error, user } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    const { id, role, isBlocked } = body

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Prevent admin from modifying their own role or blocking themselves
    if (id === user!.id && (role && normalizeRole(role) !== 'admin')) {
      return NextResponse.json({ error: 'Cannot change your own admin role' }, { status: 400 })
    }
    if (id === user!.id && isBlocked === true) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })
    }

    // Validate role if provided
    const normalizedRole = role ? normalizeRole(role) : undefined
    if (normalizedRole !== undefined && !VALID_ROLES.includes(normalizedRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    // If role is changing, look up the role_id
    if (normalizedRole) {
      const { data: roleRecord } = await supabase
        .from('roles')
        .select('id')
        .eq('name', normalizedRole)
        .maybeSingle()

      if (!roleRecord) {
        return NextResponse.json({ error: 'Role not found' }, { status: 400 })
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          role_id: roleRecord.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) {
        console.error('Update user role error:', updateError)
        return NextResponse.json({ error: 'Failed to update user role', details: updateError.message }, { status: 500 })
      }
    }

    // Update is_blocked on users table
    if (isBlocked !== undefined) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          is_blocked: !!isBlocked,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) {
        console.error('Update user block status error:', updateError)
        return NextResponse.json({ error: 'Failed to update user', details: updateError.message }, { status: 500 })
      }
    }

    // Fetch updated user with joins
    const { data: updatedUser } = await supabase
      .from('users')
      .select(`
        id, email, is_verified, is_blocked, last_login, created_at, updated_at,
        profiles(full_name, phone, avatar),
        roles(name)
      `)
      .eq('id', id)
      .single()

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found after update' }, { status: 404 })
    }

    const profile = updatedUser.profiles as Record<string, unknown> | null
    const roleObj = updatedUser.roles as Record<string, unknown> | null

    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: profile?.full_name || null,
      phone: profile?.phone || null,
      avatar: profile?.avatar || null,
      role: (roleObj?.name || 'customer').toUpperCase(),
      isVerified: updatedUser.is_verified ?? false,
      isBlocked: updatedUser.is_blocked ?? false,
      lastLogin: updatedUser.last_login || null,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at,
    })
  } catch (e) {
    console.error('Update user error:', e)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
