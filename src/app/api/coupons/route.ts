import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// POST /api/coupons - Validate a coupon code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, subtotal } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Coupon code is required' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // Find the coupon (case-insensitive, active only)
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle()

    // If the coupons table doesn't exist or query fails, return invalid gracefully
    if (error) {
      const isMissingTable =
        error.code === '42P01' || error.message?.includes('does not exist')
      if (isMissingTable) {
        console.warn(
          '[COUPONS] Table does not exist. Coupon validation disabled.'
        )
        return NextResponse.json(
          {
            error: 'Coupon feature is not available at the moment',
            valid: false,
          },
          { status: 200 }
        )
      }
      return NextResponse.json(
        { error: 'Invalid coupon code', valid: false },
        { status: 200 }
      )
    }

    if (!coupon) {
      return NextResponse.json(
        { error: 'Invalid coupon code', valid: false },
        { status: 200 }
      )
    }

    // Check if coupon has expired
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This coupon has expired', valid: false },
        { status: 200 }
      )
    }

    // USER SPECIFIC CHECK
    if (coupon.target_user_ids && Array.isArray(coupon.target_user_ids) && coupon.target_user_ids.length > 0) {
       // Get current user session
       const { data: { user: currentUser } } = await supabase.auth.getUser()
       if (!currentUser || !coupon.target_user_ids.includes(currentUser.id)) {
         return NextResponse.json({
           error: 'This coupon is only valid for selected accounts',
           valid: false
         }, { status: 200 })
       }
    }

    // Check if usage limit reached
    if (
      coupon.usage_limit &&
      coupon.used_count >= coupon.usage_limit
    ) {
      return NextResponse.json(
        {
          error: 'This coupon has reached its maximum usage limit',
          valid: false,
        },
        { status: 200 }
      )
    }

    // Check if subtotal meets minimum order requirement
    const numSubtotal = subtotal !== undefined && subtotal !== null ? parseFloat(subtotal) : 0
    const items = Array.isArray(body.items) ? body.items : []

    if (isNaN(numSubtotal)) {
      return NextResponse.json({ error: 'Invalid subtotal value', valid: false }, { status: 200 })
    }

    // PRODUCT SPECIFIC CHECK
    let targetItemPrice = numSubtotal
    if (coupon.product_id) {
      const matchingItem = items.find((item: any) => (item.product_id === coupon.product_id || item.productId === coupon.product_id || item.id === coupon.product_id))
      if (!matchingItem) {
        return NextResponse.json({ 
          error: 'This coupon is only valid for a specific product not found in your cart', 
          valid: false 
        }, { status: 200 })
      }
      // If it's a fixed discount on a product, it shouldn't exceed the product price
      // If it's a percentage, it applies to the item price * quantity
      targetItemPrice = (matchingItem.price || 0) * (matchingItem.quantity || 1)
    }

    if (coupon.min_order && numSubtotal < coupon.min_order) {
      return NextResponse.json({
        error: `Minimum order of $${coupon.min_order} required for this coupon`,
        valid: false,
      }, { status: 200 })
    }

    // PER-USER USAGE LIMIT CHECK
    if (coupon.usage_limit_per_user) {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        const { count, error: usageError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUser.id)
          .eq('coupon_code', coupon.code)
          .neq('status', 'cancelled')

        if (!usageError && count !== null && count >= coupon.usage_limit_per_user) {
          return NextResponse.json({
            error: `You have already used this coupon the maximum allowed times (${coupon.usage_limit_per_user}).`,
            valid: false
          }, { status: 200 })
        }
      }
    }

    // Calculate discount based on discount_type
    const discountType = coupon.discount_type as string
    const discountValue = Number(coupon.discount_value) || 0
    let discountAmount = 0

    if (discountType === 'fixed') {
      discountAmount = discountValue
    } else {
      discountAmount = (numSubtotal * discountValue) / 100
    }

    // ── PROD-GRADE DTO: Never expose internal targeting arrays or metadata to public ──
    const publicResponse = {
      valid: true,
      code: coupon.code,
      discountType: discountType,
      discountValue: discountValue,
      discountAmount: discountAmount,
      productId: coupon.product_id,
      minOrder: coupon.min_order
    }

    return NextResponse.json(publicResponse, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to validate coupon', valid: false },
      { status: 500 }
    )
  }
}
