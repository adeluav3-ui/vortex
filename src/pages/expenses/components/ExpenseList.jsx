import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useBranchFilter } from '../../../hooks/useBranchFilter'

export default function ExpenseList({ refresh, onEdit }) {
    const { profile } = useAuth()
    const [expenses, setExpenses] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [categoryFilter, setCategoryFilter] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const { applyFilter } = useBranchFilter()

    useEffect(() => {
        if (profile?.business_id) {
            fetchCategories()
        }
    }, [profile]) // Added profile dependency

    useEffect(() => {
        if (profile?.business_id) {
            fetchExpenses()
        }
    }, [refresh, categoryFilter, dateFrom, dateTo, profile]) // Added profile dependency

    async function fetchExpenses() {
        setLoading(true)
        let query = supabase
            .from('expenses')
            .select('*, expense_categories(name)')
            .eq('business_id', profile.business_id)
            .order('expense_date', { ascending: false })

        query = applyFilter(query)
        if (categoryFilter) query = query.eq('category_id', categoryFilter)
        if (dateFrom) query = query.gte('expense_date', dateFrom)
        if (dateTo) query = query.lte('expense_date', dateTo)

        const { data } = await query
        setExpenses(data ?? [])
        setLoading(false)
    }

    async function fetchCategories() {
        if (!profile?.business_id) return

        const { data, error } = await supabase
            .from('expense_categories')
            .select('*')
            .eq('business_id', profile.business_id)
            .order('name')

        if (error) {
            console.error('Error fetching categories:', error)
        }
        setCategories(data ?? [])
    }

    async function deleteExpense(id) {
        if (!confirm('Delete this expense?')) return

        const { error } = await supabase.from('expenses').delete().eq('id', id)
        if (error) {
            console.error('Error deleting expense:', error)
            alert('Failed to delete expense')
            return
        }
        fetchExpenses()
    }

    const totalFiltered = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

    if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading expenses...</div>

    return (
        <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">All Categories</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {(categoryFilter || dateFrom || dateTo) && (
                    <button
                        onClick={() => { setCategoryFilter(''); setDateFrom(''); setDateTo('') }}
                        className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Summary */}
            {expenses.length > 0 && (
                <div className="bg-red-50 rounded-xl px-5 py-4 mb-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-red-500 font-medium">Total Expenses</p>
                        <p className="text-2xl font-bold text-red-600">₦{totalFiltered.toLocaleString()}</p>
                    </div>
                    <span className="text-3xl">💸</span>
                </div>
            )}

            {expenses.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                    <p className="text-4xl mb-3">💸</p>
                    <p className="text-gray-500 text-sm">No expenses recorded yet</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Receipt</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {expenses.map(expense => (
                                    <tr key={expense.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 text-gray-500">
                                            {new Date(expense.expense_date).toLocaleDateString('en-NG', {
                                                day: 'numeric', month: 'short', year: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900">{expense.title}</p>
                                            {expense.note && <p className="text-xs text-gray-400">{expense.note}</p>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                                {expense.expense_categories?.name ?? 'Uncategorized'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-red-600">
                                            ₦{Number(expense.amount).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            {expense.receipt_url ? (
                                                <a
                                                    href={expense.receipt_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs text-blue-600 hover:underline"
                                                >
                                                    View
                                                </a>
                                            ) : (
                                                <span className="text-xs text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => onEdit(expense)}
                                                    className="text-xs text-blue-600 hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => deleteExpense(expense.id)}
                                                    className="text-xs text-red-500 hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}