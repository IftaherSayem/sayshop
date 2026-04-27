import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // Get all unique brands from products table
    const { data, error } = await supabase
      .from('products')
      .select('brand')
      .is('deleted_at', null)
      .eq('is_active', true)
      .not('brand', 'is', null)

    if (error) {
      console.error('[BRANDS GET] Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 })
    }

    // Extract unique brands and sort them
    const brands = Array.from(new Set(data.map((p: any) => p.brand)))
      .filter(Boolean)
      .sort()

    return NextResponse.json(brands)
  } catch (error) {
    console.error('[BRANDS GET] Unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
