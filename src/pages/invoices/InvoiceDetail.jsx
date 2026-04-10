import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import { generateInvoicePDF } from '../../lib/generateInvoicePDF'

export default function InvoiceDetail() {
    const { id } = useParams()
    const { profile } = useAuth()
    const navigate = useNavigate()

    const [invoice, setInvoice] = useState(null)
    const [order, setOrder] = useState(null)
    const [items, setItems] = useState([])
    const [delivery, setDelivery] = useState(null)
    const [business, setBusiness] = useState(null)
    const [loading, setLoading] = useState(true)
    const [confirming, setConfirming] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)

    useEffect(() => {
        if (!id) return
        fetchAll()
    }, [id])

    async function fetchAll() {
        setLoading(true)

        const [invoiceRes, bizRes] = await Promise.all([
            supabase
                .from('invoices')
                .select(`
                    *,
                    vendor_orders (
                        id, order_number, customer_name, customer_phone,
                        customer_address, order_source, total_amount,
                        amount_paid, balance_due, payment_status, status
                    )
                `)
                .eq('id', id)
                .single(),
            supabase
                .from('businesses')
                .select('name, logo_url, address, phone, email, store_whatsapp')
                .eq('id', profile.business_id)
                .single(),
        ])

        const inv = invoiceRes.data
        setInvoice(inv)
        setOrder(inv?.vendor_orders ?? null)
        setBusiness(bizRes.data)

        // Fetch order items and delivery in parallel
        if (inv?.order_id) {
            const [itemsRes, deliveryRes] = await Promise.all([
                supabase.from('order_items').select('*').eq('order_id', inv.order_id).order('created_at'),
                supabase.from('deliveries').select('delivery_cost, cost_bearer, courier_name').eq('order_id', inv.order_id).maybeSingle(),
            ])
            setItems(itemsRes.data ?? [])
            // Only show delivery cost if customer bears it
            const del = deliveryRes.data
            if (del && del.cost_bearer === 'customer' && Number(del.delivery_cost) > 0) {
                setDelivery(del)
            } else {
                setDelivery(null)
            }
        }

        setLoading(false)
    }

    async function handleConfirmPayment() {
        setConfirming(true)

        // Calculate grand total (products + delivery)
        const productsTotal = Number(invoice.subtotal)
        const deliveryCost = delivery ? Number(delivery.delivery_cost) : 0
        const grandTotal = productsTotal + deliveryCost

        // 1. Mark invoice as paid
        await supabase
            .from('invoices')
            .update({
                status: 'paid',
                confirmed_at: new Date().toISOString(),
                confirmed_by: profile.id,
                updated_at: new Date().toISOString(),
                amount_paid: grandTotal,
                balance_due: 0,
            })
            .eq('id', id)

        // 2. Update the order payment status with grand total
        await supabase
            .from('vendor_orders')
            .update({
                amount_paid: grandTotal,
                payment_status: 'paid',
                updated_at: new Date().toISOString(),
            })
            .eq('id', invoice.order_id)

        // 3. Log status history
        await supabase
            .from('order_status_history')
            .insert({
                order_id: invoice.order_id,
                status: order?.status ?? 'confirmed',
                note: `Payment confirmed via invoice ${invoice.invoice_number}. Total: ₦${grandTotal.toLocaleString()} (Products: ₦${productsTotal.toLocaleString()} + Delivery: ₦${deliveryCost.toLocaleString()})`,
                changed_by: profile.id,
            })

        setShowConfirmModal(false)
        setConfirming(false)
        await fetchAll()
    }

    async function handleDownloadPDF() {
        if (!invoice || !business) return
        setDownloading(true)

        try {
            const productsTotal = Number(invoice.subtotal)
            const deliveryCost = delivery ? Number(delivery.delivery_cost) : 0
            const grandTotal = productsTotal + deliveryCost
            const amountPaid = invoice.status === 'paid' ? grandTotal : (invoice.amount_paid || 0)
            const balanceDue = invoice.status === 'paid' ? 0 : (grandTotal - amountPaid)

            await generateInvoicePDF({
                business: {
                    name: business.name,
                    logo_url: business.logo_url,
                    address: business.address,
                    phone: business.phone,
                    email: business.email,
                    store_whatsapp: business.store_whatsapp,
                },
                customer: {
                    name: order?.customer_name,
                    phone: order?.customer_phone,
                    address: order?.customer_address,
                },
                invoice: {
                    invoice_number: invoice.invoice_number,
                    created_at: invoice.created_at,
                    notes: invoice.notes,
                    status: invoice.status,
                },
                order: {
                    order_number: order?.order_number,
                    order_source: order?.order_source,
                },
                items: items.map(item => ({
                    product_name: item.product_name,
                    variant_name: item.variant_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    subtotal: item.subtotal,
                })),
                amounts: {
                    subtotal: productsTotal,
                    delivery_cost: deliveryCost,
                    grand_total: grandTotal,
                    amount_paid: amountPaid,
                    balance_due: balanceDue,
                    delivery_courier: delivery?.courier_name ?? null,
                },
            })
        } catch (err) {
            console.error('PDF generation failed:', err)
        }

        setDownloading(false)
    }

    // Calculate totals
    const productsTotal = Number(invoice?.subtotal || 0)
    const deliveryCost = delivery ? Number(delivery.delivery_cost) : 0
    const grandTotal = productsTotal + deliveryCost
    const amountPaid = invoice?.status === 'paid'
        ? grandTotal
        : (invoice?.amount_paid || 0)
    const balanceDue = invoice?.status === 'paid' ? 0 : (grandTotal - amountPaid)

    if (loading) {
        return (
            <PageWrapper title="Invoice">
                <div className="py-20 text-center text-sm text-gray-400">Loading invoice...</div>
            </PageWrapper>
        )
    }

    if (!invoice) {
        return (
            <PageWrapper title="Invoice">
                <div className="py-20 text-center text-sm text-gray-400">Invoice not found.</div>
            </PageWrapper>
        )
    }

    const isPaid = invoice.status === 'paid'

    return (
        <PageWrapper title={invoice.invoice_number}>

            {/* ── Back + actions ── */}
            <div className="flex items-center justify-between mb-5">
                <button
                    onClick={() => navigate('/invoices')}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                    ← Back to Invoices
                </button>
                <div className="flex items-center gap-2">
                    {!isPaid && (
                        <button
                            onClick={() => setShowConfirmModal(true)}
                            className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2"
                        >
                            ✓ Confirm Payment Received
                        </button>
                    )}
                    <button
                        onClick={handleDownloadPDF}
                        disabled={downloading}
                        className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {downloading ? 'Generating...' : '⬇️ Download PDF'}
                    </button>
                </div>
            </div>

            {/* ── Invoice preview card ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden max-w-2xl mx-auto">

                {/* Header band */}
                <div className="bg-blue-600 px-6 py-5">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            {business?.logo_url ? (
                                <img
                                    src={business.logo_url}
                                    alt={business?.name}
                                    className="w-12 h-12 rounded-xl object-contain bg-white p-1"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-xl">
                                    {business?.name?.charAt(0)}
                                </div>
                            )}
                            <div>
                                <p className="text-white font-bold text-lg">{business?.name}</p>
                                {business?.address && (
                                    <p className="text-blue-200 text-xs mt-0.5">{business.address}</p>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-white font-bold text-2xl">INVOICE</p>
                            <p className="text-blue-200 text-sm">{invoice.invoice_number}</p>
                        </div>
                    </div>
                    {/* Contact bar */}
                    <div className="mt-3 pt-3 border-t border-blue-500 flex flex-wrap gap-3 text-xs text-blue-200">
                        {business?.phone && <span>📞 {business.phone}</span>}
                        {business?.email && <span>✉️ {business.email}</span>}
                        {business?.store_whatsapp && <span>💬 {business.store_whatsapp}</span>}
                    </div>
                </div>

                {/* Meta row */}
                <div className="grid grid-cols-2 gap-4 px-6 py-5 border-b border-gray-100">
                    {/* Bill to */}
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bill To</p>
                        <p className="text-sm font-bold text-gray-900">{order?.customer_name}</p>
                        {order?.customer_phone && (
                            <p className="text-xs text-gray-500 mt-0.5">{order.customer_phone}</p>
                        )}
                        {order?.customer_address && (
                            <p className="text-xs text-gray-400 mt-0.5">{order.customer_address}</p>
                        )}
                    </div>
                    {/* Invoice details */}
                    <div className="space-y-1.5 text-sm">
                        {[
                            ['Invoice No', invoice.invoice_number],
                            ['Date', new Date(invoice.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })],
                            ['Order No', order?.order_number ?? '—'],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between">
                                <span className="text-gray-400 text-xs">{label}</span>
                                <span className="text-gray-800 font-medium text-xs">{value}</span>
                            </div>
                        ))}
                        <div className="flex justify-between pt-1">
                            <span className="text-gray-400 text-xs">Status</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPaid
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                                }`}>
                                {isPaid ? '✓ Paid' : 'Pending'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="px-6 py-4">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-2 border-gray-900">
                                <th className="text-left text-xs font-bold text-gray-700 pb-2">Item</th>
                                <th className="text-center text-xs font-bold text-gray-700 pb-2">Qty</th>
                                <th className="text-right text-xs font-bold text-gray-700 pb-2">Unit Price</th>
                                <th className="text-right text-xs font-bold text-gray-700 pb-2">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.map(item => (
                                <tr key={item.id}>
                                    <td className="py-2.5">
                                        <p className="text-sm text-gray-900">{item.product_name}</p>
                                        {item.variant_name && (
                                            <p className="text-xs text-gray-400">{item.variant_name}</p>
                                        )}
                                    </td>
                                    <td className="py-2.5 text-center text-gray-500">{item.quantity}</td>
                                    <td className="py-2.5 text-right text-gray-700">
                                        ₦{Number(item.unit_price).toLocaleString()}
                                    </td>
                                    <td className="py-2.5 text-right font-semibold text-gray-900">
                                        ₦{Number(item.subtotal).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {delivery && (
                                <tr className="bg-gray-50">
                                    <td className="py-2.5">
                                        <p className="text-sm text-gray-700">Delivery Fee</p>
                                        {delivery.courier_name && (
                                            <p className="text-xs text-gray-400">{delivery.courier_name}</p>
                                        )}
                                    </td>
                                    <td className="py-2.5 text-center text-gray-400">—</td>
                                    <td className="py-2.5 text-right text-gray-700">—</td>
                                    <td className="py-2.5 text-right font-semibold text-gray-900">
                                        ₦{Number(delivery.delivery_cost).toLocaleString()}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="px-6 pb-5 space-y-1.5">
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                        <span className="text-gray-500">Products Subtotal</span>
                        <span className="font-medium text-gray-900">₦{productsTotal.toLocaleString()}</span>
                    </div>
                    {deliveryCost > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Delivery Fee</span>
                            <span className="font-medium text-gray-900">₦{deliveryCost.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm border-t border-gray-100 pt-1.5">
                        <span className="font-semibold text-gray-700">Grand Total</span>
                        <span className="font-bold text-gray-900">₦{grandTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Amount Paid</span>
                        <span className="font-medium text-green-600">₦{amountPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t-2 border-gray-900">
                        <span className="font-bold text-gray-900">Balance Due</span>
                        <span className={`font-bold text-base ${isPaid || balanceDue <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {isPaid || balanceDue <= 0
                                ? 'FULLY PAID'
                                : `₦${balanceDue.toLocaleString()}`
                            }
                        </span>
                    </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
                        <p className="text-sm text-gray-600">{invoice.notes}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400">Thank you for your business!</p>
                    <p className="text-xs text-gray-300 mt-0.5">Generated by Vortex</p>
                </div>
            </div>

            {/* View order link */}
            {order?.id && (
                <div className="text-center mt-4">
                    <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        View linked order →
                    </button>
                </div>
            )}

            {/* ── Confirm Payment Modal ── */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 z-10">
                        <div className="text-center space-y-2">
                            <div className="text-4xl">✅</div>
                            <h3 className="text-base font-bold text-gray-900">Confirm Payment Received</h3>
                            <p className="text-sm text-gray-500">
                                This will mark invoice <span className="font-semibold">{invoice.invoice_number}</span> as paid
                                and update the linked order payment status to <span className="font-semibold text-green-600">Paid</span>.
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Customer</span>
                                <span className="font-medium">{order?.customer_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Products</span>
                                <span className="font-medium">₦{productsTotal.toLocaleString()}</span>
                            </div>
                            {deliveryCost > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Delivery</span>
                                    <span className="font-medium">₦{deliveryCost.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-gray-200 pt-2">
                                <span className="text-gray-500 font-semibold">Grand Total</span>
                                <span className="font-bold text-green-600">₦{grandTotal.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmPayment}
                                disabled={confirming}
                                className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
                            >
                                {confirming ? 'Confirming...' : 'Yes, Confirm Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageWrapper>
    )
}