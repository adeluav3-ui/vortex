import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'

const STATUS_TABS = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
]

const ORDER_STATUS_COLORS = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    packed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dispatched: 'bg-purple-50 text-purple-700 border-purple-200',
    delivered: 'bg-green-50 text-green-700 border-green-200',
    completed: 'bg-green-100 text-green-800 border-green-300',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
    returned: 'bg-gray-100 text-gray-600 border-gray-300',
}

const PAYMENT_STATUS_COLORS = {
    unpaid: 'bg-red-50 text-red-600',
    part_paid: 'bg-amber-50 text-amber-700',
    paid: 'bg-green-50 text-green-700',
}

const PAYMENT_STATUS_LABELS = {
    unpaid: 'Unpaid',
    part_paid: 'Part Paid',
    paid: 'Paid',
}

const SOURCE_ICONS = {
    whatsapp: '💬',
    instagram: '📸',
    website: '🌐',
    referral: '🤝',
    direct: '🛒',
    other: '📦',
}

export default function Orders() {
    const { profile } = useAuth()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState(searchParams.get('filter') === 'dispatch' ? 'confirmed' : 'all')
    const [paymentFilter, setPaymentFilter] = useState('all')
    const [counts, setCounts] = useState({})

    useEffect(() => {
        if (!profile?.business_id) return
        fetchOrders()
        fetchCounts()

        const channel = supabase
            .channel('orders-list')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'vendor_orders',
                filter: `business_id=eq.${profile.business_id}`,
            }, () => {
                fetchOrders()
                fetchCounts()
            })
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [profile?.business_id, activeTab, paymentFilter])

    async function fetchCounts() {
        const { data } = await supabase
            .from('vendor_orders')
            .select('status')
            .eq('business_id', profile.business_id)

        if (!data) return
        const c = { all: data.length }
        data.forEach(o => {
            c[o.status] = (c[o.status] ?? 0) + 1
        })
        setCounts(c)
    }

    async function fetchOrders() {
        setLoading(true)
        let query = supabase
            .from('vendor_orders')
            .select('*')
            .eq('business_id', profile.business_id)
            .order('created_at', { ascending: false })

        if (activeTab !== 'all') query = query.eq('status', activeTab)
        if (paymentFilter !== 'all') query = query.eq('payment_status', paymentFilter)

        const { data } = await query
        setOrders(data ?? [])
        setLoading(false)
    }

    const filtered = orders.filter(o => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
            o.customer_name?.toLowerCase().includes(q) ||
            o.order_number?.toLowerCase().includes(q) ||
            o.customer_phone?.toLowerCase().includes(q)
        )
    })

    async function updateStatus(orderId, newStatus) {
        await supabase
            .from('vendor_orders')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', orderId)

        await supabase
            .from('order_status_history')
            .insert({ order_id: orderId, status: newStatus, changed_by: profile.id })

        fetchOrders()
        fetchCounts()
    }

    function getNextStatus(current) {
        const flow = ['pending', 'confirmed', 'packed', 'dispatched', 'delivered', 'completed']
        const idx = flow.indexOf(current)
        return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null
    }

    const NEXT_STATUS_LABELS = {
        pending: 'Confirm',
        confirmed: 'Complete',
    }

    return (
        <PageWrapper title="Orders">
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <p className="text-sm text-gray-500">
                        {counts.all ?? 0} total orders
                    </p>
                </div>
                <button
                    onClick={() => navigate('/orders/new')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                >
                    <span>➕</span> New Order
                </button>
            </div>

            {/* ── Search + Payment filter ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by customer name, phone or order number..."
                        className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={paymentFilter}
                    onChange={e => setPaymentFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="all">All Payments</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="part_paid">Part Paid</option>
                    <option value="paid">Paid</option>
                </select>
            </div>

            {/* ── Status Tabs ── */}
            <div className="flex gap-1 overflow-x-auto pb-1 mb-4 scrollbar-hide">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${activeTab === tab.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {tab.label}
                        {counts[tab.value] > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === tab.value
                                ? 'bg-white/20 text-white'
                                : 'bg-gray-200 text-gray-600'
                                }`}>
                                {counts[tab.value]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Orders List ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center text-sm text-gray-400">Loading orders...</div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                        <p className="text-2xl">📭</p>
                        <p className="text-sm text-gray-500">
                            {search ? 'No orders match your search' : 'No orders in this category yet'}
                        </p>
                        {!search && activeTab === 'all' && (
                            <button
                                onClick={() => navigate('/orders/new')}
                                className="text-sm text-blue-600 font-medium hover:underline"
                            >
                                Record your first order →
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filtered.map(order => {
                            const nextStatus = getNextStatus(order.status)
                            return (
                                <div key={order.id} className="px-4 py-4 hover:bg-gray-50 transition">
                                    <div className="flex items-start justify-between gap-3">
                                        {/* Left */}
                                        <div
                                            className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                                            onClick={() => navigate(`/orders/${order.id}`)}
                                        >
                                            <span className="text-xl mt-0.5 shrink-0">
                                                {SOURCE_ICONS[order.order_source] ?? '📦'}
                                            </span>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {order.customer_name}
                                                    </p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${ORDER_STATUS_COLORS[order.status]}`}>
                                                        {order.status}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[order.payment_status]}`}>
                                                        {PAYMENT_STATUS_LABELS[order.payment_status]}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400">
                                                    {order.order_number} · {new Date(order.created_at).toLocaleString('en-NG', {
                                                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </p>
                                                {order.customer_phone && (
                                                    <p className="text-xs text-gray-400 mt-0.5">{order.customer_phone}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right */}
                                        <div className="text-right shrink-0 space-y-1">
                                            <p className="text-sm font-bold text-gray-900">
                                                ₦{Number(order.total_amount).toLocaleString()}
                                            </p>
                                            {Number(order.balance_due) > 0 && (
                                                <p className="text-xs text-red-500 font-medium">
                                                    ₦{Number(order.balance_due).toLocaleString()} due
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick status advance */}
                                    {nextStatus && order.status !== 'cancelled' && (
                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                onClick={() => updateStatus(order.id, nextStatus)}
                                                className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-gray-700 transition"
                                            >
                                                {NEXT_STATUS_LABELS[order.status]} →
                                            </button>
                                            <button
                                                onClick={() => navigate(`/orders/${order.id}`)}
                                                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
                                            >
                                                View details
                                            </button>
                                            {order.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => updateStatus(order.id, 'cancelled')}
                                                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5 ml-auto"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </PageWrapper>
    )
}