import { NextResponse } from 'next/server'

// Mock Q&A data per product (kept as-is — no database table for Q&A)
const MOCK_QA_DATA: Record<string, Array<{
  id: string
  question: string
  answer: string
  askedBy: string
  answeredBy: string
  helpful: number
  createdAt: string
}>> = {
  default: [
    {
      id: '1',
      question: 'Is this product compatible with iPhone 15?',
      answer: 'Yes, this product is fully compatible with iPhone 15 and later models.',
      askedBy: 'Sarah M.',
      answeredBy: 'Say Shop Team',
      helpful: 12,
      createdAt: '2025-01-15T10:00:00Z',
    },
    {
      id: '2',
      question: "What's the warranty period?",
      answer: 'This product comes with a 1-year manufacturer warranty.',
      askedBy: 'John D.',
      answeredBy: 'Say Shop Team',
      helpful: 8,
      createdAt: '2025-01-10T10:00:00Z',
    },
    {
      id: '3',
      question: 'Does it come with a charging cable?',
      answer: 'Yes, a USB-C charging cable is included in the box.',
      askedBy: 'Emily R.',
      answeredBy: 'Say Shop Team',
      helpful: 5,
      createdAt: '2025-01-08T10:00:00Z',
    },
    {
      id: '4',
      question: 'Can I use this while it is charging?',
      answer: 'Yes, you can use the product while it is charging without any issues.',
      askedBy: 'Michael T.',
      answeredBy: 'Say Shop Team',
      helpful: 3,
      createdAt: '2025-01-05T10:00:00Z',
    },
  ],
}

// ── GET /api/products/[id]/qa ────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const qaList = MOCK_QA_DATA[id] || MOCK_QA_DATA.default

  return NextResponse.json({
    qa: qaList.map((item, index) => ({
      ...item,
      id: `${id}-qa-${index + 1}`,
    })),
  })
}
