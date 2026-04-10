import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

export default function CustomerModal({ customer, onClose, onSaved }) {
    const { profile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [form, setForm] = useState({
        full_name: customer?.full_name ?? '',
        phone: customer?.phone ?? '',
        email: customer?.email ?? '',
    })

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    async function handleSave() {
        setError('')
        if (!form.full_name.trim()) return setError('Customer name is required')
        setLoading(true)

        try {
            if (customer) {
                const { error } = await supabase
                    .from('customers')
                    .update({
                        full_name: form.full_name.trim(),
                        phone: form.phone.trim() || null,
                        email: form.email.trim() || null,
                    })
                    .eq('id', customer.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('customers')
                    .insert({
                        business_id: profile.business_id,
                        branch_id: profile.branch_id,
                        full_name: form.full_name.trim(),
                        phone: form.phone.trim() || null,
                        email: form.email.trim() || null,
                    })
                if (error) throw error
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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {customer ? 'Edit Customer' : 'Add Customer'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            name="full_name"
                            value={form.full_name}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. Amaka Obi"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="08012345678"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                        <input
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="amaka@example.com"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
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
                        {loading ? 'Saving...' : customer ? 'Save Changes' : 'Add Customer'}
                    </button>
                </div>
            </div>
        </div>
    )
}