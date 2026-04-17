import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyAdmin } from '../_auth'

// ── GET: List categories ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { error } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseServerClient()
    const { data: categories, error: queryError } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch categories', details: queryError.message }, { status: 500 })
    }

    return NextResponse.json(categories)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

// ── POST: Create category ──────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const { error } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseAdminClient()
    const body = await request.json()
    const { name, slug, parentId } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    const { data, error: insertError } = await supabase
      .from('categories')
      .insert([{ 
        name, 
        slug, 
        parent_id: parentId || null 
      }])
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create category', details: insertError.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}

// ── PUT: Update category ───────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const { error } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseAdminClient()
    const body = await request.json()
    const { id, name, slug, parentId } = body

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const { data, error: updateError } = await supabase
      .from('categories')
      .update({ 
        name, 
        slug, 
        parent_id: parentId || null 
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update category', details: updateError.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

// ── DELETE: Delete category ────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const { error } = await verifyAdmin(request)
  if (error) return error

  try {
    const supabase = await createSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    // Check if category has products
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)

    if (count && count > 0) {
      return NextResponse.json({ error: 'Cannot delete category with associated products' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete category', details: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
