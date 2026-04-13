import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'

// Vendor Plans
const VENDOR_PLANS = [
    {
        tier: 'solo',
        name: 'Solo',
        monthlyPrice: 4500,
        yearlyPrice: 45900,
        features: ['100 orders/month', '1 user account', 'Up to 50 products', 'Order management', 'Customer tracking', 'Logistics directory'],
    },
    {
        tier: 'hustle',
        name: 'Hustle',
        monthlyPrice: 9500,
        yearlyPrice: 96900,
        badge: 'Most Popular',
        features: ['500 orders/month', '2 user accounts', 'Unlimited products', 'Everything in Solo', 'Payment tracking', 'Delivery tracking'],
    },
    {
        tier: 'scale',
        name: 'Scale',
        monthlyPrice: 18000,
        yearlyPrice: 183600,
        badge: 'Best Value',
        features: ['Unlimited orders', '5 user accounts', 'Unlimited products', 'Everything in Hustle', 'Full reports & export', 'Storefront link', 'Priority support'],
    },
]

// Retail Plans
const RETAIL_PLANS = [
    {
        tier: 'starter',
        name: 'Starter',
        monthlyPrice: 8000,
        yearlyPrice: 81600,
        features: ['1 branch', '2 staff accounts', 'Up to 50 products', 'Sales / POS', 'Inventory', 'Expenses', 'Customers'],
    },
    {
        tier: 'growth',
        name: 'Growth',
        monthlyPrice: 15000,
        yearlyPrice: 153000,
        badge: 'Most Popular',
        features: ['Up to 3 branches', '15 staff accounts', 'Up to 200 products', 'Everything in Starter', 'Full Reports', 'Stock transfers'],
    },
    {
        tier: 'business',
        name: 'Business',
        monthlyPrice: 25000,
        yearlyPrice: 255000,
        badge: 'Best Value',
        features: ['Unlimited branches', 'Unlimited staff', 'Unlimited products', 'Everything in Growth', 'Audit logs', 'Priority support'],
    },
]

// Combo Plans (NEW)
const COMBO_PLANS = [
    {
        tier: 'combo_basic',
        name: 'Basic',
        monthlyPrice: 12500,
        yearlyPrice: 127500,
        features: [
            '1 branch',
            '2 staff accounts',
            'Up to 50 products',
            '100 orders/month',
            'Sales / POS + Order management',
            'Inventory + Customers',
            'Expenses + Logistics directory',
        ],
    },
    {
        tier: 'combo_standard',
        name: 'Standard',
        monthlyPrice: 24500,
        yearlyPrice: 249900,
        badge: 'Most Popular',
        features: [
            'Up to 3 branches',
            '15 staff accounts',
            'Up to 200 products',
            '500 orders/month',
            'Full Reports',
            'Stock transfers',
            'Payment tracking + Delivery tracking',
        ],
    },
    {
        tier: 'combo_premium',
        name: 'Premium',
        monthlyPrice: 43000,
        yearlyPrice: 438600,
        badge: 'Best Value',
        features: [
            'Unlimited branches',
            'Unlimited staff',
            'Unlimited products',
            'Unlimited orders',
            'Audit logs',
            'Storefront link',
            'Priority support',
        ],
    },
]

