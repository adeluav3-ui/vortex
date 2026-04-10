import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'

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

const STATUS_FLOW = ['pending', 'confirmed', 'completed']

const NEXT_STATUS_LABELS = {
    pending: 'Confirm Order',
    confirmed: 'Complete Order',
}

export default function OrderDetail() {
    const { id } = useParams()
    const { profile } = useAuth()
    const navigate = useNavigate()

    const [order, setOrder] = useState(null)
    const [items, setItems] = useState([])
    const [history, setHistory] = useState([])
    const [delivery, setDelivery] = useState(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [generatingInvoice, setGeneratingInvoice] = useState(false)
    const [existingInvoice, setExistingInvoice] = useState(null)
    const [error, setError] = useState('')

    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
    const [paymentError, setPaymentError] = useState('')

    const [showDeliveryModal, setShowDeliveryModal] = useState(false)
    const [deliveryForm, setDeliveryForm] = useState({
        courier_name: '', tracking_number: '', delivery_cost: '',
        cost_bearer: 'customer', estimated_delivery_date: '', notes: '',
    })

    useEffect(() => {
        if (!id || !profile?.business_id) return
        fetchAll()
    }, [id, profile?.business_id])

    useEffect(() => {
        document.body.style.overflow = (showPaymentModal || showDeliveryModal) ? 'hidden' : 'unset'
        return () => { document.body.style.overflow = 'unset' }
    }, [showPaymentModal, showDeliveryModal])

    async function fetchAll() {
        setLoading(true)
        setError('')
        try {
            const [orderRes, itemsRes, historyRes, deliveryRes, invoiceRes] = await Promise.all([
                supabase.from('vendor_orders').select('*').eq('id', id).single(),
                supabase.from('order_items').select('*').eq('order_id', id).order('created_at'),
                supabase.from('order_status_history').select('*, profiles(full_name)').eq('order_id', id).order('created_at', { ascending: false }),
                supabase.from('deliveries').select('*').eq('order_id', id).maybeSingle(),
                supabase.from('invoices').select('id, invoice_number, status').eq('order_id', id).maybeSingle(),
            ])
            if (orderRes.error) throw orderRes.error
            if (itemsRes.error) throw itemsRes.error
            setOrder(orderRes.data)
            setItems(itemsRes.data ?? [])
            setHistory(historyRes.data ?? [])
            setDelivery(deliveryRes.data)
            setExistingInvoice(invoiceRes.data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleGenerateInvoice() {
        if (existingInvoice) { navigate(`/invoices/${existingInvoice.id}`); return }
        setGeneratingInvoice(true)
        setError('')
        try {
            const { data: seqData, error: seqError } = await supabase.rpc('generate_invoice_number', { business_uuid: profile?.business_id })
            if (seqError) throw seqError

            // Include delivery cost if customer bears it
            const deliveryCost = (delivery && delivery.cost_bearer === 'customer')
                ? Number(delivery.delivery_cost) || 0
                : 0
            const grandTotal = Number(order.total_amount) + deliveryCost
            const balanceDue = grandTotal - Number(order.amount_paid)

            const { data: newInvoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert({
                    business_id: profile?.business_id,
                    order_id: id,
                    invoice_number: seqData,
                    status: 'pending',
                    subtotal: order.total_amount,       // products only
                    delivery_cost: deliveryCost,        // delivery separately
                    amount_paid: order.amount_paid,
                    balance_due: balanceDue,            // full balance including delivery
                })
                .select().single()
            if (invoiceError) throw invoiceError
            setExistingInvoice(newInvoice)
            navigate(`/invoices/${newInvoice.id}`)
        } catch (err) {
            setError('Failed to generate invoice: ' + err.message)
        } finally {
            setGeneratingInvoice(false)
        }
    }

    async function updateStatus(newStatus) {
        setUpdating(true)
        setError('')
        try {
            const { error: e1 } = await supabase.from('vendor_orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id)
            if (e1) throw e1
            await supabase.from('order_status_history').insert({ order_id: id, status: newStatus, changed_by: profile?.id })
            await fetchAll()
        } catch (err) { setError('Failed to update status: ' + err.message) }
        finally { setUpdating(false) }
    }

    async function handlePaymentUpdate() {
        const amount = Number(paymentAmount)
        const balanceDue = Number(order.balance_due)
        if (!paymentAmount || isNaN(amount) || amount <= 0) return setPaymentError('Please enter a valid amount')
        if (amount > balanceDue) return setPaymentError(`Amount cannot exceed balance due of ₦${balanceDue.toLocaleString()}`)
        setUpdating(true)
        setPaymentError('')
        try {
            const newAmountPaid = Number(order.amount_paid) + amount
            const newPaymentStatus = newAmountPaid >= Number(order.total_amount) ? 'paid' : newAmountPaid > 0 ? 'part_paid' : 'unpaid'
            const { error: e } = await supabase.from('vendor_orders').update({ amount_paid: newAmountPaid, payment_status: newPaymentStatus, payment_method: paymentMethod, updated_at: new Date().toISOString() }).eq('id', id)
            if (e) throw e
            setPaymentAmount('')
            setShowPaymentModal(false)
            await fetchAll()
        } catch (err) { setPaymentError('Failed to record payment: ' + err.message) }
        finally { setUpdating(false) }
    }

    async function handleSaveDelivery() {
        if (!deliveryForm.courier_name) return setError('Courier name is required')
        setUpdating(true)
        setError('')
        try {
            const payload = { order_id: id, business_id: profile?.business_id, courier_name: deliveryForm.courier_name, tracking_number: deliveryForm.tracking_number || null, delivery_cost: Number(deliveryForm.delivery_cost) || 0, cost_bearer: deliveryForm.cost_bearer, estimated_delivery_date: deliveryForm.estimated_delivery_date || null, notes: deliveryForm.notes || null, status: delivery?.status ?? 'pending' }
            if (delivery) {
                const { error: e } = await supabase.from('deliveries').update(payload).eq('id', delivery.id)
                if (e) throw e
            } else {
                const { error: e } = await supabase.from('deliveries').insert(payload)
                if (e) throw e
            }
            setShowDeliveryModal(false)
            resetDeliveryForm()
            await fetchAll()
        } catch (err) { setError('Failed to save delivery: ' + err.message) }
        finally { setUpdating(false) }
    }

    async function updateDeliveryStatus(newStatus) {
        if (!delivery) return
        setUpdating(true)
        try {
            await supabase.from('deliveries').update({ status: newStatus, ...(newStatus === 'delivered' ? { delivered_at: new Date().toISOString() } : {}), updated_at: new Date().toISOString() }).eq('id', delivery.id)
            await fetchAll()
        } catch (err) { setError('Failed to update delivery status') }
        finally { setUpdating(false) }
    }

    function resetDeliveryForm() {
        setDeliveryForm({ courier_name: '', tracking_number: '', delivery_cost: '', cost_bearer: 'customer', estimated_delivery_date: '', notes: '' })
    }

    function openDeliveryModal() {
        delivery ? setDeliveryForm({ courier_name: delivery.courier_name ?? '', tracking_number: delivery.tracking_number ?? '', delivery_cost: delivery.delivery_cost?.toString() ?? '', cost_bearer: delivery.cost_bearer ?? 'customer', estimated_delivery_date: delivery.estimated_delivery_date ?? '', notes: delivery.notes ?? '' }) : resetDeliveryForm()
        setShowDeliveryModal(true)
    }

    if (loading) return <PageWrapper title="Order"><div className="py-20 text-center text-sm text-gray-400">Loading order...</div></PageWrapper>
    if (!order) return <PageWrapper title="Order"><div className="py-20 text-center text-sm text-gray-400">Order not found.</div></PageWrapper>

    const currentStepIndex = STATUS_FLOW.indexOf(order.status)
    const nextStatus = currentStepIndex >= 0 && currentStepIndex < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentStepIndex + 1] : null

    return (
        <PageWrapper title={order.order_number}>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                <button onClick={() => navigate('/orders')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">← Back to Orders</button>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {order.status !== 'cancelled' && order.status !== 'completed' && (
                        <button onClick={() => updateStatus('cancelled')} disabled={updating} className="flex-1 sm:flex-initial text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition disabled:opacity-50">Cancel Order</button>
                    )}
                    {nextStatus && (
                        <button onClick={() => updateStatus(nextStatus)} disabled={updating} className="flex-1 sm:flex-initial text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                            {updating ? 'Updating...' : NEXT_STATUS_LABELS[order.status]}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    {/* Order header */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">{order.customer_name}</h2>
                                {order.customer_phone && <p className="text-sm text-gray-500">{order.customer_phone}</p>}
                                {order.customer_address && <p className="text-sm text-gray-400 mt-0.5">📍 {order.customer_address}</p>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${ORDER_STATUS_COLORS[order.status]}`}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PAYMENT_STATUS_COLORS[order.payment_status]}`}>{order.payment_status === 'part_paid' ? 'Part Paid' : order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm pt-4 border-t border-gray-100">
                            <div><p className="text-xs text-gray-400">Order Number</p><p className="font-medium text-gray-800">{order.order_number}</p></div>
                            <div><p className="text-xs text-gray-400">Source</p><p className="font-medium text-gray-800 capitalize">{order.order_source}</p></div>
                            <div><p className="text-xs text-gray-400">Date</p><p className="font-medium text-gray-800">{new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                        </div>
                        {order.notes && <div className="mt-3 pt-3 border-t border-gray-100"><p className="text-xs text-gray-400 mb-1">Notes</p><p className="text-sm text-gray-600">{order.notes}</p></div>}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            {existingInvoice ? (
                                <button onClick={() => navigate(`/invoices/${existingInvoice.id}`)} className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition flex items-center gap-1 ${existingInvoice.status === 'paid' ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                    🧾 {existingInvoice.status === 'paid' ? '✓ Invoice Paid' : 'View Invoice'}
                                </button>
                            ) : (
                                <button onClick={handleGenerateInvoice} disabled={generatingInvoice || order?.status === 'cancelled'} className="text-xs border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-1">
                                    {generatingInvoice ? 'Generating...' : '🧾 Generate Invoice'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Status timeline */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 overflow-x-auto">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Order Progress</h3>
                        <div className="flex items-center min-w-max">
                            {STATUS_FLOW.map((status, i) => {
                                const isDone = currentStepIndex >= i
                                const isCurrent = currentStepIndex === i
                                const isLast = i === STATUS_FLOW.length - 1
                                return (
                                    <div key={status} className="flex items-center">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${isCurrent ? 'border-blue-600 bg-blue-600 text-white' : isDone ? 'border-green-500 bg-green-500 text-white' : 'border-gray-200 bg-white text-gray-300'}`}>
                                                {isDone && !isCurrent ? '✓' : i + 1}
                                            </div>
                                            <p className={`text-xs mt-1 capitalize w-14 text-center ${isCurrent ? 'text-blue-600 font-semibold' : isDone ? 'text-green-600' : 'text-gray-300'}`}>{status}</p>
                                        </div>
                                        {!isLast && <div className={`h-0.5 w-8 mb-4 ${currentStepIndex > i ? 'bg-green-400' : 'bg-gray-200'}`} />}
                                    </div>
                                )
                            })}
                        </div>
                        {history.length > 0 && (
                            <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">History</p>
                                {history.map(h => (
                                    <div key={h.id} className="flex items-center justify-between text-xs text-gray-500">
                                        <span className="capitalize font-medium text-gray-700">{h.status}</span>
                                        <span>{new Date(h.created_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Items */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-900">Order Items</h3></div>
                        {items.length === 0 ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No items recorded</p> : (
                            <div className="divide-y divide-gray-50">
                                {items.map(item => (
                                    <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                                            {item.variant_name && <p className="text-xs text-gray-400">{item.variant_name}</p>}
                                            <p className="text-xs text-gray-400">₦{Number(item.unit_price).toLocaleString()} × {item.quantity}</p>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 ml-4">₦{Number(item.subtotal).toLocaleString()}</p>
                                    </div>
                                ))}
                                <div className="px-5 py-3 flex justify-between bg-gray-50 rounded-b-xl">
                                    <p className="text-sm font-semibold text-gray-900">Total</p>
                                    <p className="text-sm font-bold text-gray-900">₦{Number(order.total_amount).toLocaleString()}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right */}
                <div className="space-y-4">
                    {/* Payment */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">Payment</h3>
                            {order.status !== 'cancelled' && order.payment_status !== 'paid' && (
                                <button onClick={() => setShowPaymentModal(true)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700 transition">Record Payment</button>
                            )}
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Order Total</span><span className="font-semibold text-gray-900">₦{Number(order.total_amount).toLocaleString()}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Amount Paid</span><span className="font-semibold text-green-600">₦{Number(order.amount_paid).toLocaleString()}</span></div>
                            <div className="border-t border-gray-100 pt-3 flex justify-between text-sm">
                                <span className="text-gray-500">Balance Due</span>
                                <span className={`font-bold ${Number(order.balance_due) > 0 ? 'text-red-500' : 'text-green-600'}`}>₦{Number(order.balance_due).toLocaleString()}</span>
                            </div>
                            {order.payment_method && <div className="flex justify-between text-sm"><span className="text-gray-500">Method</span><span className="font-medium text-gray-700 capitalize">{order.payment_method.replace('_', ' ')}</span></div>}
                        </div>
                    </div>

                    {/* Delivery */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">Delivery</h3>
                            <button onClick={openDeliveryModal} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-200 transition">{delivery ? 'Edit' : 'Add Delivery'}</button>
                        </div>
                        {!delivery ? <p className="text-sm text-gray-400 text-center py-4">No delivery info yet</p> : (
                            <div className="space-y-2 text-sm">
                                {delivery.courier_name && <div className="flex justify-between"><span className="text-gray-500">Courier</span><span className="font-medium text-gray-800">{delivery.courier_name}</span></div>}
                                {delivery.tracking_number && <div className="flex justify-between"><span className="text-gray-500">Tracking</span><span className="font-medium text-gray-800">{delivery.tracking_number}</span></div>}
                                <div className="flex justify-between"><span className="text-gray-500">Delivery Cost</span><span className="font-medium text-gray-800">₦{Number(delivery.delivery_cost).toLocaleString()} <span className="text-xs text-gray-400">({delivery.cost_bearer === 'customer' ? 'Customer' : 'Vendor'})</span></span></div>
                                {delivery.estimated_delivery_date && <div className="flex justify-between"><span className="text-gray-500">Expected</span><span className="font-medium text-gray-800">{new Date(delivery.estimated_delivery_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span></div>}
                                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                    <span className="text-gray-500">Status</span>
                                    <select value={delivery.status} onChange={e => updateDeliveryStatus(e.target.value)} disabled={updating} className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                                        <option value="pending">Pending</option>
                                        <option value="picked_up">Picked Up</option>
                                        <option value="in_transit">In Transit</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="failed">Failed</option>
                                        <option value="returned">Returned</option>
                                    </select>
                                </div>
                                {delivery.notes && <div className="pt-2"><p className="text-xs text-gray-400">Notes</p><p className="text-xs text-gray-600">{delivery.notes}</p></div>}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => { setShowPaymentModal(false); setPaymentError(''); setPaymentAmount('') }} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 z-10">
                        <h3 className="text-base font-bold text-gray-900">Record Payment</h3>
                        <div className="bg-gray-50 rounded-lg p-3 text-sm"><div className="flex justify-between"><span className="text-gray-500">Balance Due</span><span className="font-bold text-red-500">₦{Number(order.balance_due).toLocaleString()}</span></div></div>
                        {paymentError && <p className="text-xs text-red-500">{paymentError}</p>}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received (₦)</label>
                            <input type="number" value={paymentAmount} onChange={e => { setPaymentAmount(e.target.value); setPaymentError('') }} placeholder={`Up to ₦${Number(order.balance_due).toLocaleString()}`} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="opay">OPay</option>
                                <option value="palmpay">PalmPay</option>
                                <option value="paystack_link">Paystack Link</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowPaymentModal(false); setPaymentError(''); setPaymentAmount('') }} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={handlePaymentUpdate} disabled={updating || !paymentAmount} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50">{updating ? 'Saving...' : 'Save Payment'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delivery Modal */}
            {showDeliveryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
                    <div className="absolute inset-0 bg-black/50" onClick={() => { setShowDeliveryModal(false); resetDeliveryForm() }} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 z-10">
                        <h3 className="text-base font-bold text-gray-900">Delivery Details</h3>
                        {[
                            { label: 'Courier Name *', key: 'courier_name', placeholder: 'e.g. GIG Logistics' },
                            { label: 'Tracking Number', key: 'tracking_number', placeholder: 'e.g. GIG-123456' },
                            { label: 'Delivery Cost (₦)', key: 'delivery_cost', placeholder: '0', type: 'number' },
                        ].map(field => (
                            <div key={field.key}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                                <input type={field.type ?? 'text'} value={deliveryForm[field.key]} onChange={e => setDeliveryForm({ ...deliveryForm, [field.key]: e.target.value })} placeholder={field.placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        ))}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Cost Paid By</label>
                            <select value={deliveryForm.cost_bearer} onChange={e => setDeliveryForm({ ...deliveryForm, cost_bearer: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                <option value="customer">Customer</option>
                                <option value="vendor">Me (Vendor)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                            <input type="date" value={deliveryForm.estimated_delivery_date} onChange={e => setDeliveryForm({ ...deliveryForm, estimated_delivery_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea value={deliveryForm.notes} onChange={e => setDeliveryForm({ ...deliveryForm, notes: e.target.value })} rows={2} placeholder="Any extra delivery instructions..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowDeliveryModal(false); resetDeliveryForm() }} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={handleSaveDelivery} disabled={updating} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">{updating ? 'Saving...' : 'Save Delivery'}</button>
                        </div>
                    </div>
                </div>
            )}
        </PageWrapper>
    )
}