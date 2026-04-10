import { useAuth } from '../../context/AuthContext'
import { useBranchFilter } from '../../hooks/useBranchFilter'
import { openSidebar } from './Sidebar'
import NotificationBell from './NotificationBell'

export default function Navbar({ title }) {
    const { profile } = useAuth()
    const { isOwner } = useBranchFilter()

    return (
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
            <div className="flex items-center gap-3">
                {/* Hamburger — mobile only */}
                <button
                    onClick={() => openSidebar()}
                    className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition -ml-1"
                    aria-label="Open menu"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>

                <h1 className="text-base font-semibold text-gray-900">{title}</h1>

                {!isOwner && profile?.branch_id && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">
                        📍 {profile?.branches?.name ?? 'My Branch'}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                {/* Notification bell */}
                <NotificationBell />

                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                    <p className="text-xs text-gray-400">{profile?.businesses?.name}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                    {profile?.full_name?.charAt(0) ?? 'U'}
                </div>
            </div>
        </header>
    )
}