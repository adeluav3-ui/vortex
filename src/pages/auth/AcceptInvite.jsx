import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AcceptInvite() {
    const navigate = useNavigate()
    const [step, setStep] = useState('loading')   // loading | set-password | error
    const [error, setError] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [userData, setUserData] = useState(null)

    useEffect(() => {
        // onAuthStateChange is the reliable way to catch the invite token exchange.
        // Supabase JS v2 processes the #access_token= hash automatically and fires
        // this listener with event === 'SIGNED_IN' or 'PASSWORD_RECOVERY'.
        // For invite links specifically the event is 'SIGNED_IN' with a session.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    const meta = session.user.user_metadata

                    // Verify this is actually an invite session (has our custom metadata)
                    if (!meta?.business_id) {
                        // Signed in but not via invite — someone is already logged in.
                        // Redirect them to dashboard instead.
                        navigate('/dashboard', { replace: true })
                        return
                    }

                    setUserData({
                        full_name: meta.full_name ?? '',
                        business_id: meta.business_id ?? null,
                        branch_id: meta.branch_id ?? null,
                        role: meta.role ?? 'staff',
                        staff_id: meta.staff_id ?? null,
                        email: session.user.email,
                    })
                    setStep('set-password')
                } else if (event === 'INITIAL_SESSION' && !session) {
                    // No session and no token in URL — link is invalid or already used
                    setStep('error')
                    setError('This invite link is invalid or has already been used. Please ask your manager to send a new invite.')
                }
            }
        )

        // Fallback: if the auth state listener doesn't fire within 4s (e.g. no hash),
        // show the error state
        const timeout = setTimeout(() => {
            setStep(prev => {
                if (prev === 'loading') {
                    setError('This invite link is invalid or has already been used. Please ask your manager to send a new invite.')
                    return 'error'
                }
                return prev
            })
        }, 4000)

        return () => {
            subscription.unsubscribe()
            clearTimeout(timeout)
        }
    }, [navigate])

    async function handleSetPassword() {
        setError('')

        if (!password || password.length < 6) {
            return setError('Password must be at least 6 characters.')
        }
        if (password !== confirmPassword) {
            return setError('Passwords do not match.')
        }

        setLoading(true)

        try {
            // 1. Set the new password
            const { error: pwError } = await supabase.auth.updateUser({ password })
            if (pwError) throw pwError

            // 2. Get the current user (session is still active from the invite token)
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (userError || !user) throw new Error('Could not retrieve user after password update.')

            // 3. Create / update the profile row
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: userData.full_name,
                    business_id: userData.business_id,
                    branch_id: userData.branch_id,
                    role: userData.role,
                    is_active: true,
                })
            if (profileError) throw profileError

            // 4. Mark the staff invite as accepted
            if (userData.staff_id) {
                await supabase
                    .from('staff')
                    .update({ invite_accepted: true, user_id: user.id })
                    .eq('id', userData.staff_id)
            }

            // 5. Sign out so they log in fresh with their new password
            await supabase.auth.signOut()

            // 6. Redirect to login with success flag
            navigate('/login?invite=success', { replace: true })

        } catch (err) {
            setError(err.message)
            setLoading(false)
        }
    }

    // ── Shared logo header ────────────────────────────────────────────────────
    const Logo = () => (
        <div className="flex flex-col items-center justify-center mb-6">
            <img src="/logo.png" alt="Vortex" className="h-16 w-16 object-contain mb-3" />
            <span className="text-xl font-bold bg-linear-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Vortex
            </span>
        </div>
    )

    // ── Loading ───────────────────────────────────────────────────────────────
    if (step === 'loading') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md text-center">
                    <Logo />
                    <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                        <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Setting up your account...
                    </div>
                </div>
            </div>
        )
    }

    // ── Error ─────────────────────────────────────────────────────────────────
    if (step === 'error') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md text-center">
                    <Logo />
                    <p className="text-4xl mb-4">🔗</p>
                    <h1 className="text-lg font-bold text-gray-900 mb-2">Invite Link Problem</h1>
                    <p className="text-sm text-gray-500 leading-relaxed mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="text-sm text-blue-600 hover:underline font-medium"
                    >
                        Go to Login →
                    </button>
                </div>
            </div>
        )
    }

    // ── Set password ──────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md">
                <Logo />

                <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome to Vortex</h1>
                <p className="text-sm text-gray-500 mb-6">
                    Hi <strong>{userData?.full_name}</strong>, set a password to activate your account.
                </p>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                <div className="space-y-4">
                    {/* Email — read only */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            value={userData?.email ?? ''}
                            disabled
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                        />
                    </div>

                    {/* Role info */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                        <p className="text-xs text-blue-700">
                            You're joining as a <span className="font-semibold capitalize">{userData?.role}</span>.
                        </p>
                    </div>

                    {/* New password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Set Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Min 6 characters"
                            autoFocus
                        />
                    </div>

                    {/* Confirm password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Repeat your password"
                        />
                    </div>

                    <p className="text-xs text-gray-400">
                        After activation you'll be redirected to login. Use your email and new password.
                    </p>

                    <button
                        onClick={handleSetPassword}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Activating...' : 'Activate Account →'}
                    </button>
                </div>
            </div>
        </div>
    )
}