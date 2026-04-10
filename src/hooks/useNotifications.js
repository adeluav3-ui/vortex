/**
 * useNotifications
 *
 * Manages in-app notifications with realtime updates.
 * Creates notifications client-side at the point of action.
 *
 * Usage:
 *   const { notifications, unreadCount, markRead, markAllRead, notify } = useNotifications()
 *
 *   // Create a notification:
 *   await notify({
 *     title: 'New Order',
 *     body: 'Amaka placed an order for ₦15,000',
 *     type: 'order.new',
 *     link: '/orders/abc123',
 *   })
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useNotifications() {
    const { profile } = useAuth()
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)

    const unreadCount = notifications.filter(n => !n.read).length

    const fetchNotifications = useCallback(async () => {
        if (!profile?.id) return
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(30)
        setNotifications(data ?? [])
        setLoading(false)
    }, [profile?.id])

    useEffect(() => {
        if (!profile?.id) return
        fetchNotifications()

        const channel = supabase
            .channel(`notifications-${profile.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${profile.id}`,
            }, () => fetchNotifications())
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [profile?.id, fetchNotifications])

    async function notify({ title, body, type, link = null }) {
        if (!profile?.id || !profile?.business_id) return
        await supabase.from('notifications').insert({
            business_id: profile.business_id,
            user_id: profile.id,
            title,
            body: body ?? null,
            type,
            link: link ?? null,
            read: false,
        })
    }

    async function markRead(id) {
        await supabase.from('notifications').update({ read: true }).eq('id', id)
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }

    async function markAllRead() {
        if (!profile?.id) return
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', profile.id)
            .eq('read', false)
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    async function deleteNotification(id) {
        await supabase.from('notifications').delete().eq('id', id)
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    return {
        notifications,
        unreadCount,
        loading,
        notify,
        markRead,
        markAllRead,
        deleteNotification,
        refetch: fetchNotifications,
    }
}