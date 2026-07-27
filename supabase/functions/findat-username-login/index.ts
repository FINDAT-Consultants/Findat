import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY') ?? ''

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

function cleanIdentifier(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().slice(0, 254)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'The login service is not configured.' }, 500)
  }

  try {
    const payload = await request.json()
    const identifier = cleanIdentifier(payload?.identifier)
    const password = String(payload?.password ?? '')

    if (!identifier || !password || password.length > 256) {
      return jsonResponse({ error: 'The username/email or password is incorrect.' }, 401)
    }

    let profileQuery = service
      .from('findat_profiles')
      .select('id, username, email, first_name, last_name, phone, organisation, country, role, active, created_at, updated_at')
      .limit(1)

    profileQuery = identifier.includes('@')
      ? profileQuery.ilike('email', identifier)
      : profileQuery.ilike('username', identifier)

    const { data: profile, error: profileError } = await profileQuery.maybeSingle()

    // Keep the response deliberately generic so the endpoint does not reveal
    // whether a username or email address exists.
    if (profileError || !profile || profile.active === false) {
      return jsonResponse({ error: 'The username/email or password is incorrect.' }, 401)
    }

    const publicAuth = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { data, error } = await publicAuth.auth.signInWithPassword({
      email: profile.email,
      password,
    })

    if (error || !data.session || !data.user) {
      return jsonResponse({ error: 'The username/email or password is incorrect.' }, 401)
    }

    return jsonResponse({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
        user: { id: data.user.id, email: data.user.email },
      },
      profile,
    })
  } catch (error) {
    console.error('findat-username-login', error)
    return jsonResponse({ error: 'The login service could not complete the request.' }, 500)
  }
})
