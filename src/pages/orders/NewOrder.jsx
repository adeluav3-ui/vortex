import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import { checkOrderLimit } from '../../lib/vendorPlanLimits'

const ORDER_SOURCES = [
    { value: 'whatsapp', label: '💬 WhatsApp' },
    { value: 'instagram', label: '📸 Instagram' },
    { value: 'website', label: '🌐 Website' },
    { value: 'referral', label: '🤝 Referral' },
    { value: 'direct', label: '🛒 Direct' },
    { value: 'other', label: '📦 Other' },
]

const PAYMENT_METHODS = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'opay', label: 'OPay' },
    { value: 'palmpay', label: 'PalmPay' },
    { value: 'paystack_link', label: 'Paystack Link' },
    { value: 'other', label: 'Other' },
]

export default function NewOrder() {
    const { profile } = useAuth()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(false)
    const [checkingLimit, setCheckingLimit] = useState(true)
    const [error, setError] = useState('')
    const [products, setProducts] = useState([])
    const [existingCustomers, setExistingCustomers] = useState([])
    const [customerSearch, setCustomerSearch] = useState('')
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
    const [productSearch, setProductSearch] = useState('')
    const [showProductDropdown, setShowProductDropdown] = useState(false)
    const [orderLimit, setOrderLimit] = useState({ atLimit: false, limit: Infinity, remaining: Infinity, current: 0 })

    // ── Always read both tier AND status for correct limit calculation ────────
    const tier = profile?.businesses?.subscription_tier ?? 'solo'
    const subStatus = profile?.subscription?.status ?? 'inactive'

    const [form, setForm] = useState({
        customer_name: '', customer_phone: '', customer_address: '',
        customer_id: null, order_source: 'whatsapp', notes: '',
        payment_method: 'bank_transfer', amount_paid: '',
    })
    const [orderItems, setOrderItems] = useState([])

    useEffect(() => {
        if (!profile?.business_id) return
        checkMonthlyLimit()
        fetchProducts()
        fetchCustomers()
    }, [profile?.business_id])

    async function checkMonthlyLimit() {
        setCheckingLimit(true)
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const { count } = await supabase
            .from('vendor_orders')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', profile.business_id)
            .gte('created_at', monthStart)
            .neq('status', 'cancelled')
        // Pass subStatus so trialing vendors always get Infinity limit
        const result = checkOrderLimit(tier, count ?? 0, subStatus)
        setOrderLimit({ ...result, current: count ?? 0 })
        setCheckingLimit(false)
    }

    async function fetchProducts() {
        const { data } = await supabase
            .from('products')
            .select(`
                id, name, is_active,
                product_variants (
                    id, name, selling_price, buying_price,
                    stock_levels ( id, quantity, branch_id )
                )
            `)
            .eq('business_id', profile.business_id)
            .eq('is_active', true)
            .order('name')

        const enriched = []
        for (const product of (data ?? [])) {
            for (const variant of (product.product_variants ?? [])) {
                const stock = variant.stock_levels?.[0]
                enriched.push({
                    id: variant.id,
                    product_id: product.id,
                    product_name: product.name,
                    variant_id: variant.id,
                    variant_name: variant.name !== 'Default' ? variant.name : null,
                    display_name: variant.name !== 'Default' ? `${product.name} - ${variant.name}` : product.name,
                    selling_price: variant.selling_price ?? 0,
                    cost_price: variant.buying_price ?? 0,
                    stock_quantity: stock?.quantity ?? 0,
                    stock_level_id: stock?.id ?? null,
                })
            }
        }
        setProducts(enriched)
    }

    async function fetchCustomers() {
        const { data } = await supabase
            .from('customers').select('id, full_name, phone')
            .eq('business_id', profile.business_id).order('full_name')
        setExistingCustomers(data ?? [])
    }

    function selectCustomer(customer) {
        setForm({ ...form, customer_name: customer.full_name, customer_phone: customer.phone ?? '', customer_id: customer.id })
        setCustomerSearch(customer.full_name)
        setShowCustomerDropdown(false)
    }

    function addProduct(product) {
        if (product.stock_quantity <= 0) {
            setError(`${product.display_name} is out of stock`)
            return
        }

        const existing = orderItems.findIndex(i => i.variant_id === product.variant_id)
        if (existing >= 0) {
            const updated = [...orderItems]
            const newQuantity = updated[existing].quantity + 1
            if (newQuantity > product.stock_quantity) {
                setError(`Only ${product.stock_quantity} units of ${product.display_name} available`)
                return
            }
            updated[existing].quantity = newQuantity
            setOrderItems(updated)
        } else {
            setOrderItems([...orderItems, {
                product_id: product.product_id,
                variant_id: product.variant_id,
                product_name: product.product_name,
                variant_name: product.variant_name,
                display_name: product.display_name,
                unit_price: product.selling_price,
                quantity: 1,
                stock_level_id: product.stock_level_id,
                max_stock: product.stock_quantity
            }])
        }
        setProductSearch('')
        setShowProductDropdown(false)
        setError('')
    }

    function addManualItem() {
        setOrderItems([...orderItems, {
            product_id: null,
            variant_id: null,
            product_name: '',
            variant_name: '',
            display_name: '',
            unit_price: '',
            quantity: 1,
            stock_level_id: null,
            max_stock: null
        }])
    }

    function updateItem(index, field, value) {
        const updated = [...orderItems]

        if (field === 'quantity') {
            const newQuantity = parseInt(value) || 0
            const maxStock = updated[index].max_stock

            if (maxStock !== null && newQuantity > maxStock) {
                setError(`Only ${maxStock} units of ${updated[index].display_name || updated[index].product_name} available`)
                return
            }
            setError('')
        }

        updated[index] = { ...updated[index], [field]: value }

        if (field === 'product_name' && !updated[index].variant_name) {
            updated[index].display_name = value
        } else if (field === 'variant_name' && updated[index].product_name) {
            updated[index].display_name = `${updated[index].product_name} - ${value}`
        }

        setOrderItems(updated)
    }

    function removeItem(index) {
        setOrderItems(orderItems.filter((_, i) => i !== index))
        setError('')
    }

    const totalAmount = orderItems.reduce((sum, item) => sum + (Number(item.unit_price) * Number(item.quantity) || 0), 0)
    const amountPaid = Number(form.amount_paid) || 0
    const balanceDue = totalAmount - amountPaid
    const paymentStatus = amountPaid <= 0 ? 'unpaid' : amountPaid >= totalAmount ? 'paid' : 'part_paid'
    const filteredCustomers = existingCustomers.filter(c => c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch)).slice(0, 6)
    const filteredProducts = products.filter(p => p.display_name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 6)

    async function handleSubmit() {
        setError('')
        if (!form.customer_name.trim()) return setError('Customer name is required')
        if (orderItems.length === 0) return setError('Add at least one item to the order')
        if (orderItems.some(i => !i.product_name || !i.unit_price)) return setError('All items need a name and price')

        for (const item of orderItems) {
            if (item.max_stock !== null && item.quantity > item.max_stock) {
                setError(`Insufficient stock for ${item.display_name || item.product_name}. Only ${item.max_stock} available.`)
                return
            }
        }

        setLoading(true)
        try {
            const { data: seqData, error: seqError } = await supabase.rpc('generate_order_number', { business_uuid: profile.business_id })
            if (seqError) throw seqError

            // Customer upsert
            let customerId = form.customer_id
            if (!customerId) {
                const customerName = form.customer_name.trim()
                const customerPhone = form.customer_phone.trim() || null
                if (customerPhone) {
                    const { data: existing } = await supabase.from('customers').select('id').eq('business_id', profile.business_id).eq('phone', customerPhone).maybeSingle()
                    if (existing) {
                        await supabase.from('customers').update({ full_name: customerName }).eq('id', existing.id)
                        customerId = existing.id
                    } else {
                        const { data: newC } = await supabase.from('customers').insert({ business_id: profile.business_id, branch_id: null, full_name: customerName, phone: customerPhone }).select('id').single()
                        customerId = newC?.id ?? null
                    }
                } else {
                    const { data: newC } = await supabase.from('customers').insert({ business_id: profile.business_id, branch_id: null, full_name: customerName }).select('id').single()
                    customerId = newC?.id ?? null
                }
            }

            const { data: order, error: orderError } = await supabase
                .from('vendor_orders')
                .insert({
                    business_id: profile.business_id, order_number: seqData,
                    customer_id: customerId, customer_name: form.customer_name.trim(),
                    customer_phone: form.customer_phone.trim() || null,
                    customer_address: form.customer_address.trim() || null,
                    order_source: form.order_source, notes: form.notes.trim() || null,
                    total_amount: totalAmount, amount_paid: amountPaid,
                    payment_status: paymentStatus, payment_method: amountPaid > 0 ? form.payment_method : null,
                    status: 'pending',
                })
                .select().single()
            if (orderError) throw orderError

            for (const item of orderItems) {
                const { error: itemsError } = await supabase.from('order_items').insert({
                    order_id: order.id, product_id: item.product_id,
                    product_name: item.product_name, variant_name: item.variant_name || null,
                    variant_id: item.variant_id, unit_price: Number(item.unit_price), quantity: Number(item.quantity),
                })
                if (itemsError) throw itemsError

                if (item.stock_level_id && item.variant_id) {
                    const { data: currentStock, error: stockFetchError } = await supabase.from('stock_levels').select('quantity').eq('id', item.stock_level_id).single()
                    if (stockFetchError) throw stockFetchError
                    const { error: stockUpdateError } = await supabase.from('stock_levels').update({ quantity: currentStock.quantity - Number(item.quantity) }).eq('id', item.stock_level_id)
                    if (stockUpdateError) throw stockUpdateError
                    await supabase.from('stock_movements').insert({
                        business_id: profile.business_id, branch_id: profile.branch_id,
                        variant_id: item.variant_id, user_id: profile.id, type: 'sale',
                        quantity: -Number(item.quantity),
                        note: `Order #${seqData} - ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''}`,
                    })
                }
            }

            await supabase.from('order_status_history').insert({ order_id: order.id, status: 'pending', changed_by: profile.id })
            navigate(`/orders/${order.id}`)
        } catch (err) {
            setError(err.message)
            setLoading(false)
        }
    }

    if (checkingLimit) {
        return <PageWrapper title="New Order"><div className="py-20 text-center text-sm text-gray-400">Checking order limit...</div></PageWrapper>
    }

    if (orderLimit.atLimit) {
        return (
            <PageWrapper title="New Order">
                <div className="max-w-md mx-auto mt-10 bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
                    <span className="text-5xl">🔒</span>
                    <h2 className="text-lg font-bold text-gray-900">Monthly order limit reached</h2>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        You've used <span className="font-semibold text-gray-700">{orderLimit.current}</span> of your{' '}
                        <span className="font-semibold text-gray-700">{orderLimit.limit}</span> orders this month on the{' '}
                        <span className="font-semibold capitalize">{tier}</span> plan.
                    </p>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full w-full" />
                    </div>
                    <p className="text-xs text-gray-400">Upgrade your plan to continue recording orders, or wait until next month.</p>
                    <div className="flex gap-3">
                        <button onClick={() => navigate('/orders')} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition">Back to Orders</button>
                        <button onClick={() => navigate('/settings/billing')} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 transition">Upgrade Plan →</button>
                    </div>
                </div>
            </PageWrapper>
        )
    }

    return (
        <PageWrapper title="New Order">
            <div className="flex items-center justify-between mb-5">
                <button onClick={() => navigate('/orders')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">← Back</button>
                {orderLimit.limit !== Infinity && (
                    <div className={`text-xs px-3 py-1.5 rounded-full font-medium ${orderLimit.remaining <= 10 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                        {orderLimit.remaining} orders left this month
                    </div>
                )}
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4"><p className="text-sm text-red-600">{error}</p></div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    {/* Customer */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900">Customer</h3>
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name <span className="text-red-500">*</span></label>
                            <input
                                value={customerSearch || form.customer_name}
                                onChange={e => { const v = e.target.value; setCustomerSearch(v); setForm({ ...form, customer_name: v, customer_id: null }); setShowCustomerDropdown(v.length > 0) }}
                                onFocus={() => setShowCustomerDropdown(existingCustomers.length > 0)}
                                placeholder="Search existing or type new customer name"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {showCustomerDropdown && filteredCustomers.length > 0 && (
                                <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 overflow-hidden">
                                    {filteredCustomers.map(c => (
                                        <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition">
                                            <p className="text-sm font-medium text-gray-900">{c.full_name}</p>
                                            {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} placeholder="08012345678" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Order Source</label>
                                <select value={form.order_source} onChange={e => setForm({ ...form, order_source: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                    {ORDER_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                            <textarea value={form.customer_address} onChange={e => setForm({ ...form, customer_address: e.target.value })} rows={2} placeholder="Customer's delivery address" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any special instructions..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900">Order Items</h3>
                        <div className="relative">
                            <input value={productSearch} onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(e.target.value.length > 0) }}
                                placeholder="🔍 Search products to add..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            {showProductDropdown && filteredProducts.length > 0 && (
                                <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 overflow-hidden max-h-64 overflow-y-auto">
                                    {filteredProducts.map(p => (
                                        <button key={p.id} onClick={() => addProduct(p)} disabled={p.stock_quantity <= 0}
                                            className={`w-full text-left px-4 py-2.5 transition flex items-center justify-between ${p.stock_quantity <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'}`}>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{p.display_name}</p>
                                                <p className="text-xs text-gray-400">{p.stock_quantity} in stock</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-blue-600 font-medium">₦{Number(p.selling_price).toLocaleString()}</p>
                                                {p.stock_quantity <= 0 && <p className="text-xs text-red-500">Out of stock</p>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {orderItems.length > 0 && (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {orderItems.map((item, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-2">
                                        <div className="flex items-start gap-2">
                                            <div className="flex-1 space-y-2">
                                                <input value={item.product_name} onChange={e => updateItem(index, 'product_name', e.target.value)} placeholder="Product name"
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                                {item.variant_name && <p className="text-xs text-gray-500 px-1">Variant: {item.variant_name}</p>}
                                                <input value={item.variant_name || ''} onChange={e => updateItem(index, 'variant_name', e.target.value)} placeholder="Variant (e.g. Red, Size L) — optional"
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <button onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600 mt-1 shrink-0">✕</button>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="text-xs text-gray-500 mb-0.5 block">Unit Price (₦)</label>
                                                <input type="number" value={item.unit_price} onChange={e => updateItem(index, 'unit_price', e.target.value)} placeholder="0"
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div className="w-24">
                                                <label className="text-xs text-gray-500 mb-0.5 block">Qty</label>
                                                <input type="number" min="1" max={item.max_stock} value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                                {item.max_stock !== null && <p className="text-xs text-gray-400 mt-0.5">Max: {item.max_stock}</p>}
                                            </div>
                                            <div className="w-28 text-right">
                                                <label className="text-xs text-gray-500 mb-0.5 block">Subtotal</label>
                                                <p className="text-sm font-semibold text-gray-900 mt-2">₦{(Number(item.unit_price) * Number(item.quantity) || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={addManualItem} className="w-full border border-dashed border-gray-300 text-gray-500 rounded-lg py-2.5 text-sm hover:border-blue-400 hover:text-blue-500 transition">+ Add item manually</button>
                    </div>
                </div>

                {/* Right — summary + payment */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">Order Summary</h3>
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Items</span><span className="font-medium text-gray-800">{orderItems.length}</span></div>
                        <div className="flex justify-between text-sm border-t border-gray-100 pt-3"><span className="text-gray-500">Total Amount</span><span className="font-bold text-gray-900 text-base">₦{totalAmount.toLocaleString()}</span></div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900">Payment</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid Now (₦)</label>
                            <input type="number" value={form.amount_paid} onChange={e => setForm({ ...form, amount_paid: e.target.value })} placeholder="0 if not paid yet"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        {amountPaid > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                                <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                        )}
                        {totalAmount > 0 && (
                            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="font-medium text-green-600">₦{amountPaid.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Balance Due</span><span className={`font-bold ${balanceDue > 0 ? 'text-red-500' : 'text-green-600'}`}>₦{balanceDue.toLocaleString()}</span></div>
                                <div className="flex justify-between pt-1 border-t border-gray-200">
                                    <span className="text-gray-500">Status</span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : paymentStatus === 'part_paid' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                                        {paymentStatus === 'part_paid' ? 'Part Paid' : paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                        {loading ? 'Creating Order...' : 'Create Order →'}
                    </button>
                </div>
            </div>
        </PageWrapper>
    )
}