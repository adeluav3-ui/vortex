import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const PERIODS = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'all', label: 'All Time' },
]

function getPeriodRange(period) {
    const now = new Date()
    switch (period) {
        case 'week': {
            const start = new Date(now)
            start.setDate(now.getDate() - now.getDay())
            start.setHours(0, 0, 0, 0)
            return { start: start.toISOString(), end: now.toISOString() }
        }
        case 'month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1)
            return { start: start.toISOString(), end: now.toISOString() }
        }
        case 'last_month': {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const end = new Date(now.getFullYear(), now.getMonth(), 1)
            return { start: start.toISOString(), end: end.toISOString() }
        }
        default:
            return { start: null, end: null }
    }
}

export default function VendorReports() {
    const { profile } = useAuth()
    const navigate = useNavigate()

    const [period, setPeriod] = useState('month')
    const [loading, setLoading] = useState(true)
    const [orders, setOrders] = useState([])
    const [orderItems, setOrderItems] = useState([])
    const [orderProfitMap, setOrderProfitMap] = useState({})
    const [orderDeliveryCosts, setOrderDeliveryCosts] = useState({})

    const tier = profile?.businesses?.subscription_tier ?? 'solo'
    const canSeeSource = ['hustle', 'scale'].includes(tier)
    const canExport = tier === 'scale'

    useEffect(() => {
        if (!profile?.business_id) return
        fetchData()
    }, [profile?.business_id, period])

    async function fetchData() {
        setLoading(true)
        const { start, end } = getPeriodRange(period)

        let ordersQuery = supabase
            .from('vendor_orders')
            .select('id, total_amount, amount_paid, balance_due, payment_status, order_source, status, created_at')
            .eq('business_id', profile.business_id)
            .neq('status', 'cancelled')

        if (start) ordersQuery = ordersQuery.gte('created_at', start)
        if (end) ordersQuery = ordersQuery.lte('created_at', end)

        const { data: ordersData } = await ordersQuery

        // Fetch order items with variant_id to calculate profit
        const orderIds = (ordersData ?? []).map(o => o.id)
        let itemsData = []
        const profitMap = {}
        const deliveryMap = {}

        if (orderIds.length > 0) {
            // Get order items - include product_name
            const { data } = await supabase
                .from('order_items')
                .select('order_id, product_id, product_name, variant_id, quantity, unit_price')
                .in('order_id', orderIds)
            itemsData = data ?? []

            // Get variant buying prices
            const variantIds = [...new Set(itemsData.map(i => i.variant_id).filter(v => v))]
            const { data: variantsData } = await supabase
                .from('product_variants')
                .select('id, buying_price')
                .in('id', variantIds)

            const buyingPriceMap = {}
            for (const variant of (variantsData ?? [])) {
                buyingPriceMap[variant.id] = Number(variant.buying_price) || 0
            }

            // Calculate profit per order
            for (const item of itemsData) {
                if (!profitMap[item.order_id]) {
                    profitMap[item.order_id] = { total_profit: 0, total_selling: 0 }
                }
                const sellingTotal = Number(item.unit_price) * Number(item.quantity)
                const costTotal = (buyingPriceMap[item.variant_id] || 0) * Number(item.quantity)
                const profit = sellingTotal - costTotal

                profitMap[item.order_id].total_selling += sellingTotal
                profitMap[item.order_id].total_profit += profit
            }

            // Fetch delivery costs
            const { data: deliveriesData } = await supabase
                .from('deliveries')
                .select('order_id, delivery_cost, cost_bearer')
                .in('order_id', orderIds)
                .eq('cost_bearer', 'customer')

            for (const delivery of (deliveriesData ?? [])) {
                deliveryMap[delivery.order_id] = Number(delivery.delivery_cost) || 0
            }
        }

        setOrderProfitMap(profitMap)
        setOrderDeliveryCosts(deliveryMap)
        setOrders(ordersData ?? [])
        setOrderItems(itemsData)
        setLoading(false)
    }

    // ── Computed stats (EXCLUDING DELIVERY FEES) ──
    let totalProfit = 0
    let totalProductCollected = 0

    for (const order of orders) {
        const profitData = orderProfitMap[order.id]
        const deliveryCost = orderDeliveryCosts[order.id] || 0

        if (profitData) {
            totalProfit += profitData.total_profit
            const productPayment = Math.max(0, Number(order.amount_paid) - deliveryCost)
            totalProductCollected += productPayment
        }
    }

    // Top products by profit - FIXED to show product names
    const productProfitMap = new Map() // Use Map to avoid key issues

    for (const item of orderItems) {
        const profitData = orderProfitMap[item.order_id]
        if (!profitData || profitData.total_selling === 0) continue

        // Calculate profit percentage for this item
        const itemRevenue = Number(item.unit_price) * Number(item.quantity)
        const profitPercentage = profitData.total_profit / profitData.total_selling
        const itemProfit = itemRevenue * profitPercentage

        // Use product_id or product_name as key
        const key = item.product_id || item.product_name
        const displayName = item.product_name || 'Unknown Product'

        if (!productProfitMap.has(key)) {
            productProfitMap.set(key, {
                name: displayName,
                product_id: item.product_id,
                units: 0,
                revenue: 0,
                profit: 0
            })
        }

        const product = productProfitMap.get(key)
        product.units += Number(item.quantity)
        product.revenue += itemRevenue
        product.profit += itemProfit
    }

    // Convert Map to array and sort by profit
    const topProducts = Array.from(productProfitMap.values())
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 8)

    // Order source breakdown (based on profit)
    const sourceMap = {}
    orders.forEach(o => {
        const profitData = orderProfitMap[o.id]
        const profit = profitData ? profitData.total_profit : 0
        const deliveryCost = orderDeliveryCosts[o.id] || 0
        const productPayment = Math.max(0, Number(o.amount_paid) - deliveryCost)
        const src = o.order_source ?? 'direct'
        if (!sourceMap[src]) sourceMap[src] = { source: src, orders: 0, profit: 0, revenue: 0 }
        sourceMap[src].orders += 1
        sourceMap[src].profit += profit
        sourceMap[src].revenue += productPayment
    })
    const sourceData = Object.values(sourceMap).sort((a, b) => b.profit - a.profit)

    const SOURCE_ICONS = {
        whatsapp: '💬', instagram: '📸', website: '🌐',
        referral: '🤝', direct: '🛒', other: '📦',
    }

    // Revenue chart — group by day or week (excluding delivery)
    const chartData = (() => {
        const map = {}
        orders.forEach(o => {
            const profitData = orderProfitMap[o.id]
            const profit = profitData ? profitData.total_profit : 0
            const deliveryCost = orderDeliveryCosts[o.id] || 0
            const productPayment = Math.max(0, Number(o.amount_paid) - deliveryCost)

            const d = new Date(o.created_at)
            const key = period === 'week' || period === 'month'
                ? d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
                : d.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' })
            if (!map[key]) map[key] = { date: key, profit: 0, collected: 0 }
            map[key].profit += profit
            map[key].collected += productPayment
        })
        return Object.values(map).slice(-14)
    })()

    function exportCSV() {
        const rows = [
            ['Order Number', 'Customer', 'Product Payment (₦)', 'Delivery Fee (₦)', 'Total Paid (₦)', 'Profit (₦)', 'Payment Status', 'Order Status', 'Date'],
            ...orders.map(o => {
                const profitData = orderProfitMap[o.id]
                const profit = profitData ? profitData.total_profit : 0
                const deliveryCost = orderDeliveryCosts[o.id] || 0
                const productPayment = Math.max(0, Number(o.amount_paid) - deliveryCost)
                return [
                    o.order_number,
                    o.customer_name,
                    productPayment.toFixed(2),
                    deliveryCost.toFixed(2),
                    Number(o.amount_paid).toFixed(2),
                    profit.toFixed(2),
                    o.payment_status,
                    o.status,
                    new Date(o.created_at).toLocaleDateString('en-NG'),
                ]
            })
        ]

        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `vortex-reports-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <PageWrapper title="Reports">

            {/* ── Period selector ── */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {PERIODS.map(p => (
                    <button
                        key={p.value}
                        onClick={() => setPeriod(p.value)}
                        className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${period === p.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                            }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="py-20 text-center text-sm text-gray-400">Loading report...</div>
            ) : (
                <div className="space-y-6">

                    {/* ── Summary cards (excluding delivery) ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {[
                            { label: 'Total Revenue (Profit)', value: `₦${totalProfit.toLocaleString()}`, icon: '💰', color: 'text-green-600', sub: 'Your earnings from product sales' },
                            { label: 'Total Collected', value: `₦${totalProductCollected.toLocaleString()}`, icon: '✅', color: 'text-blue-600', sub: 'Product payments received (excluding delivery)' },
                            { label: 'Total Orders', value: orders.length, icon: '📋', color: 'text-gray-900', sub: `${orders.filter(o => o.payment_status === 'paid').length} paid · ${orders.filter(o => o.payment_status === 'unpaid').length} unpaid` },
                        ].map(stat => (
                            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs text-gray-500">{stat.label}</p>
                                    <span className="text-lg">{stat.icon}</span>
                                </div>
                                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                                <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── Revenue chart ── */}
                    {chartData.length > 1 && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Profit vs Customer Payments</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={chartData} barGap={2}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                                        tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip
                                        formatter={(value) => [`₦${Number(value).toLocaleString()}`, '']}
                                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="profit" name="Your Profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="collected" name="Customer Product Payment" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* ── Top products by profit ── */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-900">Top Products by Profit</h3>
                            </div>
                            {topProducts.length === 0 ? (
                                <div className="px-5 py-8 text-center">
                                    <p className="text-2xl mb-2">📦</p>
                                    <p className="text-sm text-gray-500">No product data available</p>
                                    <p className="text-xs text-gray-400 mt-1">Products will appear here once orders are completed</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {topProducts.map((product, index) => (
                                        <div key={product.product_id || product.name} className="px-5 py-3 flex items-center gap-3">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    index === 1 ? 'bg-gray-100 text-gray-600' :
                                                        index === 2 ? 'bg-orange-100 text-orange-600' :
                                                            'bg-gray-50 text-gray-400'
                                                }`}>
                                                {index + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {product.name || 'Unnamed Product'}
                                                </p>
                                                <p className="text-xs text-gray-400">{product.units} units sold</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold text-green-600">₦{Math.round(product.profit).toLocaleString()}</p>
                                                <p className="text-xs text-gray-400">profit</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Order source ── */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-900">Profit by Source</h3>
                                {!canSeeSource && (
                                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Hustle+</span>
                                )}
                            </div>
                            {!canSeeSource ? (
                                <div className="px-5 py-8 text-center space-y-2">
                                    <p className="text-2xl">🔒</p>
                                    <p className="text-sm text-gray-500">Upgrade to Hustle to see where your orders come from</p>
                                    <button
                                        onClick={() => navigate('/settings/billing')}
                                        className="text-xs text-blue-600 font-medium hover:underline"
                                    >
                                        Upgrade →
                                    </button>
                                </div>
                            ) : sourceData.length === 0 ? (
                                <p className="px-5 py-8 text-sm text-gray-400 text-center">No source data yet</p>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {sourceData.map(src => {
                                        const pct = totalProfit > 0
                                            ? Math.round((src.profit / totalProfit) * 100)
                                            : 0
                                        return (
                                            <div key={src.source} className="px-5 py-3">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span>{SOURCE_ICONS[src.source] ?? '📦'}</span>
                                                        <span className="text-sm font-medium text-gray-800 capitalize">{src.source}</span>
                                                        <span className="text-xs text-gray-400">{src.orders} orders</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-bold text-green-600">₦{Math.round(src.profit).toLocaleString()}</span>
                                                        <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                    <div
                                                        className="bg-green-500 h-1.5 rounded-full transition-all"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Export button */}
                    {canExport && orders.length > 0 && (
                        <div className="flex justify-end">
                            <button
                                onClick={exportCSV}
                                className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                            >
                                <span>⬇️</span> Export Full Report (CSV)
                            </button>
                        </div>
                    )}
                </div>
            )}
        </PageWrapper>
    )
}