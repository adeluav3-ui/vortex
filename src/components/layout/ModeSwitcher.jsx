// src/components/layout/ModeSwitcher.jsx
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function ModeSwitcher() {
    const { profile, user, fetchProfile } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [switching, setSwitching] = useState(false)

    const currentView = profile?.dashboard_view || 'retail'
    const isCombo = profile?.businesses?.mode === 'combo'

    if (!isCombo) return null

    async function switchMode(view) {
        if (view === currentView || switching) return

        setSwitching(true)

        // Save preference to database
        await supabase
            .from('profiles')
            .update({ dashboard_view: view })
            .eq('id', user.id)

        await fetchProfile(user.id)

        // Navigate to appropriate dashboard based on new view
        if (location.pathname !== '/dashboard') {
            navigate('/dashboard')
        }

        setSwitching(false)
    }

    return (
        <div className="px-3 py-2 border-b border-gray-700">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-3">View Mode</p>
            <div className="flex gap-2">
                <button
                    onClick={() => switchMode('retail')}
                    disabled={switching || currentView === 'retail'}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${currentView === 'retail'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                >
                    <span>🏪</span>
                    Store
                </button>
                <button
                    onClick={() => switchMode('vendor')}
                    disabled={switching || currentView === 'vendor'}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${currentView === 'vendor'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                >
                    <span>📦</span>
                    Online
                </button>
            </div>
        </div>
    )
}