// src/components/layout/Sidebar.jsx
import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ModeSwitcher from './ModeSwitcher'

const RETAIL_NAV_ITEMS = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠', module: 'dashboard' },
    { path: '/sales', label: 'Sales / POS', icon: '🧾', module: 'sales' },
    { path: '/inventory', label: 'Inventory', icon: '📦', module: 'inventory' },
    { path: '/expenses', label: 'Expenses', icon: '💸', module: 'expenses' },
    { path: '/customers', label: 'Customers', icon: '👥', module: 'customers' },
    { path: '/staff', label: 'Staff', icon: '🧑‍💼', module: 'staff' },
    { path: '/reports', label: 'Reports', icon: '📊', module: 'reports' },
    { path: '/import', label: 'Import Data', icon: '📥', module: 'import' },
    { path: '/settings', label: 'Settings', icon: '⚙️', module: 'dashboard' },
    { path: '/audit-logs', label: 'Audit Logs', icon: '📋', module: 'reports' },
]

const VENDOR_NAV_ITEMS = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/orders', label: 'Orders', icon: '🛍️' },
    { path: '/inventory', label: 'Products', icon: '📦' },
    { path: '/payments', label: 'Payments', icon: '💳' },
    { path: '/invoices', label: 'Invoices', icon: '🧾' },
    { path: '/delivery', label: 'Delivery Hub', icon: '🚚' },
    { path: '/customers', label: 'Customers', icon: '👥' },
    { path: '/reports', label: 'Reports', icon: '📊' },
    { path: '/storefront', label: 'Storefront', icon: '🌐' },
    { path: '/import', label: 'Import Data', icon: '📥' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
]

// Exported so Navbar can use it to trigger open
export let openSidebar = () => { }

export default function Sidebar() {
    const { profile, signOut, hasAccess } = useAuth()
    const [mobileOpen, setMobileOpen] = useState(false)
    const location = useLocation()

    const isVendor = profile?.businesses?.mode === 'online_vendor'
    const isCombo = profile?.businesses?.mode === 'combo'
    const dashboardView = profile?.dashboard_view || 'retail'

    // For combo users, show nav items based on current view
    let navItems
    if (isCombo) {
        navItems = dashboardView === 'retail' ? RETAIL_NAV_ITEMS : VENDOR_NAV_ITEMS
    } else {
        navItems = isVendor ? VENDOR_NAV_ITEMS : RETAIL_NAV_ITEMS
    }

    // Register open function so Navbar can call it
    useEffect(() => {
        openSidebar = () => setMobileOpen(true)
    }, [])

    // Close drawer on route change
    useEffect(() => {
        setMobileOpen(false)
    }, [location.pathname])

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [mobileOpen])

    const sidebarContent = (
        <aside className="flex flex-col w-60 h-full bg-gray-900 text-white">
            {/* Logo / Business */}
            <div className="px-6 py-5 border-b border-gray-700">
                <div className="flex items-center gap-3">
                    {profile?.businesses?.logo_url ? (
                        <img
                            src={profile.businesses.logo_url}
                            alt="logo"
                            className="w-8 h-8 rounded-lg object-cover shrink-0"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                            {profile?.businesses?.name?.charAt(0) ?? 'V'}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight truncate">
                            {profile?.businesses?.name ?? 'Vortex'}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{profile?.role}</p>
                    </div>
                    {/* Close button — mobile only */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="ml-auto md:hidden text-gray-400 hover:text-white p-1 rounded transition shrink-0"
                        aria-label="Close menu"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Mode Switcher - only for combo users */}
            <ModeSwitcher />

            {/* Nav items */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {navItems
                    .filter(item => (isCombo || isVendor) ? true : hasAccess(item.module))
                    .map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/dashboard'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`
                            }
                        >
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
            </nav>

            {/* Admin panel */}
            {profile?.role === 'super_admin' && (
                <div className="px-3 py-2">
                    <NavLink
                        to="/admin"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${isActive
                                ? 'bg-yellow-600 text-white'
                                : 'text-yellow-400 hover:bg-gray-800 hover:text-yellow-300'
                            }`
                        }
                    >
                        <span>⚡</span> Admin Panel
                    </NavLink>
                </div>
            )}

            {/* User + sign out */}
            <div className="px-3 py-4 border-t border-gray-700">
                <div className="flex items-center gap-3 px-3 py-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold shrink-0">
                        {profile?.full_name?.charAt(0) ?? 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                        <p className="text-xs text-gray-400 capitalize">{profile?.role}</p>
                    </div>
                </div>
                <button
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition"
                >
                    <span>🚪</span> Sign out
                </button>
            </div>
        </aside>
    )

    return (
        <>
            {/* ── Desktop: fixed sidebar ── */}
            <div className="hidden md:block fixed left-0 top-0 h-screen w-60 z-30">
                {sidebarContent}
            </div>

            {/* ── Mobile: drawer overlay ── */}
            {mobileOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    {/* Drawer */}
                    <div className="md:hidden fixed left-0 top-0 h-full w-64 z-50 shadow-2xl">
                        {sidebarContent}
                    </div>
                </>
            )}
        </>
    )
}