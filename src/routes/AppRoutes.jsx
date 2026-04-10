import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { vendorCanAccess, minTierForFeature } from '../lib/vendorPlanLimits'
import Login from '../pages/auth/Login'
import Signup from '../pages/auth/Signup'
import Onboarding from '../pages/onboarding/Onboarding'
import Dashboard from '../pages/dashboard/Dashboard'
import PageWrapper from '../components/layout/PageWrapper'
import Inventory from '../pages/inventory/Inventory'
import Sales from '../pages/sales/Sales'
import Expenses from '../pages/expenses/Expenses'
import Customers from '../pages/customers/Customers'
import Staff from '../pages/staff/Staff'
import Reports from '../pages/reports/Reports'
import AcceptInvite from '../pages/auth/AcceptInvite'
import Admin from '../pages/admin/Admin'
import Settings from '../pages/settings/Settings'
import Orders from '../pages/orders/Orders'
import OrderDetail from '../pages/orders/OrderDetail'
import NewOrder from '../pages/orders/NewOrder'
import DeliveryHub from '../pages/delivery/DeliveryHub'
import Payments from '../pages/payments/Payments'
import PublicStorefront from '../pages/storefront/PublicStorefront'
import Storefront from '../pages/storefront/Storefront'
import Invoices from '../pages/invoices/Invoices'
import InvoiceDetail from '../pages/invoices/InvoiceDetail'
import Import from '../pages/import/Import'
import AuditLogs from '../pages/audit-logs/AuditLogs'
import WaitingList from '../pages/WaitingList'
import LandingPage from '../pages/LandingPage'

// ── Guards ────────────────────────────────────────────────────────────────────

function PrivateRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>
    return user ? children : <Navigate to="/login" />
}

// AdminRoute specifically for super_admin
function AdminRoute({ children }) {
    const { user, profile, loading } = useAuth()
    if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>
    if (!user) return <Navigate to="/login" />
    if (profile?.role !== 'super_admin') return <Navigate to="/dashboard" />
    return children
}

function RoleRoute({ children, module }) {
    const { user, profile, loading, hasAccess } = useAuth()
    if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>
    if (!user) return <Navigate to="/login" />

    // Super admin bypasses all role checks
    if (profile?.role === 'super_admin') return children

    if (!hasAccess(module)) return (
        <PageWrapper title="Access Denied">
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <p className="text-4xl mb-3">🔒</p>
                <p className="text-gray-900 font-semibold mb-1">Access Restricted</p>
                <p className="text-sm text-gray-500">You don't have permission to view this page.</p>
            </div>
        </PageWrapper>
    )
    return children
}

function OnboardingGuard({ children }) {
    const { user, profile, loading } = useAuth()
    if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>
    if (!user) return <Navigate to="/login" />
    if (profile?.business_id) return <Navigate to="/dashboard" />
    return children
}

/**
 * VendorRoute
 *
 * Wraps vendor-only pages. Requires auth.
 * Optionally accepts a `feature` key from vendorPlanLimits.js —
 * if the vendor's current tier doesn't have access, shows an
 * upgrade prompt instead of the page.
 *
 * Usage:
 *   <Route path="/payments" element={<VendorRoute feature="paymentsPage"><Payments /></VendorRoute>} />
 *   <Route path="/orders"   element={<VendorRoute><Orders /></VendorRoute>} />  // no plan gate
 */
function VendorRoute({ children, feature }) {
    const { user, profile, loading } = useAuth()
    const navigate = useNavigate()

    if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>
    if (!user) return <Navigate to="/login" />

    // Feature gating — only checked if a feature key is provided
    if (feature) {
        const tier = profile?.businesses?.subscription_tier ?? 'solo'
        const hasAccess = vendorCanAccess(tier, feature)

        if (!hasAccess) {
            const min = minTierForFeature(feature)
            const minLabel = min ? min.charAt(0).toUpperCase() + min.slice(1) : 'higher'

            return (
                <PageWrapper title="Upgrade Required">
                    <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center max-w-sm mx-auto">
                        <span className="text-5xl">🔒</span>
                        <h2 className="text-lg font-bold text-gray-900">
                            {minLabel} plan required
                        </h2>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            This feature is available on the <span className="font-semibold">{minLabel}</span> plan and above.
                            Upgrade to unlock it.
                        </p>
                        <button
                            onClick={() => navigate('/settings/billing')}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                        >
                            Upgrade Plan →
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-sm text-gray-400 hover:underline"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </PageWrapper>
            )
        }
    }

    return children
}

// ── Routes ────────────────────────────────────────────────────────────────────

export default function AppRoutes() {
    return (
        <Routes>

            {/* ── Public routes — no auth required ── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/store/:slug" element={<PublicStorefront />} />
            <Route path="/waitlist" element={<WaitingList />} />

            {/* ── Onboarding ── */}
            <Route path="/onboarding" element={
                <OnboardingGuard><Onboarding /></OnboardingGuard>
            } />

            {/* ── Admin Routes - NO layout wrapper, completely separate ── */}
            <Route path="/admin/*" element={
                <AdminRoute>
                    <Admin />
                </AdminRoute>
            } />

            {/* ── Role-gated routes (retail + shared) ── */}
            <Route path="/dashboard" element={<RoleRoute module="dashboard"><Dashboard /></RoleRoute>} />
            <Route path="/sales" element={<RoleRoute module="sales"><Sales /></RoleRoute>} />
            <Route path="/inventory" element={<RoleRoute module="inventory"><Inventory /></RoleRoute>} />
            <Route path="/expenses" element={<RoleRoute module="expenses"><Expenses /></RoleRoute>} />
            <Route path="/customers" element={<RoleRoute module="customers"><Customers /></RoleRoute>} />
            <Route path="/staff" element={<RoleRoute module="staff"><Staff /></RoleRoute>} />
            <Route path="/reports" element={<RoleRoute module="reports"><Reports /></RoleRoute>} />
            <Route path="/settings" element={<RoleRoute module="dashboard"><Settings /></RoleRoute>} />
            <Route path="/settings/billing" element={<RoleRoute module="dashboard"><Settings /></RoleRoute>} />
            <Route path="/import" element={<RoleRoute module="import"><Import /></RoleRoute>} />
            <Route path="/audit-logs" element={<RoleRoute module="reports"><AuditLogs /></RoleRoute>} />

            {/* ── Vendor routes — all tiers (auth required, no role restriction) ── */}
            <Route path="/orders" element={<VendorRoute><Orders /></VendorRoute>} />
            <Route path="/orders/new" element={<VendorRoute><NewOrder /></VendorRoute>} />
            <Route path="/orders/:id" element={<VendorRoute><OrderDetail /></VendorRoute>} />
            <Route path="/invoices" element={<VendorRoute><Invoices /></VendorRoute>} />
            <Route path="/invoices/:id" element={<VendorRoute><InvoiceDetail /></VendorRoute>} />
            <Route path="/delivery" element={<VendorRoute><DeliveryHub /></VendorRoute>} />

            {/* ── Vendor routes — Hustle+ ── */}
            <Route path="/payments" element={
                <VendorRoute feature="paymentsPage"><Payments /></VendorRoute>
            } />

            {/* ── Vendor routes — Scale only ── */}
            <Route path="/storefront" element={
                <VendorRoute feature="storefront"><Storefront /></VendorRoute>
            } />

            {/* ── Fallback ── */}
            <Route path="*" element={<Navigate to="/dashboard" />} />

        </Routes>
    )
}