import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'

const PAYMENT_STATUS_COLORS = {
    unpaid: 'bg-red-50 text-red-600 border-red-200',
    part_paid: 'bg-amber-50 text-amber-700 border-amber-200',
    paid: 'bg-green-50 text-green-700 border-green-200',
}

const PAYMENT_STATUS_LABELS = {
    unpaid: 'Unpaid',
    part_paid: 'Part Paid',
    paid: 'Paid',
}

const TABS = [
    { value: 'all', label: 'All' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'part_paid', label: 'Part Paid' },
    { value: 'paid', label: 'Paid' },
]

// Payment modal — inline record payment without going to order detail
function RecordPaymentModal({ order, onClose, onSaved }) {
    const [amount, setAmount] = useState('')
    const [method, setMethod] = useState('bank_transfer')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    async function handleSave() {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return setError('Enter a valid amount')
        }
        if (Number(amount) > Number(order.balance_due)) {
            return setError(`Amount cannot exceed balance due (₦${Number(order.balance_due).toLocaleString()})`)
        }

        setSaving(true)
        setError('')

        try {
            const newAmountPaid = Number(order.amount_paid) + Number(amount)
            const newPaymentStatus = newAmountPaid >= Number(order.total_amount)
                ? 'paid'
                : 'part_paid'

            const { error: updateError } = await supabase
                .from('vendor_orders')
                .update({
                    amount_paid: newAmountPaid,
                    payment_status: newPaymentStatus,
                    payment_method: method,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', order.id)

            if (updateError) throw updateError

            onSaved()
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 z-10">
                <div>
                    <h3 className="text-base font-bold text-gray-900">Record Payment</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{order.customer_name} · {order.order_number}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Order Total</span>
                        <span className="font-medium">₦{Number(order.total_amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Already Paid</span>
                        <span className="font-medium text-green-600">₦{Number(order.amount_paid).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-1">
                        <span className="text-gray-500">Balance Due</span>
                        <span className="font-bold text-red-500">₦{Number(order.balance_due).toLocaleString()}</span>
                    </div>
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received (₦)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => { setAmount(e.target.value); setError('') }}
                        placeholder={`Max ₦${Number(order.balance_due).toLocaleString()}`}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                        value={method}
                        onChange={e => setMethod(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="opay">OPay</option>
                        <option value="palmpay">PalmPay</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Payment'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function Payments() {
    const { profile } = useAuth()
    const navigate = useNavigate()

    const [orders, setOrders] = useState([])
    const [orderProfits, setOrderProfits] = useState({})
    const [orderDeliveryCosts, setOrderDeliveryCosts] = useState({})
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('all')
    const [search, setSearch] = useState('')
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [counts, setCounts] = useState({})

    const tier = profile?.businesses?.subscription_tier ?? 'solo'
    const canExport = tier === 'scale'

    // Redirect solo users away from payments page
    useEffect(() => {
        if (tier === 'solo') {
            navigate('/dashboard', { replace: true })
        }
    }, [tier, navigate])

    useEffect(() => {
        if (!profile?.business_id) return
        if (tier === 'solo') return
        fetchOrders()
    }, [profile?.business_id, activeTab, tier])

    async function fetchOrders() {
        setLoading(true)

        try {
            let query = supabase
                .from('vendor_orders')
                .select('id, order_number, customer_name, customer_phone, total_amount, amount_paid, balance_due, payment_status, payment_method, status, created_at')
                .eq('business_id', profile.business_id)
                .neq('status', 'cancelled')
                .order('created_at', { ascending: false })

            if (activeTab !== 'all') {
                query = query.eq('payment_status', activeTab)
            }

            const { data: ordersData, error } = await query
            if (error) throw error

            // Fetch order items with variant_id to calculate profit
            const orderIds = (ordersData ?? []).map(o => o.id)
            const profitMap = {}
            const deliveryMap = {}

            if (orderIds.length > 0) {
                // Get order items with their variant_id
                const { data: itemsData } = await supabase
                    .from('order_items')
                    .select('order_id, variant_id, quantity, unit_price')
                    .in('order_id', orderIds)

                // Get all variant IDs to fetch buying prices
                const variantIds = [...new Set((itemsData ?? []).map(i => i.variant_id).filter(v => v))]

                // Fetch buying prices from product_variants
                const { data: variantsData } = await supabase
                    .from('product_variants')
                    .select('id, buying_price')
                    .in('id', variantIds)

                // Create a map of variant_id -> buying_price
                const buyingPriceMap = {}
                for (const variant of (variantsData ?? [])) {
                    buyingPriceMap[variant.id] = Number(variant.buying_price) || 0
                }

                // Calculate profit per order and total selling price
                for (const item of (itemsData ?? [])) {
                    if (!profitMap[item.order_id]) {
                        profitMap[item.order_id] = { total_profit: 0, total_selling: 0 }
                    }
                    const sellingTotal = Number(item.unit_price) * Number(item.quantity)
                    const costTotal = (buyingPriceMap[item.variant_id] || 0) * Number(item.quantity)
                    const profit = sellingTotal - costTotal

                    profitMap[item.order_id].total_selling += sellingTotal
                    profitMap[item.order_id].total_profit += profit
                }

                // Fetch delivery costs for each order to subtract from amount_paid
                const { data: deliveriesData } = await supabase
                    .from('deliveries')
                    .select('order_id, delivery_cost, cost_bearer')
                    .in('order_id', orderIds)
                    .eq('cost_bearer', 'customer')

                for (const delivery of (deliveriesData ?? [])) {
                    deliveryMap[delivery.order_id] = Number(delivery.delivery_cost) || 0
                }
            }

            setOrderProfits(profitMap)
            setOrderDeliveryCosts(deliveryMap)
            setOrders(ordersData ?? [])

            // Fetch counts for all tabs
            const { data: allOrders, error: countError } = await supabase
                .from('vendor_orders')
                .select('payment_status')
                .eq('business_id', profile.business_id)
                .neq('status', 'cancelled')

            if (countError) throw countError

            if (allOrders) {
                const c = {
                    all: allOrders.length,
                    unpaid: allOrders.filter(o => o.payment_status === 'unpaid').length,
                    part_paid: allOrders.filter(o => o.payment_status === 'part_paid').length,
                    paid: allOrders.filter(o => o.payment_status === 'paid').length,
                }
                setCounts(c)
            }
        } catch (err) {
            console.error('Error fetching orders:', err)
        } finally {
            setLoading(false)
        }
    }

    const filtered = orders.filter(o => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
            o.customer_name?.toLowerCase().includes(q) ||
            o.order_number?.toLowerCase().includes(q) ||
            o.customer_phone?.includes(q)
        )
    })

    // Calculate totals - EXCLUDING DELIVERY FEES
    let totalProfit = 0
    let totalProductCollected = 0

    for (const order of orders) {
        const profitData = orderProfits[order.id]
        const deliveryCost = orderDeliveryCosts[order.id] || 0

        if (profitData) {
            totalProfit += profitData.total_profit
            // Calculate product payment: amount_paid minus any delivery fee paid
            const productPayment = Math.max(0, Number(order.amount_paid) - deliveryCost)
            totalProductCollected += productPayment
        }
    }

    function daysSince(dateStr) {
        const diff = new Date() - new Date(dateStr)
        return Math.floor(diff / (1000 * 60 * 60 * 24))
    }

    function exportCSV() {
        const rows = [
            ['Order Number', 'Customer', 'Phone', 'Product Payment (₦)', 'Delivery Fee (₦)', 'Total Paid (₦)', 'Profit (₦)', 'Payment Status', 'Payment Method', 'Order Status', 'Date'],
            ...filtered.map(o => {
                const profitData = orderProfits[o.id]
                const profit = profitData ? profitData.total_profit : 0
                const deliveryCost = orderDeliveryCosts[o.id] || 0
                const productPayment = Math.max(0, Number(o.amount_paid) - deliveryCost)
                return [
                    o.order_number,
                    o.customer_name,
                    o.customer_phone ?? '',
                    productPayment.toFixed(2),
                    deliveryCost.toFixed(2),
                    Number(o.amount_paid).toFixed(2),
                    profit.toFixed(2),
                    o.payment_status,
                    o.payment_method ?? '',
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
        a.download = `vortex-payments-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Show loading or redirect message
    if (tier === 'solo') {
        return (
            <PageWrapper title="Payments">
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                    <p className="text-4xl mb-4">💳</p>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Upgrade to Access Payments</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Payment tracking is available on the Hustle plan and above.
                    </p>
                    <a
                        href="/settings/billing"
                        className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
                    >
                        Upgrade Plan
                    </a>
                </div>
            </PageWrapper>
        )
    }

    return (
        <PageWrapper title="Payments">

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {[
                    {
                        label: 'Total Revenue (Profit)',
                        value: `₦${totalProfit.toLocaleString()}`,
                        sub: 'Your earnings from product sales',
                        icon: '💰',
                        color: 'text-green-600',
                    },
                    {
                        label: 'Total Collected',
                        value: `₦${totalProductCollected.toLocaleString()}`,
                        sub: 'Product payments received (excluding delivery)',
                        icon: '✅',
                        color: 'text-blue-600',
                    },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-500">{stat.label}</p>
                            <span className="text-xl">{stat.icon}</span>
                        </div>
                        <p className={`text-2xl font-bold ${loading ? 'text-gray-200' : stat.color}`}>
                            {loading ? '...' : stat.value}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Search + Export ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by customer, phone or order number..."
                        className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {canExport ? (
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition shrink-0"
                    >
                        <span>⬇️</span> Export CSV
                    </button>
                ) : (
                    <div className="relative group shrink-0">
                        <button
                            disabled
                            className="flex items-center gap-2 border border-gray-200 text-gray-400 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
                        >
                            <span>⬇️</span> Export CSV
                            <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Scale</span>
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                            Upgrade to Scale to export payment records as CSV.
                        </div>
                    </div>
                )}
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 overflow-x-auto pb-1 mb-4 scrollbar-hide">
                {TABS.map(tab => (
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

            {/* ── Payments List ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center text-sm text-gray-400">Loading payments...</div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                        <p className="text-2xl">💸</p>
                        <p className="text-sm text-gray-500">
                            {search ? 'No results match your search' : 'No orders in this category'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filtered.map(order => {
                            const days = daysSince(order.created_at)
                            const profitData = orderProfits[order.id]
                            const profit = profitData ? profitData.total_profit : 0
                            const deliveryCost = orderDeliveryCosts[order.id] || 0
                            const productPayment = Math.max(0, Number(order.amount_paid) - deliveryCost)
                            const productBalance = (profitData ? profitData.total_selling : 0) - productPayment
                            const isOverdue = ['unpaid', 'part_paid'].includes(order.payment_status) && days >= 3

                            return (
                                <div
                                    key={order.id}
                                    className={`px-5 py-4 ${isOverdue ? 'bg-red-50/30' : ''}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        {/* Left */}
                                        <div
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => navigate(`/orders/${order.id}`)}
                                        >
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {order.customer_name}
                                                </p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PAYMENT_STATUS_COLORS[order.payment_status]}`}>
                                                    {PAYMENT_STATUS_LABELS[order.payment_status]}
                                                </span>
                                                {isOverdue && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
                                                        {days}d ago
                                                    </span>
                                                )}
                                                {deliveryCost > 0 && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                                                        +₦{deliveryCost.toLocaleString()} delivery
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                {order.order_number}
                                                {order.customer_phone ? ` · ${order.customer_phone}` : ''}
                                                {order.payment_method ? ` · ${order.payment_method.replace('_', ' ')}` : ''}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {new Date(order.created_at).toLocaleDateString('en-NG', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </p>
                                        </div>

                                        {/* Right — amounts */}
                                        <div className="text-right shrink-0 space-y-0.5">
                                            <p className="text-sm font-bold text-green-600">
                                                ₦{profit.toLocaleString()} profit
                                            </p>
                                            {productPayment > 0 && (
                                                <p className="text-xs text-blue-600 font-medium">
                                                    ₦{productPayment.toLocaleString()} paid (products)
                                                </p>
                                            )}
                                            {productBalance > 0 && (
                                                <p className="text-xs text-red-500 font-medium">
                                                    ₦{productBalance.toLocaleString()} due
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {order.payment_status !== 'paid' && order.status !== 'cancelled' && (
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700 transition"
                                            >
                                                Record Payment
                                            </button>
                                            {order.customer_phone && (
                                                <a
                                                    href={`https://wa.me/234${order.customer_phone.replace(/^0/, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-green-600 border border-green-200 px-3 py-1.5 rounded-lg font-medium hover:bg-green-50 transition flex items-center gap-1"
                                                >
                                                    💬 Chase on WhatsApp
                                                </a>
                                            )}
                                            <button
                                                onClick={() => navigate(`/orders/${order.id}`)}
                                                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 ml-auto"
                                            >
                                                View order →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ── Payment Modal ── */}
            {selectedOrder && (
                <RecordPaymentModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onSaved={() => {
                        fetchOrders()
                    }}
                />
            )}
        </PageWrapper>
    )
}