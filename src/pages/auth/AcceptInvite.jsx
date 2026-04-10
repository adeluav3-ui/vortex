import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AcceptInvite() {
    const navigate = useNavigate()
    const [step, setStep] = useState('loading')
    const [error, setError] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [userData, setUserData] = useState(null)

    useEffect(() => {
        setupSession()
    }, [])

    async function setupSession() {
        // Supabase puts the token in the URL hash on invite links
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
            setStep('error')
            setError('Invalid or expired invite link. Please ask your manager to resend the invite.')
            return
        }

        const meta = session.user.user_metadata
        setUserData({
            full_name: meta.full_name,
            business_id: meta.business_id,
            branch_id: meta.branch_id,
            role: meta.role,
            staff_id: meta.staff_id,
            email: session.user.email,
        })

        setStep('set-password')
    }

    async function handleSetPassword() {
        setError('')
        if (!password || password.length < 6) return setError('Password must be at least 6 characters')
        setLoading(true)

        try {
            // Update password
            const { error: pwError } = await supabase.auth.updateUser({ password })
            if (pwError) throw pwError

            // Create profile
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: (await supabase.auth.getUser()).data.user.id,
                    full_name: userData.full_name,
                    business_id: userData.business_id,
                    branch_id: userData.branch_id,
                    role: userData.role,
                })
            if (profileError) throw profileError

            // Mark invite as accepted
            if (userData.staff_id) {
                await supabase
                    .from('staff')
                    .update({ invite_accepted: true })
                    .eq('id', userData.staff_id)
            }

            navigate('/dashboard')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (step === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
                Setting up your account...
            </div>
        )
    }

    if (step === 'error') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md text-center">
                    <div className="flex flex-col items-center justify-center mb-6">
                        <img src="/logo.png" alt="Vortex" className="h-16 w-16 object-contain mb-3" />
                        <span className="text-xl font-bold bg-linear-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                            Vortex
                        </span>
                    </div>
                    <p className="text-4xl mb-4">❌</p>
                    <h1 className="text-lg font-bold text-gray-900 mb-2">Invite Error</h1>
                    <p className="text-sm text-gray-500">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome to Vortex</h1>
                <p className="text-sm text-gray-500 mb-6">
                    Hi <strong>{userData?.full_name}</strong>, set a password to activate your account.
                </p>

                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            value={userData?.email ?? ''}
                            disabled
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Set Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Min 6 characters"
                        />
                    </div>

                    <button
                        onClick={handleSetPassword}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Activating...' : 'Activate Account'}
                    </button>
                </div>
            </div>
        </div>
    )
}