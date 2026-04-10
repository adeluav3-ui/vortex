import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
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

function PrivateRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>
    return user ? children : <Navigate to="/login" />
}

// NEW: AdminRoute specifically for super_admin
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

function StubPage({ title }) {
    return (
        <PageWrapper title={title}>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-gray-400 text-sm">
                {title} — coming soon
            </div>
        </PageWrapper>
    )
}

export default function AppRoutes() {
    return (
        <Routes>

            {/* ── Public routes — no auth required ── */}
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
            <Route path="/audit-logs" element={<RoleRoute module="reports"><AuditLogs /></RoleRoute>} />
            <Route path="/import" element={<RoleRoute module="import"><Import /></RoleRoute>} />

            {/* ── Online vendor routes (auth required, no role restriction) ── */}
            <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
            <Route path="/orders/new" element={<PrivateRoute><NewOrder /></PrivateRoute>} />
            <Route path="/orders/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
            <Route path="/delivery" element={<PrivateRoute><DeliveryHub /></PrivateRoute>} />
            <Route path="/payments" element={<PrivateRoute><Payments /></PrivateRoute>} />
            <Route path="/storefront" element={<PrivateRoute><Storefront /></PrivateRoute>} />
            <Route path="/invoices" element={<PrivateRoute><Invoices /></PrivateRoute>} />
            <Route path="/invoices/:id" element={<PrivateRoute><InvoiceDetail /></PrivateRoute>} />

            {/* ── Fallback ── */}
            <Route path="*" element={<Navigate to="/dashboard" />} />

        </Routes>
    )
}