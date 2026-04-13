import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

const ROLE_COLORS = {
    owner: 'bg-purple-50 text-purple-600',
    manager: 'bg-blue-50 text-blue-600',
    staff: 'bg-gray-100 text-gray-600',
    cashier: 'bg-green-50 text-green-600',
}

export default function StaffList({ refresh, onEdit, onView }) {
    const { profile } = useAuth()
    const [staffList, setStaffList] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetchStaff()
    }, [refresh])

    async function fetchStaff() {
        setLoading(true)
        const { data } = await supabase
            .from('staff')
            .select('*, branches(name)')
            .eq('business_id', profile.business_id)
            .order('created_at', { ascending: false })
        setStaffList(data ?? [])
        setLoading(false)
    }

    async function toggleActive(member) {
        await supabase
            .from('staff')
            .update({ is_active: !member.is_active })
            .eq('id', member.id)
        fetchStaff()
    }

    async function deleteStaff(id) {
        if (!confirm('Remove this staff member? This cannot be undone.')) return
        await supabase.from('staff').delete().eq('id', id)
        fetchStaff()
    }

    const filtered = staffList.filter(s =>
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.phone && s.phone.includes(search)) ||
        (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
    )

    const totalSalary = staffList
        .filter(s => s.is_active)
        .reduce((sum, s) => sum + Number(s.salary), 0)

    if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading staff...</div>

    return (
        <div>
            {/* Summary */}
            {staffList.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                    <div className="bg-blue-50 rounded-xl px-5 py-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 font-medium">Total Staff</p>
                            <p className="text-2xl font-bold text-blue-700">{staffList.length}</p>
                        </div>
                        <span className="text-3xl">👤</span>
                    </div>
                    <div className="bg-green-50 rounded-xl px-5 py-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 font-medium">Active</p>
                            <p className="text-2xl font-bold text-green-700">{staffList.filter(s => s.is_active).length}</p>
                        </div>
                        <span className="text-3xl">✅</span>
                    </div>
                    <div className="bg-orange-50 rounded-xl px-5 py-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-orange-500 font-medium">Monthly Salary Bill</p>
                            <p className="text-2xl font-bold text-orange-600">₦{totalSalary.toLocaleString()}</p>
                        </div>
                        <span className="text-3xl">💰</span>
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
                    <p className="text-4xl mb-3">👤</p>
                    <p className="text-gray-500 text-sm">
                        {staffList.length === 0
                            ? 'No staff added yet. Add your first team member.'
                            : 'No staff match your search.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Branch</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Salary</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(member => (
                                    <tr key={member.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                                                    {member.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <button
                                                        onClick={() => onView(member)}
                                                        className="font-medium text-gray-900 hover:text-blue-600 transition text-left"
                                                    >
                                                        {member.full_name}
                                                    </button>
                                                    {member.phone && <p className="text-xs text-gray-400">{member.phone}</p>}
                                                    {member.email && <p className="text-xs text-gray-400">{member.email}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${ROLE_COLORS[member.role] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {member.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{member.branches?.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-gray-900 font-medium">
                                            {Number(member.salary) > 0 ? `₦${Number(member.salary).toLocaleString()}` : '—'}
                                            {member.salary_frequency && Number(member.salary) > 0 && (
                                                <span className="text-xs text-gray-400 ml-1">/{member.salary_frequency}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => toggleActive(member)}
                                                className={`text-xs px-2 py-1 rounded-full font-medium ${member.is_active
                                                        ? 'bg-green-50 text-green-600'
                                                        : 'bg-gray-100 text-gray-400'
                                                    }`}
                                            >
                                                {member.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => onView(member)}
                                                    className="text-xs text-blue-600 hover:underline"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => onEdit(member)}
                                                    className="text-xs text-gray-500 hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => deleteStaff(member.id)}
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