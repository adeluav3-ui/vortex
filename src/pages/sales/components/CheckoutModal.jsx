import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash', icon: '💵' },
    { value: 'card', label: 'POS/Card', icon: '💳' },
    { value: 'transfer', label: 'Transfer', icon: '🏦' },
    { value: 'credit', label: 'Credit', icon: '📋' },
]

export default function CheckoutModal({ cart, subtotal, onClose, onSaleComplete }) {
    const { profile, user } = useAuth()
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [discount, setDiscount] = useState(0)
    const [amountPaid, setAmountPaid] = useState('')
    const [note, setNote] = useState('')
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const total = Math.max(0, subtotal - Number(discount))
    const change = paymentMethod === 'cash' ? Math.max(0, Number(amountPaid) - total) : 0

    useEffect(() => {
        if (paymentMethod === 'cash') setAmountPaid(total.toString())
    }, [total, paymentMethod])

    async function handleConfirm() {
        setError('')
        if (paymentMethod === 'credit' && !customerPhone) return setError('Phone number is required for credit sales')
        setLoading(true)

        try {
            // Generate sale number
            const { data: saleNumData } = await supabase
                .rpc('generate_sale_number', { p_business_id: profile.business_id })

            // Resolve or create customer
            let resolvedCustomerId = null
            let customer = null

            // Only try to create/find customer if name or phone is provided
            if (customerName.trim() || customerPhone.trim()) {
                // First, try to find by phone (most reliable)
                if (customerPhone.trim()) {
                    const { data: existing } = await supabase
                        .from('customers')
                        .select('id, outstanding_balance, full_name')
                        .eq('business_id', profile.business_id)
                        .eq('phone', customerPhone.trim())
                        .maybeSingle()
                    customer = existing
                }

                // If not found by phone, try by name (for walk-in customers without phone)
                if (!customer && customerName.trim()) {
                    const { data: existing } = await supabase
                        .from('customers')
                        .select('id, outstanding_balance, full_name')
                        .eq('business_id', profile.business_id)
                        .eq('full_name', customerName.trim())
                        .maybeSingle()
                    customer = existing
                }

                // If still no customer, create new one
                if (!customer) {
                    const { data: newCustomer, error: createError } = await supabase
                        .from('customers')
                        .insert({
                            business_id: profile.business_id,
                            branch_id: profile.branch_id,
                            full_name: customerName.trim() || 'Walk-in Customer',
                            phone: customerPhone.trim() || null,
                        })
                        .select()
                        .single()

                    if (createError) throw createError
                    customer = newCustomer
                } else if (customerName.trim() && customer.full_name !== customerName.trim()) {
                    // Update name if it changed
                    await supabase
                        .from('customers')
                        .update({ full_name: customerName.trim() })
                        .eq('id', customer.id)
                }

                resolvedCustomerId = customer?.id

                // Update balance for credit
                if (paymentMethod === 'credit' && customer) {
                    const currentBalance = Number(customer.outstanding_balance) || 0
                    await supabase
                        .from('customers')
                        .update({ outstanding_balance: currentBalance + total })
                        .eq('id', customer.id)
                }
            }

            console.log('Customer resolved:', { resolvedCustomerId, customerName, customerPhone })

            // Insert sale with customer_id
            const { data: sale, error: saleError } = await supabase
                .from('sales')
                .insert({
                    business_id: profile.business_id,
                    branch_id: profile.branch_id,
                    customer_id: resolvedCustomerId,
                    user_id: user.id,
                    sale_number: saleNumData,
                    subtotal,
                    discount: Number(discount),
                    total,
                    amount_paid: paymentMethod === 'cash' ? Number(amountPaid) : total,
                    change_given: change,
                    payment_method: paymentMethod,
                    status: 'completed',
                    note: note.trim() || null,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single()

            if (saleError) throw saleError

            console.log('Sale created with customer_id:', sale.customer_id)

            // Insert sale items + deduct stock
            for (const item of cart) {
                await supabase.from('sale_items').insert({
                    sale_id: sale.id,
                    variant_id: item.variant_id,
                    product_name: item.product_name,
                    variant_name: item.variant_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    buying_price: item.buying_price,
                    subtotal: item.subtotal,
                })

                // Deduct stock
                const { data: stockLevel } = await supabase
                    .from('stock_levels')
                    .select('id, quantity')
                    .eq('variant_id', item.variant_id)
                    .eq('branch_id', profile.branch_id)
                    .single()

                if (stockLevel) {
                    await supabase.from('stock_levels')
                        .update({ quantity: Math.max(0, stockLevel.quantity - item.quantity) })
                        .eq('id', stockLevel.id)

                    await supabase.from('stock_movements').insert({
                        business_id: profile.business_id,
                        branch_id: profile.branch_id,
                        variant_id: item.variant_id,
                        user_id: user.id,
                        type: 'sale',
                        quantity: -item.quantity,
                        note: `Sale ${saleNumData}`,
                    })
                }
            }

            // Return full sale with items for receipt
            const { data: fullSale } = await supabase
                .from('sales')
                .select(`*, sale_items(*), customers(full_name, phone)`)
                .eq('id', sale.id)
                .single()

            onSaleComplete(fullSale)
        } catch (err) {
            console.error('Checkout error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Checkout</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {error && <p className="text-sm text-red-500">{error}</p>}

                    {/* Order summary */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        {cart.map(item => (
                            <div key={item.variant_id} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                    {item.product_name} {item.variant_name !== 'Default' ? `(${item.variant_name})` : ''} × {item.quantity}
                                </span>
                                <span className="font-medium">₦{Number(item.subtotal).toLocaleString()}</span>
                            </div>
                        ))}
                        <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
                            <span>Subtotal</span>
                            <span>₦{subtotal.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Discount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Discount (₦)</label>
                        <input
                            type="number"
                            value={discount}
                            onChange={e => setDiscount(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                            max={subtotal}
                        />
                    </div>

                    {/* Payment method */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                        <div className="grid grid-cols-4 gap-2">
                            {PAYMENT_METHODS.map(m => (
                                <button
                                    key={m.value}
                                    onClick={() => setPaymentMethod(m.value)}
                                    className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition ${paymentMethod === m.value
                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    <span className="text-lg">{m.icon}</span>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Amount paid (cash only) */}
                    {paymentMethod === 'cash' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₦)</label>
                            <input
                                type="number"
                                value={amountPaid}
                                onChange={e => setAmountPaid(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {change > 0 && (
                                <p className="text-sm text-green-600 font-medium mt-1">Change: ₦{change.toLocaleString()}</p>
                            )}
                        </div>
                    )}

                    {/* Customer info */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Customer Name <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <input
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Amaka"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone {paymentMethod === 'credit' && <span className="text-red-500">*</span>}
                            </label>
                            <input
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="08012345678"
                            />
                        </div>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                        <input
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. Table 5, special order..."
                        />
                    </div>

                    {/* Total */}
                    <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-700">Total</span>
                        <span className="text-xl font-bold text-blue-700">₦{total.toLocaleString()}</span>
                    </div>
                </div>

                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : 'Confirm Sale'}
                    </button>
                </div>
            </div>
        </div>
    )
}