import { withSupabase } from 'npm:@supabase/server@^1'

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status })
}

function userIdFromClaims(claims: any): string {
  return String(claims?.id ?? claims?.sub ?? '')
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, ctx) => {
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

    try {
      const userId = userIdFromClaims(ctx.userClaims)
      if (!/^[0-9a-f-]{36}$/i.test(userId)) return jsonResponse({ error: 'Sign in to FINDAT before opening Cloud.' }, 401)

      const payload = await request.json()
      const password = String(payload?.password ?? '')
      if (!password || password.length > 256) return jsonResponse({ error: 'Enter your Cloud password.' }, 400)

      const admin = ctx.supabaseAdmin
      const { data: profile, error: profileError } = await admin
        .from('findat_profiles')
        .select('id, username, email, role, active')
        .eq('id', userId)
        .maybeSingle()
      if (profileError || !profile || profile.active === false) return jsonResponse({ error: 'This FINDAT account is not active.' }, 403)

      if (profile.role === 'admin') {
        const { data, error } = await admin.auth.signInWithPassword({ email: profile.email, password })
        if (error || !data?.user || data.user.id !== profile.id) return jsonResponse({ error: 'The Administrator password is incorrect.' }, 401)
        return jsonResponse({ success: true, role: 'admin', username: profile.username, expiresAt: null })
      }

      const { data: access, error: accessError } = await admin
        .from('findat_cloud_access')
        .select('password_salt, password_hash, active, expires_at')
        .eq('user_id', userId)
        .maybeSingle()
      if (accessError || !access) return jsonResponse({ error: 'No Cloud password has been assigned to this account.' }, 403)
      if (access.active !== true) return jsonResponse({ error: 'This Cloud password has been suspended.' }, 403)
      if (new Date(access.expires_at).getTime() <= Date.now()) return jsonResponse({ error: 'This Cloud password has expired. Ask an Administrator to generate a new one.' }, 403)

      const hash = await sha256Hex(`${access.password_salt}:${password}`)
      if (!constantTimeEqual(hash, String(access.password_hash))) return jsonResponse({ error: 'The Cloud password is incorrect.' }, 401)

      await admin.from('findat_cloud_access').update({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', userId)
      return jsonResponse({ success: true, role: profile.role, username: profile.username, expiresAt: access.expires_at })
    } catch (error) {
      console.error('findat-cloud-login', error)
      return jsonResponse({ error: error instanceof Error ? error.message : 'Cloud access could not be verified.' }, 500)
    }
  }),
}
