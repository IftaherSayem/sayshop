import { NextRequest, NextResponse } from 'next/server'

// ── GET /api/products/[id]/reviews ───────────────────────────────────────────
// Reviews table doesn't exist in the new schema. Return empty array.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))

    return NextResponse.json({
      reviews: [],
      total: 0,
      page,
      totalPages: 0,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    })
  } catch (error) {
    console.error('[REVIEWS GET] Unhandled error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// ── POST /api/products/[id]/reviews ──────────────────────────────────────────
// Reviews feature coming soon — return a placeholder response.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { rating } = body

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 1 and 5' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Reviews feature coming soon' },
      { status: 501 }
    )
  } catch (error) {
    console.error('[REVIEWS POST] Unhandled error:', error)
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    )
  }
}
