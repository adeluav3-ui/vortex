import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'

const SCORE_COLORS = {
    excellent: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', ring: 'ring-green-400', emoji: '🌟', label: 'Excellent', description: 'Your business is thriving! Great consistency and growth.' },
    good: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', ring: 'ring-blue-400', emoji: '📈', label: 'Good', description: 'Solid performance. A few improvements will get you to excellent.' },
    fair: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', ring: 'ring-yellow-400', emoji: '⚠️', label: 'Fair', description: 'Some inconsistency. Focus on regular sales and inventory management.' },
    poor: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', ring: 'ring-orange-400', emoji: '🔻', label: 'Poor', description: 'Significant issues need attention. Your business is at risk.' },
    critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', ring: 'ring-red-400', emoji: '💀', label: 'Critical', description: 'Immediate action required. Your business may be struggling.' },
}

const METRICS_CONFIG = {
    sales_consistency: { label: 'Sales Consistency', weight: 30, icon: '📊', tips: ['Make sales at least 5 days per week', 'Track daily sales consistently', 'Offer promotions on slow days'] },
    inventory_health: { label: 'Inventory Health', weight: 20, icon: '📦', tips: ['Keep low stock alerts enabled', 'Restock before items run out', 'Track stock movements regularly'] },
    customer_retention: { label: 'Customer Retention', weight: 20, icon: '👥', tips: ['Collect customer contact info', 'Follow up with repeat customers', 'Offer loyalty rewards'] },
    revenue_trend: { label: 'Revenue Trend', weight: 20, icon: '💰', tips: ['Aim for month-over-month growth', 'Track best-selling products', 'Review pricing strategy'] },
    business_activity: { label: 'Business Activity', weight: 10, icon: '⚡', tips: ['Log in daily to Vortex', 'Add new products regularly', 'Record sales as they happen'] },
}

