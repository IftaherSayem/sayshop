import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '../_auth'
import { toCamel } from '@/lib/supabase/helpers'

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded']
const VALID_PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded']

function transformOrder(o: Record<string, unknown>) {
  const orderItems = Array.isArray(o.order_items) ? o.order_items : []
  const enrichedItems = orderItems.map((item: Record<string, unknown>) => ({
    ...toCamel(item),
    productName: item.products ? (item.products as Record<string, unknown>).name : null,
    productSlug: item.products ? (item.products as Record<string, unknown>).slug : null,
  }))

  const profile = o.profiles as Record<string, unknown> | null
  const user = o.users as Record<string, unknown> | null
  const payment = o.payments as Record<string, unknown> | null

  return {
    id: o.id,
    userId: o.user_id,
    total: Number(o.total_amount) || 0,
    subtotal: Number(o.subtotal) || 0,
    shipping: Number(o.shipping) || 0,
    tax: Number(o.tax) || 0,
    orderNumber: `SS-${String(o.id).slice(0, 8).toUpperCase()}`,
    status: o.status,
    paymentStatus: o.payment_status,
    paymentMethod: payment ? payment.provider : null,
    customerName: profile ? profile.full_name : (user ? user.email : 'Unknown'),
    customerEmail: user ? user.email : null,
    customerPhone: profile ? profile.phone : null,
    shippingAddress: o.shipping_address,
    notes: o.notes,
    orderItems: enrichedItems,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  }
}

// ── GET: List all orders ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { error } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items(
          id, order_id, product_id, quantity, price,
          products(name, slug)
        ),
        users(id, email),
        profiles(full_name, phone),
        payments(provider)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`id.ilike.%${search}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: orders, count, error: queryError } = await query

    if (queryError) {
      console.error('Admin orders GET error:', queryError)
      return NextResponse.json({ error: 'Failed to fetch orders', details: queryError.message }, { status: 500 })
    }

    // Filter by search on client side if search term looks like a name/email
    let filtered = orders || []
    if (search) {
      const lowerSearch = search.toLowerCase()
      filtered = filtered.filter((o: Record<string, unknown>) => {
        const profile = o.profiles as Record<string, unknown> | null
        const user = o.users as Record<string, unknown> | null
        const orderNum = `SS-${String(o.id).slice(0, 8).toUpperCase()}`.toLowerCase()
        const name = profile?.full_name?.toString().toLowerCase() || ''
        const email = user?.email?.toString().toLowerCase() || ''
        return orderNum.includes(lowerSearch) || name.includes(lowerSearch) || email.includes(lowerSearch)
      })
    }

    const transformed = filtered.map((o: Record<string, unknown>) => transformOrder(o))

    return NextResponse.json({
      orders: transformed,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

// ── PUT: Update order status ───────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const { error, user } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    const { id, status, paymentStatus } = body

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    if (paymentStatus !== undefined) {
      if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
        return NextResponse.json(
          { error: `Invalid paymentStatus. Must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.payment_status = paymentStatus
    }

    if (Object.keys(updateData).length === 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: order, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update order error:', updateError)
      return NextResponse.json({ error: 'Failed to update order', details: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: `SS-${String(order.id).slice(0, 8).toUpperCase()}`,
      status: order.status,
      paymentStatus: order.payment_status,
      total: Number(order.total_amount),
      updatedAt: order.updated_at,
    })
  } catch (e) {
    console.error('Update order error:', e)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
