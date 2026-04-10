import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'

export default function LandingPage() {
    const navigate = useNavigate()
    const { user } = useAuth()

    // If user is already logged in, redirect to dashboard
    if (user) {
        navigate('/dashboard')
        return null
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Navigation Bar */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="Vortex" className="h-8 w-8" />
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Vortex
                            </span>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
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
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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
                            className="px-8 py-3 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:shadow-lg transition-all transform hover:scale-105"
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
                            <div key={index} className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition">
                                <div className="text-4xl mb-4">{feature.icon}</div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-gray-600">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Two Modes Section */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Built for Your Business Type
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Choose the experience that matches how you sell
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Online Vendor Card */}
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100">
                            <div className="text-5xl mb-4">📱</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Online Vendor</h3>
                            <p className="text-gray-600 mb-4">Perfect for sellers on WhatsApp, Instagram, and social media</p>
                            <ul className="space-y-2 mb-6">
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-green-500">✓</span> Order management from multiple sources
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-green-500">✓</span> Product variants (sizes, colors)
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-green-500">✓</span> Customer history and tracking
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-green-500">✓</span> Delivery tracking and invoices
                                </li>
                            </ul>
                        </div>

                        {/* Retail Store Card */}
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
                            <div className="text-5xl mb-4">🏪</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Retail Store</h3>
                            <p className="text-gray-600 mb-4">Ideal for physical shops, restaurants, and pharmacies</p>
                            <ul className="space-y-2 mb-6">
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-green-500">✓</span> POS system and sales tracking
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-green-500">✓</span> Multi-branch inventory
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-green-500">✓</span> Expense and staff management
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-green-500">✓</span> Supplier and purchase orders
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="bg-gray-50 py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Simple, Transparent Pricing
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Start free, upgrade as you grow
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                name: "Solo",
                                price: "₦4,500",
                                period: "/month",
                                features: ["100 orders/month", "1 user account", "Up to 50 products", "Order management", "Customer tracking"],
                                color: "from-gray-600 to-gray-700"
                            },
                            {
                                name: "Hustle",
                                price: "₦9,500",
                                period: "/month",
                                features: ["500 orders/month", "2 user accounts", "Unlimited products", "Payment tracking", "Delivery tracking"],
                                popular: true,
                                color: "from-blue-600 to-purple-600"
                            },
                            {
                                name: "Scale",
                                price: "₦18,000",
                                period: "/month",
                                features: ["Unlimited orders", "5 user accounts", "Unlimited products", "Full reports", "Priority support"],
                                color: "from-purple-600 to-pink-600"
                            }
                        ].map((plan, index) => (
                            <div key={index} className={`bg-white rounded-2xl p-6 shadow-lg relative ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}>
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Most Popular</span>
                                    </div>
                                )}
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                <div className="mb-4">
                                    <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                                    <span className="text-gray-500">{plan.period}</span>
                                </div>
                                <ul className="space-y-2 mb-6">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                            <span className="text-green-500">✓</span> {feature}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => navigate('/signup')}
                                    className={`w-full py-2 rounded-lg font-semibold transition bg-gradient-to-r ${plan.color} text-white hover:opacity-90`}
                                >
                                    Get Started
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-20">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Ready to Transform Your Business?
                    </h2>
                    <p className="text-lg text-blue-100 mb-8">
                        Join thousands of businesses using Vortex to manage their operations
                    </p>
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
                        <p>&copy; 2024 Vortex. All rights reserved.</p>
                        <p className="text-sm mt-2">Made with ❤️ for Nigerian businesses</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}