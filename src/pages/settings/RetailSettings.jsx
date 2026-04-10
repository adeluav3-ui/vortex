import { useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import BusinessProfile from './components/BusinessProfile'
import BranchManager from './components/BranchManager'
import PersonalProfile from './components/PersonalProfile'
import ChangePassword from './components/ChangePassword'
import Billing from './components/Billing'

const TABS = [
    { key: 'business', label: '🏢 Business Profile' },
    { key: 'branches', label: '🏬 Branches' },
    { key: 'personal', label: '👤 Personal Profile' },
    { key: 'password', label: '🔒 Password' },
    { key: 'billing', label: '💳 Billing' },
]

export default function Settings() {
    const [activeTab, setActiveTab] = useState('business')

    return (
        <PageWrapper title="Settings">
            {/* Tabs */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${activeTab === tab.key
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'business' && <BusinessProfile />}
            {activeTab === 'branches' && <BranchManager />}
            {activeTab === 'personal' && <PersonalProfile />}
            {activeTab === 'password' && <ChangePassword />}
            {activeTab === 'billing' && <Billing />}
        </PageWrapper>
    )
}