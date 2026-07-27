import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY') ?? ''

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

function text(value: unknown, max = 200): string {
  return String(value ?? '').trim().slice(0, max)
}

function validUsername(username: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/.test(username)
}

async function requireAdmin(request: Request) {
  const authorization = request.headers.get('authorization') ?? ''
  const accessToken = authorization.replace(/^Bearer\s+/i, '').trim()
  if (!accessToken) throw new Error('AUTH_REQUIRED')

  const verifier = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await verifier.auth.getUser(accessToken)
  if (error || !data.user) throw new Error('AUTH_REQUIRED')

  const { data: profile, error: profileError } = await service
    .from('findat_profiles')
    .select('id, role, active')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError || !profile || profile.role !== 'admin' || profile.active === false) {
    throw new Error('ADMIN_REQUIRED')
  }
  return data.user
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'The account administration service is not configured.' }, 500)
  }

  try {
    const administrator = await requireAdmin(request)
    const payload = await request.json()
    const action = text(payload?.action, 40)

    if (action === 'list') {
      const { data, error } = await service
        .from('findat_profiles')
        .select('id, username, email, first_name, last_name, phone, organisation, country, role, active, created_at, updated_at')
        .order('role', { ascending: true })
        .order('first_name', { ascending: true })
      if (error) throw error
      return jsonResponse({ users: data ?? [] })
    }

    if (action === 'create') {
      const email = text(payload?.email, 254).toLowerCase()
      const username = text(payload?.username, 30)
      const password = String(payload?.password ?? '')
      const role = text(payload?.role, 20).toLowerCase()
      const firstName = text(payload?.firstName, 80)
      const lastName = text(payload?.lastName, 80)
      const phone = text(payload?.phone, 50)
      const organisation = text(payload?.organisation, 160)

      if (!email.includes('@') || !validUsername(username) || password.length < 8) {
        return jsonResponse({ error: 'Enter a valid email, username and password of at least 8 characters.' }, 400)
      }
      if (!['consultant', 'client'].includes(role)) {
        return jsonResponse({ error: 'Administrators can create only Consultant or Client accounts here.' }, 400)
      }

      const { data: usernameMatch } = await service
        .from('findat_profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle()
      if (usernameMatch) return jsonResponse({ error: 'That username is already in use.' }, 409)

      const { data: emailMatch } = await service
        .from('findat_profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle()
      if (emailMatch) return jsonResponse({ error: 'That email address is already registered.' }, 409)

      const { data: created, error: createError } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          first_name: firstName,
          last_name: lastName,
          phone,
          organisation,
          country: '',
        },
        app_metadata: { findat_role: role },
      })
      if (createError || !created.user) throw createError ?? new Error('The Auth user was not created.')

      const { error: profileError } = await service
        .from('findat_profiles')
        .update({
          username,
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          organisation,
          role,
          active: true,
        })
        .eq('id', created.user.id)
      if (profileError) throw profileError

      await service.from('findat_audit_log').insert({
        actor_id: administrator.id,
        actor_name: 'Administrator',
        actor_role: 'admin',
        action: 'Account created',
        detail: `${username} created as ${role}.`,
      })

      return jsonResponse({ userId: created.user.id }, 201)
    }

    if (action === 'change_password') {
      const userId = text(payload?.userId, 50)
      const password = String(payload?.password ?? '')
      if (!/^[0-9a-f-]{36}$/i.test(userId) || password.length < 8 || password.length > 256) {
        return jsonResponse({ error: 'Enter a valid account and password of at least 8 characters.' }, 400)
      }
      const { data: target, error: targetError } = await service
        .from('findat_profiles')
        .select('id, role')
        .eq('id', userId)
        .maybeSingle()
      if (targetError || !target) return jsonResponse({ error: 'Account not found.' }, 404)
      if (target.role === 'admin') {
        return jsonResponse({ error: 'Administrator credentials are protected. Use the secure recovery flow for the Administrator account.' }, 403)
      }

      const { error } = await service.auth.admin.updateUserById(userId, { password })
      if (error) throw error
      await service.from('findat_audit_log').insert({
        actor_id: administrator.id,
        actor_name: 'Administrator',
        actor_role: 'admin',
        action: 'Account password replaced',
        detail: `${target.id} password replaced by an Administrator.`,
      })
      return jsonResponse({ success: true })
    }

    if (action === 'set_active') {
      const userId = text(payload?.userId, 50)
      const active = payload?.active === true
      if (!/^[0-9a-f-]{36}$/i.test(userId)) return jsonResponse({ error: 'Invalid account.' }, 400)

      const { data: target, error: targetError } = await service
        .from('findat_profiles')
        .select('id, role')
        .eq('id', userId)
        .maybeSingle()
      if (targetError || !target) return jsonResponse({ error: 'Account not found.' }, 404)
      if (target.role === 'admin') return jsonResponse({ error: 'Administrator accounts are protected from this control.' }, 403)

      const { error } = await service.from('findat_profiles').update({ active }).eq('id', userId)
      if (error) throw error
      await service.from('findat_audit_log').insert({
        actor_id: administrator.id,
        actor_name: 'Administrator',
        actor_role: 'admin',
        action: active ? 'Account activated' : 'Account suspended',
        detail: `${target.id} ${active ? 'activated' : 'suspended'} by an Administrator.`,
      })
      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Unsupported account action.' }, 400)
  } catch (error) {
    console.error('findat-admin-users', error)
    const message = error instanceof Error ? error.message : ''
    if (message === 'AUTH_REQUIRED') return jsonResponse({ error: 'Please log in again.' }, 401)
    if (message === 'ADMIN_REQUIRED') return jsonResponse({ error: 'Administrator privileges are required.' }, 403)
    return jsonResponse({ error: message || 'The account request failed.' }, 500)
  }
})
