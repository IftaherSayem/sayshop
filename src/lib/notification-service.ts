import { createSupabaseAdminClient } from '@/lib/supabase/server'

export type NotificationType = 'order_update' | 'new_order' | 'low_stock' | 'payment_status' | 'system'

/**
 * Creates and sends a notification to a specific user.
 * This function uses the AdminClient to bypass RLS for system insertions.
 */
export async function sendNotification({
  recipientId,
  type,
  title,
  message,
  link
}: {
  recipientId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}) {
  try {
    const supabase = await createSupabaseAdminClient()

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        type,
        title,
        message,
        link,
        read: false
      })
      .select()
      .single()

    if (error) {
      console.error('[NOTIFICATION_SERVICE] Error inserting notification:', error.message)
      return null
    }

    return data
  } catch (err) {
    console.error('[NOTIFICATION_SERVICE] Critical failure:', err)
    return null
  }
}

/**
 * Notifies all admins and managers of a significant event.
 */
export async function notifyStaff({
  type,
  title,
  message,
  link
}: {
  type: NotificationType
  title: string
  message: string
  link?: string
}) {
  try {
    const supabase = await createSupabaseAdminClient()

    // 1. Fetch admin/manager role IDs first
    const { data: roles } = await supabase
      .from('roles')
      .select('id')
      .in('name', ['admin', 'manager'])

    if (!roles || roles.length === 0) return

    const roleIds = roles.map(r => r.id)

    // 2. Fetch users with those roles
    const { data: staff, error: staffError } = await supabase
      .from('users')
      .select('id')
      .in('role_id', roleIds)

    if (staffError || !staff || staff.length === 0) return

    // 3. Batch insert notifications for all staff
    const notifications = staff.map(s => ({
      user_id: s.id,
      type,
      title,
      message,
      link: link || null,
      read: false
    }))

    await supabase.from('notifications').insert(notifications)
  } catch (err) {
    console.warn('[NOTIFICATION_SERVICE] Staff notification failed:', err)
  }
}
