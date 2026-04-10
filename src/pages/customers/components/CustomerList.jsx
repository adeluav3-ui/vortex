import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

export default function CustomerList({ refresh, onEdit, onView }) {
    const { profile } = useAuth()
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetchCustomers()
    }, [refresh])

    async function fetchCustomers() {
        setLoading(true)
        const { data } = await supabase
            .from('customers')
            .select('*')
            .eq('business_id', profile.business_id)
            .order('created_at', { ascending: false })
        setCustomers(data ?? [])
        setLoading(false)
    }

    async function deleteCustomer(id) {
        if (!confirm('Delete this customer? Their sales history will be unlinked but not deleted.')) return
        await supabase.from('customers').delete().eq('id', id)
        fetchCustomers()
    }

    const filtered = customers.filter(c =>
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search)) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
    )

    const totalCredit = customers.reduce((sum, c) => sum + Number(c.outstanding_balance), 0)

    if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading customers...</div>

    return (
        <div>
            {/* Summary */}
            {customers.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <div className="bg-blue-50 rounded-xl px-5 py-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 font-medium">Total Customers</p>
                            <p className="text-2xl font-bold text-blue-700">{customers.length}</p>
                        </div>
                        <span className="text-3xl">👥</span>
                    </div>
                    <div className="bg-orange-50 rounded-xl px-5 py-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-orange-500 font-medium">Total Outstanding Credit</p>
                            <p className="text-2xl font-bold text-orange-600">₦{totalCredit.toLocaleString()}</p>
                        </div>
                        <span className="text-3xl">📋</span>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="mb-4">
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, phone or email..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                    <p className="text-4xl mb-3">👥</p>
                    <p className="text-gray-500 text-sm">
                        {customers.length === 0
                            ? 'No customers yet. Add your first customer or make a sale with a customer name.'
                            : 'No customers match your search.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Credit Balance</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(customer => (
                                    <tr key={customer.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                                                    {customer.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <button
                                                    onClick={() => onView(customer)}
                                                    className="font-medium text-gray-900 hover:text-blue-600 transition text-left"
                                                >
                                                    {customer.full_name}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{customer.phone ?? '—'}</td>
                                        <td className="px-4 py-3 text-gray-500">{customer.email ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`font-semibold ${Number(customer.outstanding_balance) > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                                                ₦{Number(customer.outstanding_balance).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">
                                            {new Date(customer.created_at).toLocaleDateString('en-NG', {
                                                day: 'numeric', month: 'short', year: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => onView(customer)}
                                                    className="text-xs text-blue-600 hover:underline"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => onEdit(customer)}
                                                    className="text-xs text-gray-500 hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => deleteCustomer(customer.id)}
                                                    className="text-xs text-red-400 hover:underline"
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