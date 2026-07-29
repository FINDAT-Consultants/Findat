import { withSupabase } from 'npm:@supabase/server@^1'

function text(value: unknown, max = 200): string {
  return String(value ?? '').trim().slice(0, max)
}

function validUsername(username: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/.test(username)
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status })
}

function userIdFromClaims(claims: any): string {
  return String(claims?.id ?? claims?.sub ?? '')
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

async function repairMissingProfiles(admin: any, authUsers: any[]) {
  const { data: profiles, error } = await admin
    .from('findat_profiles')
    .select('id, username')
  if (error) throw error

  const existingIds = new Set((profiles ?? []).map((profile: any) => profile.id))
  const usernames = new Set((profiles ?? []).map((profile: any) => String(profile.username).toLowerCase()))

  for (const user of authUsers) {
    if (existingIds.has(user.id)) continue

    const requested = String(user?.user_metadata?.username ?? '').trim().toLowerCase()
    const emailPrefix = String(user?.email ?? '').split('@')[0].trim().toLowerCase()
    let username = validUsername(requested)
      ? requested
      : validUsername(emailPrefix)
        ? emailPrefix
        : `user_${String(user.id).replaceAll('-', '').slice(0, 12)}`
    if (usernames.has(username.toLowerCase())) {
      username = `${username.slice(0, 20)}_${String(user.id).replaceAll('-', '').slice(0, 8)}`
    }

    const { error: insertError } = await admin.from('findat_profiles').insert({
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
    })
    if (insertError) throw insertError
    usernames.add(username.toLowerCase())
  }
}

async function requireAdministrator(ctx: any) {
  const userId = userIdFromClaims(ctx.userClaims)
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('AUTH_REQUIRED')

  const { data: profile, error } = await ctx.supabaseAdmin
    .from('findat_profiles')
    .select('id, username, first_name, last_name, role, active')
    .eq('id', userId)
    .maybeSingle()

  if (error || !profile || profile.role !== 'admin' || profile.active === false) {
    throw new Error('ADMIN_REQUIRED')
  }
  return profile
}

async function audit(admin: any, administrator: any, action: string, detail: string) {
  const actorName = `${administrator.first_name ?? ''} ${administrator.last_name ?? ''}`.trim() || administrator.username || 'Administrator'
  const { error } = await admin.from('findat_audit_log').insert({
    actor_id: administrator.id,
    actor_name: actorName,
    actor_role: 'admin',
    action,
    detail,
  })
  if (error) console.error('FINDAT account audit failed', error)
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, ctx) => {
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

    try {
      const administrator = await requireAdministrator(ctx)
      const admin = ctx.supabaseAdmin
      const payload = await request.json()
      const action = text(payload?.action, 40).toLowerCase()

      if (action === 'list') {
        const authUsers = await listAllAuthUsers(admin)
        await repairMissingProfiles(admin, authUsers)

        const { data, error } = await admin
          .from('findat_profiles')
          .select('id, username, email, first_name, last_name, phone, organisation, country, role, active, created_at, updated_at')
          .order('role', { ascending: true })
          .order('first_name', { ascending: true })
        if (error) throw error

        const authById = new Map(authUsers.map((user: any) => [user.id, user]))
        return jsonResponse({
          users: (data ?? []).map((profile: any) => {
            const authUser: any = authById.get(profile.id)
            return {
              ...profile,
              email_confirmed_at: authUser?.email_confirmed_at ?? null,
              emailConfirmed: Boolean(authUser?.email_confirmed_at),
              last_sign_in_at: authUser?.last_sign_in_at ?? null,
            }
          }),
        })
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

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !validUsername(username) || password.length < 8) {
          return jsonResponse({ error: 'Enter a valid email, username and password of at least 8 characters.' }, 400)
        }
        if (!['admin', 'consultant', 'client'].includes(role)) {
          return jsonResponse({ error: 'Choose Administrator, Consultant or Client.' }, 400)
        }
        if (role === 'admin' && password.length < 12) {
          return jsonResponse({ error: 'Administrator passwords must contain at least 12 characters.' }, 400)
        }

        const { data: usernameMatch, error: usernameError } = await admin
          .from('findat_profiles')
          .select('id')
          .ilike('username', username)
          .maybeSingle()
        if (usernameError) throw usernameError
        if (usernameMatch) return jsonResponse({ error: 'That username is already in use.' }, 409)

        const { data: emailMatch, error: emailError } = await admin
          .from('findat_profiles')
          .select('id')
          .ilike('email', email)
          .maybeSingle()
        if (emailError) throw emailError
        if (emailMatch) return jsonResponse({ error: 'That email address is already registered.' }, 409)

        let createdUserId = ''
        try {
          const { data: created, error: createError } = await admin.auth.admin.createUser({
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
          createdUserId = created.user.id

          const { data: profile, error: profileError } = await admin
            .from('findat_profiles')
            .upsert({
              id: created.user.id,
              username,
              email,
              first_name: firstName,
              last_name: lastName,
              phone,
              organisation,
              country: '',
              role,
              active: true,
            }, { onConflict: 'id' })
            .select('id, username, email, first_name, last_name, phone, organisation, country, role, active, created_at, updated_at')
            .single()
          if (profileError) throw profileError

          await audit(admin, administrator, 'Account created', `${username} created as ${role}.`)
          return jsonResponse({ user: { ...profile, emailConfirmed: true } }, 201)
        } catch (error) {
          if (createdUserId) await admin.auth.admin.deleteUser(createdUserId)
          throw error
        }
      }

      if (action === 'set_role') {
        const userId = text(payload?.userId, 50)
        const role = text(payload?.role, 20).toLowerCase()
        if (!/^[0-9a-f-]{36}$/i.test(userId) || role !== 'admin') {
          return jsonResponse({ error: 'Only promotion to Administrator is supported by this control.' }, 400)
        }

        const { data: target, error: targetError } = await admin
          .from('findat_profiles')
          .select('id, username, role, active')
          .eq('id', userId)
          .maybeSingle()
        if (targetError || !target) return jsonResponse({ error: 'Account not found.' }, 404)
        if (target.role === 'admin') return jsonResponse({ success: true, role: 'admin' })

        const { data: authResult, error: authReadError } = await admin.auth.admin.getUserById(userId)
        if (authReadError || !authResult?.user) throw authReadError ?? new Error('The Auth account could not be loaded.')
        const currentMetadata = authResult.user.app_metadata ?? {}
        const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, {
          app_metadata: { ...currentMetadata, findat_role: 'admin' },
          email_confirm: true,
        })
        if (authUpdateError) throw authUpdateError

        const { error: profileUpdateError } = await admin
          .from('findat_profiles')
          .update({ role: 'admin', active: true })
          .eq('id', userId)
        if (profileUpdateError) throw profileUpdateError

        await audit(admin, administrator, 'Account promoted to Administrator', `${target.username} was promoted from ${target.role} to Administrator.`)
        return jsonResponse({ success: true, role: 'admin' })
      }

      if (action === 'confirm_email') {
        const userId = text(payload?.userId, 50)
        if (!/^[0-9a-f-]{36}$/i.test(userId)) return jsonResponse({ error: 'Invalid account.' }, 400)

        const { data: target, error: targetError } = await admin
          .from('findat_profiles')
          .select('id, username, role')
          .eq('id', userId)
          .maybeSingle()
        if (targetError || !target) return jsonResponse({ error: 'Account not found.' }, 404)
        if (target.role === 'admin') return jsonResponse({ error: 'Administrator accounts are protected from this control.' }, 403)

        const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true })
        if (error) throw error
        await admin.from('findat_profiles').update({ active: true }).eq('id', userId)
        await audit(admin, administrator, 'Account email confirmed', `${target.username} was confirmed by an Administrator.`)
        return jsonResponse({ success: true })
      }

      if (action === 'change_password') {
        const userId = text(payload?.userId, 50)
        const password = String(payload?.password ?? '')
        if (!/^[0-9a-f-]{36}$/i.test(userId) || password.length < 8 || password.length > 256) {
          return jsonResponse({ error: 'Enter a valid account and password of at least 8 characters.' }, 400)
        }
        const { data: target, error: targetError } = await admin
          .from('findat_profiles')
          .select('id, username, role')
          .eq('id', userId)
          .maybeSingle()
        if (targetError || !target) return jsonResponse({ error: 'Account not found.' }, 404)
        if (target.role === 'admin') {
          return jsonResponse({ error: 'Administrator credentials are protected. Use the secure recovery flow for the Administrator account.' }, 403)
        }

        const { error } = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true })
        if (error) throw error
        await admin.from('findat_profiles').update({ active: true }).eq('id', userId)
        await audit(admin, administrator, 'Account password replaced', `${target.username} password replaced by an Administrator.`)
        return jsonResponse({ success: true, emailConfirmed: true })
      }

      if (action === 'set_active') {
        const userId = text(payload?.userId, 50)
        const active = payload?.active === true
        if (!/^[0-9a-f-]{36}$/i.test(userId)) return jsonResponse({ error: 'Invalid account.' }, 400)

        const { data: target, error: targetError } = await admin
          .from('findat_profiles')
          .select('id, username, role')
          .eq('id', userId)
          .maybeSingle()
        if (targetError || !target) return jsonResponse({ error: 'Account not found.' }, 404)
        if (target.role === 'admin') return jsonResponse({ error: 'Administrator accounts are protected from this control.' }, 403)

        const { error } = await admin.from('findat_profiles').update({ active }).eq('id', userId)
        if (error) throw error
        await audit(admin, administrator, active ? 'Account activated' : 'Account suspended', `${target.username} ${active ? 'activated' : 'suspended'} by an Administrator.`)
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
  }),
}
