// In create-staff-user/index.ts - Updated version

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
    let isNewUser = false

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
      isNewUser = true
    }

    // Generate a separate UUID for staff record (don't use user_id as staff_id)
    const staffId = crypto.randomUUID()

    // Check if staff record already exists for this user
    const { data: existingStaff } = await supabaseAdmin
      .from('staff')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingStaff) {
      // Update existing staff record
      const { error: staffError } = await supabaseAdmin
        .from('staff')
        .update({
          full_name,
          phone: phone || null,
          email,
          role,
          branch_id: branch_id || null,
          salary: salary || 0,
          salary_frequency: salary_frequency || 'monthly',
          is_active: true,
        })
        .eq('id', existingStaff.id)
      
      if (staffError) throw staffError
    } else {
      // Create new staff record with unique ID
      const { error: staffError } = await supabaseAdmin
        .from('staff')
        .insert({
          id: staffId,  // Use a new UUID, not the user_id
          user_id: userId,
          business_id,
          branch_id: branch_id || null,
          full_name,
          phone: phone || null,
          email,
          role,
          salary: salary || 0,
          salary_frequency: salary_frequency || 'monthly',
          invite_accepted: true,
          invite_sent: true,
          is_active: true,
        })
      
      if (staffError) throw staffError
    }

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (existingProfile) {
      // Update existing profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name,
          email,
          business_id,
          branch_id: branch_id || null,
          role,
          is_active: true,
        })
        .eq('id', userId)
      
      if (profileError) throw profileError
    } else {
      // Create new profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          full_name,
          email,
          business_id,
          branch_id: branch_id || null,
          role,
          is_active: true,
        })
      
      if (profileError) throw profileError
    }

    console.log(`Staff account created/updated for ${email} with role ${role}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userId, 
        staff_id: existingStaff?.id || staffId,
        message: isNewUser ? `Staff account created for ${full_name}` : `Staff account updated for ${full_name}`
      }),
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