import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

export default function ExpenseModal({ expense, onClose, onSaved }) {
    const { profile, user } = useAuth()
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [receiptFile, setReceiptFile] = useState(null)
    const [receiptPreview, setReceiptPreview] = useState(expense?.receipt_url ?? null)

    const [form, setForm] = useState({
        title: expense?.title ?? '',
        amount: expense?.amount ?? '',
        category_id: expense?.category_id ?? '',
        note: expense?.note ?? '',
        expense_date: expense?.expense_date ?? new Date().toISOString().split('T')[0],
    })

    useEffect(() => {
        supabase
            .from('expense_categories')
            .select('*')
            .eq('business_id', profile.business_id)
            .order('name')
            .then(({ data }) => setCategories(data ?? []))
    }, [])

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    function handleReceiptChange(e) {
        const file = e.target.files[0]
        if (!file) return
        setReceiptFile(file)
        setReceiptPreview(URL.createObjectURL(file))
    }

    async function handleSave() {
        setError('')
        if (!form.title.trim()) return setError('Title is required')
        if (!form.amount || Number(form.amount) <= 0) return setError('Valid amount is required')
        setLoading(true)

        try {
            let receipt_url = expense?.receipt_url ?? null

            if (receiptFile) {
                const ext = receiptFile.name.split('.').pop()
                const path = `${profile.business_id}/${Date.now()}.${ext}`
                const { error: uploadError } = await supabase.storage
                    .from('expense-receipts')
                    .upload(path, receiptFile, { upsert: true })
                if (uploadError) throw uploadError
                const { data: urlData } = supabase.storage
                    .from('expense-receipts')
                    .getPublicUrl(path)
                receipt_url = urlData.publicUrl
            }

            if (expense) {
                const { error: updateError } = await supabase
                    .from('expenses')
                    .update({
                        title: form.title,
                        amount: Number(form.amount),
                        category_id: form.category_id || null,
                        note: form.note,
                        expense_date: form.expense_date,
                        receipt_url,
                    })
                    .eq('id', expense.id)
                if (updateError) throw updateError
            } else {
                const { error: insertError } = await supabase
                    .from('expenses')
                    .insert({
                        business_id: profile.business_id,
                        branch_id: profile.branch_id,
                        user_id: user.id,
                        title: form.title,
                        amount: Number(form.amount),
                        category_id: form.category_id || null,
                        note: form.note,
                        expense_date: form.expense_date,
                        receipt_url,
                    })
                if (insertError) throw insertError
            }

            onSaved()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {expense ? 'Edit Expense' : 'Add Expense'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. Monthly Rent Payment"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
                            <input
                                name="amount"
                                type="number"
                                value={form.amount}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                name="expense_date"
                                type="date"
                                value={form.expense_date}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                            name="category_id"
                            value={form.category_id}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select category</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                        <textarea
                            name="note"
                            value={form.note}
                            onChange={handleChange}
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Additional details..."
                        />
                    </div>

                    {/* Receipt upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Receipt (optional)</label>
                        <div className="flex items-center gap-4">
                            {receiptPreview && (
                                <a href={receiptPreview} target="_blank" rel="noreferrer">
                                    <img
                                        src={receiptPreview}
                                        alt="receipt"
                                        className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                                    />
                                </a>
                            )}
                            <label className="cursor-pointer text-sm text-blue-600 font-medium hover:underline">
                                {receiptPreview ? 'Change receipt' : 'Upload receipt'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleReceiptChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : expense ? 'Save Changes' : 'Add Expense'}
                    </button>
                </div>
            </div>
        </div>
    )
}