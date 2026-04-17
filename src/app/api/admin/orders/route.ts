import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '../_auth'
import { toCamel } from '@/lib/supabase/helpers'
import { invalidateStatsCache } from '@/lib/admin-cache'
import { sendNotification } from '@/lib/notification-service'

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_STATUSES = ['pending', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']
const VALID_PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded']

function transformOrder(o: Record<string, unknown>) {
  const orderItems = Array.isArray(o.order_items) ? o.order_items : []
  const enrichedItems = orderItems.map((item: Record<string, unknown>) => ({
    ...(toCamel(item) as Record<string, unknown>),
    productName: item.products ? (item.products as Record<string, unknown>).name : null,
    productSlug: item.products ? (item.products as Record<string, unknown>).slug : null,
  }))

  const user = o.users as Record<string, unknown> | null
  const profile = user?.profiles as Record<string, unknown> | null
  const paymentArray = Array.isArray(o.payments) ? o.payments : []
  const payment = paymentArray[0] as Record<string, unknown> | null

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
    customerName: profile?.full_name || profile?.fullName || (user ? user.email : 'Unknown'),
    customerEmail: user ? (user.email as string) : null,
    customerPhone: profile ? (profile.phone || profile.phoneNumber) : null,
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
        payments(provider)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
    if (status) {
      query = query.eq('status', status)
    }

    if (!search && !status) {
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)
    } else {
      // If searching, fetch more to ensure we find matches across tables
      query = query.range(0, 99)
    }

    const { data: orders, count, error: queryError } = await query

    if (queryError) {
      console.error('Admin orders GET query error:', queryError)
      return NextResponse.json({ orders: [], total: 0, page, totalPages: 0 })
    }

    // Since joins with users/profiles can be tricky with RLS, fetch them separately
    const userIds = [...new Set((orders || []).map((o: any) => o.user_id))].filter(Boolean)
    let userData: Record<string, any> = {}
    
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email, profiles(full_name, phone, fullName)')
        .in('id', userIds)
      
      if (users) {
        userData = Object.fromEntries(users.map((u: any) => [u.id, u]))
      }
    }

    const transformed = (orders || []).map((o: any) => {
      const u = userData[o.user_id]
      return transformOrder({ ...o, users: u })
    })

    // Comprehensive client-side filtering for search
    let filtered = transformed
    if (search) {
      const lowerSearch = search.toLowerCase().replace(/^ss-/, '')
      filtered = transformed.filter((o: any) => {
        const name = (o.customerName || '').toLowerCase()
        const email = (o.customerEmail || '').toLowerCase()
        const orderNo = (o.orderNumber || '').toLowerCase().replace(/^ss-/, '')
        const items = o.orderItems || []
        const matchItem = items.some((item: any) => 
          (item.productName || item.name || '').toLowerCase().includes(lowerSearch)
        )
        const matchId = (o.id || '').toLowerCase().includes(lowerSearch)
        return name.includes(lowerSearch) || 
               email.includes(lowerSearch) || 
               orderNo.includes(lowerSearch) || 
               matchId ||
               matchItem
      })
    }

    return NextResponse.json({
      orders: filtered,
      total: search ? filtered.length : (count || 0),
      page,
      totalPages: Math.ceil((search ? filtered.length : (count || 0)) / limit),
    })
  } catch (err: any) {
    console.error('Admin orders GET unexpected error:', err)
    return NextResponse.json({ 
      error: 'Failed to fetch orders',
      message: err.message 
    }, { status: 500 })
  }
}

// ── PUT: Update order status ───────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const { error, user } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    let { id, status, paymentStatus } = body

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Map legacy 'approved' or 'confirmed' to 'processing' for DB compatibility
    if (status === 'approved' || status === 'confirmed') status = 'processing'

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

    invalidateStatsCache()

    // 🔔 Notify Customer about status change
    if (status) {
      sendNotification({
        recipientId: order.user_id,
        type: 'order_update',
        title: 'Order Status Updated',
        message: `Your order ${order.id.slice(0, 8).toUpperCase()} is now ${status.replace(/_/g, ' ')}.`,
        link: `/profile?tab=orders&id=${order.id}`
      }).catch(err => console.error('[NOTIFICATION] Failed to notify customer:', err))
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
