import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ── Transform helpers ────────────────────────────────────────────────────────

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

/**
 * Transform a database product row into the frontend-compatible format.
 */
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

/**
 * Sanitize search string to prevent injection in full-text search.
 */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[&|!()*:<>"'+\\]/g, ' ').trim()
}

// ── GET /api/products ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const supabase = await createSupabaseServerClient()

    // ── Fetch specific products by ID: ?ids=id1,id2,id3 ──
    const idsParam = searchParams.get('ids')
    if (idsParam) {
      const ids = idsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
      if (ids.length === 0) {
        return NextResponse.json({ products: [], total: 0, page: 1, totalPages: 0 })
      }

      const { data, error } = await supabase
        .from('products')
        .select('*, categories(id, name, slug), inventory(stock)')
        .in('id', ids)
        .is('deleted_at', null)

      if (error) {
        console.error('[PRODUCTS /ids] Supabase error:', JSON.stringify(error))
      }

      const products = (data || []) as unknown as DbProductRow[]
      const transformed = products.map(transformProduct)

      return NextResponse.json({
        products: transformed,
        total: transformed.length,
        page: 1,
        totalPages: 1,
      })
    }

    // ── Standard listing with search, filter, sort, pagination ──
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const sort = searchParams.get('sort') || 'newest'
    const minPrice = searchParams.get('minPrice')
      ? parseFloat(searchParams.get('minPrice')!)
      : null
    const maxPrice = searchParams.get('maxPrice')
      ? parseFloat(searchParams.get('maxPrice')!)
      : null
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '12')))

    // Build base query
    let query = supabase
      .from('products')
      .select('*, categories(id, name, slug), inventory(stock)', { count: 'exact' })
      .eq('is_active', true)
      .is('deleted_at', null)

    // Search: try full-text search first, fallback to ILIKE
    if (search) {
      const sanitized = sanitizeSearchTerm(search)
      try {
        query = query.textSearch('search_vector', sanitized, {
          type: 'plain',
          config: 'english',
        })
      } catch {
        // Full-text search failed, fallback to ILIKE on name
        query = supabase
          .from('products')
          .select('*, categories(id, name, slug), inventory(stock)', { count: 'exact' })
          .eq('is_active', true)
          .is('deleted_at', null)
          .ilike('name', `%${search}%`)
      }
    }

    // Category filter
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    // Price filter on base_price
    if (minPrice !== null) {
      query = query.gte('base_price', minPrice)
    }
    if (maxPrice !== null) {
      query = query.lte('base_price', maxPrice)
    }

    // Sort
    switch (sort) {
      case 'price_asc':
        query = query.order('base_price', { ascending: true })
        break
      case 'price_desc':
        query = query.order('base_price', { ascending: false })
        break
      case 'popular':
        query = query.order('created_at', { ascending: false })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('[PRODUCTS GET] Supabase error:', JSON.stringify(error))
      return NextResponse.json(
        {
          error: 'Failed to fetch products',
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      )
    }

    const products = (data || []) as unknown as DbProductRow[]
    const transformed = products.map(transformProduct)
    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      products: transformed,
      total,
      page,
      totalPages,
    })
  } catch (error) {
    console.error('[PRODUCTS GET] Unhandled error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// ── POST /api/products ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createSupabaseServerClient()

    const {
      name,
      slug: providedSlug,
      description,
      basePrice,
      discountPrice,
      images,
      categoryId,
      sku,
      tags,
      isActive,
    } = body

    // Validate required fields
    if (!name || basePrice === undefined || !categoryId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, basePrice, categoryId' },
        { status: 400 }
      )
    }

    if (typeof basePrice !== 'number' || basePrice < 0) {
      return NextResponse.json(
        { error: 'basePrice must be a positive number' },
        { status: 400 }
      )
    }

    if (discountPrice !== undefined && discountPrice !== null && typeof discountPrice !== 'number') {
      return NextResponse.json(
        { error: 'discountPrice must be a number or null' },
        { status: 400 }
      )
    }

    // Auto-generate slug from name if not provided
    const slug = providedSlug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    // Check slug uniqueness
    const { data: existingSlug } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single()

    if (existingSlug) {
      return NextResponse.json(
        { error: 'A product with this slug already exists' },
        { status: 409 }
      )
    }

    // Verify category exists
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .single()

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Build insert data with snake_case column names
    const insertData: Record<string, unknown> = {
      name,
      slug,
      description: description || null,
      base_price: parseFloat(basePrice),
      discount_price: discountPrice ? parseFloat(discountPrice) : null,
      category_id: categoryId,
      is_active: isActive !== undefined ? isActive : true,
      images: Array.isArray(images) ? images : [],
      tags: Array.isArray(tags) ? tags : [],
    }

    if (sku) insertData.sku = sku

    // Insert product
    const { data: product, error } = await supabase
      .from('products')
      .insert(insertData)
      .select('*, categories(id, name, slug), inventory(stock)')
      .single()

    if (error) {
      console.error('[PRODUCTS POST] Supabase error:', JSON.stringify(error))
      return NextResponse.json(
        { error: 'Failed to create product', details: error.message },
        { status: 500 }
      )
    }

    const transformed = transformProduct(product as unknown as DbProductRow)

    return NextResponse.json(transformed, { status: 201 })
  } catch (error) {
    console.error('[PRODUCTS POST] Unhandled error:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
