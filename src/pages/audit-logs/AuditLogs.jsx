import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'

const ACTION_ICONS = {
    'sale.created': { icon: '🧾', color: 'bg-blue-50 text-blue-600' },
    'sale.voided': { icon: '🚫', color: 'bg-red-50 text-red-600' },
    'product.created': { icon: '📦', color: 'bg-green-50 text-green-600' },
    'product.updated': { icon: '✏️', color: 'bg-yellow-50 text-yellow-600' },
    'product.deleted': { icon: '🗑️', color: 'bg-red-50 text-red-600' },
    'staff.invited': { icon: '👤', color: 'bg-purple-50 text-purple-600' },
    'staff.removed': { icon: '👤', color: 'bg-red-50 text-red-600' },
    'expense.created': { icon: '💸', color: 'bg-orange-50 text-orange-600' },
    'stock.transferred': { icon: '🔄', color: 'bg-indigo-50 text-indigo-600' },
    'settings.updated': { icon: '⚙️', color: 'bg-gray-50 text-gray-600' },
    'subscription.changed': { icon: '💳', color: 'bg-blue-50 text-blue-600' },
    'customer.created': { icon: '👥', color: 'bg-green-50 text-green-600' },
    'order.created': { icon: '🛍️', color: 'bg-purple-50 text-purple-600' },
    'order.updated': { icon: '✏️', color: 'bg-yellow-50 text-yellow-600' },
    'order.cancelled': { icon: '❌', color: 'bg-red-50 text-red-600' },
    'payment.recorded': { icon: '💳', color: 'bg-green-50 text-green-600' },
    'delivery.created': { icon: '🚚', color: 'bg-indigo-50 text-indigo-600' },
    'delivery.updated': { icon: '📦', color: 'bg-blue-50 text-blue-600' },
    'invoice.generated': { icon: '🧾', color: 'bg-amber-50 text-amber-600' },
}

const ACTION_LABELS = {
    'sale.created': 'Recorded a sale',
    'sale.voided': 'Voided a sale',
    'product.created': 'Added a product',
    'product.updated': 'Updated a product',
    'product.deleted': 'Deleted a product',
    'staff.invited': 'Invited a staff member',
    'staff.removed': 'Removed a staff member',
    'expense.created': 'Recorded an expense',
    'stock.transferred': 'Transferred stock',
    'settings.updated': 'Updated settings',
    'subscription.changed': 'Changed subscription',
    'customer.created': 'Added a customer',
    'order.created': 'Created an order',
    'order.updated': 'Updated an order',
    'order.cancelled': 'Cancelled an order',
    'payment.recorded': 'Recorded a payment',
    'delivery.created': 'Added delivery info',
    'delivery.updated': 'Updated delivery status',
    'invoice.generated': 'Generated an invoice',
}

const FILTERS = [
    { value: 'all', label: 'All Activity' },
    { value: 'sale', label: 'Sales' },
    { value: 'product', label: 'Products' },
    { value: 'staff', label: 'Staff' },
    { value: 'expense', label: 'Expenses' },
    { value: 'stock', label: 'Stock' },
    { value: 'settings', label: 'Settings' },
]

