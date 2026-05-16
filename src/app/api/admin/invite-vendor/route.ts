import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, orgName, quota, designation } = body

    if (!email || !orgName) {
      return NextResponse.json({ error: 'Email and organisation name are required' }, { status: 400 })
    }

    // Use Service Role Key for admin operations
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Server configuration error: missing service role key' }, { status: 500 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the caller is an admin
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token)
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminCheck } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('id', caller.id)
      .single()

    if (!adminCheck) {
      return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })
    }

    // Generate temporary password
    const tempPassword = generateTempPassword()

    // Create the auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm so they can log in immediately
    })

    if (createError) {
      // Check if user already exists
      if (createError.message?.includes('already been registered')) {
        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    if (!newUser.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Get active event
    const { data: activeEvent } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('is_active', true)
      .single()

    // Create vendor profile
    const { error: profileError } = await supabaseAdmin
      .from('vendor_profiles')
      .insert({
        id: newUser.user.id,
        username: email,
        org_name: orgName,
        designation: designation || null,
        quota: parseInt(quota) || 5,
        event_id: activeEvent?.id || null,
        is_active: true,
        is_registered: false,
      })

    if (profileError) {
      // Rollback: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: `Profile creation failed: ${profileError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      userId: newUser.user.id,
      tempPassword,
      message: `Vendor account created for ${email}`,
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password + '!1Aa' // Ensure it meets complexity requirements
}
