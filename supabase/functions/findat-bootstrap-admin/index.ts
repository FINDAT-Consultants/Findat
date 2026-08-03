import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY') ?? ''
const bootstrapSecret = Deno.env.get('FINDAT_ADMIN_BOOTSTRAP_SECRET') ?? ''

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)
  if (!supabaseUrl || !serviceRoleKey || !bootstrapSecret) {
    return jsonResponse({ error: 'The Administrator bootstrap service is not configured.' }, 500)
  }

  const suppliedSecret = request.headers.get('x-bootstrap-secret') ?? ''
  if (!bootstrapSecret || suppliedSecret !== bootstrapSecret) {
    return jsonResponse({ error: 'Bootstrap authorization failed.' }, 401)
  }

  try {
    const { count, error: countError } = await service
      .from('findat_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
    if (countError) throw countError
    if ((count ?? 0) > 0) return jsonResponse({ error: 'An Administrator account already exists.' }, 409)

    const payload = await request.json()
    const email = String(payload?.email ?? '').trim().toLowerCase()
    const username = String(payload?.username ?? '').trim()
    const password = String(payload?.password ?? '')
    const firstName = String(payload?.firstName ?? 'System').trim().slice(0, 80)
    const lastName = String(payload?.lastName ?? 'Administrator').trim().slice(0, 80)

    if (!email.includes('@') || !/^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/.test(username) || password.length < 12) {
      return jsonResponse({ error: 'Use a valid email, username and a password of at least 12 characters.' }, 400)
    }

    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, first_name: firstName, last_name: lastName },
      app_metadata: { findat_role: 'admin' },
    })
    if (error || !data.user) throw error ?? new Error('The Administrator account was not created.')

    const { error: profileError } = await service
      .from('findat_profiles')
      .update({ username, email, first_name: firstName, last_name: lastName, role: 'admin', active: true })
      .eq('id', data.user.id)
    if (profileError) throw profileError

    return jsonResponse({ userId: data.user.id, username }, 201)
  } catch (error) {
    console.error('findat-bootstrap-admin', error)
    return jsonResponse({ error: error instanceof Error ? error.message : 'Administrator bootstrap failed.' }, 500)
  }
})
