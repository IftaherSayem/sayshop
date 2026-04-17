import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { validateSession } from '@/lib/auth'
import jsPDF from 'jspdf'

// ── Helper: get authenticated user from request ──────────────────

async function getUserFromRequest() {
  const cookieStore = await cookies()
  const token = cookieStore.get('sayshop_session')?.value
  if (!token) return null
  return validateSession(token)
}

// ── Order number helper ──────────────────────────────────────────

function generateOrderNumber(id: string): string {
  return 'SS-' + id.slice(0, 8).toUpperCase()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionUser = await getUserFromRequest()

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // Support lookup by human-readable order number (SS-XXXXXXXX)
    let query = supabase.from('orders').select('*, order_items(*)')
    
    if (id.startsWith('SS-')) {
      const shortId = id.slice(3).toLowerCase()
      // Human order number is the first 8 chars of the ID
      query = query.filter('id::text', 'ilike', `${shortId}%`)
    } else {
      query = query.eq('id', id)
    }

    const { data: order, error } = await query.maybeSingle()

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Authorization check
    if (
      order.user_id !== sessionUser.id &&
      sessionUser.roleName !== 'admin'
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to view this invoice' },
        { status: 403 }
      )
    }

    // Fetch customer info
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', order.user_id)
      .maybeSingle()

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('user_id', order.user_id)
      .maybeSingle()

    // Fetch payment method
    const { data: payment } = await supabase
      .from('payments')
      .select('provider')
      .eq('order_id', order.id)
      .maybeSingle()

    const paymentMethod = payment?.provider || 'credit_card'

    // Parse order items with product names & images
    const rawItems = (order.order_items as Record<string, unknown>[]) || []
    let orderItems: Array<{
      productId: string
      name: string
      price: number
      quantity: number
      image: string
    }> = []

    for (const item of rawItems) {
      const { data: product } = await supabase
        .from('products')
        .select('name, images')
        .eq('id', item.product_id)
        .maybeSingle()

      orderItems.push({
        productId: (item.product_id as string) || '',
        name: product?.name || '',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        image: (product?.images as string[] | null)?.[0] || '',
      })
    }

    // Generate order number from UUID
    const orderNumber = generateOrderNumber(order.id as string)

    // Parse shipping address
    let shippingAddress: {
      firstName: string
      lastName: string
      email?: string
      address: string
      apartment?: string
      city: string
      state: string
      zipCode: string
      country: string
      phone: string
    }

    try {
      const parsed =
        typeof order.shipping_address === 'string'
          ? JSON.parse(order.shipping_address)
          : order.shipping_address
      shippingAddress = {
        firstName: parsed.firstName || '',
        lastName: parsed.lastName || '',
        email: parsed.email || '',
        address: parsed.address || '',
        apartment: parsed.apartment || '',
        city: parsed.city || '',
        state: parsed.state || '',
        zipCode: parsed.zipCode || '',
        country: parsed.country || '',
        phone: parsed.phone || '',
      }
    } catch {
      shippingAddress = {
        firstName: '',
        lastName: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        phone: '',
      }
    }

    // Customer name from profile or shipping address
    const customerName =
      profile?.full_name ||
      (shippingAddress.firstName && shippingAddress.lastName
        ? `${shippingAddress.firstName} ${shippingAddress.lastName}`
        : '')
    const customerEmail = user?.email || ''
    const customerPhone = profile?.phone || ''

    // ── Generate PDF ──────────────────────────────────────────────

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - margin * 2

    const ORANGE = [249, 115, 22] as const
    const DARK_TEXT = [31, 41, 55] as const
    const GRAY_TEXT = [107, 114, 128] as const
    const LIGHT_BG = [245, 245, 245] as const
    const WHITE = [255, 255, 255] as const
    const BORDER_COLOR = [229, 231, 235] as const

    function setTextColor(color: readonly number[]) {
      doc.setTextColor(color[0], color[1], color[2])
    }
    function setFillColor(color: readonly number[]) {
      doc.setFillColor(color[0], color[1], color[2])
    }
    function setDrawColor(color: readonly number[]) {
      doc.setDrawColor(color[0], color[1], color[2])
    }

    function formatPriceValue(price: number): string {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(price)
    }

    function formatDateValue(dateStr: string): string {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    function formatPaymentMethod(method: string): string {
      const labels: Record<string, string> = {
        credit_card: 'Credit Card',
        paypal: 'PayPal',
        apple_pay: 'Apple Pay',
        bkash: 'bKash',
        nagad: 'Nagad',
        rocket: 'Rocket',
        gpay: 'Google Pay',
      }
      return (
        labels[method] ||
        method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      )
    }

    function formatStatus(status: string): string {
      return status
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    }

    // Header Bar
    setFillColor(ORANGE)
    doc.rect(0, 0, pageWidth, 42, 'F')

    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    setTextColor(WHITE)
    doc.text('SAYSHOP', margin, 22)

    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text('INVOICE', pageWidth - margin, 16, { align: 'right' })

    doc.setFontSize(9)
    doc.text(
      `Generated: ${formatDateValue(new Date().toISOString())}`,
      pageWidth - margin,
      24,
      { align: 'right' }
    )

    // Order Details
    let y = 52
    doc.setFontSize(9)
    setTextColor(GRAY_TEXT)
    doc.setFont('helvetica', 'normal')
    doc.text('Order Number', margin, y)
    doc.text('Order Date', margin + 60, y)
    doc.text('Status', margin + 120, y)

    y += 6
    doc.setFontSize(11)
    setTextColor(DARK_TEXT)
    doc.setFont('helvetica', 'bold')
    doc.text(orderNumber, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDateValue(order.created_at), margin + 60, y)

    const statusText = formatStatus(order.status)
    const statusWidth = doc.getTextWidth(statusText) + 10
    const statusX = margin + 120
    setFillColor(ORANGE)
    setTextColor(WHITE)
    doc.roundedRect(statusX, y - 4.2, statusWidth, 7, 1.5, 1.5, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(statusText, statusX + statusWidth / 2, y, {
      align: 'center',
    })

    y += 10
    setDrawColor(BORDER_COLOR)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y)

    // Customer Info & Shipping Address
    y += 10
    setTextColor(GRAY_TEXT)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('BILLING INFORMATION', margin, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    setTextColor(DARK_TEXT)
    doc.setFontSize(10)

    doc.text(
      customerName ||
        (shippingAddress.firstName && shippingAddress.lastName
          ? `${shippingAddress.firstName} ${shippingAddress.lastName}`
          : 'N/A'),
      margin,
      y
    )
    y += 5
    doc.setFontSize(9)
    setTextColor(GRAY_TEXT)
    doc.text(customerEmail, margin, y)
    y += 5
    if (customerPhone) {
      doc.text(customerPhone, margin, y)
    }

    const rightColX = margin + contentWidth / 2 + 10
    let rightY = y - 10

    setTextColor(GRAY_TEXT)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('SHIPPING ADDRESS', rightColX, rightY)
    rightY += 5

    doc.setFont('helvetica', 'normal')
    setTextColor(DARK_TEXT)
    doc.setFontSize(10)
    doc.text(
      shippingAddress.firstName && shippingAddress.lastName
        ? `${shippingAddress.firstName} ${shippingAddress.lastName}`
        : customerName,
      rightColX,
      rightY
    )
    rightY += 5

    doc.setFontSize(9)
    setTextColor(GRAY_TEXT)

    const addressParts = [
      shippingAddress.address,
      shippingAddress.apartment,
      [
        shippingAddress.city,
        shippingAddress.state,
        shippingAddress.zipCode,
      ]
        .filter(Boolean)
        .join(', '),
      shippingAddress.country,
    ].filter(Boolean)

    for (const part of addressParts) {
      if (part) {
        doc.text(part, rightColX, rightY)
        rightY += 4.5
      }
    }

    y = Math.max(y, rightY) + 6
    setDrawColor(BORDER_COLOR)
    doc.line(margin, y, pageWidth - margin, y)

    // Items Table
    y += 8
    setTextColor(GRAY_TEXT)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('ORDER DETAILS', margin, y)
    y += 6

    setFillColor(LIGHT_BG)
    doc.rect(margin, y - 3.5, contentWidth, 8, 'F')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    setTextColor(DARK_TEXT)

    const colX = {
      name: margin + 4,
      qty: margin + contentWidth - 70,
      price: margin + contentWidth - 45,
      total: margin + contentWidth - 5,
    }

    doc.text('Product', colX.name, y)
    doc.text('Qty', colX.qty, y, { align: 'center' })
    doc.text('Price', colX.price, y, { align: 'right' })
    doc.text('Total', colX.total, y, { align: 'right' })

    y += 8

    setTextColor(DARK_TEXT)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)

    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i]
      const itemTotal = item.price * item.quantity

      if (i % 2 === 1) {
        setFillColor([250, 250, 250])
        doc.rect(margin, y - 3.5, contentWidth, 8, 'F')
      }

      setTextColor(DARK_TEXT)
      let itemName = item.name
      const maxNameWidth = colX.qty - colX.name - 10
      while (
        doc.getTextWidth(itemName) > maxNameWidth &&
        itemName.length > 10
      ) {
        itemName = itemName.slice(0, -4) + '...'
      }
      doc.text(itemName, colX.name, y)

      doc.setFontSize(8)
      setTextColor(GRAY_TEXT)
      doc.text(String(item.quantity), colX.qty, y, { align: 'center' })
      doc.text(formatPriceValue(item.price), colX.price, y, {
        align: 'right',
      })

      setTextColor(DARK_TEXT)
      doc.setFont('helvetica', 'bold')
      doc.text(formatPriceValue(itemTotal), colX.total, y, {
        align: 'right',
      })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      y += 8
    }

    setDrawColor(BORDER_COLOR)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y)

    // Parse details from notes (like coupons)
    let couponCodeRow = ''
    let couponDiscountAmount = 0
    let cleanNotes = (order.notes as string) || ''

    if (cleanNotes.includes('[COUPON:')) {
      const match = cleanNotes.match(/\[COUPON:([^,]+),DISCOUNT:([^\]]+)\]/)
      if (match) {
        couponCodeRow = match[1]
        couponDiscountAmount = parseFloat(match[2]) || 0
        cleanNotes = cleanNotes.replace(/\[COUPON:[^\]]+\]/, '').replace(/ \| $/, '').trim()
        if (cleanNotes.startsWith('| ')) cleanNotes = cleanNotes.slice(2)
      }
    }

    // Totals — use total_amount for final total
    y += 10
    const totalsX = margin + contentWidth - 5
    const labelsX = margin + contentWidth - 85

    setTextColor(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    doc.text('Subtotal:', labelsX, y)
    doc.text(formatPriceValue(Number(order.subtotal) || 0), totalsX, y, {
      align: 'right',
    })
    y += 7

    if (couponDiscountAmount > 0) {
      setTextColor(ORANGE)
      doc.setFont('helvetica', 'bold')
      doc.text(`Discount (${couponCodeRow}):`, labelsX, y)
      doc.text(`-${formatPriceValue(couponDiscountAmount)}`, totalsX, y, {
        align: 'right',
      })
      y += 7
      setTextColor(GRAY_TEXT)
      doc.setFont('helvetica', 'normal')
    }

    doc.text('Shipping:', labelsX, y)
    if (Number(order.shipping) === 0) {
      setTextColor([22, 163, 74])
      doc.setFont('helvetica', 'bold')
      doc.text('Free', totalsX, y, { align: 'right' })
    } else {
      doc.text(formatPriceValue(Number(order.shipping) || 0), totalsX, y, {
        align: 'right',
      })
    }
    y += 7

    setTextColor(GRAY_TEXT)
    doc.setFont('helvetica', 'normal')
    doc.text('Tax:', labelsX, y)
    doc.text(formatPriceValue(Number(order.tax) || 0), totalsX, y, {
      align: 'right',
    })
    y += 7

    setDrawColor(DARK_TEXT)
    doc.setLineWidth(0.5)
    doc.line(labelsX, y - 1, totalsX, y - 1)

    y += 5
    setTextColor(DARK_TEXT)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Total:', labelsX, y)
    setTextColor(ORANGE)
    doc.text(formatPriceValue(Number(order.total_amount) || 0), totalsX, y, {
      align: 'right',
    })

    // Payment Method
    y += 15
    setDrawColor(BORDER_COLOR)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y)

    y += 8
    setTextColor(GRAY_TEXT)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('PAYMENT METHOD', margin, y)

    y += 5
    setTextColor(DARK_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(formatPaymentMethod(paymentMethod), margin, y)

    if (cleanNotes && cleanNotes !== 'null') {
      y += 9
      setTextColor(GRAY_TEXT)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('ORDER NOTES', margin, y)

      y += 5
      setTextColor(DARK_TEXT)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')

      const notesLines = doc.splitTextToSize(
        cleanNotes,
        contentWidth
      )
      for (const line of notesLines) {
        doc.text(line, margin, y)
        y += 5
      }
    }

    // Footer
    const footerY = pageHeight - 30
    setFillColor(ORANGE)
    doc.rect(0, footerY - 5, pageWidth, 1.5, 'F')

    setTextColor(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(
      'Thank you for your business!',
      pageWidth / 2,
      footerY + 3,
      { align: 'center' }
    )
    doc.setFontSize(7)
    doc.text(
      'SayShop | www.sayshop.com | support@sayshop.com',
      pageWidth / 2,
      footerY + 9,
      { align: 'center' }
    )

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${orderNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}
