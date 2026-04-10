// src/pages/admin/AdminDashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function AdminDashboard() {
    const { profile } = useAuth()
    const navigate = useNavigate()

    const [stats, setStats] = useState({
        totalBusinesses: 0,
        activeSubscriptions: 0,
        totalUsers: 0,
        totalRevenue: 0,
        newBusinessesThisMonth: 0,
        mrr: 0,
        arr: 0
    })
    const [recentBusinesses, setRecentBusinesses] = useState([])
    const [recentUsers, setRecentUsers] = useState([])
    const [revenueData, setRevenueData] = useState([])
    const [loading, setLoading] = useState(true)

    const TIER_PRICES = { starter: 8000, growth: 15000, business: 25000 }

    useEffect(() => {
        if (profile?.role !== 'super_admin') {
            navigate('/dashboard')
            return
        }
        fetchAdminData()
    }, [profile])

    async function fetchAdminData() {
        setLoading(true)

        // Get all businesses
        const { data: businesses } = await supabase
            .from('businesses')
            .select('*')
            .order('created_at', { ascending: false })

        // Get active subscriptions
        const { data: subscriptions } = await supabase
            .from('subscriptions')
            .select('*, businesses(name)')
            .eq('status', 'active')

        // Get all users
        const { data: users } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

        // Calculate revenue
        const mrr = subscriptions?.reduce((sum, s) => sum + (TIER_PRICES[s.tier] ?? 0), 0) || 0
        const arr = mrr * 12

        // Get businesses created this month
        const now = new Date()
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const newBusinessesThisMonth = businesses?.filter(b => new Date(b.created_at) >= thisMonth).length || 0

        // Prepare revenue chart data (last 6 months)
        const monthlyRevenue = {}
        subscriptions?.forEach(sub => {
            const month = new Date(sub.created_at).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
            monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (TIER_PRICES[sub.tier] ?? 0)
        })

        const chartData = Object.entries(monthlyRevenue)
            .map(([month, revenue]) => ({ month, revenue }))
            .slice(-6)

        setStats({
            totalBusinesses: businesses?.length || 0,
            activeSubscriptions: subscriptions?.length || 0,
            totalUsers: users?.length || 0,
            totalRevenue: subscriptions?.reduce((sum, s) => sum + (TIER_PRICES[s.tier] ?? 0), 0) || 0,
            newBusinessesThisMonth,
            mrr,
            arr
        })

        setRecentBusinesses(businesses?.slice(0, 5) || [])
        setRecentUsers(users?.slice(0, 5) || [])
        setRevenueData(chartData)
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-gray-400">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
                <h1 className="text-2xl font-bold mb-2">Welcome back, {profile?.full_name?.split(' ')[0] || 'Admin'}!</h1>
                <p className="text-blue-100">Here's what's happening with your platform today.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Businesses', value: stats.totalBusinesses, icon: '🏢', color: 'bg-blue-500', change: `+${stats.newBusinessesThisMonth} this month` },
                    { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: '✅', color: 'bg-green-500', change: `${Math.round((stats.activeSubscriptions / stats.totalBusinesses) * 100)}% conversion` },
                    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'bg-purple-500', change: 'across all businesses' },
                    { label: 'Monthly Revenue', value: `₦${stats.mrr.toLocaleString()}`, icon: '💰', color: 'bg-orange-500', change: `ARR: ₦${stats.arr.toLocaleString()}` },
                ].map(stat => (
                    <div key={stat.label} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-gray-400">{stat.label}</p>
                            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center text-lg`}>
                                {stat.icon}
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                        <p className="text-xs text-gray-500 mt-2">{stat.change}</p>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Revenue Trend (Last 6 Months)</h3>
                    {revenueData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }}
                                    formatter={v => [`₦${Number(v).toLocaleString()}`, 'Revenue']}
                                />
                                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-gray-500">No revenue data yet</div>
                    )}
                </div>

                {/* Plan Distribution */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Plan Distribution</h3>
                    <div className="space-y-4">
                        {[
                            { tier: 'starter', color: 'bg-gray-600', price: '₦8,000/mo' },
                            { tier: 'growth', color: 'bg-yellow-600', price: '₦15,000/mo' },
                            { tier: 'business', color: 'bg-orange-600', price: '₦25,000/mo' }
                        ].map(plan => {
                            const count = stats.activeSubscriptions > 0 ? Math.round(stats.activeSubscriptions * 0.3) : 0 // This would need actual data
                            return (
                                <div key={plan.tier} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 ${plan.color} rounded-full`} />
                                        <span className="text-sm font-medium text-white capitalize">{plan.tier}</span>
                                        <span className="text-xs text-gray-500">{plan.price}</span>
                                    </div>
                                    <span className="text-sm text-gray-400">{count} businesses</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Businesses */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-800">
                        <h3 className="text-sm font-semibold text-white">Recent Businesses</h3>
                    </div>
                    <div className="divide-y divide-gray-800">
                        {recentBusinesses.length === 0 ? (
                            <div className="px-5 py-8 text-center text-gray-500">No businesses yet</div>
                        ) : (
                            recentBusinesses.map(business => (
                                <div key={business.id} className="px-5 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {business.logo_url ? (
                                            <img src={business.logo_url} alt={business.name} className="w-8 h-8 rounded-lg object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center text-blue-400 text-sm font-bold">
                                                {business.name?.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-white">{business.name}</p>
                                            <p className="text-xs text-gray-500">{new Date(business.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400">{business.mode || 'retail'}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="px-5 py-3 border-t border-gray-800">
                        <button onClick={() => navigate('/admin/businesses')} className="text-xs text-blue-400 hover:underline">
                            View all businesses →
                        </button>
                    </div>
                </div>

                {/* Recent Users */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-800">
                        <h3 className="text-sm font-semibold text-white">Recent Users</h3>
                    </div>
                    <div className="divide-y divide-gray-800">
                        {recentUsers.length === 0 ? (
                            <div className="px-5 py-8 text-center text-gray-500">No users yet</div>
                        ) : (
                            recentUsers.map(user => (
                                <div key={user.id} className="px-5 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-900 flex items-center justify-center text-purple-400 text-sm font-bold">
                                            {user.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{user.full_name || 'No name'}</p>
                                            <p className="text-xs text-gray-500">{user.email || 'No email'}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400 capitalize">{user.role || 'user'}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="px-5 py-3 border-t border-gray-800">
                        <button onClick={() => navigate('/admin/users')} className="text-xs text-blue-400 hover:underline">
                            View all users →
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Manage Businesses', icon: '🏢', path: '/admin/businesses', color: 'bg-blue-600' },
                        { label: 'View Subscriptions', icon: '💳', path: '/admin/subscriptions', color: 'bg-green-600' },
                        { label: 'Add Logistics', icon: '🚚', path: '/admin/logistics', color: 'bg-purple-600' },
                        { label: 'View Revenue', icon: '💰', path: '/admin/revenue', color: 'bg-orange-600' },
                    ].map(action => (
                        <button
                            key={action.label}
                            onClick={() => navigate(action.path)}
                            className={`${action.color} text-white px-4 py-3 rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2`}
                        >
                            <span>{action.icon}</span>
                            {action.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}