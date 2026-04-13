// supabase/functions/paystack-webhook/index.ts
// Deploy with: supabase functions deploy paystack-webhook --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// ── All 12 Paystack plan codes (TEST — swap to live before launch) ──────────
// IMPORTANT: When swapping to live, update ALL 12 codes here AND in:
//   - Onboarding.jsx (RETAIL_PLANS + VENDOR_PLANS)
//   - TrialExpiredModal.jsx (VENDOR_PLANS)
//   - VendorSettings.jsx (VENDOR_PLANS)
//   - RetailSettings.jsx (RETAIL_PLANS)
const PLAN_CODES: Record<string, { tier: string; interval: string; mode: string }> = {
  // ── Retail Plans ──
  PLN_grze6zv0gkw5euw: { tier: 'starter', interval: 'monthly', mode: 'retail' },
  PLN_jz65z74pi7nvbxy: { tier: 'starter',  interval: 'yearly',  mode: 'retail' },
  PLN_2bym17e1gqq9a68: { tier: 'growth',   interval: 'monthly', mode: 'retail' },
  PLN_jvas4v10w9qx92w: { tier: 'growth',   interval: 'yearly',  mode: 'retail' },
  PLN_a2mnjvi7wom1oeu: { tier: 'business', interval: 'monthly', mode: 'retail' },
  PLN_j8xvl1sr93ufrmr: { tier: 'business', interval: 'yearly',  mode: 'retail' },
  // ── Online Vendor Plans ──
  PLN_1dmcxfs006gtl6m: { tier: 'solo',   interval: 'monthly', mode: 'online_vendor' },
  PLN_vp08jxmaekii6m8: { tier: 'solo',   interval: 'yearly',  mode: 'online_vendor' },
  PLN_jgfdsznt7qu4bwm: { tier: 'hustle', interval: 'monthly', mode: 'online_vendor' },
  PLN_vz2eh4f9jvwr0dv: { tier: 'hustle', interval: 'yearly',  mode: 'online_vendor' },
  PLN_zg2ndbq2x36flcx: { tier: 'scale',  interval: 'monthly', mode: 'online_vendor' },
  PLN_izrkgoyv88a1pss: { tier: 'scale',  interval: 'yearly',  mode: 'online_vendor' },
// ── Combo Plans ──
PLN_hlm3uftf4cpg8bb: { tier: 'combo_basic', interval: 'monthly', mode: 'combo' },
PLN_urqq1jm9sm43nbn: { tier: 'combo_basic', interval: 'yearly', mode: 'combo' },
PLN_94h10u6wc2bh9eb: { tier: 'combo_standard', interval: 'monthly', mode: 'combo' },
PLN_woec9ujwshc6fh5: { tier: 'combo_standard', interval: 'yearly', mode: 'combo' },
PLN_020qaqdryasz5ma: { tier: 'combo_premium', interval: 'monthly', mode: 'combo' },
PLN_wh4ia00b29ve9db: { tier: 'combo_premium', interval: 'yearly', mode: 'combo' },
}

// Interval → days
const INTERVAL_DAYS: Record<string, number> = {
  monthly: 30,
  yearly:  365,
}

async function verifySignature(req: Request, body: string): Promise<boolean> {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY')
  if (!secret) return false
  const signature = req.headers.get('x-paystack-signature')
  if (!signature) return false

  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const msgData = encoder.encode(body)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return computed === signature
}

