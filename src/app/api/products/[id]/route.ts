import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ── Transform helper ─────────────────────────────────────────────────────────

interface DbProductRow {
  id: string
  name: string
  slug: string
  description: string | null
  base_price: number
  discount_price: number | null
  category_id: string | null
  sku: string | null
  tags: string[] | null
  is_active: boolean
  images: string[] | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  categories: { id: string; name: string; slug: string } | null
  inventory: { stock: number } | null
}

function transformProduct(p: DbProductRow) {
  const images = Array.isArray(p.images) ? p.images : []
  const tags = Array.isArray(p.tags) ? p.tags : []

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description || '',
    shortDesc: (p as any).short_desc || null,
    price: p.discount_price ?? p.base_price,
    comparePrice: p.discount_price ? p.base_price : null,
    images: JSON.stringify(images),
    categoryId: p.category_id,
    brand: (p as any).brand || null,
    stock: p.inventory?.stock ?? 0,
    rating: Number((p as any).rating || 0),
    reviewCount: Number((p as any).review_count || 0),
    featured: (p as any).featured || false,
    active: p.is_active,
    tags: JSON.stringify(tags),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    category: p.categories
      ? { id: p.categories.id, name: p.categories.name, slug: p.categories.slug }
      : null,
  }
}

// ── GET /api/products/[id] ───────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const { data: product, error } = await supabase
      .from('products')
      .select('*, categories(id, name, slug), inventory(stock)')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(transformProduct(product as unknown as DbProductRow))
  } catch (error) {
    console.error('[PRODUCT DETAIL] Unhandled error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}
