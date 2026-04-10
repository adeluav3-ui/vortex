import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'

const STATUS_COLORS = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    paid: 'bg-green-50 text-green-700 border-green-200',
}

export default function Invoices() {
    const { profile } = useAuth()
    const navigate = useNavigate()

    const [invoices, setInvoices] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [deliveryCosts, setDeliveryCosts] = useState({})

    useEffect(() => {
        if (!profile?.business_id) return
        fetchInvoices()
    }, [profile?.business_id, filter])

    async function fetchInvoices() {
        setLoading(true)

        let query = supabase
            .from('invoices')
            .select(`
                *,
                vendor_orders (
                    id,
                    order_number,
                    customer_name,
                    customer_phone,
                    total_amount
                )
            `)
            .eq('business_id', profile.business_id)
            .order('created_at', { ascending: false })

        if (filter !== 'all') query = query.eq('status', filter)

        const { data: invoicesData } = await query

        // Fetch delivery costs for each invoice
        const deliveryMap = {}
        for (const inv of (invoicesData ?? [])) {
            if (inv.order_id) {
                const { data: delivery } = await supabase
                    .from('deliveries')
                    .select('delivery_cost, cost_bearer')
                    .eq('order_id', inv.order_id)
                    .eq('cost_bearer', 'customer')
                    .maybeSingle()

                if (delivery && delivery.cost_bearer === 'customer') {
                    deliveryMap[inv.id] = Number(delivery.delivery_cost) || 0
                } else {
                    deliveryMap[inv.id] = 0
                }
            } else {
                deliveryMap[inv.id] = 0
            }
        }

        setDeliveryCosts(deliveryMap)
        setInvoices(invoicesData ?? [])
        setLoading(false)
    }

    const filtered = invoices.filter(inv => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
            inv.invoice_number?.toLowerCase().includes(q) ||
            inv.vendor_orders?.customer_name?.toLowerCase().includes(q) ||
            inv.vendor_orders?.order_number?.toLowerCase().includes(q)
        )
    })

    // Calculate totals including delivery
    const totalOutstanding = invoices.reduce((sum, inv) => {
        if (inv.status === 'pending') {
            const productsTotal = Number(inv.subtotal)
            const deliveryCost = deliveryCosts[inv.id] || 0
            const grandTotal = productsTotal + deliveryCost
            const amountPaid = Number(inv.amount_paid) || 0
            const balanceDue = grandTotal - amountPaid
            return sum + balanceDue
        }
        return sum
    }, 0)

    return (
        <PageWrapper title="Invoices">

            {/* ── Summary ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                    {
                        label: 'Total Invoices',
                        value: invoices.length,
                        icon: '🧾',
                        color: 'text-gray-900',
                    },
                    {
                        label: 'Paid',
                        value: invoices.filter(i => i.status === 'paid').length,
                        icon: '✅',
                        color: 'text-green-600',
                    },
                    {
                        label: 'Outstanding',
                        value: `₦${totalOutstanding.toLocaleString()}`,
                        icon: '⏳',
                        color: totalOutstanding > 0 ? 'text-amber-600' : 'text-gray-400',
                    },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                        <span className="text-2xl">{stat.icon}</span>
                        <div>
                            <p className="text-xs text-gray-500">{stat.label}</p>
                            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Search + filter ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by customer, invoice or order number..."
                        className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-1">
                    {['all', 'pending', 'paid'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition ${filter === f
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── List ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center text-sm text-gray-400">Loading invoices...</div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                        <p className="text-3xl">🧾</p>
                        <p className="text-sm text-gray-500">
                            {search ? 'No invoices match your search' : 'No invoices yet'}
                        </p>
                        <p className="text-xs text-gray-400">
                            Open an order and generate an invoice to get started
                        </p>
                        <button
                            onClick={() => navigate('/orders')}
                            className="text-sm text-blue-600 font-medium hover:underline"
                        >
                            Go to Orders →
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filtered.map(inv => {
                            const productsTotal = Number(inv.subtotal)
                            const deliveryCost = deliveryCosts[inv.id] || 0
                            const grandTotal = productsTotal + deliveryCost
                            const amountPaid = Number(inv.amount_paid) || 0
                            const balanceDue = grandTotal - amountPaid

                            return (
                                <div
                                    key={inv.id}
                                    onClick={() => navigate(`/invoices/${inv.id}`)}
                                    className="px-5 py-4 hover:bg-gray-50 transition cursor-pointer"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {inv.vendor_orders?.customer_name ?? 'Unknown'}
                                                </p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[inv.status]}`}>
                                                    {inv.status === 'paid' ? '✓ Paid' : 'Pending'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                {inv.invoice_number} · {inv.vendor_orders?.order_number ?? '—'}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {new Date(inv.created_at).toLocaleDateString('en-NG', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </p>
                                            {deliveryCost > 0 && (
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    Includes delivery: ₦{deliveryCost.toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0 space-y-0.5">
                                            <p className="text-sm font-bold text-gray-900">
                                                ₦{grandTotal.toLocaleString()}
                                            </p>
                                            {balanceDue > 0 && inv.status !== 'paid' && (
                                                <p className="text-xs text-amber-600 font-medium">
                                                    ₦{balanceDue.toLocaleString()} due
                                                </p>
                                            )}
                                            {inv.status === 'paid' && (
                                                <p className="text-xs text-green-600 font-medium">Fully paid</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </PageWrapper>
    )
}