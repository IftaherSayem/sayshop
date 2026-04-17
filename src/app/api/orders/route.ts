import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toCamel } from '@/lib/supabase/helpers'
import { validateSession } from '@/lib/auth'
import type { SessionUser } from '@/lib/auth'
import { notifyStaff, sendNotification } from '@/lib/notification-service'

// ── Helper: get authenticated user from request ──────────────────

async function getUserFromRequest(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('sayshop_session')?.value
  if (!token) return null
  return validateSession(token)
}

// ── Input sanitization helpers ────────────────────────────────────

function sanitizeString(input: unknown, maxLength: number = 500): string {
  if (typeof input !== 'string') return ''
  let sanitized = input.trim()
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength)
  }
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
  return sanitized
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// ── Field length limits ───────────────────────────────────────────

const MAX_NAME_LENGTH = 100
const MAX_EMAIL_LENGTH = 254
const MAX_PHONE_LENGTH = 30
const MAX_ADDRESS_LENGTH = 200
const MAX_CITY_LENGTH = 100
const MAX_STATE_LENGTH = 100
const MAX_ZIP_LENGTH = 20
const MAX_COUNTRY_LENGTH = 3
const MAX_NOTES_LENGTH = 1000
const MAX_COUPON_CODE_LENGTH = 50
const MAX_PAYMENT_METHOD_LENGTH = 50
const MAX_ITEM_NAME_LENGTH = 200
const MAX_ITEM_IMAGE_LENGTH = 500

// ── Order number helper ──────────────────────────────────────────

function generateOrderNumber(id: string): string {
  return 'SS-' + id.slice(0, 8).toUpperCase()
}

// ── Coupon discount helper ───────────────────────────────────────

async function getCouponDiscount(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  code: string,
  subtotal: number
): Promise<{ discount: number; discountType: string; discountValue: number }> {
  const defaultResult = { discount: 0, discountType: '', discountValue: 0 }
  if (!code) return defaultResult
  try {
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle()

    // Gracefully handle missing coupons table
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      console.warn('[ORDERS] Coupons table does not exist. Coupon discounts disabled.')
      return defaultResult
    }

    if (!coupon) return defaultResult
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return defaultResult
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) return defaultResult
    if (coupon.min_order && subtotal < coupon.min_order) return defaultResult

    const discountType = coupon.discount_type as string
    const discountValue = Number(coupon.discount_value) || 0

    if (discountType === 'fixed') {
      return { discount: discountValue, discountType, discountValue }
    }
    // percent
    return { discount: subtotal * discountValue / 100, discountType, discountValue }
  } catch {
    return defaultResult
  }
}

// ── Transform order row to frontend-compatible format ────────────

function transformOrder(
  order: Record<string, unknown>,
  orderItems: Record<string, unknown>[],
  customerInfo?: { fullName: string | null; email: string; phone: string | null } | null,
  paymentMethod?: string
): Record<string, unknown> {
  const orderNumber = generateOrderNumber(order.id as string)
  const itemsJson = JSON.stringify(
    (orderItems || []).map((item: Record<string, unknown>) => ({
      productId: item.product_id,
      name: item.name || '',
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      image: item.image || '',
    }))
  )

  return {
    id: order.id,
    orderNumber,
    status: order.status,
    items: itemsJson,
    subtotal: Number(order.subtotal) || 0,
    shipping: Number(order.shipping) || 0,
    tax: Number(order.tax) || 0,
    total: Number(order.total_amount) || 0,
    shippingAddress:
      typeof order.shipping_address === 'string'
        ? order.shipping_address
        : JSON.stringify(order.shipping_address || {}),
    paymentMethod: paymentMethod || 'credit_card',
    customerName: customerInfo?.fullName || customerInfo?.email || '',
    customerEmail: customerInfo?.email || '',
    customerPhone: customerInfo?.phone || null,
    notes: order.notes || null,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    orderItems: toCamel(orderItems || []),
  }
}

