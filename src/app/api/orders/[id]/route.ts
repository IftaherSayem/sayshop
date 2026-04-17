import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toCamel } from '@/lib/supabase/helpers'
import { validateSession } from '@/lib/auth'

// ── Helper: get authenticated user from request ──────────────────

async function getUserFromRequest() {
  const cookieStore = await cookies()
  const token = cookieStore.get('sayshop_session')?.value
  if (!token) return null
  return validateSession(token)
}

// ── Order number helper ──────────────────────────────────────────

function generateOrderNumber(id: string): string {
  return 'SS-' + id.slice(0, 8).toUpperCase()
}

// GET /api/orders/[id] - Get a single order by id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionUser = await getUserFromRequest()

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = await createSupabaseServerClient()
    
    // Support lookup by human-readable order number (SS-XXXXXXXX)
    let query = supabase.from('orders').select('*, order_items(*)')
    
    if (id.startsWith('SS-')) {
      const shortId = id.slice(3).toLowerCase()
      // Filter by the start of the UUID since our order number is the first 8 chars of the ID
      query = query.filter('id::text', 'ilike', `${shortId}%`)
    } else {
      query = query.eq('id', id)
    }

    const { data: order, error } = await query.maybeSingle()

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Authorization: only allow the order owner to view (or admins)
    if (
      order.user_id !== sessionUser.id &&
      sessionUser.roleName !== 'admin'
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to view this order' },
        { status: 403 }
      )
    }

    // Fetch customer info from users + profiles
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', order.user_id)
      .maybeSingle()

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('user_id', order.user_id)
      .maybeSingle()

    // Fetch payment method
    const { data: payment } = await supabase
      .from('payments')
      .select('provider')
      .eq('order_id', order.id)
      .maybeSingle()

    // Enrich order_items with product name + image for frontend display
    const rawItems = (order.order_items as Record<string, unknown>[]) || []
    const enrichedItems = await Promise.all(
      rawItems.map(async (item: Record<string, unknown>) => {
        const { data: product } = await supabase
          .from('products')
          .select('name, images')
          .eq('id', item.product_id)
          .maybeSingle()

        return {
          ...item,
          name: product?.name || '',
          image: (product?.images as string[] | null)?.[0] || '',
        }
      })
    )

    // Transform to match frontend format
    const orderNumber = generateOrderNumber(order.id as string)
    const itemsJson = JSON.stringify(
      enrichedItems.map((item: Record<string, unknown>) => ({
        productId: item.product_id,
        name: item.name || '',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        image: item.image || '',
      }))
    )

    const transformed = {
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
      paymentMethod: payment?.provider || 'credit_card',
      customerName: profile?.full_name || user?.email || '',
      customerEmail: user?.email || '',
      customerPhone: profile?.phone || null,
      notes: order.notes || null,
      orderItems: toCamel(enrichedItems),
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    }

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
