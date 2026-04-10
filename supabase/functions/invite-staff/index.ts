import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify the requesting user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) throw new Error('Unauthorized')

    // Get request body
    const { email, full_name, role, business_id, branch_id, staff_id } = await req.json()

    if (!email || !full_name || !role || !business_id || !staff_id) {
      throw new Error('Missing required fields')
    }

    // Verify the requesting user owns this business
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.business_id !== business_id) {
      throw new Error('Unauthorized — not your business')
    }

    if (!['owner', 'manager'].includes(profile.role)) {
      throw new Error('Unauthorized — insufficient role')
    }

    // Send invite
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name,
          business_id,
          branch_id: branch_id ?? null,
          role,
          staff_id,
        },
        redirectTo: `${Deno.env.get('SITE_URL') ?? 'https://vortex-uq9t.vercel.app/'}/accept-invite`,
      }
    )

    if (inviteError) throw inviteError

    // Mark invite as sent on staff record
    await supabaseAdmin
      .from('staff')
      .update({ invite_sent: true })
      .eq('id', staff_id)

    return new Response(
      JSON.stringify({ success: true, user_id: inviteData.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})