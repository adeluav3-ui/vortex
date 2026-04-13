// src/pages/dashboard/Dashboard.jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import RetailDashboard from './RetailDashboard'
import VendorDashboard from './VendorDashboard'

export default function Dashboard() {
    const { profile } = useAuth()
    const navigate = useNavigate()

    // Super admin should go to admin panel
    useEffect(() => {
        if (profile?.role === 'super_admin') {
            navigate('/admin', { replace: true })
        }
    }, [profile, navigate])

    // Don't render anything while checking or redirecting
    if (profile?.role === 'super_admin') {
        return null
    }

    const mode = profile?.businesses?.mode
    const dashboardView = profile?.dashboard_view || 'retail'

    // Combo users see the dashboard based on their saved view preference
    if (mode === 'combo') {
        return dashboardView === 'retail' ? <RetailDashboard /> : <VendorDashboard />
    }

    if (mode === 'online_vendor') return <VendorDashboard />
    return <RetailDashboard />
}