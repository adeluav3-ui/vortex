// src/pages/customers/ComboCustomers.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'

const PAYMENT_COLORS = {
    unpaid: 'bg-red-50 text-red-600',
    part_paid: 'bg-amber-50 text-amber-700',
    paid: 'bg-green-50 text-green-700',
}

export default function ComboCustomers() {
    const { profile } = useAuth()
    const navigate = useNavigate()

    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [selected, setSelected] = useState(null)
    const [selectedTransactions, setSelectedTransactions] = useState([])
    const [selectedProducts, setSelectedProducts] = useState([])
    const [loadingDetail, setLoadingDetail] = useState(false)

    useEffect(() => {
        if (!profile?.business_id) return
        fetchCustomers()
    }, [profile?.business_id])

    async function fetchCustomers() {
        setLoading(true)

        try {
            // Fetch all customers
            const { data: customerData } = await supabase
                .from('customers')
                .select('id, full_name, phone, email, created_at')
                .eq('business_id', profile.business_id)
                .order('full_name')

            if (!customerData || customerData.length === 0) {
                setCustomers([])
                setLoading(false)
                return
            }

            const customerIds = customerData.map(c => c.id)

            // Fetch vendor orders
            const { data: vendorOrdersData } = await supabase
                .from('vendor_orders')
                .select(`
                    id, customer_id, order_number, total_amount, amount_paid, 
                    balance_due, payment_status, status, created_at,
                    order_items (
                        id, product_name, variant_name, quantity, unit_price, subtotal
                    )
                `)
                .eq('business_id', profile.business_id)
                .in('customer_id', customerIds)
                .neq('status', 'cancelled')
                .order('created_at', { ascending: false })

            // Fetch POS sales (without nested select)
            const { data: posSalesData } = await supabase
                .from('sales')
                .select('id, customer_id, sale_number, total, payment_status, created_at')
                .eq('business_id', profile.business_id)
                .in('customer_id', customerIds)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })

            // Fetch sale items separately
            let saleItemsMap = {}
            if (posSalesData && posSalesData.length > 0) {
                const saleIds = posSalesData.map(s => s.id)
                const { data: saleItemsData } = await supabase
                    .from('sale_items')
                    .select('*')
                    .in('sale_id', saleIds)

                saleItemsMap = (saleItemsData || []).reduce((acc, item) => {
                    if (!acc[item.sale_id]) acc[item.sale_id] = []
                    acc[item.sale_id].push(item)
                    return acc
                }, {})
            }

            // Fetch delivery costs for vendor orders
            const vendorOrderIds = (vendorOrdersData ?? []).map(o => o.id)
            const deliveryMap = {}

            if (vendorOrderIds.length > 0) {
                const { data: deliveriesData } = await supabase
                    .from('deliveries')
                    .select('order_id, delivery_cost, cost_bearer')
                    .in('order_id', vendorOrderIds)
                    .eq('cost_bearer', 'customer')

                for (const delivery of (deliveriesData ?? [])) {
                    deliveryMap[delivery.order_id] = Number(delivery.delivery_cost) || 0
                }
            }

            // Calculate stats per customer
            const enriched = customerData.map(customer => {
                const customerVendorOrders = (vendorOrdersData ?? []).filter(o => o.customer_id === customer.id)
                const customerPosSales = (posSalesData ?? []).filter(s => s.customer_id === customer.id)

                let totalProductValue = 0
                let totalProductPaid = 0
                let totalOrders = customerVendorOrders.length + customerPosSales.length

                // Process vendor orders
                for (const order of customerVendorOrders) {
                    const deliveryCost = deliveryMap[order.id] || 0
                    const orderProductValue = order.order_items?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0
                    totalProductValue += orderProductValue

                    const totalOrderValue = Number(order.total_amount)
                    const productRatio = totalOrderValue > 0 ? orderProductValue / totalOrderValue : 1
                    const productPayment = Math.min(orderProductValue, Number(order.amount_paid) * productRatio)
                    totalProductPaid += productPayment
                }

                // Process POS sales
                for (const sale of customerPosSales) {
                    const saleItems = saleItemsMap[sale.id] || []
                    const saleProductValue = saleItems.reduce((sum, item) => sum + Number(item.subtotal), 0) || sale.total || 0
                    totalProductValue += saleProductValue
                    totalProductPaid += saleProductValue // POS sales are fully paid
                }

                const outstanding = totalProductValue - totalProductPaid

                return {
                    ...customer,
                    totalOrders,
                    totalProductValue,
                    totalProductPaid,
                    outstanding: Math.max(0, outstanding),
                    vendorOrdersCount: customerVendorOrders.length,
                    posSalesCount: customerPosSales.length
                }
            })

            setCustomers(enriched)
        } catch (err) {
            console.error('Error fetching customers:', err)
        } finally {
            setLoading(false)
        }
    }

    async function openCustomer(customer) {
        setSelected(customer)
        setLoadingDetail(true)

        try {
            // Fetch vendor orders
            const { data: vendorOrders } = await supabase
                .from('vendor_orders')
                .select(`
                    id, order_number, total_amount, amount_paid, balance_due,
                    payment_status, status, created_at,
                    order_items (
                        id, product_name, variant_name, quantity, unit_price, subtotal
                    )
                `)
                .eq('business_id', profile.business_id)
                .eq('customer_id', customer.id)
                .neq('status', 'cancelled')
                .order('created_at', { ascending: false })

            // Fetch POS sales
            const { data: posSales } = await supabase
                .from('sales')
                .select('id, sale_number, total, payment_status, created_at')
                .eq('business_id', profile.business_id)
                .eq('customer_id', customer.id)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })

            // Fetch sale items for POS sales
            let saleItemsMap = {}
            if (posSales && posSales.length > 0) {
                const saleIds = posSales.map(s => s.id)
                const { data: saleItemsData } = await supabase
                    .from('sale_items')
                    .select('*')
                    .in('sale_id', saleIds)

                saleItemsMap = (saleItemsData || []).reduce((acc, item) => {
                    if (!acc[item.sale_id]) acc[item.sale_id] = []
                    acc[item.sale_id].push(item)
                    return acc
                }, {})
            }

            // Fetch delivery costs
            const vendorOrderIds = (vendorOrders ?? []).map(o => o.id)
            const deliveryMap = {}

            if (vendorOrderIds.length > 0) {
                const { data: deliveriesData } = await supabase
                    .from('deliveries')
                    .select('order_id, delivery_cost, cost_bearer')
                    .in('order_id', vendorOrderIds)
                    .eq('cost_bearer', 'customer')

                for (const delivery of (deliveriesData ?? [])) {
                    deliveryMap[delivery.order_id] = Number(delivery.delivery_cost) || 0
                }
            }

            // Process vendor orders
            const processedVendorOrders = (vendorOrders ?? []).map(order => {
                const deliveryCost = deliveryMap[order.id] || 0
                const orderProductValue = order.order_items?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0
                const totalOrderValue = Number(order.total_amount)
                const productRatio = totalOrderValue > 0 ? orderProductValue / totalOrderValue : 1
                const productPaid = Math.min(orderProductValue, Number(order.amount_paid) * productRatio)
                const productBalance = orderProductValue - productPaid

                return {
                    ...order,
                    deliveryCost,
                    orderProductValue,
                    productPaid,
                    productBalance,
                    source: 'online',
                    sourceIcon: '🛍️',
                    sourceLabel: 'Online Order'
                }
            })

            // Process POS sales
            const processedPosSales = (posSales ?? []).map(sale => {
                const saleItems = saleItemsMap[sale.id] || []
                const saleProductValue = saleItems.reduce((sum, item) => sum + Number(item.subtotal), 0) || sale.total || 0
                return {
                    id: sale.id,
                    order_number: sale.sale_number,
                    total_amount: sale.total,
                    amount_paid: sale.total,
                    balance_due: 0,
                    payment_status: 'paid',
                    status: 'completed',
                    created_at: sale.created_at,
                    order_items: saleItems,
                    orderProductValue: saleProductValue,
                    productPaid: saleProductValue,
                    productBalance: 0,
                    deliveryCost: 0,
                    source: 'pos',
                    sourceIcon: '🏪',
                    sourceLabel: 'Store Purchase'
                }
            })

            // Combine all transactions
            const allTransactions = [...processedVendorOrders, ...processedPosSales]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

            setSelectedTransactions(allTransactions)

            // Build product summary
            const productMap = {}

            for (const order of processedVendorOrders) {
                const paymentRatio = order.orderProductValue > 0 ? order.productPaid / order.orderProductValue : 0
                for (const item of (order.order_items ?? [])) {
                    const key = item.product_name + (item.variant_name ? ` (${item.variant_name})` : '')
                    if (!productMap[key]) {
                        productMap[key] = { name: key, totalQty: 0, totalValue: 0, totalPaid: 0 }
                    }
                    productMap[key].totalQty += Number(item.quantity)
                    const itemValue = Number(item.subtotal)
                    productMap[key].totalValue += itemValue
                    productMap[key].totalPaid += itemValue * paymentRatio
                }
            }

            for (const sale of processedPosSales) {
                for (const item of (sale.order_items ?? [])) {
                    const key = item.product_name + (item.variant_name ? ` (${item.variant_name})` : '')
                    if (!productMap[key]) {
                        productMap[key] = { name: key, totalQty: 0, totalValue: 0, totalPaid: 0 }
                    }
                    productMap[key].totalQty += Number(item.quantity)
                    const itemValue = Number(item.subtotal)
                    productMap[key].totalValue += itemValue
                    productMap[key].totalPaid += itemValue
                }
            }

            const products = Object.values(productMap)
                .sort((a, b) => b.totalPaid - a.totalPaid)
                .map(p => ({
                    name: p.name,
                    totalQty: p.totalQty,
                    totalSpent: p.totalPaid
                }))

            setSelectedProducts(products)
        } catch (err) {
            console.error('Error fetching customer details:', err)
        } finally {
            setLoadingDetail(false)
        }
    }

    const filtered = customers.filter(c => {
        const matchSearch = !search.trim() ||
            c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            c.phone?.includes(search)
        const matchFilter = filter === 'owes' ? c.outstanding > 0 : true
        return matchSearch && matchFilter
    })

    const totalOutstandingAll = customers.reduce((s, c) => s + c.outstanding, 0)
    const totalProductValueAll = customers.reduce((s, c) => s + c.totalProductValue, 0)
    const totalProductPaidAll = customers.reduce((s, c) => s + c.totalProductPaid, 0)

    return (
        <PageWrapper title="Customers">

            {/* Customer detail drawer */}
            {selected && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
                    <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden">

                        {/* Header */}
                        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between bg-white shrink-0">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                                        {selected.full_name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-gray-900">{selected.full_name}</h2>
                                        {selected.phone && <p className="text-xs text-gray-500">{selected.phone}</p>}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl p-1 shrink-0">✕</button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 shrink-0">
                            <div className="px-3 py-3 text-center">
                                <p className="text-sm font-bold text-gray-900">{selected.totalOrders}</p>
                                <p className="text-xs text-gray-400 mt-0.5">Total Transactions</p>
                                <p className="text-xs text-gray-400">
                                    ({selected.vendorOrdersCount || 0} online · {selected.posSalesCount || 0} store)
                                </p>
                            </div>
                            <div className="px-3 py-3 text-center">
                                <p className="text-sm font-bold text-gray-900">₦{Number(selected.totalProductValue).toLocaleString()}</p>
                                <p className="text-xs text-gray-400 mt-0.5">Total Spent</p>
                            </div>
                            <div className="px-3 py-3 text-center">
                                <p className={`text-sm font-bold ${selected.outstanding > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    ₦{Number(selected.outstanding).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">Balance</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-4 py-3 border-b border-gray-100 flex gap-2 shrink-0">
                            {selected.phone && (
                                <>
                                    <a href={`https://wa.me/234${selected.phone.replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 text-white text-xs font-semibold py-2 rounded-lg hover:bg-green-600 transition">
                                        💬 WhatsApp
                                    </a>
                                    <a href={`tel:${selected.phone}`}
                                        className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 text-xs font-medium py-2 rounded-lg hover:bg-gray-50 transition">
                                        📞 Call
                                    </a>
                                </>
                            )}
                            <button
                                onClick={() => { setSelected(null); navigate('/orders/new') }}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-blue-700 transition">
                                ➕ New Order
                            </button>
                        </div>

                        {loadingDetail ? (
                            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading...</div>
                        ) : (
                            <div className="flex-1 overflow-y-auto">

                                {/* Products bought */}
                                {selectedProducts.length > 0 && (
                                    <div>
                                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Products Purchased</p>
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                            {selectedProducts.map(p => (
                                                <div key={p.name} className="px-5 py-3 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                                                        <p className="text-xs text-gray-400">{p.totalQty} unit{p.totalQty !== 1 ? 's' : ''}</p>
                                                    </div>
                                                    <p className="text-sm font-semibold text-gray-700">₦{Number(p.totalSpent).toLocaleString()}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Transaction history */}
                                <div>
                                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 border-t border-gray-100">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Transaction History</p>
                                    </div>
                                    {selectedTransactions.length === 0 ? (
                                        <div className="py-10 text-center text-sm text-gray-400">No transactions yet</div>
                                    ) : (
                                        <div className="divide-y divide-gray-50">
                                            {selectedTransactions.map(transaction => (
                                                <div
                                                    key={transaction.id}
                                                    onClick={() => {
                                                        setSelected(null)
                                                        if (transaction.source === 'online') {
                                                            navigate(`/orders/${transaction.id}`)
                                                        } else {
                                                            navigate(`/sales`)
                                                        }
                                                    }}
                                                    className="px-5 py-3 hover:bg-gray-50 cursor-pointer transition"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-base">{transaction.sourceIcon}</span>
                                                                <p className="text-sm font-medium text-gray-900">{transaction.order_number}</p>
                                                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${transaction.source === 'online' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                                                    {transaction.sourceLabel}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-400 mt-0.5">
                                                                {new Date(transaction.created_at).toLocaleDateString('en-NG', {
                                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                                })}
                                                            </p>
                                                            {transaction.order_items?.length > 0 && (
                                                                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-44">
                                                                    {transaction.order_items.slice(0, 2).map(i => i.product_name).join(', ')}
                                                                    {transaction.order_items.length > 2 && '...'}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right shrink-0 ml-3">
                                                            <p className="text-sm font-bold text-gray-900">₦{Number(transaction.orderProductValue).toLocaleString()}</p>
                                                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PAYMENT_COLORS[transaction.payment_status]}`}>
                                                                {transaction.payment_status === 'part_paid' ? 'Part paid' : transaction.payment_status}
                                                            </span>
                                                            {transaction.productBalance > 0 && (
                                                                <p className="text-xs text-red-400 mt-0.5">₦{Number(transaction.productBalance).toLocaleString()} owed</p>
                                                            )}
                                                            {transaction.deliveryCost > 0 && (
                                                                <p className="text-xs text-gray-400 mt-0.5">+₦{transaction.deliveryCost.toLocaleString()} delivery</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Summary banner */}
            {totalOutstandingAll > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-red-700">
                                <span className="font-semibold">{customers.filter(c => c.outstanding > 0).length} customers</span> owe
                                <span className="font-semibold"> ₦{totalOutstandingAll.toLocaleString()}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Total spent: ₦{totalProductValueAll.toLocaleString()} · Total paid: ₦{totalProductPaidAll.toLocaleString()}
                            </p>
                        </div>
                        <button onClick={() => setFilter(filter === 'owes' ? 'all' : 'owes')} className="text-xs text-red-600 font-medium hover:underline">
                            {filter === 'owes' ? 'Show all' : 'View only'}
                        </button>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or phone..."
                        className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Customer list */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center text-sm text-gray-400">Loading customers...</div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                        <p className="text-3xl">👥</p>
                        <p className="text-sm text-gray-500">{search ? 'No customers match your search' : 'No customers yet'}</p>
                        <p className="text-xs text-gray-400">Customers are automatically added when you create orders or sales</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filtered.map(customer => (
                            <div
                                key={customer.id}
                                onClick={() => openCustomer(customer)}
                                className="px-5 py-4 hover:bg-gray-50 cursor-pointer transition flex items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                                        {customer.full_name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{customer.full_name}</p>
                                        <p className="text-xs text-gray-400">
                                            {customer.phone ?? 'No phone'} · {customer.totalOrders} transaction{customer.totalOrders !== 1 ? 's' : ''}
                                            {customer.vendorOrdersCount > 0 && customer.posSalesCount > 0 && (
                                                <span className="ml-1">(🛍️{customer.vendorOrdersCount} · 🏪{customer.posSalesCount})</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-green-600">₦{Number(customer.totalProductPaid).toLocaleString()}</p>
                                    <p className="text-xs text-gray-400">of ₦{Number(customer.totalProductValue).toLocaleString()}</p>
                                    {customer.outstanding > 0 ? (
                                        <p className="text-xs text-red-500 font-medium">₦{Number(customer.outstanding).toLocaleString()} owed</p>
                                    ) : (
                                        <p className="text-xs text-green-500 font-medium">All paid</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Customer count */}
            {filtered.length > 0 && (
                <p className="text-xs text-center text-gray-400 mt-4">
                    {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
                    {filter === 'owes' ? ' with outstanding balance' : ''}
                </p>
            )}
        </PageWrapper>
    )
}