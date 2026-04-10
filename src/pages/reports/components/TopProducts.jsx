import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { exportToCSV } from '../utils/exportUtils'
import { useBranchFilter } from '../../../hooks/useBranchFilter'

export default function TopProducts({ dateRange }) {
    const { profile } = useAuth()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const { applyFilter } = useBranchFilter()

    useEffect(() => { fetchData() }, [dateRange])

    async function fetchData() {
        setLoading(true)
        let query = supabase
            .from('sales')
            .select('id, created_at')
            .eq('business_id', profile.business_id)
            .eq('status', 'completed')
            .gte('created_at', dateRange.from)
            .lte('created_at', dateRange.to + 'T23:59:59')
        query = applyFilter(query)
        const { data: sales } = await query

        if (!sales?.length) { setItems([]); setLoading(false); return }

        const saleIds = sales.map(s => s.id)
        const { data: saleItems } = await supabase
            .from('sale_items')
            .select('*')
            .in('sale_id', saleIds)

        const agg = (saleItems ?? []).reduce((acc, item) => {
            const key = `${item.product_name}${item.variant_name !== 'Default' ? ` (${item.variant_name})` : ''}`
            if (!acc[key]) acc[key] = { name: key, quantity: 0, revenue: 0 }
            acc[key].quantity += Number(item.quantity)
            acc[key].revenue += Number(item.subtotal)
            return acc
        }, {})

        setItems(Object.values(agg).sort((a, b) => b.revenue - a.revenue))
        setLoading(false)
    }
    const top10 = items.slice(0, 10)

    if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>

    return (
        <div className="space-y-5">
            {top10.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Top 10 Products by Revenue</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={top10} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
                            <Tooltip formatter={v => `₦${Number(v).toLocaleString()}`} />
                            <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">All Products</h3>
                    <button
                        onClick={() => exportToCSV(items.map((item, i) => ({
                            Rank: i + 1,
                            Product: item.name,
                            'Qty Sold': item.quantity,
                            Revenue: item.revenue,
                        })), 'top-products-report')}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                        CSV
                    </button>
                </div>
                {items.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">No sales data in this period</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rank</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty Sold</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {items.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-400 font-medium">#{i + 1}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-4 py-3 text-gray-600">{item.quantity}</td>
                                        <td className="px-4 py-3 font-semibold text-blue-600">₦{item.revenue.toLocaleString()}</td>
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