import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { exportToCSV } from '../utils/exportUtils'

export default function SalaryReport({ dateRange }) {
    const { profile } = useAuth()
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { fetchData() }, [dateRange])

    async function fetchData() {
        setLoading(true)
        const { data } = await supabase
            .from('salary_payments')
            .select('*, staff(full_name, role, branch_id, branches(name))')
            .eq('business_id', profile.business_id)
            .gte('created_at', dateRange.from)
            .lte('created_at', dateRange.to + 'T23:59:59')
            .order('created_at', { ascending: false })
        setPayments(data ?? [])
        setLoading(false)
    }

    const total = payments.reduce((sum, p) => sum + Number(p.amount), 0)

    if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl border border-green-100 p-4 shadow-sm">
                    <p className="text-sm text-green-600 font-medium mb-1">Total Salary Paid</p>
                    <p className="text-2xl font-bold text-green-700">₦{total.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Payment Entries</p>
                    <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Salary Payments</h3>
                    <button
                        onClick={() => exportToCSV(payments.map(p => ({
                            Staff: p.staff?.full_name ?? '',
                            Role: p.staff?.role ?? '',
                            Branch: p.staff?.branches?.name ?? '',
                            Amount: p.amount,
                            'Period Start': p.period_start,
                            'Period End': p.period_end,
                            Status: p.status,
                            Note: p.note ?? '',
                            Date: new Date(p.created_at).toLocaleDateString(),
                        })), 'salary-report')}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                        CSV
                    </button>
                </div>
                {payments.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">No salary payments in this period</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Staff</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Period</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {payments.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">{p.staff?.full_name ?? '—'}</td>
                                        <td className="px-4 py-3 capitalize text-gray-500">{p.staff?.role ?? '—'}</td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {new Date(p.period_start).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} —{' '}
                                            {new Date(p.period_end).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-green-600">₦{Number(p.amount).toLocaleString()}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full capitalize">{p.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}