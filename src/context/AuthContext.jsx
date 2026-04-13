// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getPlanLimits, canAccess } from '../lib/planLimits'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            if (session?.user) fetchProfile(session.user.id)
            else setLoading(false)
        })

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) fetchProfile(session.user.id)
            else {
                setProfile(null)
                setLoading(false)
            }
        })

        return () => listener.subscription.unsubscribe()
    }, [])

    async function fetchProfile(userId) {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (data?.business_id) {
            const [bizRes, subRes] = await Promise.all([
                supabase.from('businesses').select('*').eq('id', data.business_id).single(),
                supabase.from('subscriptions')
                    .select('tier, status, is_trial, trial_start, trial_end')
                    .eq('business_id', data.business_id)
                    .single(),
            ])
            data.businesses = bizRes.data
            data.subscription = subRes.data
            if (data.businesses) {
                data.businesses.subscription_tier = subRes.data?.tier ?? 'starter'
            }

            // Set default dashboard_view for combo users
            if (data.businesses?.mode === 'combo' && !data.dashboard_view) {
                data.dashboard_view = 'retail'
            }
        }

        if (data?.branch_id) {
            const { data: branch } = await supabase
                .from('branches')
                .select('name')
                .eq('id', data.branch_id)
                .single()
            data.branches = branch
        }

        setProfile(data)
        setLoading(false)
    }

    async function signOut() {
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
    }

    function getPlan() {
        return profile?.businesses?.subscription_tier ?? 'starter'
    }

    function planCan(feature) {
        const tier = profile?.businesses?.subscription_tier ?? 'starter'
        return canAccess(tier, feature)
    }

    function planLimit(feature) {
        const tier = profile?.businesses?.subscription_tier ?? 'starter'
        return getPlanLimits(tier)[feature]
    }

    function hasAccess(module) {
        const role = profile?.role
        if (!role) return false

        const permissions = {
            super_admin: ['dashboard', 'sales', 'inventory', 'expenses', 'customers', 'staff', 'reports', 'settings', 'import'],
            owner: ['dashboard', 'sales', 'inventory', 'expenses', 'customers', 'staff', 'reports', 'settings', 'import'],
            manager: ['dashboard', 'sales', 'inventory', 'expenses', 'customers', 'staff', 'reports', 'settings', 'import'],
            staff: ['dashboard', 'sales', 'inventory'],
            cashier: ['dashboard', 'sales'],
        }

        return permissions[role]?.includes(module) ?? false
    }

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            loading,
            signOut,
            fetchProfile,
            hasAccess,
            getPlan,
            planCan,
            planLimit
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)