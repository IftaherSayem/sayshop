import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '../_auth'
import { toCamel } from '@/lib/supabase/helpers'

/**
 * GET /api/admin/audit
 * Retrieve recent admin audit log entries from the database.
 * The audit_logs table should have auto-generated entries via triggers.
 */
export async function GET(request: NextRequest) {
  const { error } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 20

    // Try to fetch from the audit_logs table
    const { data: entries, count, error: queryError } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (queryError) {
      // If the table doesn't exist or query fails, return empty
      console.warn('Audit logs table query failed (may not exist yet):', queryError.message)
      return NextResponse.json({
        entries: [],
        total: 0,
      })
    }

    return NextResponse.json({
      entries: toCamel(entries || []),
      total: count || 0,
    })
  } catch (e) {
    console.error('Admin audit error:', e)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
