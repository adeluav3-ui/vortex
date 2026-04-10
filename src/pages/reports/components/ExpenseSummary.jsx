import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { exportToCSV, exportToPDF } from '../utils/exportUtils'
import { useBranchFilter } from '../../../hooks/useBranchFilter'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1']

export default function ExpenseSummary({ dateRange }) {
    const { profile } = useAuth()
    const [expenses, setExpenses] = useState([])
    const [loading, setLoading] = useState(true)
    const { applyFilter } = useBranchFilter()

    useEffect(() => { fetchExpenses() }, [dateRange])

    async function fetchExpenses() {
        setLoading(true)
        let query = supabase
            .from('expenses')
            .select('*, expense_categories(name)')
            .eq('business_id', profile.business_id)
            .gte('expense_date', dateRange.from)
            .lte('expense_date', dateRange.to)
            .order('expense_date', { ascending: false })
        query = applyFilter(query)
        const { data } = await query
        setExpenses(data ?? [])
        setLoading(false)
    }

    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

    // Group by category
    const byCategory = expenses.reduce((acc, e) => {
        const cat = e.expense_categories?.name ?? 'Uncategorized'
        acc[cat] = (acc[cat] ?? 0) + Number(e.amount)
        return acc
    }, {})

    const pieData = Object.entries(byCategory).map(([name, value]) => ({ name, value }))

    if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600">₦{total.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Number of Entries</p>
                    <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
                </div>
            </div>

            {pieData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Expenses by Category</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={v => `₦${Number(v).toLocaleString()}`} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Expenses ({expenses.length})</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => exportToCSV(expenses.map(e => ({
                                Date: e.expense_date,
                                Title: e.title,
                                Category: e.expense_categories?.name ?? 'Uncategorized',
                                Amount: e.amount,
                                Note: e.note ?? '',
                            })), 'expenses-report')}
                            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                        >
                            CSV
                        </button>
                        <button
                            onClick={() => exportToPDF('expenses-table', 'Expenses Report')}
                            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            PDF
                        </button>
                    </div>
                </div>
                {expenses.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">No expenses in this period</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table id="expenses-table" className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {expenses.map(e => (
                                    <tr key={e.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-500 text-xs">{new Date(e.expense_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{e.title}</td>
                                        <td className="px-4 py-3 text-gray-500">{e.expense_categories?.name ?? 'Uncategorized'}</td>
                                        <td className="px-4 py-3 font-semibold text-red-500">₦{Number(e.amount).toLocaleString()}</td>
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