// ── Find business_id from a Paystack event ──────────────────────────────────
// Tries metadata first, then paystack_subscription_code, then email fallback
async function resolveBusinessId(data: Record<string, unknown>): Promise<string | null> {
  // 1. Metadata business_id (set during checkout)
  const meta = data.metadata as Record<string, unknown> | null
  if (meta?.business_id) return meta.business_id as string

  // 2. Via paystack_subscription_code stored on subscriptions table
  const subCode = (data.subscription_code ?? data.subscription?.subscription_code) as string | null
  if (subCode) {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('business_id')
      .eq('paystack_subscription_code', subCode)
      .single()
    if (sub?.business_id) return sub.business_id as string
  }

  // 3. Email fallback — find owner profile by email, then get their business
  const email = (data.customer?.email ?? data.email) as string | null
  if (email) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('business_id')
      .eq('email', email)
      .eq('role', 'owner')
      .single()
    if (profile?.business_id) return profile.business_id as string
  }

  return null
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.text()

  // Verify Paystack signature in production
  const isValid = await verifySignature(req, body)
  if (!isValid && Deno.env.get('ENVIRONMENT') === 'production') {
    console.error('Invalid Paystack signature')
    return new Response('Unauthorized', { status: 401 })
  }

  let event: { event: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(body)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  console.log(`Paystack webhook received: ${event.event}`)

  const { event: eventName, data } = event

  try {
    // ────────────────────────────────────────────────────────────────────────
    // PAYMENT SUCCESS — New subscription OR renewal
    // Fires when: initial subscription payment OR recurring renewal succeeds
    // ────────────────────────────────────────────────────────────────────────
    if (eventName === 'charge.success' || eventName === 'invoice.payment_success') {
      const planCode = (
        data.plan_code ??
        data.plan?.plan_code ??
        data.subscription?.plan?.plan_code
      ) as string | null

      if (!planCode || !PLAN_CODES[planCode]) {
        // Not a Vortex subscription charge — ignore silently
        return new Response('OK', { status: 200 })
      }

      const planInfo = PLAN_CODES[planCode]
      const businessId = await resolveBusinessId(data)
      if (!businessId) {
        console.error('Could not resolve business_id for event:', eventName, planCode)
        return new Response('OK', { status: 200 })
      }

      const subCode = (data.subscription_code ?? data.subscription?.subscription_code) as string | null
      const customerCode = (data.customer?.customer_code) as string | null

      const now = new Date()
      const periodEndDays = INTERVAL_DAYS[planInfo.interval] ?? 30
      const periodEnd = new Date(now.getTime() + periodEndDays * 24 * 60 * 60 * 1000)

      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          tier: planInfo.tier,
          is_trial: false,
          trial_start: null,
          trial_end: null,
          paystack_subscription_code: subCode ?? null,
          paystack_customer_code: customerCode ?? null,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('business_id', businessId)

      if (error) {
        console.error('Error updating subscription on payment success:', error)
      } else {
        console.log(`Subscription activated/renewed for business ${businessId} — ${planInfo.tier} (${planInfo.interval})`)
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // PAYMENT FAILED — First or retry failure
    // Paystack retries 3× before disabling. Mark as past_due on first failure.
    // ────────────────────────────────────────────────────────────────────────
    else if (eventName === 'invoice.payment_failed' || eventName === 'charge.failed') {
      const businessId = await resolveBusinessId(data)
      if (!businessId) {
        console.error('Could not resolve business_id for payment_failed event')
        return new Response('OK', { status: 200 })
      }

      // Only move to past_due if currently active — don't overwrite already-cancelled
      const { data: current } = await supabaseAdmin
        .from('subscriptions')
        .select('status')
        .eq('business_id', businessId)
        .single()

      if (current?.status === 'active' || current?.status === 'trialing') {
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('business_id', businessId)

        if (error) {
          console.error('Error marking subscription past_due:', error)
        } else {
          console.log(`Subscription marked past_due for business ${businessId}`)
        }
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // SUBSCRIPTION DISABLED — All retries exhausted, Paystack disabled it
    // This is the final state. Lock the account out completely.
    // ────────────────────────────────────────────────────────────────────────
    else if (eventName === 'subscription.disable' || eventName === 'subscription.not_renew') {
      const businessId = await resolveBusinessId(data)
      if (!businessId) {
        console.error('Could not resolve business_id for subscription.disable event')
        return new Response('OK', { status: 200 })
      }

      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', businessId)

      if (error) {
        console.error('Error cancelling subscription:', error)
      } else {
        console.log(`Subscription cancelled for business ${businessId}`)
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // SUBSCRIPTION CREATED — First-time subscription created on Paystack's end
    // This fires alongside charge.success for new subs — safe to handle both
    // ────────────────────────────────────────────────────────────────────────
    else if (eventName === 'subscription.create') {
      const planCode = data.plan?.plan_code as string | null
      if (!planCode || !PLAN_CODES[planCode]) {
        return new Response('OK', { status: 200 })
      }

      const planInfo = PLAN_CODES[planCode]
      const businessId = await resolveBusinessId(data)
      if (!businessId) {
        console.error('Could not resolve business_id for subscription.create')
        return new Response('OK', { status: 200 })
      }

      const subCode = data.subscription_code as string | null
      const customerCode = data.customer?.customer_code as string | null
      const now = new Date()
      const periodEndDays = INTERVAL_DAYS[planInfo.interval] ?? 30
      const periodEnd = new Date(now.getTime() + periodEndDays * 24 * 60 * 60 * 1000)

      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          tier: planInfo.tier,
          is_trial: false,
          trial_start: null,
          trial_end: null,
          paystack_subscription_code: subCode ?? null,
          paystack_customer_code: customerCode ?? null,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('business_id', businessId)

      if (error) {
        console.error('Error updating subscription on create:', error)
      } else {
        console.log(`Subscription created for business ${businessId} — ${planInfo.tier}`)
      }
    }

    else {
      // Unhandled event type — log and ignore
      console.log(`Unhandled Paystack event: ${eventName}`)
    }

  } catch (err) {
    console.error('Webhook handler error:', err)
    // Return 200 so Paystack doesn't retry — we'll fix in logs
    return new Response('OK', { status: 200 })
  }

  return new Response('OK', { status: 200 })
})