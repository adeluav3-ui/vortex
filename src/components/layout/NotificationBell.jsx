import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../hooks/useNotifications'

const TYPE_ICONS = {
    'order.new': '🛍️',
    'order.status': '📦',
    'payment.received': '💳',
    'stock.low': '⚠️',
    'staff.joined': '👤',
    'trial.ending': '⏳',
    'subscription.failed': '❌',
    'subscription.active': '✅',
    'import.complete': '📥',
    'default': '🔔',
}

export default function NotificationBell() {
    const navigate = useNavigate()
    const { notifications, unreadCount, markRead, markAllRead, deleteNotification } = useNotifications()
    const [open, setOpen] = useState(false)
    const ref = useRef()

    // Close on outside click
    useEffect(() => {
        function handle(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handle)
        return () => document.removeEventListener('mousedown', handle)
    }, [])

    function handleClick(notification) {
        markRead(notification.id)
        setOpen(false)
        if (notification.link) navigate(notification.link)
    }

    function timeAgo(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'just now'
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        const days = Math.floor(hrs / 24)
        return `${days}d ago`
    }

    return (
        <div className="relative" ref={ref}>
            {/* Bell button */}
            <button
                onClick={() => setOpen(!open)}
                className="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
                aria-label="Notifications"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-4.5 h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                                    {unreadCount} new
                                </span>
                            )}
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs text-blue-600 hover:underline font-medium"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-10 text-center space-y-2">
                                <p className="text-2xl">🔔</p>
                                <p className="text-sm text-gray-500">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map(n => (
                                    <div
                                        key={n.id}
                                        className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition cursor-pointer ${!n.read ? 'bg-blue-50/40' : ''}`}
                                        onClick={() => handleClick(n)}
                                    >
                                        <span className="text-lg shrink-0 mt-0.5">
                                            {TYPE_ICONS[n.type] ?? TYPE_ICONS.default}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm leading-tight ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                {n.title}
                                            </p>
                                            {n.body && (
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                                            )}
                                            <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            {!n.read && (
                                                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                                            )}
                                            <button
                                                onClick={e => { e.stopPropagation(); deleteNotification(n.id) }}
                                                className="text-gray-300 hover:text-gray-500 text-xs"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="px-4 py-2.5 border-t border-gray-100 text-center">
                            <p className="text-xs text-gray-400">Showing last 30 notifications</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}