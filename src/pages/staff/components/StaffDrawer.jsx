import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

const ROLE_COLORS = {
    owner: 'bg-purple-50 text-purple-600',
    manager: 'bg-blue-50 text-blue-600',
    staff: 'bg-gray-100 text-gray-600',
    cashier: 'bg-green-50 text-green-600',
}

export default function StaffDrawer({ staff, onClose, onEdit, onPaymentRecorded }) {
    const { profile, user } = useAuth()
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)
    const [payAmount, setPayAmount] = useState(staff.salary?.toString() ?? '')
    const [periodStart, setPeriodStart] = useState('')
    const [periodEnd, setPeriodEnd] = useState('')
    const [payNote, setPayNote] = useState('')
    const [payLoading, setPayLoading] = useState(false)
    const [payError, setPayError] = useState('')
    const [activeTab, setActiveTab] = useState('details')

    useEffect(() => {
        fetchPayments()
        // Default period to current month
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        setPeriodStart(start.toISOString().split('T')[0])
        setPeriodEnd(end.toISOString().split('T')[0])
    }, [staff.id])

    async function fetchPayments() {
        setLoading(true)
        const { data } = await supabase
            .from('salary_payments')
            .select('*')
            .eq('staff_id', staff.id)
            .order('created_at', { ascending: false })
        setPayments(data ?? [])
        setLoading(false)
    }

    async function handlePayment() {
        setPayError('')
        const amount = Number(payAmount)
        if (!amount || amount <= 0) return setPayError('Enter a valid amount')
        if (!periodStart || !periodEnd) return setPayError('Select a payment period')
        setPayLoading(true)

        try {
            const { error } = await supabase
                .from('salary_payments')
                .insert({
                    business_id: profile.business_id,
                    staff_id: staff.id,
                    user_id: user.id,
                    amount,
                    period_start: periodStart,
                    period_end: periodEnd,
                    status: 'paid',
                    note: payNote.trim() || null,
                })
            if (error) throw error

            setPayNote('')
            fetchPayments()
            onPaymentRecorded()
        } catch (err) {
            setPayError(err.message)
        } finally {
            setPayLoading(false)
        }
    }

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">

                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                        <button
                            onClick={() => onEdit(staff)}
                            className="text-sm text-blue-600 font-medium hover:underline"
                        >
                            Edit
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                            {staff.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{staff.full_name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[staff.role] ?? 'bg-gray-100 text-gray-600'}`}>
                                    {staff.role}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staff.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                    {staff.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            {staff.phone && <p className="text-sm text-gray-400 mt-1">{staff.phone}</p>}
                            {staff.email && <p className="text-sm text-gray-400">{staff.email}</p>}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-blue-50 rounded-xl px-4 py-3">
                            <p className="text-xs text-blue-500 font-medium">Salary</p>
                            <p className="text-lg font-bold text-blue-700">
                                {Number(staff.salary) > 0
                                    ? `₦${Number(staff.salary).toLocaleString()}`
                                    : 'Not set'}
                            </p>
                            {Number(staff.salary) > 0 && (
                                <p className="text-xs text-blue-400 capitalize">per {staff.salary_frequency}</p>
                            )}
                        </div>
                        <div className="bg-green-50 rounded-xl px-4 py-3">
                            <p className="text-xs text-green-500 font-medium">Total Paid</p>
                            <p className="text-lg font-bold text-green-700">₦{totalPaid.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6">
                    {['details', 'salary'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 px-4 text-sm font-medium border-b-2 transition capitalize ${activeTab === tab
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {tab === 'salary' ? `Salary History (${payments.length})` : 'Details'}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'details' && (
                        <div className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Branch</p>
                                    <p className="text-sm font-medium text-gray-900">{staff.branches?.name ?? 'Not assigned'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Joined</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {new Date(staff.created_at).toLocaleDateString('en-NG', {
                                            day: 'numeric', month: 'short', year: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Invite Status</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {staff.invite_accepted ? '✅ Accepted' : staff.invite_sent ? '⏳ Pending' : '—  Not sent'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Salary Frequency</p>
                                    <p className="text-sm font-medium text-gray-900 capitalize">{staff.salary_frequency}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'salary' && (
                        <div>
                            {/* Payment form */}
                            <div className="px-6 py-4 bg-green-50 border-b border-green-100">
                                <p className="text-sm font-medium text-green-700 mb-3">Record Salary Payment</p>
                                {payError && <p className="text-xs text-red-500 mb-2">{payError}</p>}
                                <div className="space-y-2">
                                    <input
                                        type="number"
                                        value={payAmount}
                                        onChange={e => setPayAmount(e.target.value)}
                                        placeholder="Amount (₦)"
                                        className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs text-green-600 mb-1">Period Start</label>
                                            <input
                                                type="date"
                                                value={periodStart}
                                                onChange={e => setPeriodStart(e.target.value)}
                                                className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-green-600 mb-1">Period End</label>
                                            <input
                                                type="date"
                                                value={periodEnd}
                                                onChange={e => setPeriodEnd(e.target.value)}
                                                className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                                            />
                                        </div>
                                    </div>
                                    <input
                                        value={payNote}
                                        onChange={e => setPayNote(e.target.value)}
                                        placeholder="Note (optional)"
                                        className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                                    />
                                    <button
                                        onClick={handlePayment}
                                        disabled={payLoading}
                                        className="w-full bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                                    >
                                        {payLoading ? 'Recording...' : 'Record Payment'}
                                    </button>
                                </div>
                            </div>

                            {/* Payment history */}
                            <div className="divide-y divide-gray-50">
                                {loading ? (
                                    <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
                                ) : payments.length === 0 ? (
                                    <div className="py-12 text-center text-sm text-gray-400">No salary payments recorded</div>
                                ) : (
                                    payments.map(p => (
                                        <div key={p.id} className="px-6 py-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-bold text-green-600">₦{Number(p.amount).toLocaleString()}</p>
                                                <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium capitalize">{p.status}</span>
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                {new Date(p.period_start).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} —{' '}
                                                {new Date(p.period_end).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                            {p.note && <p className="text-xs text-gray-400 italic mt-0.5">{p.note}</p>}
                                            <p className="text-xs text-gray-300 mt-0.5">
                                                Recorded {new Date(p.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}