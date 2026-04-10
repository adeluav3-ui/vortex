import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

export default function CategoryModal({ onClose }) {
    const { profile } = useAuth()
    const [categories, setCategories] = useState([])
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => { fetchCategories() }, [])

    async function fetchCategories() {
        const { data } = await supabase
            .from('categories')
            .select('*')
            .eq('business_id', profile.business_id)
            .order('name')
        setCategories(data ?? [])
    }

    async function addCategory() {
        if (!name.trim()) return
        setLoading(true)
        await supabase.from('categories').insert({
            business_id: profile.business_id,
            name: name.trim()
        })
        setName('')
        setLoading(false)
        fetchCategories()
    }

    async function deleteCategory(id) {
        await supabase.from('categories').delete().eq('id', id)
        fetchCategories()
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <div className="flex gap-2 mb-4">
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
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

                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {categories.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">No categories yet</p>
                    )}
                    {categories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-700">{cat.name}</span>
                            <button
                                onClick={() => deleteCategory(cat.id)}
                                className="text-xs text-red-400 hover:text-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}