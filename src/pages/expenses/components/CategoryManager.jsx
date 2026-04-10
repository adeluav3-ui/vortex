import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

export default function CategoryManager({ onClose }) {
    const { profile } = useAuth()
    const [categories, setCategories] = useState([])
    const [newName, setNewName] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => { fetchCategories() }, [])

    async function fetchCategories() {
        const { data } = await supabase
            .from('expense_categories')
            .select('*')
            .eq('business_id', profile.business_id)
            .order('name')
        setCategories(data ?? [])
    }

    async function addCategory() {
        if (!newName.trim()) return
        setLoading(true)
        await supabase.from('expense_categories').insert({
            business_id: profile.business_id,
            name: newName.trim(),
            is_default: false,
        })
        setNewName('')
        setLoading(false)
        fetchCategories()
    }

    async function deleteCategory(id) {
        if (!confirm('Delete this category? Expenses using it will become uncategorized.')) return
        await supabase.from('expense_categories').delete().eq('id', id)
        fetchCategories()
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Expense Categories</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Add, remove or personalise your categories</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                {/* Add new */}
                <div className="flex gap-2 mb-5">
                    <input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addCategory()}
                        placeholder="New category name"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={addCategory}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        Add
                    </button>
                </div>

                {/* Category list */}
                <div className="space-y-2 max-h-72 overflow-y-auto">
                    {categories.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">No categories yet</p>
                    )}
                    {categories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700">{cat.name}</span>
                                {cat.is_default && (
                                    <span className="text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full">Default</span>
                                )}
                            </div>
                            <button
                                onClick={() => deleteCategory(cat.id)}
                                className="text-xs text-red-400 hover:text-red-600 transition"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}