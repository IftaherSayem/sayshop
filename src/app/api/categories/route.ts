import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ── GET /api/categories ─────────────────────────────────────────────────────
// List all categories with product count (active, non-deleted products).
// Supports tree structure via parent_id.

interface DbCategoryRow {
  id: string
  name: string
  slug: string
  parent_id: string | null
  created_at: string
}

interface TransformedCategory {
  id: string
  name: string
  slug: string
  description: null
  image: null
  featured: false
  sortOrder: number
  productCount: number
  parentId: string | null
  children?: TransformedCategory[]
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    // Fetch all categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')

    if (catError) {
      console.error('[CATEGORIES] Supabase error:', JSON.stringify(catError))
      return NextResponse.json(
        {
          error: 'Failed to fetch categories',
          details: catError.message,
          code: catError.code,
        },
        { status: 500 }
      )
    }

    // Count active, non-deleted products per category
    const { data: activeProducts, error: prodError } = await supabase
      .from('products')
      .select('category_id')
      .eq('is_active', true)
      .is('deleted_at', null)

    if (prodError) {
      console.error('[CATEGORIES] Product count error:', JSON.stringify(prodError))
    }

    // Build count map
    const countMap: Record<string, number> = {}
    for (const p of activeProducts || []) {
      const catId = (p as Record<string, unknown>).category_id as string
      if (catId) {
        countMap[catId] = (countMap[catId] || 0) + 1
      }
    }

    // Transform categories to frontend format
    const rows = (categories || []) as unknown as DbCategoryRow[]
    const transformed: TransformedCategory[] = rows.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: null,
      image: null,
      featured: false,
      sortOrder: 0,
      productCount: countMap[cat.id] || 0,
      parentId: cat.parent_id,
    }))

    // Build tree structure (optional) — nest children under parents
    const categoryMap = new Map<string, TransformedCategory>()
    const rootCategories: TransformedCategory[] = []

    for (const cat of transformed) {
      categoryMap.set(cat.id, { ...cat, children: [] })
    }

    for (const cat of categoryMap.values()) {
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId)!.children!.push(cat)
      } else {
        rootCategories.push(cat)
      }
    }

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('[CATEGORIES] Unhandled error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
