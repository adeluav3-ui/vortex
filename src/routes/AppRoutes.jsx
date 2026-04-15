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

// ── Guards ─────────────────────────────────────────────────────────────────────

function PrivateRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return <div className="flex items-center justify-center h-screen text-gray-500 text-sm">Loading...</div>
    return user ? children : <Navigate to="/login" />
}

// AdminRoute specifically for super_admin
function AdminRoute({ children }) {
    const { user, profile, loading } = useAuth()
    if (loading) return <div className="flex items-center justify-center h-screen text-gray-500 text-sm">Loading...</div>
    if (!user) return <Navigate to="/login" />
    if (profile?.role !== 'super_admin') return <Navigate to="/dashboard" />
    return children
}

function RoleRoute({ children, module }) {
    const { user, profile, loading, hasAccess } = useAuth()
    if (loading) return <div className="flex items-center justify-center h-screen text-gray-500 text-sm">Loading...</div>
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

// Combo-aware route protection for staff
function ComboStaffRoute({ children, module }) {
    const { user, profile, loading, canAccessModule } = useAuth()
    const dashboardView = profile?.dashboard_view || 'retail'

    if (loading) return <div className="flex items-center justify-center h-screen text-gray-500 text-sm">Loading...</div>
    if (!user) return <Navigate to="/login" />

    // Super admin, owner, manager bypass
    if (profile?.role === 'super_admin' || profile?.role === 'owner' || profile?.role === 'manager') {
        return children
    }

    // For staff/cashier in combo mode
    if (profile?.businesses?.mode === 'combo') {
        if (canAccessModule(module, dashboardView)) {
            return children
        }
        return (
            <PageWrapper title="Access Denied">
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                    <p className="text-4xl mb-3">🔒</p>
                    <p className="text-gray-900 font-semibold mb-1">Access Restricted</p>
                    <p className="text-sm text-gray-500">You don't have permission to view this page.</p>
                </div>
            </PageWrapper>
        )
    }

    // For non-combo, use regular role check
    return <RoleRoute module={module}>{children}</RoleRoute>
}

function OnboardingGuard({ children }) {
    const { user, profile, loading } = useAuth()
    if (loading) return <div className="flex items-center justify-center h-screen text-gray-500 text-sm">Loading...</div>
    if (!user) return <Navigate to="/login" />
    if (profile?.business_id) return <Navigate to="/dashboard" />
    return children
}
function VendorRoute({ children, feature }) {
    const { user, profile, loading } = useAuth()
    const navigate = useNavigate()

    if (loading) return <div className="flex items-center justify-center h-screen text-gray-500 text-sm">Loading...</div>
    if (!user) return <Navigate to="/login" />

    if (feature) {
        const tier = profile?.businesses?.subscription_tier ?? 'solo'
        // ALWAYS pass subStatus — this is what makes trialing = Scale work
        const subStatus = profile?.subscription?.status ?? 'inactive'
        const canAccess = vendorCanAccess(tier, feature, subStatus)

        if (!canAccess) {
            const min = minTierForFeature(feature)
            const minLabel = min ? min.charAt(0).toUpperCase() + min.slice(1) : 'higher'

            return (
                <PageWrapper title="Upgrade Required">
                    <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center max-w-sm mx-auto">
                        <span className="text-5xl">🔒</span>
                        <h2 className="text-lg font-bold text-gray-900">{minLabel} plan required</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            This feature is available on the <span className="font-semibold">{minLabel}</span> plan and above.
                        </p>
                        <button
                            onClick={() => navigate('/settings/billing')}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                        >
                            Upgrade Plan →
                        </button>
                        <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-400 hover:underline">
                            Back to Dashboard
                        </button>
                    </div>
                </PageWrapper>
            )
        }
    }

    return children
}

// ── Route tree ─────────────────────────────────────────────────────────────────

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
            <Route path="/staff" element={<RoleRoute module="staff"><Staff /></RoleRoute>} />
            <Route path="/reports" element={<RoleRoute module="reports"><Reports /></RoleRoute>} />
            <Route path="/settings" element={<RoleRoute module="dashboard"><Settings /></RoleRoute>} />
            <Route path="/settings/billing" element={<RoleRoute module="dashboard"><Settings /></RoleRoute>} />
            <Route path="/audit-logs" element={<RoleRoute module="reports"><AuditLogs /></RoleRoute>} />

            {/* ── Combo-aware routes (customers, payments, invoices, delivery, storefront, import) ── */}
            <Route path="/customers" element={
                <ComboStaffRoute module="customers">
                    <Customers />
                </ComboStaffRoute>
            } />

            <Route path="/import" element={
                <ComboStaffRoute module="import">
                    <Import />
                </ComboStaffRoute>
            } />

            {/* ── Vendor — all tiers (no plan gate) ── */}
            <Route path="/orders" element={<VendorRoute><Orders /></VendorRoute>} />
            <Route path="/orders/new" element={<VendorRoute><NewOrder /></VendorRoute>} />
            <Route path="/orders/:id" element={<VendorRoute><OrderDetail /></VendorRoute>} />
            <Route path="/delivery" element={
                <ComboStaffRoute module="delivery">
                    <VendorRoute><DeliveryHub /></VendorRoute>
                </ComboStaffRoute>
            } />
            <Route path="/invoices" element={
                <ComboStaffRoute module="invoices">
                    <VendorRoute><Invoices /></VendorRoute>
                </ComboStaffRoute>
            } />
            <Route path="/invoices/:id" element={
                <ComboStaffRoute module="invoices">
                    <VendorRoute><InvoiceDetail /></VendorRoute>
                </ComboStaffRoute>
            } />

            {/* Inventory and Import are available to all vendor tiers.
                No feature gate needed — VendorInventory enforces product limits internally. */}
            <Route path="/inventory" element={<VendorRoute><Inventory /></VendorRoute>} />

            {/* ── Vendor — Hustle+ ── */}
            <Route path="/payments" element={
                <ComboStaffRoute module="payments">
                    <VendorRoute feature="paymentsPage"><Payments /></VendorRoute>
                </ComboStaffRoute>
            } />
            <Route path="/reports" element={
                <VendorRoute feature="reports"><Reports /></VendorRoute>
            } />

            {/* ── Vendor — Scale only ── */}
            <Route path="/storefront" element={
                <ComboStaffRoute module="storefront">
                    <VendorRoute feature="storefront"><Storefront /></VendorRoute>
                </ComboStaffRoute>
            } />

            {/* ── Fallback ── */}
            <Route path="*" element={<Navigate to="/dashboard" />} />

        </Routes>
    )
}