import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const RETAIL_NAV = [
    { path: '/dashboard', label: 'Home', icon: '🏠', module: 'dashboard' },
    { path: '/sales', label: 'Sales', icon: '🧾', module: 'sales' },
    { path: '/inventory', label: 'Stock', icon: '📦', module: 'inventory' },
    { path: '/expenses', label: 'Expenses', icon: '💸', module: 'expenses' },
    { path: '/reports', label: 'Reports', icon: '📊', module: 'reports' },
]

const VENDOR_NAV = [
    { path: '/dashboard', label: 'Home', icon: '🏠' },
    { path: '/orders', label: 'Orders', icon: '🛍️' },
    { path: '/inventory', label: 'Products', icon: '📦' },
    { path: '/payments', label: 'Payments', icon: '💳' },
    { path: '/delivery', label: 'Delivery', icon: '🚚' },
]

export default function BottomNav() {
    const { hasAccess, profile } = useAuth()
    const isVendor = profile?.businesses?.mode === 'online_vendor'
    const navItems = isVendor ? VENDOR_NAV : RETAIL_NAV

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 flex">
            {navItems
                .filter(item => isVendor ? true : hasAccess(item.module))
                .map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/dashboard'}
                        className={({ isActive }) =>
                            `flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition ${isActive ? 'text-blue-600' : 'text-gray-400'}`
                        }
                    >
                        <span className="text-lg mb-0.5">{item.icon}</span>
                        {item.label}
                    </NavLink>
                ))}
        </nav>
    )
}