import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { exportToCSV } from '../utils/exportUtils'

export default function CreditReport({ dateRange }) {
    const { profile } = useAuth()
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { fetchData() }, [dateRange])

    async function fetchData() {
        setLoading(true)
        const { data } = await supabase
            .from('customers')
            .select('*, sales(total, payment_method, created_at)')
            .eq('business_id', profile.business_id)
            .gt('outstanding_balance', 0)
            .order('outstanding_balance', { ascending: false })
        setCustomers(data ?? [])
        setLoading(false)
    }

    const totalOutstanding = customers.reduce((sum, c) => sum + Number(c.outstanding_balance), 0)

    if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-orange-50 rounded-xl border border-orange-100 p-4 shadow-sm">
                    <p className="text-sm text-orange-500 font-medium mb-1">Total Outstanding Credit</p>
                    <p className="text-2xl font-bold text-orange-600">₦{totalOutstanding.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Customers with Credit</p>
                    <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Outstanding Credit</h3>
                    <button
                        onClick={() => exportToCSV(customers.map(c => ({
                            Customer: c.full_name,
                            Phone: c.phone ?? '',
                            'Outstanding Balance': c.outstanding_balance,
                        })), 'credit-report')}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                        CSV
                    </button>
                </div>
                {customers.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">No outstanding credit balances</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {customers.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">
                                                    {c.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-900">{c.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{c.phone ?? '—'}</td>
                                        <td className="px-4 py-3 font-bold text-orange-500">₦{Number(c.outstanding_balance).toLocaleString()}</td>
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