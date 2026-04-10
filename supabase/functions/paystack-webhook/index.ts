import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_CODES: Record<string, { tier: string; interval: string }> = {
  // ── Retail Plans ──
  PLN_vgfmc26jpqa56dj: { tier: 'starter', interval: 'monthly' },
  PLN_qo34f4txuqa2iny: { tier: 'starter', interval: 'yearly' },
  PLN_oh48az761gii1ac: { tier: 'growth', interval: 'monthly' },
  PLN_i1jl355wen3da47: { tier: 'growth', interval: 'yearly' },
  PLN_rzmdyt42wkb1bxp: { tier: 'business', interval: 'monthly' },
  PLN_wy53l0wv0jewfyu: { tier: 'business', interval: 'yearly' },
  // ── Online Vendor Plans ──
  PLN_ld2wkx75vf2owop: { tier: 'solo', interval: 'monthly' },
  PLN_liieyblqil0xgma: { tier: 'solo', interval: 'yearly' },
  PLN_7j4dvngdd7q1xcd: { tier: 'hustle', interval: 'monthly' },
  PLN_1a7tboh8temcq9t: { tier: 'hustle', interval: 'yearly' },
  PLN_oxtaphfdtb7tvth: { tier: 'scale', interval: 'monthly' },
  PLN_n3mxm6r1aaydvnd: { tier: 'scale', interval: 'yearly' },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify Paystack signature
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''
    const signature = req.headers.get('x-paystack-signature')
    const body = await req.text()

    const hash = createHmac('sha512', paystackSecret)
      .update(body)
      .digest('hex')

    if (hash !== signature) {
      return new Response('Invalid signature', { status: 401 })
    }

    const event = JSON.parse(body)
    const { event: eventType, data } = event

    console.log('Paystack event:', eventType)

    if (eventType === 'subscription.create' || eventType === 'invoice.payment_succeeded') {
      const planCode = data?.plan?.plan_code ?? data?.subscription?.plan?.plan_code
      const customerEmail = data?.customer?.email
      const subscriptionCode = data?.subscription_code ?? data?.subscription?.subscription_code
      const nextPaymentDate = data?.next_payment_date ?? data?.subscription?.next_payment_date
      const paystackCustomerCode = data?.customer?.customer_code

      if (!planCode || !customerEmail) {
        console.log('Missing plan code or email')
        return new Response('OK', { status: 200 })
      }

      const planInfo = PLAN_CODES[planCode]
      if (!planInfo) {
        console.log('Unknown plan code:', planCode)
        return new Response('OK', { status: 200 })
      }

      // Find user by email
      const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers()
      if (userError) throw userError

      const user = users.find(u => u.email === customerEmail)
      if (!user) {
        console.log('User not found:', customerEmail)
        return new Response('OK', { status: 200 })
      }

      // Get profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single()

      if (!profile?.business_id) {
        console.log('No business found for user:', customerEmail)
        return new Response('OK', { status: 200 })
      }

      // Calculate period
      const now = new Date()
      const periodEnd = nextPaymentDate
        ? new Date(nextPaymentDate)
        : planInfo.interval === 'yearly'
        ? new Date(now.setFullYear(now.getFullYear() + 1))
        : new Date(now.setMonth(now.getMonth() + 1))

      // Update subscription
      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          tier: planInfo.tier,
          status: 'active',
          is_trial: false,         
          trial_start: null,        
          trial_end: null,      
          paystack_customer_code: paystackCustomerCode ?? null,
          paystack_subscription_code: subscriptionCode ?? null,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', profile.business_id)

      if (subError) throw subError

      // Log platform event
      await supabaseAdmin.from('platform_events').insert({
        business_id: profile.business_id,
        event_type: eventType === 'subscription.create' ? 'subscription_payment' : 'renewal',
        tier: planInfo.tier,
        amount: data?.amount ? data.amount / 100 : 0,
        meta: { plan_code: planCode, interval: planInfo.interval, subscription_code: subscriptionCode },
      })

      console.log(`Updated ${customerEmail} to ${planInfo.tier} (${planInfo.interval})`)
    }

    if (eventType === 'subscription.disable' || eventType === 'subscription.expiry_reminder') {
      const customerEmail = data?.customer?.email
      if (!customerEmail) return new Response('OK', { status: 200 })

      if (eventType === 'subscription.disable') {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        const user = users.find(u => u.email === customerEmail)
        if (!user) return new Response('OK', { status: 200 })

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('business_id')
          .eq('id', user.id)
          .single()

        if (profile?.business_id) {
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'cancelled' })
            .eq('business_id', profile.business_id)

          await supabaseAdmin.from('platform_events').insert({
            business_id: profile.business_id,
            event_type: 'cancel',
            meta: { email: customerEmail },
          })
        }
      }
    }

    return new Response('OK', { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Error', { status: 500 })
  }
})