export default function VortexScorePage() {
    const { profile } = useAuth()
    const [scoreData, setScoreData] = useState(null)
    const [scoreHistory, setScoreHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [calculating, setCalculating] = useState(false)

    useEffect(() => {
        fetchData()
    }, [profile?.business_id])

    async function fetchData() {
        if (!profile?.business_id) return

        setLoading(true)

        // Get latest score
        const { data: latest, error: latestError } = await supabase
            .rpc('get_latest_vortex_score', { p_business_id: profile.business_id })

        if (latestError) {
            console.error('Error fetching latest score:', latestError)
        }

        // Get score history (last 30 days)
        const { data: history, error: historyError } = await supabase
            .from('vortex_scores')
            .select('score, rating, calculated_at')
            .eq('business_id', profile.business_id)
            .order('calculated_at', { ascending: true })
            .limit(30)

        if (historyError) {
            console.error('Error fetching history:', historyError)
        }

        if (latest && latest.length > 0 && latest[0].score !== null) {
            setScoreData(latest[0])
        } else {
            // Calculate score if none exists
            await calculateScore()
        }

        setScoreHistory(history || [])
        setLoading(false)
    }

    async function calculateScore() {
        setCalculating(true)

        const { data, error } = await supabase
            .rpc('calculate_vortex_score', { p_business_id: profile.business_id })

        if (error) {
            console.error('Error calculating score:', error)
            setCalculating(false)
            return
        }

        if (data && data.length > 0) {
            setScoreData({
                score: data[0].score,
                rating: data[0].rating,
                metrics: data[0].metrics,
                calculated_at: new Date().toISOString(),
                previous_score: 0,
                score_change: 0
            })

            // Refresh history
            const { data: newHistory } = await supabase
                .from('vortex_scores')
                .select('score, rating, calculated_at')
                .eq('business_id', profile.business_id)
                .order('calculated_at', { ascending: true })
                .limit(30)

            setScoreHistory(newHistory || [])
        }

        setCalculating(false)
    }

    async function refreshScore() {
        await calculateScore()
    }

    if (loading || calculating) {
        return (
            <PageWrapper title="Vortex Score">
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </PageWrapper>
        )
    }

    if (!scoreData) {
        return (
            <PageWrapper title="Vortex Score">
                <div className="max-w-2xl mx-auto text-center py-16">
                    <div className="text-6xl mb-4">📊</div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No Score Yet</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Your Vortex Score will appear once you have enough business data.
                        Start adding sales, products, and customers to build your score.
                    </p>
                    <button
                        onClick={refreshScore}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                    >
                        Try Again
                    </button>
                </div>
            </PageWrapper>
        )
    }

    const colors = SCORE_COLORS[scoreData.rating] || SCORE_COLORS.fair
    const scoreChange = scoreData.score_change || 0
    const isPositive = scoreChange > 0
    const isNegative = scoreChange < 0
    const metrics = scoreData.metrics || {}

    // Prepare chart data for history
    const chartPoints = scoreHistory.map(h => ({
        date: new Date(h.calculated_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
        score: h.score
    }))

    // Find lowest and highest metrics for improvement focus
    const metricEntries = Object.entries(METRICS_CONFIG).map(([key, config]) => ({
        key,
        score: metrics[key] || 0,
        weight: config.weight,
        ...config
    })).sort((a, b) => a.score - b.score)

    const weakestMetric = metricEntries[0]
    const strongestMetric = metricEntries[metricEntries.length - 1]

    return (
        <PageWrapper title="Vortex Score">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Main Score Card */}
                <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${colors.border}`}>
                    <div className={`px-6 py-4 ${colors.bg} border-b ${colors.border}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🏆</span>
                                <h2 className="text-lg font-bold text-gray-900">Your Vortex Score</h2>
                            </div>
                            <button
                                onClick={refreshScore}
                                disabled={calculating}
                                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Score Display */}
                        <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                            <div className="relative inline-flex items-center justify-center">
                                <svg className="w-40 h-40 transform -rotate-90">
                                    <circle cx="80" cy="80" r="72" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="72"
                                        fill="none"
                                        stroke={colors.ring.replace('ring-', '')}
                                        strokeWidth="10"
                                        strokeDasharray={`${(scoreData.score / 100) * 452} 452`}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute text-center">
                                    <p className={`text-5xl font-bold ${colors.text}`}>{scoreData.score}</p>
                                    <p className="text-xs text-gray-400">out of 100</p>
                                </div>
                            </div>

                            <div className="text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                    <span className="text-3xl">{colors.emoji}</span>
                                    <span className={`text-xl font-bold ${colors.text}`}>{colors.label}</span>
                                </div>
                                <p className="text-sm text-gray-600 max-w-md">{colors.description}</p>

                                {scoreChange !== 0 && (
                                    <div className={`mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${isPositive ? 'bg-green-100 text-green-700' : isNegative ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {isPositive ? '↑' : isNegative ? '↓' : ''} {Math.abs(scoreChange)} points since last calculation
                                    </div>
                                )}

                                <p className="text-xs text-gray-400 mt-2">
                                    Last updated: {new Date(scoreData.calculated_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        {/* Score History Chart */}
                        {chartPoints.length > 1 && (
                            <div className="mb-8">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Score History</h3>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-end gap-2 h-32">
                                        {chartPoints.map((point, idx) => {
                                            const height = (point.score / 100) * 120
                                            return (
                                                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                                    <div
                                                        className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600 cursor-pointer"
                                                        style={{ height: `${Math.max(height, 4)}px` }}
                                                        title={`${point.score} on ${point.date}`}
                                                    />
                                                    <span className="text-xs text-gray-400 transform rotate-45 origin-left -mb-1">{point.date}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Metric Breakdown */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900">Score Breakdown</h3>
                        <p className="text-xs text-gray-500 mt-0.5">How each metric contributes to your total score</p>
                    </div>
                    <div className="p-6 space-y-5">
                        {metricEntries.map(metric => (
                            <div key={metric.key}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{metric.icon}</span>
                                        <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-gray-900">{metric.score}%</span>
                                        <span className="text-xs text-gray-400">Weight: {metric.weight}%</span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 rounded-full h-2 transition-all duration-500"
                                        style={{ width: `${metric.score}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">{metric.tips[0]}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Improvement Tips */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900">📋 How to Improve Your Score</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Actionable tips based on your weakest areas</p>
                    </div>
                    <div className="p-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Weakest area - priority */}
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">🎯</span>
                                    <h4 className="text-sm font-semibold text-amber-800">Priority Focus</h4>
                                </div>
                                <p className="text-sm text-amber-700 mb-2">
                                    Your lowest score is <span className="font-bold">{weakestMetric.label}</span> ({weakestMetric.score}%)
                                </p>
                                <ul className="space-y-1">
                                    {weakestMetric.tips.map((tip, i) => (
                                        <li key={i} className="text-xs text-amber-600 flex items-start gap-1">
                                            <span>•</span> {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Strongest area - maintain */}
                            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">💪</span>
                                    <h4 className="text-sm font-semibold text-green-800">Your Strength</h4>
                                </div>
                                <p className="text-sm text-green-700 mb-2">
                                    You're doing great at <span className="font-bold">{strongestMetric.label}</span> ({strongestMetric.score}%)
                                </p>
                                <p className="text-xs text-green-600">Keep up the good work! This is helping your business stay healthy.</p>
                            </div>
                        </div>

                        {/* General tips */}
                        <div className="mt-6 pt-4 border-t border-gray-100">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">General Tips for All Businesses</h4>
                            <div className="grid md:grid-cols-2 gap-3">
                                <div className="flex items-start gap-2">
                                    <span className="text-sm">✅</span>
                                    <p className="text-xs text-gray-600">Record every sale immediately — consistent data = accurate score</p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-sm">✅</span>
                                    <p className="text-xs text-gray-600">Update inventory when stock arrives or leaves</p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-sm">✅</span>
                                    <p className="text-xs text-gray-600">Collect customer phone numbers and email addresses</p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-sm">✅</span>
                                    <p className="text-xs text-gray-600">Log in daily to keep your activity score high</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* What is Vortex Score? */}
                <div className="bg-gray-50 rounded-xl p-6 text-center">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">What is Vortex Score?</h3>
                    <p className="text-xs text-gray-500 max-w-lg mx-auto">
                        Vortex Score is a business health indicator that measures your sales consistency,
                        inventory management, customer retention, revenue trends, and platform activity.
                        A higher score means a healthier, more reliable business — which can help you
                        access loans and partnerships in the future.
                    </p>
                </div>
            </div>
        </PageWrapper>
    )
}