export default function LandingPage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [pricingTab, setPricingTab] = useState('vendors') // 'vendors', 'retail', or 'combo'
    const [billingInterval, setBillingInterval] = useState('monthly')

    if (user) {
        navigate('/dashboard')
        return null
    }

    const getCurrentPlans = () => {
        if (pricingTab === 'vendors') return VENDOR_PLANS
        if (pricingTab === 'retail') return RETAIL_PLANS
        return COMBO_PLANS
    }

    const currentPlans = getCurrentPlans()

    return (
        <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50">
            {/* Navigation Bar */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="Vortex" className="h-8 w-8 object-contain" />
                            <span className="text-xl font-bold bg-linear-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                                Vortex
                            </span>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-4 py-2 text-sm font-medium text-white bg-linear-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow-sm"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-8">
                        <span className="text-blue-600 text-sm font-medium">✨ Launch Your Business into the Future</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                        The All-in-One{' '}
                        <span className="bg-linear-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                            Business Management
                        </span>{' '}
                        Platform
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
                        Manage orders, track inventory, handle payments, and grow your business — all from one powerful dashboard.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => navigate('/signup')}
                            className="px-8 py-3 text-base font-semibold text-white bg-linear-to-r from-blue-600 to-blue-700 rounded-xl hover:shadow-lg transition-all transform hover:scale-105"
                        >
                            Get Started Free
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-8 py-3 text-base font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="bg-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Everything You Need to Succeed
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Powerful features designed for modern businesses
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                icon: "🛍️",
                                title: "Order Management",
                                description: "Track orders from WhatsApp, Instagram, website, and more in one place"
                            },
                            {
                                icon: "📦",
                                title: "Inventory Control",
                                description: "Manage products, variants, stock levels, and get low stock alerts"
                            },
                            {
                                icon: "💰",
                                title: "Payment Tracking",
                                description: "Record payments, track outstanding balances, and chase unpaid orders"
                            },
                            {
                                icon: "📊",
                                title: "Profit Analytics",
                                description: "Know your real profit with selling price vs cost price calculations"
                            },
                            {
                                icon: "🚚",
                                title: "Delivery Hub",
                                description: "Access logistics partners, track deliveries, and manage shipping"
                            },
                            {
                                icon: "👥",
                                title: "Customer Management",
                                description: "Build customer profiles, track purchase history, and manage relationships"
                            }
                        ].map((feature, index) => (
                            <div key={index} className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition hover:border-blue-200 border border-transparent">
                                <div className="text-4xl mb-4">{feature.icon}</div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-gray-600">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Three Modes Section */}
            <section className="py-20 bg-linear-to-br from-blue-50 to-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Built for Your Business Type
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Choose the experience that matches how you sell
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Online Vendor Card */}
                        <div className="bg-white rounded-2xl p-8 border border-blue-100 shadow-sm hover:shadow-md transition">
                            <div className="text-5xl mb-4">📱</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Online Vendor</h3>
                            <p className="text-gray-600 mb-4">Perfect for sellers on WhatsApp, Instagram, and social media</p>
                            <ul className="space-y-2 mb-6">
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-blue-500">✓</span> Order management from multiple sources
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-blue-500">✓</span> Product variants (sizes, colors)
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-blue-500">✓</span> Customer history and tracking
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-blue-500">✓</span> Delivery tracking and invoices
                                </li>
                            </ul>
                        </div>

                        {/* Retail Store Card */}
                        <div className="bg-white rounded-2xl p-8 border border-blue-100 shadow-sm hover:shadow-md transition">
                            <div className="text-5xl mb-4">🏪</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Retail Store</h3>
                            <p className="text-gray-600 mb-4">Ideal for physical shops, restaurants, and pharmacies</p>
                            <ul className="space-y-2 mb-6">
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-blue-500">✓</span> POS system and sales tracking
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-blue-500">✓</span> Multi-branch inventory
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-blue-500">✓</span> Expense and staff management
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-blue-500">✓</span> Supplier and purchase orders
                                </li>
                            </ul>
                        </div>

                        {/* Combo Card - NEW */}
                        <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200 shadow-md hover:shadow-lg transition">
                            <div className="text-5xl mb-4">🏪📦</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Both (Store + Online)</h3>
                            <p className="text-gray-600 mb-4">For businesses with a physical store AND an online presence</p>
                            <ul className="space-y-2 mb-6">
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-blue-500">✓</span> Everything from Retail AND Vendor
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-blue-500">✓</span> Shared inventory and customers
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-blue-500">✓</span> Mode switcher — one dashboard, two views
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-blue-500">✓</span> Unified reporting and analytics
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section with Tabs */}
            <section className="bg-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Simple, Transparent Pricing
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Choose the plan that fits your business
                        </p>
                    </div>

                    {/* Pricing Tabs - Updated with Combo */}
                    <div className="flex justify-center mb-8">
                        <div className="bg-gray-100 rounded-xl p-1 flex flex-wrap justify-center gap-1">
                            <button
                                onClick={() => setPricingTab('vendors')}
                                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${pricingTab === 'vendors'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                📱 For Vendors
                            </button>
                            <button
                                onClick={() => setPricingTab('retail')}
                                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${pricingTab === 'retail'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                🏪 For Retail Stores
                            </button>
                            <button
                                onClick={() => setPricingTab('combo')}
                                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${pricingTab === 'combo'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                🏪📦 Both (Store + Online)
                            </button>
                        </div>
                    </div>

                    {/* Billing Interval Toggle */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <button
                            onClick={() => setBillingInterval('monthly')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billingInterval === 'monthly'
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingInterval('yearly')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billingInterval === 'yearly'
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Yearly
                            <span className="ml-2 text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-semibold">
                                15% off
                            </span>
                        </button>
                    </div>

                    {/* Plan Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {currentPlans.map((plan, index) => {
                            const price = billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
                            const monthlyEquiv = billingInterval === 'yearly'
                                ? Math.round(plan.yearlyPrice / 12).toLocaleString()
                                : null

                            return (
                                <div key={plan.tier} className={`bg-white rounded-2xl p-6 shadow-lg relative ${plan.badge === 'Most Popular' ? 'ring-2 ring-blue-500' : 'border border-gray-100'}`}>
                                    {plan.badge && (
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                            <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                                {plan.badge}
                                            </span>
                                        </div>
                                    )}
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                    <div className="mb-4">
                                        <span className="text-3xl font-bold text-gray-900">₦{price.toLocaleString()}</span>
                                        <span className="text-gray-500">/{billingInterval === 'yearly' ? 'yr' : 'mo'}</span>
                                        {monthlyEquiv && (
                                            <p className="text-xs text-green-600 mt-1">₦{monthlyEquiv}/mo (billed yearly)</p>
                                        )}
                                    </div>
                                    <ul className="space-y-2 mb-6">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                                <span className="text-blue-500">✓</span> {feature}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        onClick={() => navigate('/signup')}
                                        className="w-full py-2 rounded-lg font-semibold transition bg-linear-to-r from-blue-600 to-blue-700 text-white hover:opacity-90"
                                    >
                                        Get Started
                                    </button>
                                </div>
                            )
                        })}
                    </div>

                    <p className="text-center text-sm text-gray-500 mt-8">
                        Vendors get a 14-day free trial. Retail and Combo plans include a 7-day free trial. No credit card required to start.
                    </p>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-linear-to-r from-blue-600 to-blue-800 py-20">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Ready to Transform Your Business?
                    </h2>
                    <button
                        onClick={() => navigate('/signup')}
                        className="px-8 py-3 text-base font-semibold text-blue-600 bg-white rounded-xl hover:shadow-lg transition transform hover:scale-105"
                    >
                        Start Your Free Trial
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <p>&copy; 2026 Vortex. All rights reserved.</p>
                        <p className="text-sm mt-2">Made with ❤️ for Nigerian businesses</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}