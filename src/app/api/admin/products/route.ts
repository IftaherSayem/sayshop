import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyAdmin } from '../_auth'
import { toCamel } from '@/lib/supabase/helpers'
import { invalidateStatsCache } from '@/lib/admin-cache'
import { revalidatePath } from 'next/cache'

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
    shortDesc: p.short_desc || null,
    brand: p.brand || null,
    featured: p.featured || false,
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
    active: p.is_active ?? true,
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
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`)
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const status = searchParams.get('status') || 'all'
    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'inactive') {
      query = query.eq('is_active', false)
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
    const supabase = await createSupabaseAdminClient()
    const body = await request.json()
    const {
      name,
      slug: providedSlug,
      description,
      price,
      comparePrice,
      basePrice,
      discountPrice,
      images,
      categoryId,
      sku,
      tags,
      active,
      shortDesc,
      brand,
      featured,
    } = body

    const actualPrice = price ?? basePrice
    if (!name || actualPrice === undefined || !categoryId) {
      return NextResponse.json({ error: 'Name, price, and categoryId are required' }, { status: 400 })
    }

    const slug = providedSlug || generateSlug(name)

    const parsedPrice = (price !== undefined && price !== null && price !== "") ? parseFloat(price) : (basePrice !== undefined ? parseFloat(basePrice) : 0)
    const parsedCompare = (comparePrice !== undefined && comparePrice !== null && comparePrice !== "") ? parseFloat(comparePrice) : (discountPrice !== undefined ? parseFloat(discountPrice) : null)

    // Parallelize uniqueness checks for performance (Rule 7)
    const [existingSlug, existingSku] = await Promise.all([
      supabase.from('products').select('id').eq('slug', slug).maybeSingle(),
      sku ? supabase.from('products').select('id').eq('sku', sku).maybeSingle() : Promise.resolve({ data: null })
    ])

    if (existingSlug.data) return NextResponse.json({ error: `The slug "${slug}" is already in use.` }, { status: 409 })
    if (existingSku.data) return NextResponse.json({ error: `The SKU "${sku}" is already in use.` }, { status: 409 })

    const insertData: Record<string, unknown> = {
      name,
      slug,
      description: description || '',
      base_price: parsedCompare !== null ? parsedCompare : parsedPrice,
      discount_price: parsedCompare !== null ? parsedPrice : null,
      category_id: categoryId,
      is_active: active !== false,
      short_desc: shortDesc || null,
      brand: brand || null,
      featured: featured || false,
    }

    function safeParseArray(val: any): string[] {
      let arr: any[] = []
      if (Array.isArray(val)) {
        arr = val
      } else if (val && typeof val === 'string') {
        try {
          const p = JSON.parse(val)
          arr = Array.isArray(p) ? p : [p]
        } catch {
          arr = val.split(',').map(s => s.trim()).filter(Boolean)
        }
      }
      
      // Ensure we only store strings (URLs). If it's an object {url, alt}, pluck url.
      return arr.map(item => {
        if (typeof item === 'object' && item !== null && 'url' in item) return String(item.url)
        return String(item)
      }).filter(s => s && s.trim() !== '')
    }

    if (images) insertData.images = safeParseArray(images)
    if (sku) insertData.sku = sku
    if (tags) insertData.tags = safeParseArray(tags)

    console.log('Final insertData:', JSON.stringify(insertData, null, 2))

    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('[DATABASE_AUDIT] Create product error:', insertError)
      return NextResponse.json({ error: 'Failed to create product. Please contact support.' }, { status: 500 })
    }

    // Create inventory row if it doesn't exist (DB trigger usually handles this)
    const { error: inventoryError } = await supabase
      .from('inventory')
      .upsert({ product_id: product.id, stock: 100 }, { onConflict: 'product_id' })

    if (inventoryError) {
      console.error('Inventory setup error:', inventoryError)
      // We don't rollback if it's just a minor inventory issue since the product is there
    }

    // Fetch the full product with joins
    const { data: fullProduct } = await supabase
      .from('products')
      .select('*, categories(id, name, slug), inventory(stock)')
      .eq('id', product.id)
      .single()

    invalidateStatsCache()
    revalidatePath('/')
    revalidatePath('/admin')
    revalidatePath('/products')
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
    const supabase = await createSupabaseAdminClient()
    const body = await request.json()
    // ── PROD-GRADE: Strict Whitelist (Rule 1 & 5) ──
    const { 
      id, 
      name, slug, description, categoryId, sku, shortDesc, brand, 
      active, featured, images, tags, stock, 
      price, basePrice, comparePrice, discountPrice 
    } = body

    if (!id) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    
    // Scoped data object for internal mapping
    const data = { 
      name, slug, description, categoryId, sku, shortDesc, brand, active, featured, images, tags, stock, 
      price, basePrice, comparePrice, discountPrice 
    } as Record<string, any>

    const updateData: Record<string, unknown> = {}

    // Map camelCase to snake_case
    const fieldMap: Record<string, string> = {
      name: 'name',
      slug: 'slug',
      description: 'description',
      categoryId: 'category_id',
      sku: 'sku',
      shortDesc: 'short_desc',
      brand: 'brand',
    }

    for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
      if (data[camelKey] !== undefined) {
        updateData[snakeKey] = data[camelKey]
      }
    }

    // Correct price mapping logic
    const inputPrice = data.price !== undefined ? data.price : data.basePrice
    const inputCompare = data.comparePrice !== undefined ? data.comparePrice : data.discountPrice

    if (inputPrice !== undefined || inputCompare !== undefined) {
      // We need to fetch current values if one is missing to ensure consistency
      // But usually frontend sends both or we can assume if inputCompare is present it's the base
      const parsedPrice = (inputPrice !== undefined && inputPrice !== null && inputPrice !== "") ? parseFloat(inputPrice) : null
      const parsedCompare = (inputCompare !== undefined && inputCompare !== null && inputCompare !== "") ? parseFloat(inputCompare) : null

      if (parsedCompare !== null) {
        updateData.base_price = parsedCompare
        updateData.discount_price = parsedPrice ?? 0 // If compare is set, price MUST be there
      } else if (parsedPrice !== null) {
        updateData.base_price = parsedPrice
        updateData.discount_price = null
      }
    }

    // Handle boolean field mapping explicitly to be safe
    if (data.active !== undefined) updateData.is_active = !!data.active
    if (data.featured !== undefined) updateData.featured = !!data.featured

    // Handle array fields robustly
    function safeParseArray(val: any): string[] {
      let arr: any[] = []
      if (Array.isArray(val)) {
        arr = val
      } else if (val && typeof val === 'string') {
        try {
          const p = JSON.parse(val)
          arr = Array.isArray(p) ? p : [p]
        } catch {
          arr = val.split(',').map(s => s.trim()).filter(Boolean)
        }
      }
      return arr.map(item => {
        if (typeof item === 'object' && item !== null && 'url' in item) return String(item.url)
        return String(item)
      }).filter(s => s && s.trim() !== '')
    }

    if (data.images !== undefined) {
      updateData.images = safeParseArray(data.images)
    }
    if (data.tags !== undefined) {
      updateData.tags = safeParseArray(data.tags)
    }

    // Handle inventory stock separately
    if (data.stock !== undefined) {
      const stockVal = parseInt(data.stock) || 0
      const { error: invError } = await supabase
        .from('inventory')
        .update({ stock: stockVal })
        .eq('product_id', id)
      
      if (invError) {
        console.error('Update inventory error:', invError)
      }
    }

    // Auto-generate slug if name changed but slug not explicitly provided
    if (data.name && data.slug === undefined) {
      updateData.slug = generateSlug(data.name)
    }

    // ── PROD-GRADE: Parallel Uniqueness Verification (Rule 7) ──
    const [slugCheck, skuCheck] = await Promise.all([
      updateData.slug ? supabase.from('products').select('id').eq('slug', updateData.slug).neq('id', id).maybeSingle() : Promise.resolve({ data: null }),
      updateData.sku ? supabase.from('products').select('id').eq('sku', updateData.sku).neq('id', id).maybeSingle() : Promise.resolve({ data: null })
    ])

    if (slugCheck.data) return NextResponse.json({ error: 'Slug already in use by another product' }, { status: 409 })
    if (skuCheck.data) return NextResponse.json({ error: 'SKU already in use by another product' }, { status: 409 })

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
        return NextResponse.json({ error: updateError.message || 'Failed to update product' }, { status: 500 })
      }
    }

    // Fetch the full product with joins
    const { data: fullProduct } = await supabase
      .from('products')
      .select('*, categories(id, name, slug), inventory(stock)')
      .eq('id', id)
      .single()

    invalidateStatsCache()
    revalidatePath('/')
    revalidatePath('/admin')
    revalidatePath('/products')
    return NextResponse.json(transformProduct(fullProduct as Record<string, unknown>))
  } catch (e: any) {
    console.error('Update product error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to update product' }, { status: 500 })
  }
}

// ── DELETE: Soft-delete product ────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const { error } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseAdminClient()
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

    // Hard delete from database
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete product error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete product', details: deleteError.message }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/admin')
    revalidatePath('/products')
    invalidateStatsCache()
    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (e) {
    console.error('Delete product error:', e)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
