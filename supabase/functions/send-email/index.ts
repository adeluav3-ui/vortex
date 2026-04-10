// supabase/functions/send-email/index.ts
// Deploy: supabase functions deploy send-email
//
// Required secrets:
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
//   supabase secrets set FROM_EMAIL=noreply@yourdomain.com
//   supabase secrets set FROM_NAME=Vortex

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Email templates ───────────────────────────────────────────────────────────

function baseLayout(content: string, previewText = '') {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vortex</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr>
          <td style="background:#2563eb;padding:24px 32px;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Vortex</p>
            <p style="margin:4px 0 0;color:#93c5fd;font-size:12px;">Business Management Platform</p>
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;background:#f9fafb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
              This email was sent by Vortex. If you didn't expect this, you can safely ignore it.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

const TEMPLATES: Record<string, (data: Record<string, string>) => { subject: string; html: string }> = {

    // ── Staff invite ──────────────────────────────────────────────────────────
    staff_invite: (data) => ({
        subject: `You've been invited to join ${data.business_name} on Vortex`,
        html: baseLayout(`
            <p style="margin:0 0 16px;color:#111827;font-size:24px;font-weight:700;">You're invited! 🎉</p>
            <p style="margin:0 0 16px;color:#6b7280;font-size:15px;line-height:1.6;">
                <strong style="color:#111827;">${data.inviter_name}</strong> has invited you to join
                <strong style="color:#111827;">${data.business_name}</strong> on Vortex as a
                <strong style="color:#111827;">${data.role}</strong>.
            </p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                Click the button below to accept your invitation and set up your account.
            </p>
            <a href="${data.invite_url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">
                Accept Invitation →
            </a>
            <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;">
                This invitation link expires in 7 days. If you have any issues, contact ${data.inviter_name}.
            </p>
        `, `You've been invited to join ${data.business_name}`),
    }),

    // ── Trial ending ──────────────────────────────────────────────────────────
    trial_ending: (data) => ({
        subject: `Your free trial ends in ${data.days_left} day${data.days_left === '1' ? '' : 's'} — keep your access`,
        html: baseLayout(`
            <p style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:700;">Your trial is ending soon ⏳</p>
            <p style="margin:0 0 16px;color:#6b7280;font-size:15px;line-height:1.6;">
                Hi ${data.business_name}, your free 14-day trial on the <strong style="color:#111827;">Scale plan</strong>
                ends in <strong style="color:#dc2626;">${data.days_left} day${data.days_left === '1' ? '' : 's'}</strong>.
            </p>
            <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:16px;margin:0 0 24px;">
                <p style="margin:0;color:#92400e;font-size:14px;line-height:1.6;">
                    After your trial ends, you'll need to subscribe to keep using Vortex.
                    Your data is safe — subscribe now to avoid any interruption.
                </p>
            </div>
            <a href="${data.billing_url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">
                Subscribe Now →
            </a>
            <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;">
                Plans start at ₦4,500/month. Cancel anytime.
            </p>
        `, `Your trial ends in ${data.days_left} days`),
    }),

    // ── Payment confirmation ──────────────────────────────────────────────────
    payment_confirmation: (data) => ({
        subject: `Payment confirmed — Welcome to Vortex ${data.plan_name}`,
        html: baseLayout(`
            <p style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:700;">Payment confirmed ✅</p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                Hi ${data.business_name}, your subscription to the
                <strong style="color:#111827;">${data.plan_name} plan</strong> is now active.
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:0 0 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="color:#6b7280;font-size:14px;padding:4px 0;">Plan</td>
                        <td style="color:#111827;font-size:14px;font-weight:600;text-align:right;padding:4px 0;">${data.plan_name}</td>
                    </tr>
                    <tr>
                        <td style="color:#6b7280;font-size:14px;padding:4px 0;">Billing</td>
                        <td style="color:#111827;font-size:14px;font-weight:600;text-align:right;padding:4px 0;">${data.interval}</td>
                    </tr>
                    <tr>
                        <td style="color:#6b7280;font-size:14px;padding:4px 0;">Amount</td>
                        <td style="color:#111827;font-size:14px;font-weight:600;text-align:right;padding:4px 0;">₦${data.amount}</td>
                    </tr>
                    <tr>
                        <td style="color:#6b7280;font-size:14px;padding:4px 0;">Next renewal</td>
                        <td style="color:#111827;font-size:14px;font-weight:600;text-align:right;padding:4px 0;">${data.next_renewal}</td>
                    </tr>
                </table>
            </div>
            <a href="${data.dashboard_url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">
                Go to Dashboard →
            </a>
        `, `Payment confirmed for ${data.plan_name} plan`),
    }),

    // ── Subscription failed ───────────────────────────────────────────────────
    subscription_failed: (data) => ({
        subject: 'Action required — Your Vortex subscription payment failed',
        html: baseLayout(`
            <p style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:700;">Payment failed ❌</p>
            <p style="margin:0 0 16px;color:#6b7280;font-size:15px;line-height:1.6;">
                Hi ${data.business_name}, we couldn't process your subscription renewal for the
                <strong style="color:#111827;">${data.plan_name} plan</strong>.
            </p>
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:0 0 24px;">
                <p style="margin:0;color:#991b1b;font-size:14px;line-height:1.6;">
                    Your account will be downgraded if payment isn't completed. Please update your card details and try again.
                </p>
            </div>
            <a href="${data.billing_url}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">
                Update Payment Details →
            </a>
        `, 'Your subscription payment failed'),
    }),
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { template, to, data } = await req.json()

        if (!template || !to) {
            return new Response(JSON.stringify({ error: 'template and to are required' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const templateFn = TEMPLATES[template]
        if (!templateFn) {
            return new Response(JSON.stringify({ error: `Unknown template: ${template}` }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const { subject, html } = templateFn(data ?? {})

        const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'noreply@vortex.app'
        const fromName = Deno.env.get('FROM_NAME') ?? 'Vortex'
        const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: `${fromName} <${fromEmail}>`,
                to: Array.isArray(to) ? to : [to],
                subject,
                html,
            }),
        })

        const result = await response.json()

        if (!response.ok) {
            console.error('Resend error:', result)
            return new Response(JSON.stringify({ error: result }), {
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify({ success: true, id: result.id }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    } catch (err) {
        console.error('send-email error:', err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})