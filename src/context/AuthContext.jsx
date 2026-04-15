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

    // New function: Combo-aware module access
    function canAccessModule(module, dashboardView = null) {
        const role = profile?.role
        const businessMode = profile?.businesses?.mode
        const view = dashboardView || profile?.dashboard_view || 'retail'

        if (!role) return false

        // Super admin and owner have full access
        if (role === 'super_admin' || role === 'owner') return true

        // Manager has same as owner for now
        if (role === 'manager') return true

        // Staff and cashier permissions
        if (role === 'staff' || role === 'cashier') {
            // For combo mode, permissions depend on current view
            if (businessMode === 'combo') {
                if (view === 'retail') {
                    // Retail view permissions for combo staff
                    const retailStaffModules = ['dashboard', 'sales', 'inventory', 'customers', 'import']
                    return retailStaffModules.includes(module)
                } else if (view === 'vendor') {
                    // Vendor view permissions for combo staff
                    const vendorStaffModules = ['dashboard', 'orders', 'inventory', 'payments', 'invoices', 'delivery', 'customers', 'storefront', 'import']
                    return vendorStaffModules.includes(module)
                }
            }

            // For non-combo modes (pure retail or pure vendor)
            if (businessMode === 'online_vendor') {
                // Vendor mode staff permissions
                const vendorStaffModules = ['dashboard', 'orders', 'inventory', 'payments', 'invoices', 'delivery', 'customers', 'storefront', 'import']
                return vendorStaffModules.includes(module)
            } else {
                // Retail mode staff permissions (default)
                const retailStaffModules = ['dashboard', 'sales', 'inventory', 'customers', 'import']
                return retailStaffModules.includes(module)
            }
        }

        return false
    }

    // Updated hasAccess that uses canAccessModule
    function hasAccess(module) {
        return canAccessModule(module, profile?.dashboard_view)
    }

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            loading,
            signOut,
            fetchProfile,
            hasAccess,
            canAccessModule,
            getPlan,
            planCan,
            planLimit
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)