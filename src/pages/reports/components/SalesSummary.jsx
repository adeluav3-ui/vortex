import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { exportToCSV, exportToPDF } from '../utils/exportUtils'
import { useBranchFilter } from '../../../hooks/useBranchFilter'

export default function SalesSummary({ dateRange }) {
    const { profile } = useAuth()
    const [sales, setSales] = useState([])
    const [loading, setLoading] = useState(true)
    const { applyFilter } = useBranchFilter()

    useEffect(() => { fetchSales() }, [dateRange])

    async function fetchSales() {
        setLoading(true)
        let query = supabase
            .from('sales')
            .select('*')
            .eq('business_id', profile.business_id)
            .eq('status', 'completed')
            .gte('created_at', dateRange.from)
            .lte('created_at', dateRange.to + 'T23:59:59')
            .order('created_at', { ascending: true })
        query = applyFilter(query)
        const { data } = await query
        setSales(data ?? [])
        setLoading(false)
    }

    // Group by day
    const grouped = sales.reduce((acc, sale) => {
        const day = new Date(sale.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
        acc[day] = (acc[day] ?? 0) + Number(sale.total)
        return acc
    }, {})

    const chartData = Object.entries(grouped).map(([date, total]) => ({ date, total }))

    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0)
    const totalDiscount = sales.reduce((sum, s) => sum + Number(s.discount), 0)
    const avgSale = sales.length ? totalRevenue / sales.length : 0

    if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>

    return (
        <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Total Revenue', value: `₦${totalRevenue.toLocaleString()}`, color: 'text-blue-600' },
                    { label: 'Total Sales', value: sales.length.toString(), color: 'text-purple-600' },
                    { label: 'Average Sale', value: `₦${avgSale.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-green-600' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Daily Revenue</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={v => [`₦${Number(v).toLocaleString()}`, 'Revenue']} />
                            <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Sales ({sales.length})</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => exportToCSV(sales.map(s => ({
                                Date: new Date(s.created_at).toLocaleDateString(),
                                'Sale No': s.sale_number,
                                'Payment Method': s.payment_method,
                                Subtotal: s.subtotal,
                                Discount: s.discount,
                                Total: s.total,
                            })), 'sales-report')}
                            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                        >
                            CSV
                        </button>
                        <button
                            onClick={() => exportToPDF('sales-table', 'Sales Report')}
                            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            PDF
                        </button>
                    </div>
                </div>
                {sales.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">No sales in this period</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table id="sales-table" className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Sale No</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Method</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Discount</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {sales.map(sale => (
                                    <tr key={sale.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {new Date(sale.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{sale.sale_number}</td>
                                        <td className="px-4 py-3 capitalize text-gray-500">{sale.payment_method}</td>
                                        <td className="px-4 py-3 text-gray-700">₦{Number(sale.subtotal).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-red-400">
                                            {Number(sale.discount) > 0 ? `-₦${Number(sale.discount).toLocaleString()}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-gray-900">₦{Number(sale.total).toLocaleString()}</td>
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