// src/pages/admin/Admin.jsx
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import AdminDashboard from './AdminDashboard'
import AdminStats from './components/AdminStats'
import AdminBusinesses from './components/AdminBusinesses'
import AdminUsers from './components/AdminUsers'
import AdminSubscriptions from './components/AdminSubscriptions'
import AdminRevenue from './components/AdminRevenue'
import AdminLogistics from './components/AdminLogistics'

const TABS = [
    { key: 'dashboard', label: '🏠 Dashboard' },
    { key: 'stats', label: '📊 Stats' },
    { key: 'businesses', label: '🏢 Businesses' },
    { key: 'subscriptions', label: '💳 Subscriptions' },
    { key: 'users', label: '👥 Users' },
    { key: 'revenue', label: '💰 Revenue' },
    { key: 'logistics', label: '🚚 Logistics' },
]

export default function Admin() {
    const { profile, loading, signOut } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('dashboard')

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400 text-sm">
                Loading...
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400 text-sm">
                Loading profile...
            </div>
        )
    }

    if (profile.role !== 'super_admin') {
        return <Navigate to="/dashboard" replace />
    }

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Top bar */}
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">V</div>
                    <div>
                        <p className="text-sm font-bold text-white">Vortex Admin</p>
                        <p className="text-xs text-gray-400">Super Admin Panel</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* User info */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold">
                            {profile?.full_name?.charAt(0) || 'A'}
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-medium text-white">{profile?.full_name}</p>
                            <p className="text-xs text-gray-400 capitalize">{profile?.role}</p>
                        </div>
                    </div>

                    {/* Sign Out button */}
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
                    >
                        <span>🚪</span>
                        <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-gray-900 border-b border-gray-800 px-6 sticky top-18.25 z-10">
                <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${activeTab === tab.key
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {activeTab === 'dashboard' && <AdminDashboard />}
                {activeTab === 'stats' && <AdminStats />}
                {activeTab === 'businesses' && <AdminBusinesses />}
                {activeTab === 'subscriptions' && <AdminSubscriptions />}
                {activeTab === 'users' && <AdminUsers />}
                {activeTab === 'revenue' && <AdminRevenue />}
                {activeTab === 'logistics' && <AdminLogistics />}
            </div>
        </div>
    )
}