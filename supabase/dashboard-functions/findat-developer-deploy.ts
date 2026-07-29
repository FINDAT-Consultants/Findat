import { withSupabase } from 'npm:@supabase/server@^1'

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status })
}

function userIdFromClaims(claims: any): string {
  return String(claims?.id ?? claims?.sub ?? '')
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, ctx) => {
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

    try {
      const userId = userIdFromClaims(ctx.userClaims)
      const { data: profile, error: profileError } = await ctx.supabaseAdmin
        .from('findat_profiles')
        .select('id, username, first_name, last_name, role, active')
        .eq('id', userId)
        .maybeSingle()

      if (profileError || !profile || profile.role !== 'admin' || profile.active === false) {
        return jsonResponse({ error: 'Administrator privileges are required.' }, 403)
      }

      const buildHook = Deno.env.get('FINDAT_NETLIFY_BUILD_HOOK') ?? ''
      if (!/^https:\/\/api\.netlify\.com\/build_hooks\/[A-Za-z0-9_-]+/.test(buildHook)) {
        return jsonResponse({ error: 'The private Netlify build hook has not been configured.' }, 503)
      }

      let reason = 'Administrator Developer Studio'
      try {
        const payload = await request.json()
        reason = String(payload?.reason ?? reason).trim().slice(0, 200) || reason
      } catch {
        // A JSON body is optional.
      }

      const response = await fetch(buildHook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_title: reason }),
      })

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 500)
        throw new Error(`Netlify rejected the build request (${response.status}). ${detail}`)
      }

      const actorName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.username
      await ctx.supabaseAdmin.from('findat_audit_log').insert({
        actor_id: profile.id,
        actor_name: actorName,
        actor_role: 'admin',
        action: 'Netlify production build triggered',
        detail: reason,
        page_path: '#developer',
        entity_type: 'deployment',
        metadata: { provider: 'Netlify' },
      })

      return jsonResponse({ success: true, message: 'Netlify accepted the production build request.' }, 202)
    } catch (error) {
      console.error('findat-developer-deploy', error)
      return jsonResponse({ error: error instanceof Error ? error.message : 'The deployment request failed.' }, 500)
    }
  }),
}
