// supabase/functions/invite-staff/index.ts
// Deploy: supabase functions deploy invite-staff
//
// Required secrets:
//   supabase secrets set SUPABASE_URL=https://etezatsqtzjjyexcrwrl.supabase.co
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
//   supabase secrets set SITE_URL=https://your-production-domain.com
//
// IMPORTANT: SITE_URL must be the exact domain where your app is deployed.
// For local dev: http://localhost:5173
// For production: https://yourdomain.com (no trailing slash)
//
// Also add your SITE_URL to Supabase Auth > URL Configuration > Redirect URLs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      email,
      full_name,
      role,
      business_id,
      branch_id,
      staff_id,
    } = await req.json()

    // Validate required fields
    if (!email || !full_name || !role || !business_id || !branch_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, full_name, role, business_id, branch_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://vortex-uq9t.vercel.app'

    // The redirectTo URL is where Supabase sends the user AFTER they click the email link.
    // It must be in your Supabase Auth > URL Configuration > Redirect URLs allowlist.
    // The #access_token= hash will be appended automatically by Supabase.
    const redirectTo = `${siteUrl}/accept-invite`

    // Invite the user — this creates the auth user and sends the invite email
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        // This metadata is attached to the user and accessible via session.user.user_metadata
        // AcceptInvite.jsx reads these to set up the profile
        full_name,
        role,
        business_id,
        branch_id,
        staff_id: staff_id ?? null,
      },
    })

    if (error) {
      // Handle the common case where the user was already invited
      if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
        return new Response(
          JSON.stringify({ error: 'This email has already been invited or registered. If they need a new link, delete their user in Supabase Auth and re-invite.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.error('inviteUserByEmail error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Invite sent to ${email} for business ${business_id}, role: ${role}`)

    return new Response(
      JSON.stringify({ success: true, user_id: data.user?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Unexpected error in invite-staff:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})