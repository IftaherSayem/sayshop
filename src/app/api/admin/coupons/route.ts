import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyAdmin } from '../_auth'
import { toCamel } from '@/lib/supabase/helpers'

// ── Constants ──────────────────────────────────────────────────────────────────

const VALID_DISCOUNT_TYPES = ['percent', 'fixed']

// ── GET: List coupons ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { error } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const search = searchParams.get('search') || ''

    let query = supabase
      .from('coupons')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.ilike('code', `%${search}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: coupons, count, error: queryError } = await query

    if (queryError) {
      if (queryError.code === '42P01' || queryError.message?.includes('does not exist')) {
        return NextResponse.json({ coupons: [], total: 0, page, totalPages: 0 })
      }
      console.error('Admin coupons GET error:', queryError)
      return NextResponse.json({ error: 'Failed to fetch coupons', details: queryError.message }, { status: 500 })
    }

    return NextResponse.json({
      coupons: toCamel(coupons || []),
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 })
  }
}

// ── POST: Create coupon ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { error } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseAdminClient()
    const body = await request.json()
    const {
      code,
      discountType,
      discountValue,
      minOrder,
      usageLimit,
      isActive,
      expiresAt,
      targetUserIds,
      usageLimitPerUser,
    } = body

    if (!code || !discountType || discountValue === undefined) {
      return NextResponse.json({ error: 'Code, discountType, and discountValue are required' }, { status: 400 })
    }

    if (!VALID_DISCOUNT_TYPES.includes(discountType)) {
      return NextResponse.json(
        { error: `Invalid discountType. Must be one of: ${VALID_DISCOUNT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const discountVal = parseFloat(discountValue)
    if (isNaN(discountVal) || discountVal <= 0) {
      return NextResponse.json({ error: 'discountValue must be a positive number' }, { status: 400 })
    }

    if (discountType === 'percent' && discountVal > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100' }, { status: 400 })
    }

    const upperCode = code.toUpperCase()

    // Check for existing coupon code
    const { data: existing } = await supabase
      .from('coupons')
      .select('id')
      .eq('code', upperCode)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 })
    }

    const insertData: Record<string, unknown> = {
      code: upperCode,
      discount_type: discountType,
      discount_value: discountVal,
      min_order: (minOrder && minOrder !== "") ? parseFloat(minOrder) : null,
      usage_limit: (usageLimit && usageLimit !== "") ? parseInt(usageLimit) : null,
      product_id: body.productId && body.productId !== 'none' ? body.productId : null,
      target_user_ids: Array.isArray(targetUserIds) && targetUserIds.length > 0 ? targetUserIds.filter(id => id !== 'none') : null,
      usage_limit_per_user: (usageLimitPerUser && usageLimitPerUser !== "") ? parseInt(usageLimitPerUser) : null,
      used_count: 0,
      is_active: isActive === undefined ? true : Boolean(isActive),
      expires_at: (expiresAt && expiresAt !== "") ? new Date(expiresAt).toISOString() : null,
    }

    const { data: coupon, error: insertError } = await supabase
      .from('coupons')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('Create coupon error:', insertError)
      return NextResponse.json({ error: 'Failed to create coupon', details: insertError.message }, { status: 500 })
    }

    return NextResponse.json(toCamel(coupon as Record<string, unknown>), { status: 201 })
  } catch (e) {
    console.error('Create coupon error:', e)
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 })
  }
}

// ── PUT: Update coupon ─────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const { error } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseAdminClient()
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    if (data.code !== undefined) {
      const upperCode = String(data.code).toUpperCase()
      const { data: existing } = await supabase
        .from('coupons')
        .select('id')
        .eq('code', upperCode)
        .neq('id', id)
        .maybeSingle()
      if (existing) {
        return NextResponse.json({ error: 'Coupon code already in use' }, { status: 409 })
      }
      updateData.code = upperCode
    }

    if (data.discountType !== undefined) {
      if (!VALID_DISCOUNT_TYPES.includes(data.discountType)) {
        return NextResponse.json(
          { error: `Invalid discountType. Must be one of: ${VALID_DISCOUNT_TYPES.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.discount_type = data.discountType
    }

    if (data.discountValue !== undefined) {
      const val = parseFloat(data.discountValue)
      if (isNaN(val) || val <= 0) {
        return NextResponse.json({ error: 'discountValue must be a positive number' }, { status: 400 })
      }
      const discountType = data.discountType || 'fixed'
      if (discountType === 'percent' && val > 100) {
        return NextResponse.json({ error: 'Percentage discount cannot exceed 100' }, { status: 400 })
      }
      updateData.discount_value = val
    }

    if (data.minOrder !== undefined) {
      updateData.min_order = (data.minOrder && data.minOrder !== "") ? parseFloat(data.minOrder) : null
    }

    if (data.usageLimit !== undefined) {
      updateData.usage_limit = (data.usageLimit && data.usageLimit !== "") ? parseInt(data.usageLimit) : null
    }

    if (data.productId !== undefined) {
      updateData.product_id = data.productId === 'none' ? null : data.productId
    }

    if (data.expiresAt !== undefined) {
      updateData.expires_at = (data.expiresAt && data.expiresAt !== "") ? new Date(data.expiresAt).toISOString() : null
    }

    if (data.targetUserIds !== undefined) {
      updateData.target_user_ids = Array.isArray(data.targetUserIds) && data.targetUserIds.length > 0 ? data.targetUserIds.filter((id: string) => id !== 'none') : null
    }

    if (data.usageLimitPerUser !== undefined) {
      updateData.usage_limit_per_user = (data.usageLimitPerUser && data.usageLimitPerUser !== "") ? parseInt(data.usageLimitPerUser) : null
    }

    if (data.isActive !== undefined) {
      updateData.is_active = Boolean(data.isActive)
    }

    if (data.expiresAt !== undefined) {
      updateData.expires_at = data.expiresAt ? new Date(data.expiresAt).toISOString() : null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: coupon, error: updateError } = await supabase
      .from('coupons')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update coupon error:', updateError)
      return NextResponse.json({ 
        error: updateError.message || 'Failed to update coupon',
        details: updateError.code
      }, { status: 500 })
    }

    return NextResponse.json(toCamel(coupon as Record<string, unknown>))
  } catch (e: any) {
    console.error('Update coupon error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to update coupon' }, { status: 500 })
  }
}

// ── DELETE: Delete coupon ──────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const { error } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete coupon error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete coupon', details: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Coupon deleted successfully' })
  } catch (e) {
    console.error('Delete coupon error:', e)
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 })
  }
}
