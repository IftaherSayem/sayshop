import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const supabase = await createSupabaseServerClient()

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: reviews, count, error } = await supabase
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    // Transform keys to camelCase for frontend
    const transformedReviews = (reviews || []).map(r => ({
      id: r.id,
      productId: r.product_id,
      userName: r.user_name || 'Anonymous',
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      verified: r.verified,
      createdAt: r.created_at
    }))

    // Calculate rating breakdown
    const { data: allRatings } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', id)

    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    allRatings?.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) breakdown[r.rating as keyof typeof breakdown]++
    })

    return NextResponse.json({
      reviews: transformedReviews,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
      ratingBreakdown: breakdown,
    })
  } catch (error) {
    console.error('[REVIEWS GET] error:', error)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userName, rating, title, comment } = body
    const supabase = await createSupabaseServerClient()

    if (!rating || rating < 1 || rating > 5 || !comment || !userName) {
      return NextResponse.json({ error: 'Missing rating, comment or name' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        product_id: id,
        user_name: userName,
        rating,
        title: title || '',
        comment,
        verified: false
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('[REVIEWS POST] error:', error)
    return NextResponse.json({ 
      error: 'Failed to submit review', 
      details: error.message || String(error) 
    }, { status: 500 })
  }
}
