import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { exportToCSV } from '../utils/exportUtils'
import { useBranchFilter } from '../../../hooks/useBranchFilter'

const COLORS = { cash: '#10b981', card: '#3b82f6', transfer: '#8b5cf6', credit: '#f59e0b' }

export default function PaymentMethods({ dateRange }) {
    const { profile } = useAuth()
    const [sales, setSales] = useState([])
    const [loading, setLoading] = useState(true)
    const { applyFilter } = useBranchFilter()

    useEffect(() => { fetchData() }, [dateRange])

    async function fetchData() {
        setLoading(true)
        let query = supabase
            .from('sales')
            .select('payment_method, total')
            .eq('business_id', profile.business_id)
            .eq('status', 'completed')
            .gte('created_at', dateRange.from)
            .lte('created_at', dateRange.to + 'T23:59:59')
        query = applyFilter(query)
        const { data } = await query
        setSales(data ?? [])
        setLoading(false)
    }

    const byMethod = sales.reduce((acc, s) => {
        const m = s.payment_method
        if (!acc[m]) acc[m] = { name: m, total: 0, count: 0 }
        acc[m].total += Number(s.total)
        acc[m].count += 1
        return acc
    }, {})

    const pieData = Object.values(byMethod)
    const grandTotal = sales.reduce((sum, s) => sum + Number(s.total), 0)

    if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>

    return (
        <div className="space-y-5">
            {pieData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Sales by Payment Method</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie data={pieData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {pieData.map((entry, i) => <Cell key={i} fill={COLORS[entry.name] ?? '#6366f1'} />)}
                            </Pie>
                            <Tooltip formatter={v => `₦${Number(v).toLocaleString()}`} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Breakdown</h3>
                    <button
                        onClick={() => exportToCSV(pieData.map(m => ({
                            Method: m.name,
                            'No. of Sales': m.count,
                            Total: m.total,
                            '% of Revenue': grandTotal > 0 ? `${((m.total / grandTotal) * 100).toFixed(1)}%` : '0%',
                        })), 'payment-methods-report')}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                        CSV
                    </button>
                </div>
                {pieData.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">No sales in this period</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Method</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">No. of Sales</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">% of Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {pieData.map((m, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className="capitalize font-medium text-gray-900">{m.name}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{m.count}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-900">₦{m.total.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {grandTotal > 0 ? `${((m.total / grandTotal) * 100).toFixed(1)}%` : '0%'}
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