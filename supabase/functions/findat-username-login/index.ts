import { withSupabase } from 'npm:@supabase/server@^1'

function cleanIdentifier(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().slice(0, 254)
}

function validUsername(value: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{2,29}$/.test(value)
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status })
}

function roleFromUser(user: any): 'admin' | 'consultant' | 'client' {
  const role = String(user?.app_metadata?.findat_role ?? '').toLowerCase()
  return role === 'admin' || role === 'consultant' ? role : 'client'
}

async function listAllAuthUsers(admin: any): Promise<any[]> {
  const users: any[] = []
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const batch = data?.users ?? []
    users.push(...batch)
    if (batch.length < 100) break
  }
  return users
}

async function createMissingProfile(admin: any, user: any) {
  const requested = String(user?.user_metadata?.username ?? '').trim().toLowerCase()
  const emailPrefix = String(user?.email ?? '').split('@')[0].trim().toLowerCase()
  let username = validUsername(requested)
    ? requested
    : validUsername(emailPrefix)
      ? emailPrefix
      : `user_${String(user.id).replaceAll('-', '').slice(0, 12)}`

  const { data: collision, error: collisionError } = await admin
    .from('findat_profiles')
    .select('id')
    .ilike('username', username)
    .neq('id', user.id)
    .maybeSingle()
  if (collisionError) throw collisionError
  if (collision) username = `${username.slice(0, 20)}_${String(user.id).replaceAll('-', '').slice(0, 8)}`

  const { data, error } = await admin
    .from('findat_profiles')
    .upsert({
      id: user.id,
      username,
      email: String(user.email ?? '').toLowerCase(),
      first_name: String(user?.user_metadata?.first_name ?? ''),
      last_name: String(user?.user_metadata?.last_name ?? ''),
      phone: String(user?.user_metadata?.phone ?? ''),
      organisation: String(user?.user_metadata?.organisation ?? ''),
      country: String(user?.user_metadata?.country ?? ''),
      role: roleFromUser(user),
      active: true,
    }, { onConflict: 'id' })
    .select('id, username, email, first_name, last_name, phone, organisation, country, role, active, created_at, updated_at')
    .single()
  if (error) throw error
  return data
}

async function resolveProfile(admin: any, identifier: string) {
  let query = admin
    .from('findat_profiles')
    .select('id, username, email, first_name, last_name, phone, organisation, country, role, active, created_at, updated_at')
    .limit(1)

  query = identifier.includes('@')
    ? query.ilike('email', identifier)
    : query.ilike('username', identifier)

  const { data: profile, error } = await query.maybeSingle()
  if (error) throw error
  if (profile) return profile

  // Repair older Auth accounts whose profile trigger failed.
  const users = await listAllAuthUsers(admin)
  const authUser = users.find((user) => {
    const email = String(user?.email ?? '').trim().toLowerCase()
    const username = String(user?.user_metadata?.username ?? '').trim().toLowerCase()
    return identifier.includes('@') ? email === identifier : username === identifier
  })
  if (!authUser) return null
  return await createMissingProfile(admin, authUser)
}

export default {
  fetch: withSupabase({ auth: 'none' }, async (request, ctx) => {
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

    try {
      const payload = await request.json()
      const identifier = cleanIdentifier(payload?.identifier)
      const password = String(payload?.password ?? '')

      if (!identifier || !password || password.length > 256) {
        return jsonResponse({ error: 'The username/email or password is incorrect.' }, 401)
      }

      const profile = await resolveProfile(ctx.supabaseAdmin, identifier)
      if (!profile) {
        return jsonResponse({ error: 'The username/email or password is incorrect.' }, 401)
      }
      if (profile.active === false) {
        return jsonResponse({ error: 'This account is currently inactive or suspended. Contact a FINDAT Administrator.' }, 403)
      }

      const { data, error } = await ctx.supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      })

      if (error) {
        const code = String((error as { code?: string }).code ?? '')
        if (code === 'email_not_confirmed') {
          return jsonResponse({
            error: 'This Client account exists, but its email is not confirmed. Confirm the email from the secure message, then log in again. Administrator approval is not required.',
            code,
          }, 403)
        }
        if (code === 'user_banned') {
          return jsonResponse({ error: 'This account is currently inactive or suspended. Contact a FINDAT Administrator.', code }, 403)
        }
        console.warn('FINDAT login rejected', { code, status: error.status })
        return jsonResponse({ error: 'The username/email or password is incorrect.', code }, 401)
      }

      if (!data.session || !data.user || data.user.id !== profile.id) {
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
  }),
}