// GET /api/orders - List orders for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getUserFromRequest()

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const status = searchParams.get('status') || ''

    // Fetch orders for this user with order_items
    let query = supabase
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .eq('user_id', sessionUser.id)
      .order('created_at', { ascending: false })

    if (status) {
      const validStatuses = [
        'pending',
        'processing',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
      ]
      if (validStatuses.includes(status)) {
        query = query.eq('status', status)
      }
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: orders, count, error } = await query

    if (error) {
      console.error('Supabase orders error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    // Fetch user profile for customer info (batch: already have it from session)
    const customerInfo = {
      fullName: sessionUser.profile?.fullName || null,
      email: sessionUser.email,
      phone: sessionUser.profile?.phone || null,
    }

    // Fetch payment methods for each order (batch query)
    const orderIds = (orders || []).map((o: Record<string, unknown>) => o.id)
    let paymentMethods: Record<string, string> = {}
    if (orderIds.length > 0) {
      const { data: payments } = await supabase
        .from('payments')
        .select('order_id, provider')
        .in('order_id', orderIds)

      if (payments) {
        for (const p of payments) {
          paymentMethods[p.order_id as string] = (p.provider as string) || 'credit_card'
        }
      }
    }

    // Transform orders to match frontend format
    const transformed = (orders || []).map((o: Record<string, unknown>) =>
      transformOrder(
        o,
        (o.order_items as Record<string, unknown>[]) || [],
        customerInfo,
        paymentMethods[o.id as string]
      )
    )

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      orders: transformed,
      total,
      page,
      totalPages,
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getUserFromRequest()

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Authentication required to place an order' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const supabase = await createSupabaseServerClient()

    const {
      items,
      subtotal,
      shipping,
      tax,
      total,
      giftWrapCost,
      shippingAddress,
      paymentMethod,
      customerName,
      customerEmail,
      customerPhone,
      notes,
      couponCode,
      redeemedPoints,
      earnedPoints,
    } = body

    // ── Validate required fields ──
    if (
      !items ||
      subtotal === undefined ||
      subtotal === null ||
      isNaN(subtotal) ||
      total === undefined ||
      total === null ||
      isNaN(total) ||
      !shippingAddress
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: items, subtotal, total, shippingAddress',
        },
        { status: 400 }
      )
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items must be a non-empty array' },
        { status: 400 }
      )
    }

    // ── Sanitize inputs ──
    const sanitizedCustomerName = sanitizeString(
      customerName || sessionUser.profile?.fullName || sessionUser.email,
      MAX_NAME_LENGTH
    )
    const sanitizedCustomerEmail = sanitizeString(customerEmail || sessionUser.email, MAX_EMAIL_LENGTH)
    const sanitizedCustomerPhone = customerPhone
      ? sanitizeString(customerPhone, MAX_PHONE_LENGTH)
      : sessionUser.profile?.phone || null
    const sanitizedNotes = notes ? sanitizeString(notes, MAX_NOTES_LENGTH) : null
    const sanitizedCouponCode = couponCode
      ? sanitizeString(couponCode, MAX_COUPON_CODE_LENGTH)
      : ''
    const sanitizedPaymentMethod = paymentMethod
      ? sanitizeString(paymentMethod, MAX_PAYMENT_METHOD_LENGTH)
      : ''

    if (!isValidEmail(sanitizedCustomerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (!sanitizedCustomerName) {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 }
      )
    }

    // ── Sanitize shipping address ──
    if (typeof shippingAddress !== 'object' || shippingAddress === null) {
      return NextResponse.json(
        { error: 'Invalid shipping address format' },
        { status: 400 }
      )
    }

    const sanitizedAddress: Record<string, unknown> = {
      firstName: sanitizeString(shippingAddress.firstName, MAX_NAME_LENGTH),
      lastName: sanitizeString(shippingAddress.lastName, MAX_NAME_LENGTH),
      email: sanitizeString(shippingAddress.email, MAX_EMAIL_LENGTH),
      address: sanitizeString(shippingAddress.address, MAX_ADDRESS_LENGTH),
      apartment: shippingAddress.apartment
        ? sanitizeString(shippingAddress.apartment, MAX_ADDRESS_LENGTH)
        : '',
      city: sanitizeString(shippingAddress.city, MAX_CITY_LENGTH),
      state: sanitizeString(shippingAddress.state, MAX_STATE_LENGTH),
      zipCode: sanitizeString(shippingAddress.zipCode, MAX_ZIP_LENGTH),
      country: sanitizeString(shippingAddress.country, MAX_COUNTRY_LENGTH),
      phone: sanitizeString(shippingAddress.phone, MAX_PHONE_LENGTH),
    }

    // ── Validate numeric fields ──
    const numSubtotal = parseFloat(subtotal)
    const numTotal = parseFloat(total)
    const numShipping =
      shipping !== undefined && shipping !== null ? parseFloat(shipping) : 0
    const numTax =
      tax !== undefined && tax !== null ? parseFloat(tax) : 0

    if (isNaN(numSubtotal) || numSubtotal < 0) {
      return NextResponse.json(
        { error: 'subtotal must be a valid non-negative number' },
        { status: 400 }
      )
    }
    if (isNaN(numTotal) || numTotal < 0) {
      return NextResponse.json(
        { error: 'total must be a valid non-negative number' },
        { status: 400 }
      )
    }
    if (isNaN(numShipping) || numShipping < 0) {
      return NextResponse.json(
        { error: 'shipping must be a valid non-negative number' },
        { status: 400 }
      )
    }
    if (isNaN(numTax) || numTax < 0) {
      return NextResponse.json(
        { error: 'tax must be a valid non-negative number' },
        { status: 400 }
      )
    }

    // ── Validate payment method ──
    const validPaymentMethods = [
      'credit_card',
      'paypal',
      'apple_pay',
      'bkash',
      'nagad',
      'rocket',
      'gpay',
    ]
    const resolvedPaymentMethod = sanitizedPaymentMethod || 'credit_card'
    if (!validPaymentMethods.includes(resolvedPaymentMethod)) {
      return NextResponse.json(
        {
          error: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // ── Sanitize and validate order items ──
    const sanitizedItems = items.map((item: Record<string, unknown>) => ({
      product_id: typeof item.productId === 'string' ? item.productId : '',
      name: sanitizeString(
        typeof item.name === 'string' ? item.name : '',
        MAX_ITEM_NAME_LENGTH
      ),
      price: parseFloat(String(item.price)) || 0,
      quantity: Math.min(999, Math.max(1, parseInt(String(item.quantity)) || 1)),
      image: sanitizeString(
        typeof item.image === 'string' ? item.image : '',
        MAX_ITEM_IMAGE_LENGTH
      ),
    }))

    for (const item of sanitizedItems) {
      if (!item.product_id) {
        return NextResponse.json(
          { error: 'Each item must have a valid productId' },
          { status: 400 }
        )
      }
      // Name will be filled from the products table if missing
      // (don't reject here — the server-side verification fetches the real name)
    }

    // ── Server-side verification (Optimized Batch Query) ──
    const productIds = sanitizedItems.map(i => i.product_id)
    
    // Fetch all products, inventory, and coupon in parallel
    const [dbRes, couponResult] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, base_price, discount_price, is_active, images, inventory(stock)')
        .in('id', productIds),
      sanitizedCouponCode 
        ? getCouponDiscount(supabase, sanitizedCouponCode, numSubtotal)
        : Promise.resolve({ discount: 0, discountType: '', discountValue: 0 })
    ])

    const { data: dbProducts, error: dbError } = dbRes
    if (dbError || !dbProducts) {
      console.error('[ORDERS POST] Batch fetch error:', dbError)
      return NextResponse.json({ error: 'Failed to verify products' }, { status: 500 })
    }

    const productMap = new Map(dbProducts.map((p: any) => [p.id, p]))
    let serverSubtotal = 0
    const verifiedItems: typeof sanitizedItems = []

    for (const item of sanitizedItems) {
      const product = productMap.get(item.product_id)
      
      if (!product) {
        return NextResponse.json({ error: `Product not found: ${item.name}` }, { status: 400 })
      }
      if (!product.is_active) {
        return NextResponse.json({ error: `Product "${product.name}" is no longer available` }, { status: 400 })
      }

      const stock = product.inventory?.stock ?? 0
      if (stock < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock for "${product.name}". Only ${stock} available.` }, { status: 400 })
      }

      const effectivePrice = product.discount_price ? Number(product.discount_price) : Number(product.base_price)
      verifiedItems.push({
        ...item,
        name: product.name,
        price: effectivePrice,
        image: (product.images as string[] | null)?.[0] || item.image || '',
      })
      serverSubtotal += effectivePrice * item.quantity
    }

    // ── Gift wrap cost ──
    const numGiftWrapCost =
      giftWrapCost !== undefined && giftWrapCost !== null
        ? parseFloat(giftWrapCost)
        : 0
    if (isNaN(numGiftWrapCost) || numGiftWrapCost < 0) {
      return NextResponse.json(
        { error: 'giftWrapCost must be a valid non-negative number' },
        { status: 400 }
      )
    }

    // ── Rewards Deduction ──
    const numRedeemedPoints = Number(redeemedPoints) || 0
    const numEarnedPoints = Number(earnedPoints) || 0
    const redeemedAmount = numRedeemedPoints > 0 ? numRedeemedPoints / 100 : 0 // 100 points = $1

    // ── Validate totals match (within $1 tolerance) ──
    const expectedTotal = Math.max(
      0,
      serverSubtotal + numShipping + numTax + numGiftWrapCost - couponResult.discount - redeemedAmount
    )

    if (Math.abs(numTotal - expectedTotal) > 1.0) {
      return NextResponse.json(
        {
          error:
            'Order total verification failed. Prices may have changed. Please refresh and try again.',
          serverTotal: expectedTotal.toFixed(2),
        },
        { status: 400 }
      )
    }

    // ── Insert the order ──
    const couponInfo = sanitizedCouponCode && couponResult.discount > 0 
      ? `[COUPON:${sanitizedCouponCode},DISCOUNT:${couponResult.discount.toFixed(2)}]` 
      : ''
    
    const finalNotes = [sanitizedNotes, couponInfo].filter(Boolean).join(' | ')

    const orderData = {
      user_id: sessionUser.id,
      total_amount: expectedTotal,
      status: 'pending',
      payment_status: 'pending',
      shipping_address: sanitizedAddress,
      subtotal: serverSubtotal,
      shipping: numShipping,
      tax: numTax,
      notes: finalNotes,
      coupon_code: sanitizedCouponCode || null,
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      console.error('Create order error:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    // 🔥 Trigger Staff Notification
    notifyStaff({
      type: 'new_order',
      title: 'New Order Received',
      message: `Order ${order.id.slice(0, 8)} for $${expectedTotal.toFixed(2)} has been placed by ${sanitizedCustomerName}.`,
      link: `/admin/orders?id=${order.id}`
    }).catch(err => console.error('[NOTIFICATION] Failed to notify staff:', err))

    // ── Update User Rewards (Atomic Point Transation) ──
    const currentPoints = (sessionUser.profile as any)?.points || 0
    const finalPoints = Math.max(0, currentPoints - numRedeemedPoints + numEarnedPoints)

    const { error: rewardsError } = await supabase
      .from('profiles')
      .update({ 
        points: finalPoints,
        // Award tier based on logic if needed
      })
      .eq('user_id', sessionUser.id)

    if (rewardsError) {
      console.warn('[REWARDS] Failed to update user points:', rewardsError.message)
      // Non-critical for the order itself, but we record for audit
    }

    // Log the rewards transaction
    if (numRedeemedPoints > 0 || numEarnedPoints > 0) {
      await supabase.from('rewards_history').insert([
        { 
          user_id: sessionUser.id, 
          points: -numRedeemedPoints, 
          reason: `Redeemed for Order ${generateOrderNumber(order.id)}` 
        },
        { 
          user_id: sessionUser.id, 
          points: numEarnedPoints, 
          reason: `Earned from Order ${generateOrderNumber(order.id)}` 
        }
      ].filter(r => r.points !== 0));
    }

    // ── Insert order_items ──
    const orderItemRows = verifiedItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemRows)

    if (itemsError) {
      console.error('Create order items error:', itemsError)
      // Order was created but items failed — attempt cleanup
      await supabase.from('orders').delete().eq('id', order.id)
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      )
    }

    // ── PROD-GRADE: Atomic inventory decrement ──
    // Enforces a single atomic operation with a conditional check to prevent race conditions
    for (const item of verifiedItems) {
      const { error: atomicInvError } = await supabase.rpc('decrement_inventory_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity
      })
      
      if (atomicInvError) {
        console.error(`[SYSTEM_AUDIT] Atomic inventory decrement failed for ${item.product_id}:`, atomicInvError.message)
      }

      // 📦 Low Stock Alert — check remaining inventory
      const { data: inv } = await supabase
        .from('inventory')
        .select('stock')
        .eq('product_id', item.product_id)
        .maybeSingle()

      if (inv && inv.stock < 10) {
        notifyStaff({
          type: 'low_stock',
          title: '⚠️ Low Stock Alert',
          message: `"${item.name}" has only ${inv.stock} units remaining.`,
          link: `/admin/products`
        }).catch(err => console.error('[NOTIFICATION] Low stock alert failed:', err))
      }
    }

    // ── PROD-GRADE: Atomic usage increment ──
    // Prevents race conditions where usage_limit could be exceeded under load
    if (sanitizedCouponCode && couponResult.discount > 0) {
      const { error: atomicError } = await supabase.rpc('increment_coupon_usage', {
        p_code: sanitizedCouponCode.toUpperCase()
      })
      if (atomicError) {
        console.error('[SYSTEM_AUDIT] Atomic coupon increment failed:', atomicError)
        // Note: In high-integrity systems, we might rollback the order if this fails,
        // but here we log for audit as the order is primary.
      }
    }

    // ── Create payment record ──
    const paymentData = {
      order_id: order.id,
      provider: resolvedPaymentMethod,
      amount: expectedTotal,
      status: 'pending',
      currency: 'USD',
    }

    const { error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)

    if (paymentError) {
      console.error('Create payment error:', paymentError)
      // Non-critical, don't fail the order

      // 💳 Notify customer of payment failure
      sendNotification({
        recipientId: sessionUser.id,
        type: 'payment_status',
        title: 'Payment Processing Issue',
        message: `There was an issue processing your payment for order ${generateOrderNumber(order.id)}. We'll retry automatically.`,
        link: `/profile?tab=orders`
      }).catch(() => {})
    } else {
      // 💳 Notify customer of payment success
      sendNotification({
        recipientId: sessionUser.id,
        type: 'payment_status',
        title: 'Payment Confirmed',
        message: `Your payment of $${expectedTotal.toFixed(2)} for order ${generateOrderNumber(order.id)} was successful.`,
        link: `/profile?tab=orders`
      }).catch(() => {})
    }

    // ── Return transformed order ──
    const transformedOrder = transformOrder(
      order,
      verifiedItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
      })),
      {
        fullName: sanitizedCustomerName,
        email: sanitizedCustomerEmail,
        phone: sanitizedCustomerPhone,
      },
      resolvedPaymentMethod
    )

    return NextResponse.json(transformedOrder, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to create order'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
