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
    shortDesc: null,
    price: p.discount_price ?? p.base_price,
    comparePrice: p.discount_price ? p.base_price : null,
    images: JSON.stringify(images),
    categoryId: p.category_id,
    brand: null,
    stock: p.inventory?.stock ?? 0,
    rating: 0,
    reviewCount: 0,
    featured: false,
    active: p.is_active,
    tags: JSON.stringify(tags),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    category: p.categories
      ? { id: p.categories.id, name: p.categories.name, slug: p.categories.slug }
      : null,
  }
}

// ── GET /api/products/slug/[slug] ────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // Try slug lookup first
    const { data: product, error } = await supabase
      .from('products')
      .select('*, categories(id, name, slug), inventory(stock)')
      .eq('slug', slug)
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
    console.error('[PRODUCT SLUG] Unhandled error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}
