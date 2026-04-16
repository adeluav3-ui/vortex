import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const SCORE_COLORS = {
    excellent: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', ring: 'ring-green-400', emoji: '🌟', label: 'Excellent' },
    good: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', ring: 'ring-blue-400', emoji: '📈', label: 'Good' },
    fair: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', ring: 'ring-yellow-400', emoji: '⚠️', label: 'Fair' },
    poor: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', ring: 'ring-orange-400', emoji: '🔻', label: 'Poor' },
    critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', ring: 'ring-red-400', emoji: '💀', label: 'Critical' },
}

export default function VortexScoreCard() {
    const { profile } = useAuth()
    const navigate = useNavigate()
    const [scoreData, setScoreData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [calculating, setCalculating] = useState(false)

    useEffect(() => {
        fetchScore()
    }, [profile?.business_id])

    async function fetchScore() {
        if (!profile?.business_id) return

        setLoading(true)

        // First try to get latest score
        const { data: existing, error: fetchError } = await supabase
            .rpc('get_latest_vortex_score', { p_business_id: profile.business_id })

        if (fetchError) {
            console.error('Error fetching score:', fetchError)
        }

        if (existing && existing.length > 0 && existing[0].score !== null) {
            setScoreData(existing[0])
            setLoading(false)
        } else {
            // No score exists, calculate one
            await calculateScore()
        }

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
        }

        setCalculating(false)
    }

    if (loading || calculating) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </div>
        )
    }

    if (!scoreData) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
                <p className="text-3xl mb-3">📊</p>
                <p className="text-sm text-gray-600">Your Vortex Score will appear here once you have enough business data.</p>
                <p className="text-xs text-gray-400 mt-2">Start adding sales, products, and customers to build your score.</p>
            </div>
        )
    }

    const colors = SCORE_COLORS[scoreData.rating] || SCORE_COLORS.fair
    const scoreChange = scoreData.score_change || 0
    const isPositive = scoreChange > 0
    const isNegative = scoreChange < 0

    return (
        <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${colors.border}`}>
            {/* Header */}
            <div className={`px-5 py-4 border-b ${colors.bg} ${colors.border}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🏆</span>
                        <h3 className="text-sm font-semibold text-gray-900">Vortex Score</h3>
                    </div>
                    <button
                        onClick={() => navigate('/vortex-score')}
                        className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
                    >
                        View Details →
                    </button>
                </div>
            </div>

            {/* Score Display */}
            <div className="p-5 text-center">
                <div className="relative inline-flex items-center justify-center mb-3">
                    {/* Circular progress ring */}
                    <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r="58"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="8"
                        />
                        <circle
                            cx="64"
                            cy="64"
                            r="58"
                            fill="none"
                            stroke={colors.ring.replace('ring-', '')}
                            strokeWidth="8"
                            strokeDasharray={`${(scoreData.score / 100) * 364} 364`}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute">
                        <p className={`text-4xl font-bold ${colors.text}`}>{scoreData.score}</p>
                        <p className="text-xs text-gray-500">/ 100</p>
                    </div>
                </div>

                {/* Rating Badge */}
                <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-xl">{colors.emoji}</span>
                    <span className={`text-sm font-semibold ${colors.text}`}>{colors.label}</span>
                </div>

                {/* Score Change */}
                {scoreChange !== 0 && (
                    <p className={`text-xs font-medium ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'}`}>
                        {isPositive ? '↑' : isNegative ? '↓' : ''} {Math.abs(scoreChange)} points from last calculation
                    </p>
                )}

                {/* Last Updated */}
                <p className="text-xs text-gray-400 mt-2">
                    Updated {new Date(scoreData.calculated_at).toLocaleDateString()}
                </p>
            </div>

            {/* Quick Metrics Preview */}
            <div className="px-5 pb-5">
                <div className="grid grid-cols-5 gap-2 pt-3 border-t border-gray-100">
                    <div className="text-center">
                        <p className="text-lg font-semibold text-gray-800">{scoreData.metrics?.sales_consistency || 0}</p>
                        <p className="text-xs text-gray-400">Sales</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-semibold text-gray-800">{scoreData.metrics?.inventory_health || 0}</p>
                        <p className="text-xs text-gray-400">Stock</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-semibold text-gray-800">{scoreData.metrics?.customer_retention || 0}</p>
                        <p className="text-xs text-gray-400">Customers</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-semibold text-gray-800">{scoreData.metrics?.revenue_trend || 0}</p>
                        <p className="text-xs text-gray-400">Revenue</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-semibold text-gray-800">{scoreData.metrics?.business_activity || 0}</p>
                        <p className="text-xs text-gray-400">Activity</p>
                    </div>
                </div>
            </div>
        </div>
    )
}