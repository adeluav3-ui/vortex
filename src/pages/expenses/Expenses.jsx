import { useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import ExpenseList from './components/ExpenseList'
import ExpenseModal from './components/ExpenseModal'
import CategoryManager from './components/CategoryManager'

export default function Expenses() {
    const [showExpenseModal, setShowExpenseModal] = useState(false)
    const [showCategoryManager, setShowCategoryManager] = useState(false)
    const [editingExpense, setEditingExpense] = useState(null)
    const [refresh, setRefresh] = useState(0)

    function handleSaved() {
        setShowExpenseModal(false)
        setEditingExpense(null)
        setRefresh(r => r + 1)
    }

    function handleEdit(expense) {
        setEditingExpense(expense)
        setShowExpenseModal(true)
    }

    return (
        <PageWrapper title="Expenses">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
                    <p className="text-sm text-gray-500">Track and manage your business expenses</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCategoryManager(true)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                        Categories
                    </button>
                    <button
                        onClick={() => { setEditingExpense(null); setShowExpenseModal(true) }}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        + Add Expense
                    </button>
                </div>
            </div>

            <ExpenseList refresh={refresh} onEdit={handleEdit} />

            {showExpenseModal && (
                <ExpenseModal
                    expense={editingExpense}
                    onClose={() => { setShowExpenseModal(false); setEditingExpense(null) }}
                    onSaved={handleSaved}
                />
            )}

            {showCategoryManager && (
                <CategoryManager onClose={() => setShowCategoryManager(false)} />
            )}
        </PageWrapper>
    )
}