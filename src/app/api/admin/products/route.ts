import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '../_auth'
import { toCamel } from '@/lib/supabase/helpers'

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function transformProduct(p: Record<string, unknown>) {
  const basePrice = Number(p.base_price) || 0
  const discountPrice = p.discount_price != null ? Number(p.discount_price) : null
  const images = Array.isArray(p.images) ? p.images : []
  const tags = Array.isArray(p.tags) ? p.tags : []

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: discountPrice ?? basePrice,
    comparePrice: discountPrice ? basePrice : null,
    basePrice,
    discountPrice,
    sku: p.sku,
    images: JSON.stringify(images),
    tags: JSON.stringify(tags),
    categoryId: p.category_id,
    category: p.categories
      ? { id: (p.categories as Record<string, unknown>).id, name: (p.categories as Record<string, unknown>).name, slug: (p.categories as Record<string, unknown>).slug }
      : null,
    stock: p.inventory ? (p.inventory as Record<string, unknown>).stock : 0,
    isActive: p.is_active ?? true,
    searchVector: p.search_vector,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    deletedAt: p.deleted_at,
  }
}

// ── GET: List all products (including inactive/deleted) ────────────────────────

export async function GET(request: NextRequest) {
  const { error } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId') || ''

    let query = supabase
      .from('products')
      .select('*, categories(id, name, slug), inventory(stock)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`)
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: products, count, error: queryError } = await query

    if (queryError) {
      console.error('Admin products GET error:', queryError)
      return NextResponse.json({ error: 'Failed to fetch products', details: queryError.message }, { status: 500 })
    }

    const transformed = (products || []).map((p: Record<string, unknown>) => transformProduct(p))

    return NextResponse.json({
      products: transformed,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

// ── POST: Create product ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { error, user } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()
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

    if (!name || basePrice === undefined || !categoryId) {
      return NextResponse.json({ error: 'Name, basePrice, and categoryId are required' }, { status: 400 })
    }

    const slug = providedSlug || generateSlug(name)

    // Check slug uniqueness
    const { data: existingSlug } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existingSlug) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    }

    // Check SKU uniqueness if provided
    if (sku) {
      const { data: existingSku } = await supabase
        .from('products')
        .select('id')
        .eq('sku', sku)
        .maybeSingle()

      if (existingSku) {
        return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })
      }
    }

    const insertData: Record<string, unknown> = {
      name,
      slug,
      description: description || '',
      base_price: parseFloat(basePrice),
      category_id: categoryId,
      is_active: isActive !== false,
    }

    if (discountPrice != null) insertData.discount_price = parseFloat(discountPrice)
    if (images) insertData.images = Array.isArray(images) ? images : JSON.parse(images)
    if (sku) insertData.sku = sku
    if (tags) insertData.tags = Array.isArray(tags) ? tags : JSON.parse(tags)

    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('Create product error:', insertError)
      return NextResponse.json({ error: 'Failed to create product', details: insertError.message }, { status: 500 })
    }

    // Create inventory row with default stock of 100
    const { error: inventoryError } = await supabase
      .from('inventory')
      .insert({ product_id: product.id, stock: 100 })

    if (inventoryError) {
      console.error('Create inventory error:', inventoryError)
      // Rollback: delete the product we just created
      await supabase.from('products').delete().eq('id', product.id)
      return NextResponse.json({ error: 'Failed to create product inventory' }, { status: 500 })
    }

    // Fetch the full product with joins
    const { data: fullProduct } = await supabase
      .from('products')
      .select('*, categories(id, name, slug), inventory(stock)')
      .eq('id', product.id)
      .single()

    return NextResponse.json(transformProduct(fullProduct as Record<string, unknown>), { status: 201 })
  } catch (e) {
    console.error('Create product error:', e)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

// ── PUT: Update product ────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const { error } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    // Map camelCase to snake_case
    const fieldMap: Record<string, string> = {
      name: 'name',
      slug: 'slug',
      description: 'description',
      basePrice: 'base_price',
      discountPrice: 'discount_price',
      categoryId: 'category_id',
      sku: 'sku',
      isActive: 'is_active',
    }

    for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
      if (data[camelKey] !== undefined) {
        let value = data[camelKey]
        if (['basePrice', 'discountPrice'].includes(camelKey)) {
          value = value !== null ? parseFloat(value) : null
        }
        updateData[snakeKey] = value
      }
    }

    // Handle array fields
    if (data.images !== undefined) {
      updateData.images = typeof data.images === 'string' ? JSON.parse(data.images) : data.images
    }
    if (data.tags !== undefined) {
      updateData.tags = typeof data.tags === 'string' ? JSON.parse(data.tags) : data.tags
    }

    // Handle inventory stock separately
    if (data.stock !== undefined) {
      const stockVal = parseInt(data.stock) || 0
      await supabase
        .from('inventory')
        .update({ stock: stockVal })
        .eq('product_id', id)
    }

    // Auto-generate slug if name changed but slug not explicitly provided
    if (data.name && data.slug === undefined) {
      updateData.slug = generateSlug(data.name)
    }

    // Check slug uniqueness if slug is being updated
    if (updateData.slug) {
      const { data: existingSlug } = await supabase
        .from('products')
        .select('id')
        .eq('slug', updateData.slug)
        .neq('id', id)
        .maybeSingle()

      if (existingSlug) {
        return NextResponse.json({ error: 'Slug already in use by another product' }, { status: 409 })
      }
    }

    // Check SKU uniqueness if SKU is being updated
    if (updateData.sku) {
      const { data: existingSku } = await supabase
        .from('products')
        .select('id')
        .eq('sku', updateData.sku)
        .neq('id', id)
        .maybeSingle()

      if (existingSku) {
        return NextResponse.json({ error: 'SKU already in use by another product' }, { status: 409 })
      }
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString()

      const { data: product, error: updateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Update product error:', updateError)
        return NextResponse.json({ error: 'Failed to update product', details: updateError.message }, { status: 500 })
      }
    }

    // Fetch the full product with joins
    const { data: fullProduct } = await supabase
      .from('products')
      .select('*, categories(id, name, slug), inventory(stock)')
      .eq('id', id)
      .single()

    return NextResponse.json(transformProduct(fullProduct as Record<string, unknown>))
  } catch (e) {
    console.error('Update product error:', e)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

// ── DELETE: Soft-delete product ────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const { error } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Check for existing order items referencing this product
    const { count: orderItemsCount } = await supabase
      .from('order_items')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', id)

    if (orderItemsCount && orderItemsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product with existing orders. Deactivate it instead.' },
        { status: 400 }
      )
    }

    // Soft delete by setting deleted_at
    const { error: deleteError } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (deleteError) {
      console.error('Delete product error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete product', details: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (e) {
    console.error('Delete product error:', e)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
