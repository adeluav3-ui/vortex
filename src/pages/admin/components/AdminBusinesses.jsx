import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const TIER_COLORS = {
    starter: 'bg-gray-700 text-gray-300',
    growth: 'bg-yellow-900 text-yellow-300',
    business: 'bg-orange-900 text-orange-300',
    solo: 'bg-gray-700 text-gray-300',
    hustle: 'bg-blue-900 text-blue-300',
    scale: 'bg-indigo-900 text-indigo-300',
}

const STATUS_COLORS = {
    active: 'bg-green-900 text-green-300',
    trialing: 'bg-amber-900 text-amber-300',
    inactive: 'bg-gray-700 text-gray-400',
    expired: 'bg-red-900 text-red-300',
    cancelled: 'bg-red-900 text-red-300',
}

export default function AdminBusinesses() {
    const [businesses, setBusinesses] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [modeFilter, setModeFilter] = useState('all')

    useEffect(() => { fetchBusinesses() }, [])

    async function fetchBusinesses() {
        setLoading(true)
        const { data } = await supabase
            .from('businesses')
            .select(`
                *,
                subscriptions ( tier, status, is_trial, trial_end ),
                branches ( id ),
                profiles ( id, full_name, role )
            `)
            .order('created_at', { ascending: false })
        setBusinesses(data ?? [])
        setLoading(false)
    }

    const filtered = businesses.filter(b => {
        const matchSearch = !search.trim() ||
            b.name.toLowerCase().includes(search.toLowerCase()) ||
            b.email?.toLowerCase().includes(search.toLowerCase())
        const matchMode = modeFilter === 'all' ||
            (modeFilter === 'vendor' && b.mode === 'online_vendor') ||
            (modeFilter === 'retail' && b.mode !== 'online_vendor')
        return matchSearch && matchMode
    })

    if (loading) return <div className="text-sm text-gray-500 py-8 text-center">Loading...</div>

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                <h2 className="text-lg font-bold text-white">
                    All Businesses ({businesses.length})
                    <span className="ml-2 text-sm font-normal text-gray-500">
                        {businesses.filter(b => b.mode === 'online_vendor').length} vendors ·{' '}
                        {businesses.filter(b => b.mode !== 'online_vendor').length} retail
                    </span>
                </h2>
                <div className="flex gap-2">
                    {/* Mode filter */}
                    <div className="flex gap-1">
                        {[
                            { value: 'all', label: 'All' },
                            { value: 'retail', label: '🏪 Retail' },
                            { value: 'vendor', label: '📦 Vendor' },
                        ].map(f => (
                            <button
                                key={f.value}
                                onClick={() => setModeFilter(f.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${modeFilter === f.value
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search..."
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                    />
                </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-800">
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Business</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Mode</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Owner</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Plan</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Branches</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Users</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {filtered.map(biz => {
                                const sub = biz.subscriptions?.[0]
                                const owner = biz.profiles?.find(p => p.role === 'owner')
                                const isVendor = biz.mode === 'online_vendor'
                                const isTrialing = sub?.status === 'trialing'

                                return (
                                    <tr key={biz.id} className="hover:bg-gray-800 transition">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {biz.logo_url ? (
                                                    <img src={biz.logo_url} alt={biz.name} className="w-8 h-8 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center text-blue-400 text-sm font-bold">
                                                        {biz.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-white">{biz.name}</p>
                                                    {biz.email && <p className="text-xs text-gray-500">{biz.email}</p>}
                                                    {biz.business_type && (
                                                        <p className="text-xs text-gray-600 capitalize">{biz.business_type}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${isVendor
                                                    ? 'bg-purple-900 text-purple-300'
                                                    : 'bg-cyan-900 text-cyan-300'
                                                }`}>
                                                {isVendor ? '📦 Vendor' : '🏪 Retail'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">{owner?.full_name ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize w-fit ${TIER_COLORS[sub?.tier] ?? 'bg-gray-700 text-gray-400'}`}>
                                                    {sub?.tier ?? '—'}
                                                </span>
                                                {isTrialing && (
                                                    <span className="text-xs text-amber-400 font-medium">🎁 Trial</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[sub?.status] ?? 'bg-gray-700 text-gray-400'}`}>
                                                {sub?.status ?? '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">
                                            {isVendor ? <span className="text-gray-600">—</span> : (biz.branches?.length ?? 0)}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{biz.profiles?.length ?? 0}</td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {new Date(biz.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="py-12 text-center text-sm text-gray-500">No businesses match your search</div>
                )}
            </div>
        </div>
    )
}