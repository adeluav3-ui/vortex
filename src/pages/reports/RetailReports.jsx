import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper'
import SalesSummary from './components/SalesSummary'
import ExpenseSummary from './components/ExpenseSummary'
import ProfitLoss from './components/ProfitLoss'
import TopProducts from './components/TopProducts'
import PaymentMethods from './components/PaymentMethods'
import CreditReport from './components/CreditReport'
import SalaryReport from './components/SalaryReport'
import { useAuth } from '../../context/AuthContext'

const TABS = [
    { key: 'sales', label: 'Sales Summary' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'pl', label: 'Profit & Loss' },
    { key: 'products', label: 'Top Products' },
    { key: 'payments', label: 'Payment Methods' },
    { key: 'credit', label: 'Credit' },
    { key: 'salary', label: 'Salary' },
]

export default function Reports() {
    const { planCan } = useAuth()
    const [activeTab, setActiveTab] = useState('sales')
    const [dateRange, setDateRange] = useState({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
    })

    // Check if user has access to reports (Growth plan and above)
    const hasReportAccess = planCan('reports', 'view') || planCan('premium_reports', 'view')

    if (!hasReportAccess) {
        return (
            <PageWrapper title="Reports">
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                    <p className="text-4xl mb-4">📊</p>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Reports — Growth Plan & Above</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Upgrade to the Growth plan to unlock full reports including P&L, top products, payment methods and more.
                    </p>
                    <Link
                        to="/settings/billing"
                        className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
                    >
                        Upgrade Plan
                    </Link>
                </div>
            </PageWrapper>
        )
    }

    return (
        <PageWrapper title="Reports">
            {/* Date range filter */}
            <div className="flex flex-wrap items-center gap-3 mb-6 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                <span className="text-sm font-medium text-gray-700">Date Range:</span>
                <input
                    type="date"
                    value={dateRange.from}
                    onChange={e => setDateRange(r => ({ ...r, from: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-400">to</span>
                <input
                    type="date"
                    value={dateRange.to}
                    onChange={e => setDateRange(r => ({ ...r, to: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2 ml-auto">
                    {[
                        {
                            label: 'Today',
                            fn: () => ({
                                from: new Date().toISOString().split('T')[0],
                                to: new Date().toISOString().split('T')[0]
                            })
                        },
                        {
                            label: 'This Week',
                            fn: () => {
                                const d = new Date();
                                const day = d.getDay();
                                const start = new Date(d);
                                start.setDate(d.getDate() - day);
                                return {
                                    from: start.toISOString().split('T')[0],
                                    to: d.toISOString().split('T')[0]
                                }
                            }
                        },
                        {
                            label: 'This Month',
                            fn: () => ({
                                from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                                to: new Date().toISOString().split('T')[0]
                            })
                        },
                        {
                            label: 'This Year',
                            fn: () => ({
                                from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
                                to: new Date().toISOString().split('T')[0]
                            })
                        },
                    ].map(({ label, fn }) => (
                        <button
                            key={label}
                            onClick={() => setDateRange(fn())}
                            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

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

            {/* Report content */}
            {activeTab === 'sales' && <SalesSummary dateRange={dateRange} />}
            {activeTab === 'expenses' && <ExpenseSummary dateRange={dateRange} />}
            {activeTab === 'pl' && <ProfitLoss dateRange={dateRange} />}
            {activeTab === 'products' && <TopProducts dateRange={dateRange} />}
            {activeTab === 'payments' && <PaymentMethods dateRange={dateRange} />}
            {activeTab === 'credit' && <CreditReport dateRange={dateRange} />}
            {activeTab === 'salary' && <SalaryReport dateRange={dateRange} />}
        </PageWrapper>
    )
}