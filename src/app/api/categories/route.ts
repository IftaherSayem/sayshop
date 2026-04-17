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
  description: string | null
  image: string | null
  featured: boolean
  sortOrder: number
  productCount: number
  parentId: string | null
  children?: TransformedCategory[]
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    // Parallelize category fetch and product counting
    const [categoriesRes, countsRes] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase
        .from('products')
        .select('category_id')
        .eq('is_active', true)
        .is('deleted_at', null)
    ])

    const { data: categories, error: catError } = categoriesRes
    const { data: activeProducts, error: prodError } = countsRes

    if (catError) {
      console.error('[CATEGORIES] Supabase error:', catError)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    // Build count map efficiently
    const countMap: Record<string, number> = {}
    if (activeProducts) {
      for (const p of activeProducts) {
        const catId = (p as any).category_id
        if (catId) countMap[catId] = (countMap[catId] || 0) + 1
      }
    }

    // Transform categories
    const transformed = (categories || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      productCount: countMap[cat.id] || 0,
      parentId: cat.parent_id,
      description: null,
      image: null,
      featured: false,
      sortOrder: 0,
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
