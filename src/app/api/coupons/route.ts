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
    const numSubtotal =
      subtotal !== undefined && subtotal !== null
        ? parseFloat(subtotal)
        : 0

    if (isNaN(numSubtotal)) {
      return NextResponse.json(
        { error: 'Invalid subtotal value', valid: false },
        { status: 200 }
      )
    }

    if (coupon.min_order && numSubtotal < coupon.min_order) {
      return NextResponse.json(
        {
          error: `Minimum order of $${coupon.min_order} required for this coupon`,
          valid: false,
        },
        { status: 200 }
      )
    }

    // Calculate discount based on discount_type
    const discountType = coupon.discount_type as string
    const discountValue = Number(coupon.discount_value) || 0
    let discount = 0

    if (discountType === 'fixed') {
      discount = discountValue
    } else {
      // percent
      discount = (numSubtotal * discountValue) / 100
    }

    // Build success message
    let message = ''
    if (discountType === 'percent') {
      message = `Coupon applied! You get ${discountValue}% off (${discount.toFixed(2)}).`
    } else {
      message = `Coupon applied! You get $${discountValue.toFixed(2)} off.`
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discount,
      discountType,
      message,
    })
  } catch (error) {
    console.error('Error validating coupon:', error)
    return NextResponse.json(
      { error: 'Failed to validate coupon', valid: false },
      { status: 500 }
    )
  }
}
