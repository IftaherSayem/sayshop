import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toCamel } from '@/lib/supabase/helpers'
import { validateSession } from '@/lib/auth'
import type { SessionUser } from '@/lib/auth'

// ── Helper: get authenticated user from request ──────────────────

async function getUserFromRequest(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('sayshop_session')?.value
  if (!token) return null
  return validateSession(token)
}

const MAX_ITEMS = 10
const FALLBACK_IMAGE = '/images/products/headphones.png'

// ── GET /api/recently-viewed ──────────────────────────────────────

export async function GET() {
  try {
    const sessionUser = await getUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()

    // Fetch recently viewed items joined with products, ordered by viewed_at DESC, limit 10
    const { data, error } = await supabase
      .from('recently_viewed')
      .select('product_id, viewed_at, products(name, base_price, discount_price, images)')
      .eq('user_id', sessionUser.id)
      .order('viewed_at', { ascending: false })
      .limit(MAX_ITEMS)

    if (error) {
      console.error('[recently-viewed] GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch recently viewed' }, { status: 500 })
    }

    // Transform to frontend format
    const items = (data || []).map((row) => {
      const product = row.products as Record<string, unknown> | null
      const rawImages = product?.images as string[] | string | null
      let parsedImages: Array<{ url: string }> = []

      if (rawImages) {
        try {
          const parsed = typeof rawImages === 'string' ? JSON.parse(rawImages) : rawImages
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.url) {
            parsedImages = parsed
          }
        } catch {
          // ignore parse errors
        }
      }

      const price = Number(product?.discount_price) || Number(product?.base_price) || 0
      const comparePrice = product?.discount_price ? null : (Number(product?.base_price) || null)
      // If there's a discount_price, compare_price should be the base_price
      const effectiveComparePrice = product?.discount_price
        ? (Number(product?.base_price) || null)
        : null

      return {
        productId: row.product_id as string,
        name: (product?.name as string) || 'Unknown Product',
        price,
        comparePrice: effectiveComparePrice,
        image: parsedImages.length > 0 ? parsedImages[0].url : FALLBACK_IMAGE,
        viewedAt: row.viewed_at as string,
      }
    })

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[recently-viewed] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch recently viewed' }, { status: 500 })
  }
}

// ── POST /api/recently-viewed ─────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { productId } = body

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Check if the product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .maybeSingle()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if already in recently viewed for this user
    const { data: existing } = await supabase
      .from('recently_viewed')
      .select('id')
      .eq('user_id', sessionUser.id)
      .eq('product_id', productId)
      .maybeSingle()

    if (existing) {
      // Update viewed_at to now (upsert behavior)
      const { error: updateError } = await supabase
        .from('recently_viewed')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', existing.id)

      if (updateError) {
        console.error('[recently-viewed] POST update error:', updateError)
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('recently_viewed')
        .insert({
          user_id: sessionUser.id,
          product_id: productId,
        })

      if (insertError) {
        console.error('[recently-viewed] POST insert error:', insertError)
        return NextResponse.json({ error: 'Failed to add to recently viewed' }, { status: 500 })
      }

      // If user has more than MAX_ITEMS, delete the oldest one
      const { count } = await supabase
        .from('recently_viewed')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', sessionUser.id)

      if (count && count > MAX_ITEMS) {
        // Find the oldest item (not the one we just inserted) and delete it
        const { data: oldest } = await supabase
          .from('recently_viewed')
          .select('id')
          .eq('user_id', sessionUser.id)
          .order('viewed_at', { ascending: true })
          .limit(1)
          .single()

        if (oldest) {
          await supabase.from('recently_viewed').delete().eq('id', oldest.id)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[recently-viewed] POST error:', err)
    return NextResponse.json({ error: 'Failed to add to recently viewed' }, { status: 500 })
  }
}

// ── DELETE /api/recently-viewed ───────────────────────────────────

export async function DELETE() {
  try {
    const sessionUser = await getUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()

    const { error } = await supabase
      .from('recently_viewed')
      .delete()
      .eq('user_id', sessionUser.id)

    if (error) {
      console.error('[recently-viewed] DELETE error:', error)
      return NextResponse.json({ error: 'Failed to clear recently viewed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[recently-viewed] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to clear recently viewed' }, { status: 500 })
  }
}
