import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/auth'

// ───────────────────────────────────────────────────────────
// POST /api/auth/init-admin
// ───────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'admin@sayshop.com'
const ADMIN_PASSWORD = 'admin123'

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()

    // ── Get admin role_id first ─────────────────────────────
    const { data: adminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .maybeSingle()

    if (roleError) {
      console.error('[init-admin] Role query error:', roleError)
      return NextResponse.json(
        { error: 'Failed to query roles. Did you run sayshop-schema.sql?' },
        { status: 500 }
      )
    }

    if (!adminRole) {
      return NextResponse.json(
        { error: 'Admin role not found. Please run sayshop-schema.sql to seed roles.' },
        { status: 500 }
      )
    }

    // ── Check if admin user already exists ──────────────────
    const { data: existingAdmin, error: queryError } = await supabase
      .from('users')
      .select('id, email')
      .eq('role_id', adminRole.id)
      .eq('email', ADMIN_EMAIL)
      .is('deleted_at', null)
      .limit(1)

    if (queryError) {
      console.error('[init-admin] Query admin error:', queryError)
      return NextResponse.json(
        { error: 'Failed to check admin existence' },
        { status: 500 }
      )
    }

    if (existingAdmin && existingAdmin.length > 0) {
      // Fetch the admin's profile for full_name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', existingAdmin[0].id)
        .maybeSingle()

      return NextResponse.json({
        message: 'Admin user already exists',
        user: {
          id: existingAdmin[0].id,
          email: existingAdmin[0].email,
          name: profile?.full_name || 'Admin',
          role: 'ADMIN',
        },
      })
    }

    // ── Hash password ───────────────────────────────────────
    const passwordHash = await hashPassword(ADMIN_PASSWORD)

    // ── Insert admin user (trigger auto-creates profile) ────
    const { data: newAdmin, error: insertError } = await supabase
      .from('users')
      .insert({
        email: ADMIN_EMAIL,
        password_hash: passwordHash,
        role_id: adminRole.id,
        is_verified: true,
        is_blocked: false,
      })
      .select('id, email')
      .single()

    if (insertError) {
      console.error('[init-admin] Failed to create admin user:', insertError)
      return NextResponse.json(
        { error: `Failed to create admin: ${insertError.message}` },
        { status: 500 }
      )
    }

    // ── Update profile with full_name ───────────────────────
    await supabase
      .from('profiles')
      .update({ full_name: 'Admin' })
      .eq('user_id', newAdmin.id)

    console.log(`[init-admin] Admin user created: ${ADMIN_EMAIL}`)

    return NextResponse.json(
      {
        message: 'Admin user created successfully',
        user: {
          id: newAdmin.id,
          email: newAdmin.email,
          name: 'Admin',
          role: 'ADMIN',
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[init-admin] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Failed to create admin user' },
      { status: 500 }
    )
  }
}
