import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '../_auth'
import { toCamel } from '@/lib/supabase/helpers'
import { getStatsCache, setStatsCache } from '@/lib/admin-cache'

// ── GET: Dashboard stats ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { error } = await verifyAdmin(request)
  if (error) return error

  const cached = getStatsCache()
  if (cached) return NextResponse.json(cached)

  try {
    const supabase = await createSupabaseServerClient()

    const [
      revenueResult,
      ordersCountResult,
      productsCountResult,
      usersCountResult,
      couponsCountResult,
      recentOrdersResult,
      lowStockResult,
    ] = await Promise.all([
      // Total revenue from non-cancelled orders
      supabase
        .from('orders')
        .select('total_amount')
        .neq('status', 'cancelled'),

      // Total orders count
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true }),

      // Total products count (excluding soft-deleted)
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null),

      // Total users count (excluding soft-deleted)
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null),

      // Total coupons count
      supabase
        .from('coupons')
        .select('*', { count: 'exact', head: true })
        .then(({ count, error: err }) => {
          if (err?.code === '42P01' || err?.message?.includes('does not exist')) {
            return { count: 0, error: null }
          }
          return { count, error: err }
        }),

      // Recent 10 orders joined with profiles for customer names
      supabase
        .from('orders')
        .select(`
          id, total_amount, status, payment_status, created_at,
          users(email, profiles(full_name))
        `)
        .order('created_at', { ascending: false })
        .limit(10),

      // Low stock products (stock < 10) joined with inventory and categories
      supabase
        .from('inventory')
        .select('stock, products(id, name, slug, images, is_active, categories(id, name, slug))')
        .lt('stock', 10),
    ])

    // Calculate total revenue
    const totalRevenue = (revenueResult.data || []).reduce(
      (sum: number, o: Record<string, unknown>) => sum + (Number(o.total_amount) || 0),
      0
    )

    // Transform recent orders
    const recentOrders = (recentOrdersResult.data || []).map((o: Record<string, unknown>) => {
      const user = o.users as Record<string, unknown> | null
      const profile = user?.profiles as Record<string, unknown> | null
      return {
        id: o.id,
        orderNumber: `SS-${String(o.id).slice(0, 8).toUpperCase()}`,
        total: Number(o.total_amount) || 0,
        status: o.status,
        paymentStatus: o.payment_status,
        customerName: profile?.full_name || null,
        customerEmail: user?.email || null,
        createdAt: o.created_at,
      }
    })

    // Transform low stock products
    const lowStockProducts = (lowStockResult.data || []).map((row: Record<string, unknown>) => {
      const product = row.products as Record<string, unknown> | null
      const category = product?.categories as Record<string, unknown> | null
      const images = Array.isArray(product?.images) ? product.images : []
      return {
        id: product?.id,
        name: product?.name,
        slug: product?.slug,
        stock: Number(row.stock) || 0,
        isActive: product?.is_active ?? false,
        images: JSON.stringify(images),
        category: category
          ? { id: category.id, name: category.name, slug: category.slug }
          : null,
      }
    })

    // Fetch daily sales for the last 30 days to build a more granular chart if needed, 
    // or just fetch 6 months of monthly data. Let's do 6 months of monthly data.
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const { data: salesHistoryData } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .neq('status', 'cancelled')
      .gte('created_at', sixMonthsAgo.toISOString())

    // Group sales by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const salesHistoryMap: Record<string, number> = {}
    
    // Initialize last 6 months with 0
    for (let i = 0; i < 6; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const label = months[d.getMonth()]
      salesHistoryMap[label] = 0
    }

    if (salesHistoryData) {
      salesHistoryData.forEach((order) => {
        const d = new Date(order.created_at)
        const label = months[d.getMonth()]
        if (salesHistoryMap[label] !== undefined) {
          salesHistoryMap[label] += Number(order.total_amount) || 0
        }
      })
    }

    // Convert map to array of { name: month, sales: amount } and reverse to chronological order
    const salesHistory = Object.entries(salesHistoryMap)
      .map(([name, sales]) => ({ name, sales }))
      .reverse()

    const result = {
      totalRevenue,
      totalOrders: ordersCountResult.count || 0,
      totalProducts: productsCountResult.count || 0,
      totalUsers: usersCountResult.count || 0,
      totalCoupons: couponsCountResult.count || 0,
      recentOrders,
      lowStockProducts,
      salesHistory,
    }

    // Update cache
    setStatsCache(result)

    return NextResponse.json(result)
  } catch (e) {
    console.error('Admin stats error:', e)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