export default function AuditLogs() {
    const { profile, planCan } = useAuth()

    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [userFilter, setUserFilter] = useState('all')
    const [users, setUsers] = useState([])
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(false)

    const PAGE_SIZE = 50
    const canAccess = planCan('auditLogs')

    useEffect(() => {
        if (!profile?.business_id || !canAccess) return
        fetchUsers()
    }, [profile?.business_id])

    useEffect(() => {
        if (!profile?.business_id || !canAccess) return
        setPage(0)
        fetchLogs(0)
    }, [filter, userFilter, profile?.business_id])

    async function fetchUsers() {
        const { data } = await supabase
            .from('audit_logs')
            .select('user_id, user_name')
            .eq('business_id', profile.business_id)
        if (!data) return
        const unique = {}
        data.forEach(l => { if (l.user_id) unique[l.user_id] = l.user_name })
        setUsers(Object.entries(unique).map(([id, name]) => ({ id, name })))
    }

    async function fetchLogs(pageNum = 0) {
        setLoading(true)
        let query = supabase
            .from('audit_logs')
            .select('*')
            .eq('business_id', profile.business_id)
            .order('created_at', { ascending: false })
            .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE)

        if (filter !== 'all') {
            query = query.like('action', `${filter}.%`)
        }
        if (userFilter !== 'all') {
            query = query.eq('user_id', userFilter)
        }

        const { data } = await query
        const results = data ?? []

        if (pageNum === 0) {
            setLogs(results)
        } else {
            setLogs(prev => [...prev, ...results])
        }
        setHasMore(results.length === PAGE_SIZE + 1)
        setLoading(false)
    }

    function loadMore() {
        const next = page + 1
        setPage(next)
        fetchLogs(next)
    }

    function formatMeta(meta) {
        if (!meta) return null
        const parts = []
        if (meta.total) parts.push(`₦${Number(meta.total).toLocaleString()}`)
        if (meta.items) parts.push(`${meta.items} item${meta.items !== 1 ? 's' : ''}`)
        if (meta.product_name) parts.push(meta.product_name)
        if (meta.staff_name) parts.push(meta.staff_name)
        if (meta.amount) parts.push(`₦${Number(meta.amount).toLocaleString()}`)
        if (meta.from_branch && meta.to_branch) parts.push(`${meta.from_branch} → ${meta.to_branch}`)
        return parts.length > 0 ? parts.join(' · ') : null
    }

    // ── Gate: Business plan only ──
    if (!canAccess) {
        return (
            <PageWrapper title="Audit Logs">
                <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                    <span className="text-5xl">🔒</span>
                    <h2 className="text-lg font-bold text-gray-900">Audit Logs is a Business plan feature</h2>
                    <p className="text-sm text-gray-500 max-w-sm">
                        Upgrade to the Business plan to get a full activity log of everything happening in your business — who did what and when.
                    </p>
                    <a
                        href="/settings/billing"
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                    >
                        Upgrade to Business →
                    </a>
                </div>
            </PageWrapper>
        )
    }

    return (
        <PageWrapper title="Audit Logs">

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide flex-1">
                    {FILTERS.map(f => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value)}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === f.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                {users.length > 1 && (
                    <select
                        value={userFilter}
                        onChange={e => setUserFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shrink-0"
                    >
                        <option value="all">All staff</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Log list */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading && logs.length === 0 ? (
                    <div className="py-16 text-center text-sm text-gray-400">Loading activity...</div>
                ) : logs.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                        <p className="text-2xl">📋</p>
                        <p className="text-sm text-gray-500">No activity logged yet</p>
                        <p className="text-xs text-gray-400">Actions taken in your business will appear here</p>
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-gray-50">
                            {logs.map((log, i) => {
                                const style = ACTION_ICONS[log.action] ?? { icon: '📝', color: 'bg-gray-50 text-gray-600' }
                                const label = ACTION_LABELS[log.action] ?? log.action
                                const metaStr = formatMeta(log.meta)
                                const date = new Date(log.created_at)

                                // Date separator
                                const prevDate = i > 0 ? new Date(logs[i - 1].created_at).toDateString() : null
                                const showDateSep = prevDate !== date.toDateString()

                                return (
                                    <div key={log.id}>
                                        {showDateSep && (
                                            <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                                    {date.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>
                                            </div>
                                        )}
                                        <div className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50 transition">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${style.color}`}>
                                                {style.icon}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm text-gray-900">
                                                            <span className="font-semibold">{log.user_name}</span>
                                                            {' '}{label}
                                                            {log.entity && (
                                                                <span className="text-gray-500"> — {log.entity}</span>
                                                            )}
                                                        </p>
                                                        {metaStr && (
                                                            <p className="text-xs text-gray-400 mt-0.5">{metaStr}</p>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-400 shrink-0">
                                                        {date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {hasMore && (
                            <div className="px-5 py-4 border-t border-gray-100 text-center">
                                <button
                                    onClick={loadMore}
                                    disabled={loading}
                                    className="text-sm text-blue-600 font-medium hover:underline disabled:opacity-50"
                                >
                                    {loading ? 'Loading...' : 'Load more →'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </PageWrapper>
    )
}