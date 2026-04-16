import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import VortexScoreCard from '../../pages/dashboard/VortexScoreCard'

const ORDER_STATUS_COLORS = {
    pending: 'bg-yellow-50 text-yellow-700',
    confirmed: 'bg-blue-50 text-blue-700',
    packed: 'bg-indigo-50 text-indigo-700',
    dispatched: 'bg-purple-50 text-purple-700',
    delivered: 'bg-green-50 text-green-700',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-50 text-red-600',
    returned: 'bg-gray-100 text-gray-600',
}

const PAYMENT_STATUS_COLORS = {
    unpaid: 'bg-red-50 text-red-600',
    part_paid: 'bg-amber-50 text-amber-700',
    paid: 'bg-green-50 text-green-700',
}

export default function VendorDashboard() {
    const { profile } = useAuth()
    const navigate = useNavigate()

    const [stats, setStats] = useState({
        todayOrders: 0,
        pendingPayments: 0,
        toDispatch: 0,
        totalCustomers: 0,
    })
    const [recentOrders, setRecentOrders] = useState([])
    const [lowStockItems, setLowStockItems] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!profile?.business_id) return
        fetchStats()

        const channel = supabase
            .channel('vendor-dashboard')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'vendor_orders',
                filter: `business_id=eq.${profile.business_id}`,
            }, () => fetchStats())
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [profile?.business_id])

    async function fetchStats() {
        // Get today's date in local timezone (Nigeria UTC+1)
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

        // Convert to ISO strings for Supabase query
        const todayStartISO = todayStart.toISOString()
        const todayEndISO = todayEnd.toISOString()

        const [
            todayOrdersRes,
            pendingPaymentsRes,
            toDispatchRes,
            customersRes,
            recentOrdersRes,
            lowStockRes,
        ] = await Promise.all([
            // Orders created today (using local timezone)
            supabase
                .from('vendor_orders')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', profile.business_id)
                .gte('created_at', todayStartISO)
                .lt('created_at', todayEndISO),

            // Total balance due across all unpaid/part-paid orders
            supabase
                .from('vendor_orders')
                .select('balance_due')
                .eq('business_id', profile.business_id)
                .in('payment_status', ['unpaid', 'part_paid'])
                .neq('status', 'cancelled'),

            // Orders confirmed or packed — ready to dispatch
            supabase
                .from('vendor_orders')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', profile.business_id)
                .in('status', ['confirmed', 'packed']),

            // Total customers
            supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', profile.business_id),

            // Recent orders with items count
            supabase
                .from('vendor_orders')
                .select('id, order_number, customer_name, total_amount, amount_paid, balance_due, status, payment_status, order_source, created_at')
                .eq('business_id', profile.business_id)
                .order('created_at', { ascending: false })
                .limit(8),

            // Low stock products
            supabase
                .from('products')
                .select(`
                    id, name,
                    product_variants (
                        id,
                        stock_levels (
                            quantity
                        )
                    )
                `)
                .eq('business_id', profile.business_id)
                .eq('is_active', true)
        ])

        const pendingPaymentsTotal = pendingPaymentsRes.data?.reduce(
            (sum, o) => sum + Number(o.balance_due), 0
        ) ?? 0

        // Process low stock items
        const lowStock = []
        if (lowStockRes.data) {
            for (const product of lowStockRes.data) {
                const variant = product.product_variants?.[0]
                const stockLevel = variant?.stock_levels?.[0]
                const quantity = stockLevel?.quantity ?? 0

                if (quantity <= 5) {
                    lowStock.push({
                        id: product.id,
                        name: product.name,
                        stock_quantity: quantity
                    })
                }
            }
            lowStock.sort((a, b) => a.stock_quantity - b.stock_quantity)
        }

        setStats({
            todayOrders: todayOrdersRes.count ?? 0,
            pendingPayments: pendingPaymentsTotal,
            toDispatch: toDispatchRes.count ?? 0,
            totalCustomers: customersRes.count ?? 0,
        })
        setRecentOrders(recentOrdersRes.data ?? [])
        setLowStockItems(lowStock.slice(0, 4))
        setLoading(false)
    }

    const SOURCE_ICONS = {
        whatsapp: '💬',
        instagram: '📸',
        website: '🌐',
        referral: '🤝',
        direct: '🛒',
        other: '📦',
    }

    return (
        <PageWrapper title="Dashboard">
            <div className="mb-6">
                <VortexScoreCard />
            </div>
            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    {
                        label: "Today's Orders",
                        value: stats.todayOrders.toString(),
                        icon: '🛍️',
                        color: 'text-blue-600',
                        sub: 'orders placed today',
                    },
                    {
                        label: 'Pending Payments',
                        value: `₦${stats.pendingPayments.toLocaleString()}`,
                        icon: '💳',
                        color: 'text-red-500',
                        sub: 'total balance due',
                    },
                    {
                        label: 'Ready to Dispatch',
                        value: stats.toDispatch.toString(),
                        icon: '🚚',
                        color: 'text-indigo-600',
                        sub: 'confirmed & packed',
                    },
                    {
                        label: 'Total Customers',
                        value: stats.totalCustomers.toString(),
                        icon: '👥',
                        color: 'text-green-600',
                        sub: 'all time',
                    },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-500">{stat.label}</p>
                            <span className="text-xl">{stat.icon}</span>
                        </div>
                        <p className={`text-2xl font-bold ${loading ? 'text-gray-300' : stat.color}`}>
                            {loading ? '...' : stat.value}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* ── Recent Orders ── */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Recent Orders</h3>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-green-500 font-medium">● Live</span>
                            <button
                                onClick={() => navigate('/orders')}
                                className="text-xs text-blue-600 hover:underline font-medium"
                            >
                                View all →
                            </button>
                        </div>
                    </div>

                    {recentOrders.length === 0 ? (
                        <div className="px-5 py-10 text-center space-y-3">
                            <p className="text-2xl">📭</p>
                            <p className="text-sm text-gray-500">No orders yet</p>
                            <button
                                onClick={() => navigate('/orders/new')}
                                className="text-sm text-blue-600 font-medium hover:underline"
                            >
                                Record your first order →
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {recentOrders.map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => navigate(`/orders/${order.id}`)}
                                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 cursor-pointer transition"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-base shrink-0">
                                            {SOURCE_ICONS[order.order_source] ?? '📦'}
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {order.customer_name}
                                                </p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ORDER_STATUS_COLORS[order.status]}`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                {order.order_number} · {new Date(order.created_at).toLocaleString('en-NG', {
                                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-3">
                                        <p className="text-sm font-bold text-gray-900">
                                            ₦{Number(order.total_amount).toLocaleString()}
                                        </p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[order.payment_status]}`}>
                                            {order.payment_status === 'part_paid' ? 'Part paid' : order.payment_status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Right column ── */}
                <div className="space-y-4">

                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
                        <div className="space-y-2">
                            {[
                                { label: 'New Order', icon: '➕', path: '/orders/new', color: 'bg-blue-600 text-white hover:bg-blue-700' },
                                { label: 'View Orders', icon: '📋', path: '/orders', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                                { label: 'Add Product', icon: '📦', path: '/inventory', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                                { label: 'Logistics & Delivery', icon: '🚚', path: '/delivery', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                            ].map(action => (
                                <button
                                    key={action.label}
                                    onClick={() => navigate(action.path)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${action.color}`}
                                >
                                    <span>{action.icon}</span>
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Low Stock Alert */}
                    {lowStockItems.length > 0 && (
                        <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span>⚠️</span>
                                <h3 className="text-sm font-semibold text-amber-700">Low Stock</h3>
                            </div>
                            <div className="space-y-2">
                                {lowStockItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between">
                                        <p className="text-xs text-gray-700 truncate max-w-37.5">{item.name}</p>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-2 shrink-0 ${item.stock_quantity === 0
                                            ? 'bg-red-100 text-red-600'
                                            : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {item.stock_quantity === 0 ? 'Out of stock' : `${item.stock_quantity} left`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => navigate('/inventory')}
                                className="mt-3 text-xs text-blue-600 hover:underline font-medium"
                            >
                                Manage inventory →
                            </button>
                        </div>
                    )}

                    {/* Dispatch reminder */}
                    {stats.toDispatch > 0 && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                            <p className="text-sm font-semibold text-indigo-800">
                                🚚 {stats.toDispatch} order{stats.toDispatch > 1 ? 's' : ''} ready to dispatch
                            </p>
                            <p className="text-xs text-indigo-600 mt-1">
                                These orders are confirmed or packed and waiting for delivery.
                            </p>
                            <button
                                onClick={() => navigate('/orders?filter=dispatch')}
                                className="mt-2 text-xs text-indigo-700 font-semibold hover:underline"
                            >
                                View orders →
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </PageWrapper>
    )
}