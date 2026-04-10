import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { exportToCSV } from '../utils/exportUtils'
import { useBranchFilter } from '../../../hooks/useBranchFilter'

export default function ProfitLoss({ dateRange }) {
    const { profile } = useAuth()
    const [sales, setSales] = useState([])
    const [saleItems, setSaleItems] = useState([])
    const [expenses, setExpenses] = useState([])
    const [loading, setLoading] = useState(true)
    const { applyFilter } = useBranchFilter()

    useEffect(() => { fetchData() }, [dateRange])

    async function fetchData() {
        setLoading(true)
        let salesQuery = supabase
            .from('sales')
            .select('id, total, created_at')
            .eq('business_id', profile.business_id)
            .eq('status', 'completed')
            .gte('created_at', dateRange.from)
            .lte('created_at', dateRange.to + 'T23:59:59')
        salesQuery = applyFilter(salesQuery)

        let expensesQuery = supabase
            .from('expenses')
            .select('amount, expense_date')
            .eq('business_id', profile.business_id)
            .gte('expense_date', dateRange.from)
            .lte('expense_date', dateRange.to)
        expensesQuery = applyFilter(expensesQuery)

        const [salesRes, expensesRes] = await Promise.all([salesQuery, expensesQuery])

        const fetchedSales = salesRes.data ?? []
        setSales(fetchedSales)
        setExpenses(expensesRes.data ?? [])

        if (fetchedSales.length > 0) {
            const saleIds = fetchedSales.map(s => s.id)
            const { data: items } = await supabase
                .from('sale_items')
                .select('sale_id, quantity, unit_price, buying_price, subtotal')
                .in('sale_id', saleIds)
            setSaleItems(items ?? [])
        } else {
            setSaleItems([])
        }

        setLoading(false)
    }

    // Core calculations
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0)
    const totalCOGS = saleItems.reduce((sum, i) => sum + (Number(i.buying_price) * Number(i.quantity)), 0)
    const grossProfit = totalRevenue - totalCOGS
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const netProfit = grossProfit - totalExpenses
    const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0
    const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0

    // Build sale lookup for day grouping
    const saleMap = sales.reduce((acc, s) => { acc[s.id] = s; return acc }, {})

    // Group by day
    const allDays = new Set([
        ...sales.map(s => new Date(s.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })),
        ...expenses.map(e => new Date(e.expense_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })),
    ])

    const revenueByDay = sales.reduce((acc, s) => {
        const d = new Date(s.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
        acc[d] = (acc[d] ?? 0) + Number(s.total)
        return acc
    }, {})

    const cogsByDay = saleItems.reduce((acc, item) => {
        const sale = saleMap[item.sale_id]
        if (!sale) return acc
        const d = new Date(sale.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
        acc[d] = (acc[d] ?? 0) + (Number(item.buying_price) * Number(item.quantity))
        return acc
    }, {})

    const expensesByDay = expenses.reduce((acc, e) => {
        const d = new Date(e.expense_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
        acc[d] = (acc[d] ?? 0) + Number(e.amount)
        return acc
    }, {})

    const chartData = [...allDays].map(day => {
        const revenue = revenueByDay[day] ?? 0
        const cogs = cogsByDay[day] ?? 0
        const exp = expensesByDay[day] ?? 0
        const gross = revenue - cogs
        const net = gross - exp
        return { date: day, revenue, cogs, grossProfit: gross, expenses: exp, netProfit: net }
    })

    if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>

    return (
        <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Revenue', value: `₦${totalRevenue.toLocaleString()}`, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'COGS', value: `₦${totalCOGS.toLocaleString()}`, color: 'text-gray-600', bg: 'bg-gray-50' },
                    { label: 'Gross Profit', value: `₦${grossProfit.toLocaleString()}`, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Expenses', value: `₦${totalExpenses.toLocaleString()}`, color: 'text-red-500', bg: 'bg-red-50' },
                    { label: 'Net Profit', value: `₦${netProfit.toLocaleString()}`, color: netProfit >= 0 ? 'text-green-600' : 'text-red-600', bg: netProfit >= 0 ? 'bg-green-50' : 'bg-red-50' },
                    { label: 'Net Margin', value: `${netMargin}%`, color: Number(netMargin) >= 0 ? 'text-green-600' : 'text-red-600', bg: Number(netMargin) >= 0 ? 'bg-green-50' : 'bg-red-50' },
                ].map(stat => (
                    <div key={stat.label} className={`${stat.bg} rounded-xl p-3 shadow-sm`}>
                        <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                        <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Gross margin info */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex flex-wrap gap-6">
                    <div>
                        <p className="text-xs text-gray-400 mb-0.5">Gross Profit</p>
                        <p className="text-sm font-semibold text-purple-600">₦{grossProfit.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 mb-0.5">Gross Margin</p>
                        <p className="text-sm font-semibold text-purple-600">{grossMargin}%</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 mb-0.5">Net Profit</p>
                        <p className={`text-sm font-semibold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₦{netProfit.toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 mb-0.5">Net Margin</p>
                        <p className={`text-sm font-semibold ${Number(netMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {netMargin}%
                        </p>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                    <strong>COGS</strong> = buying price × qty sold &nbsp;|&nbsp;
                    <strong>Gross Profit</strong> = Revenue − COGS &nbsp;|&nbsp;
                    <strong>Net Profit</strong> = Gross Profit − Expenses
                </p>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue vs Gross Profit vs Net Profit</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData}>
                            <defs>
                                {[
                                    { id: 'revenue', color: '#3b82f6' },
                                    { id: 'grossProfit', color: '#8b5cf6' },
                                    { id: 'netProfit', color: '#10b981' },
                                ].map(({ id, color }) => (
                                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={v => `₦${Number(v).toLocaleString()}`} />
                            <Legend />
                            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revenue)" name="Revenue" />
                            <Area type="monotone" dataKey="grossProfit" stroke="#8b5cf6" fill="url(#grossProfit)" name="Gross Profit" />
                            <Area type="monotone" dataKey="netProfit" stroke="#10b981" fill="url(#netProfit)" name="Net Profit" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Daily Breakdown</h3>
                    <button
                        onClick={() => exportToCSV(chartData.map(d => ({
                            Date: d.date,
                            Revenue: d.revenue,
                            COGS: d.cogs,
                            'Gross Profit': d.grossProfit,
                            Expenses: d.expenses,
                            'Net Profit': d.netProfit,
                        })), 'profit-loss-report')}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                        CSV
                    </button>
                </div>
                {chartData.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">No data in this period</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">COGS</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Gross Profit</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Expenses</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Net Profit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {chartData.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-500 text-xs">{row.date}</td>
                                        <td className="px-4 py-3 text-blue-600 font-medium">₦{row.revenue.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-gray-500">₦{row.cogs.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-purple-600 font-medium">₦{row.grossProfit.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-red-500">₦{row.expenses.toLocaleString()}</td>
                                        <td className={`px-4 py-3 font-bold ${row.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {row.netProfit >= 0 ? '+' : ''}₦{row.netProfit.toLocaleString()}
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