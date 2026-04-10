import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

export default function CustomerDrawer({ customer, onClose, onEdit, onRepayment }) {
    const { profile, user } = useAuth()
    const [sales, setSales] = useState([])
    const [repayments, setRepayments] = useState([])
    const [loading, setLoading] = useState(true)
    const [repayAmount, setRepayAmount] = useState('')
    const [repayNote, setRepayNote] = useState('')
    const [repayLoading, setRepayLoading] = useState(false)
    const [repayError, setRepayError] = useState('')
    const [activeTab, setActiveTab] = useState('purchases')
    const [currentBalance, setCurrentBalance] = useState(Number(customer.outstanding_balance))

    useEffect(() => {
        fetchData()
    }, [customer.id])

    async function fetchData() {
        setLoading(true)
        const [salesRes, repaymentsRes] = await Promise.all([
            supabase
                .from('sales')
                .select('*, sale_items(*)')
                .eq('customer_id', customer.id)
                .order('created_at', { ascending: false }),
            supabase
                .from('credit_repayments')
                .select('*')
                .eq('customer_id', customer.id)
                .order('created_at', { ascending: false }),
        ])
        setSales(salesRes.data ?? [])
        setRepayments(repaymentsRes.data ?? [])
        setLoading(false)
    }

    async function handleRepayment() {
        setRepayError('')
        const amount = Number(repayAmount)
        if (!amount || amount <= 0) return setRepayError('Enter a valid amount')
        if (amount > currentBalance) return setRepayError('Amount exceeds outstanding balance')
        setRepayLoading(true)

        try {
            // Record repayment
            const { error: repayErr } = await supabase
                .from('credit_repayments')
                .insert({
                    business_id: profile.business_id,
                    customer_id: customer.id,
                    user_id: user.id,
                    amount,
                    note: repayNote.trim() || null,
                })
            if (repayErr) throw repayErr

            // Update customer balance
            const newBalance = Math.max(0, currentBalance - amount)
            const { error: updateErr } = await supabase
                .from('customers')
                .update({ outstanding_balance: newBalance })
                .eq('id', customer.id)
            if (updateErr) throw updateErr

            setCurrentBalance(newBalance)
            setRepayAmount('')
            setRepayNote('')
            fetchData()
            onRepayment()
        } catch (err) {
            setRepayError(err.message)
        } finally {
            setRepayLoading(false)
        }
    }

    const totalSpent = sales.reduce((sum, s) => sum + Number(s.total), 0)

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">

                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                        <button
                            onClick={() => onEdit(customer)}
                            className="text-sm text-blue-600 font-medium hover:underline"
                        >
                            Edit
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                            {customer.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{customer.full_name}</h2>
                            <p className="text-sm text-gray-500">{customer.phone ?? 'No phone'}</p>
                            {customer.email && <p className="text-sm text-gray-400">{customer.email}</p>}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-blue-50 rounded-xl px-4 py-3">
                            <p className="text-xs text-blue-500 font-medium">Total Spent</p>
                            <p className="text-lg font-bold text-blue-700">₦{totalSpent.toLocaleString()}</p>
                        </div>
                        <div className={`rounded-xl px-4 py-3 ${currentBalance > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                            <p className={`text-xs font-medium ${currentBalance > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                                Outstanding Credit
                            </p>
                            <p className={`text-lg font-bold ${currentBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                ₦{currentBalance.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6">
                    {['purchases', 'repayments'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 px-4 text-sm font-medium border-b-2 transition capitalize ${activeTab === tab
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {tab === 'purchases' ? `Purchases (${sales.length})` : `Repayments (${repayments.length})`}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>
                    ) : (
                        <>
                            {activeTab === 'purchases' && (
                                <div className="divide-y divide-gray-50">
                                    {sales.length === 0 ? (
                                        <div className="py-12 text-center text-sm text-gray-400">No purchases yet</div>
                                    ) : (
                                        sales.map(sale => (
                                            <div key={sale.id} className="px-6 py-4">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-sm font-medium text-gray-900">{sale.sale_number}</p>
                                                    <p className="text-sm font-bold text-gray-900">₦{Number(sale.total).toLocaleString()}</p>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-gray-400">
                                                        {new Date(sale.created_at).toLocaleDateString('en-NG', {
                                                            day: 'numeric', month: 'short', year: 'numeric'
                                                        })}
                                                    </p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${sale.payment_method === 'credit'
                                                            ? 'bg-orange-50 text-orange-500'
                                                            : 'bg-green-50 text-green-600'
                                                        }`}>
                                                        {sale.payment_method}
                                                    </span>
                                                </div>
                                                <div className="mt-2 space-y-0.5">
                                                    {sale.sale_items?.map(item => (
                                                        <p key={item.id} className="text-xs text-gray-400">
                                                            {item.product_name} {item.variant_name !== 'Default' ? `(${item.variant_name})` : ''} × {item.quantity}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'repayments' && (
                                <div>
                                    {/* Repayment form */}
                                    {currentBalance > 0 && (
                                        <div className="px-6 py-4 bg-orange-50 border-b border-orange-100">
                                            <p className="text-sm font-medium text-orange-700 mb-3">Record Repayment</p>
                                            {repayError && <p className="text-xs text-red-500 mb-2">{repayError}</p>}
                                            <div className="space-y-2">
                                                <input
                                                    type="number"
                                                    value={repayAmount}
                                                    onChange={e => setRepayAmount(e.target.value)}
                                                    placeholder={`Amount (max ₦${currentBalance.toLocaleString()})`}
                                                    className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                                                />
                                                <input
                                                    value={repayNote}
                                                    onChange={e => setRepayNote(e.target.value)}
                                                    placeholder="Note (optional)"
                                                    className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                                                />
                                                <button
                                                    onClick={handleRepayment}
                                                    disabled={repayLoading}
                                                    className="w-full bg-orange-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50"
                                                >
                                                    {repayLoading ? 'Processing...' : 'Record Repayment'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Repayment history */}
                                    <div className="divide-y divide-gray-50">
                                        {repayments.length === 0 ? (
                                            <div className="py-12 text-center text-sm text-gray-400">No repayments recorded</div>
                                        ) : (
                                            repayments.map(r => (
                                                <div key={r.id} className="px-6 py-4 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium text-green-600">+₦{Number(r.amount).toLocaleString()}</p>
                                                        <p className="text-xs text-gray-400">
                                                            {new Date(r.created_at).toLocaleDateString('en-NG', {
                                                                day: 'numeric', month: 'short', year: 'numeric'
                                                            })}
                                                        </p>
                                                        {r.note && <p className="text-xs text-gray-400 italic">{r.note}</p>}
                                                    </div>
                                                    <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full font-medium">Paid</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}