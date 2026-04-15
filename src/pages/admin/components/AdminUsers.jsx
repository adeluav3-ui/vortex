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
    const [stats, setStats] = useState({ totalAuthUsers: 0, totalProfiles: 0, orphanedAuthUsers: 0 })

    useEffect(() => { fetchAllUsers() }, [])

    async function fetchAllUsers() {
        setLoading(true)

        try {
            // Method 1: Get all auth users via admin API (requires service role)
            // Since you might not have this, let's use a different approach

            // Get all profiles
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*, businesses(name, mode)')
                .order('created_at', { ascending: false })

            if (profilesError) {
                console.error('Error fetching profiles:', profilesError)
            }

            // Also get all businesses to see which ones don't have owners
            const { data: businesses } = await supabase
                .from('businesses')
                .select('id, name, mode, created_at')
                .order('created_at', { ascending: false })

            // Get all staff records
            const { data: staffRecords } = await supabase
                .from('staff')
                .select('*, businesses(name)')

            // Create a map of business_id to owner
            const businessOwners = {}
            profiles?.forEach(profile => {
                if (profile.business_id && (profile.role === 'owner' || profile.role === 'super_admin')) {
                    if (!businessOwners[profile.business_id]) {
                        businessOwners[profile.business_id] = profile
                    }
                }
            })

            // Find businesses without owners
            const businessesWithoutOwners = businesses?.filter(b => !businessOwners[b.id]) || []

            // Enrich profiles with additional info
            const enrichedUsers = profiles?.map(profile => ({
                ...profile,
                hasBusiness: !!profile.businesses,
                businessMode: profile.businesses?.mode,
                isOwnerOrphan: profile.role === 'owner' && !profile.businesses
            })) || []

            setUsers(enrichedUsers)
            setStats({
                totalProfiles: profiles?.length || 0,
                totalBusinesses: businesses?.length || 0,
                businessesWithoutOwners: businessesWithoutOwners.length,
                totalStaff: staffRecords?.length || 0,
                orphanedOwners: enrichedUsers.filter(u => u.isOwnerOrphan).length
            })
        } catch (err) {
            console.error('Error:', err)
        } finally {
            setLoading(false)
        }
    }

    const filtered = users.filter(u =>
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.businesses?.name?.toLowerCase().includes(search.toLowerCase())
    )

    if (loading) return <div className="text-sm text-gray-500 py-8 text-center">Loading...</div>

    return (
        <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-400">Total Profiles</p>
                    <p className="text-2xl font-bold text-white">{stats.totalProfiles}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-400">Total Businesses</p>
                    <p className="text-2xl font-bold text-white">{stats.totalBusinesses}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-400">Businesses w/o Owner</p>
                    <p className="text-2xl font-bold text-yellow-400">{stats.businessesWithoutOwners}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-400">Orphaned Owners</p>
                    <p className="text-2xl font-bold text-red-400">{stats.orphanedOwners}</p>
                </div>
            </div>

            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">All Users ({users.length})</h2>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search users..."
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
            </div>

            {/* Businesses without owners warning */}
            {stats.businessesWithoutOwners > 0 && (
                <div className="mb-4 bg-yellow-900/30 border border-yellow-700 rounded-xl p-4">
                    <p className="text-sm text-yellow-400 font-medium mb-2">⚠️ Businesses without an owner profile:</p>
                    <div className="space-y-1">
                        {businessesWithoutOwners.slice(0, 5).map(b => (
                            <p key={b.id} className="text-xs text-yellow-300">• {b.name} (created: {new Date(b.created_at).toLocaleDateString()})</p>
                        ))}
                        {stats.businessesWithoutOwners > 5 && (
                            <p className="text-xs text-yellow-400">...and {stats.businessesWithoutOwners - 5} more</p>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-800">
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Business</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-800 transition">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-400 text-sm font-bold">
                                                    {user.full_name?.charAt(0) ?? '?'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">
                                                        {user.full_name ?? '—'}
                                                        {user.isOwnerOrphan && (
                                                            <span className="ml-2 text-xs text-red-400">(orphaned)</span>
                                                        )}
                                                    </p>
                                                    {user.phone && <p className="text-xs text-gray-500">{user.phone}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">
                                            {user.email ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${ROLE_COLORS[user.role] ?? 'bg-gray-700 text-gray-300'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.businesses ? (
                                                <div>
                                                    <p className="text-gray-300">{user.businesses.name}</p>
                                                    <p className="text-xs text-gray-500 capitalize">{user.businesses.mode}</p>
                                                </div>
                                            ) : (
                                                <span className="text-red-400 text-xs">No business assigned</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.is_active ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {new Date(user.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}