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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, full_name, role, business_id, branch_id, phone, salary, salary_frequency } = await req.json()

    // Validate required fields
    if (!email || !password || !full_name || !role || !business_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers.users.find(u => u.email === email)
    
    let userId: string
    
    if (existingUser) {
      // User exists, update password
      userId = existingUser.id
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password })
      if (updateError) throw updateError
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role, business_id, branch_id },
      })
      if (createError) throw createError
      userId = newUser.user.id
    }

    // Create staff record
    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        id: userId,
        business_id,
        branch_id: branch_id || null,
        user_id: userId,
        full_name,
        phone: phone || null,
        email,
        role,
        salary: salary || 0,
        salary_frequency: salary_frequency || 'monthly',
        invite_accepted: true,
        invite_sent: true,
      })
    
    if (staffError) throw staffError

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name,
        email,
        business_id,
        branch_id: branch_id || null,
        role,
        is_active: true,
      })
    
    if (profileError) throw profileError

    console.log(`Staff account created for ${email} with role ${role}`)

    return new Response(
      JSON.stringify({ success: true, user_id: userId, message: `Staff account created for ${full_name}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Error creating staff user:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})