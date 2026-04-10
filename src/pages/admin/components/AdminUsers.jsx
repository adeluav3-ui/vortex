import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const ROLE_COLORS = {
    super_admin: 'bg-purple-900 text-purple-300',
    owner: 'bg-blue-900 text-blue-300',
    manager: 'bg-cyan-900 text-cyan-300',
    staff: 'bg-gray-700 text-gray-300',
    cashier: 'bg-green-900 text-green-300',
}

export default function AdminUsers() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => { fetchUsers() }, [])

    async function fetchUsers() {
        setLoading(true)
        const { data } = await supabase
            .from('profiles')
            .select('*, businesses(name)')
            .order('created_at', { ascending: false })
        setUsers(data ?? [])
        setLoading(false)
    }

    const filtered = users.filter(u =>
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.businesses?.name?.toLowerCase().includes(search.toLowerCase())
    )

    if (loading) return <div className="text-sm text-gray-500 py-8 text-center">Loading...</div>

    return (
        <div>
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">All Users ({users.length})</h2>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search users..."
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-800">
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Business</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {filtered.map(user => (
                                <tr key={user.id} className="hover:bg-gray-800 transition">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-400 text-sm font-bold">
                                                {user.full_name?.charAt(0) ?? '?'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{user.full_name ?? '—'}</p>
                                                {user.phone && <p className="text-xs text-gray-500">{user.phone}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${ROLE_COLORS[user.role] ?? 'bg-gray-700 text-gray-300'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400">{user.businesses?.name ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.is_active ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                        {new Date(user.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}