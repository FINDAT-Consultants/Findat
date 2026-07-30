import { withSupabase } from 'npm:@supabase/server@^1'

function text(value: unknown, max = 200): string {
  return String(value ?? '').trim().slice(0, max)
}

function validUsername(username: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/.test(username)
}

function randomText(length = 18): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('')
}

function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

function endOfCurrentMonth(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)).toISOString()
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

        const { data: cloudRows, error: cloudError } = await admin
          .from('findat_cloud_access')
          .select('user_id, active, expires_at, generated_at, last_used_at')
        if (cloudError && !String(cloudError.message ?? '').includes('findat_cloud_access')) throw cloudError
        const cloudById = new Map((cloudRows ?? []).map((row: any) => [row.user_id, row]))
        const authById = new Map(authUsers.map((user: any) => [user.id, user]))
        return jsonResponse({
          users: (data ?? []).map((profile: any) => {
            const authUser: any = authById.get(profile.id)
            const cloud: any = cloudById.get(profile.id)
            return {
              ...profile,
              email_confirmed_at: authUser?.email_confirmed_at ?? null,
              emailConfirmed: Boolean(authUser?.email_confirmed_at),
              last_sign_in_at: authUser?.last_sign_in_at ?? null,
              cloud_access_active: cloud?.active === true,
              cloud_access_expires_at: cloud?.expires_at ?? null,
              cloud_access_generated_at: cloud?.generated_at ?? null,
              cloud_access_last_used_at: cloud?.last_used_at ?? null,
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
        if (!['consultant', 'client'].includes(role)) {
          return jsonResponse({ error: 'Create a Consultant or Client account. Additional Administrators must first be Consultants and then be promoted from the account registry.' }, 400)
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


      if (action === 'promote_admin') {
        const userId = text(payload?.userId, 50)
        if (!/^[0-9a-f-]{36}$/i.test(userId)) return jsonResponse({ error: 'Invalid account.' }, 400)

        const { data: target, error: targetError } = await admin
          .from('findat_profiles')
          .select('id, username, role, active')
          .eq('id', userId)
          .maybeSingle()
        if (targetError || !target) return jsonResponse({ error: 'Account not found.' }, 404)
        if (target.role === 'admin') return jsonResponse({ success: true, message: 'The account is already an Administrator.' })
        if (target.role !== 'consultant') return jsonResponse({ error: 'Only a Consultant account can be promoted to Administrator.' }, 403)

        const authUsers = await listAllAuthUsers(admin)
        const authUser = authUsers.find((user: any) => user.id === userId)
        if (!authUser) return jsonResponse({ error: 'The Supabase Auth account was not found.' }, 404)

        const { error: authError } = await admin.auth.admin.updateUserById(userId, {
          app_metadata: { ...(authUser.app_metadata ?? {}), findat_role: 'admin' },
          email_confirm: true,
        })
        if (authError) throw authError

        const { error: profileError } = await admin
          .from('findat_profiles')
          .update({ role: 'admin', active: true })
          .eq('id', userId)
        if (profileError) throw profileError

        await audit(admin, administrator, 'Account promoted to Administrator', `${target.username} was promoted to Administrator.`)
        return jsonResponse({ success: true })
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


      if (action === 'generate_cloud_password') {
        const userId = text(payload?.userId, 50)
        if (!/^[0-9a-f-]{36}$/i.test(userId)) return jsonResponse({ error: 'Invalid account.' }, 400)
        const { data: target, error: targetError } = await admin
          .from('findat_profiles')
          .select('id, username, first_name, last_name, role, active')
          .eq('id', userId)
          .maybeSingle()
        if (targetError || !target) return jsonResponse({ error: 'Account not found.' }, 404)
        if (target.role === 'admin') return jsonResponse({ error: 'Administrators use their normal FINDAT password for Cloud access.' }, 403)
        if (target.active === false) return jsonResponse({ error: 'Activate this account before generating Cloud access.' }, 409)

        const password = randomText(18)
        const salt = randomSalt()
        const passwordHash = await sha256Hex(`${salt}:${password}`)
        const expiresAt = endOfCurrentMonth()

        const { error: accessError } = await admin.from('findat_cloud_access').upsert({
          user_id: userId,
          password_salt: salt,
          password_hash: passwordHash,
          active: true,
          expires_at: expiresAt,
          generated_by: administrator.id,
          generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        if (accessError) throw accessError

        const displayName = `${target.first_name ?? ''} ${target.last_name ?? ''}`.trim() || target.username
        const { error: notificationError } = await admin.from('findat_notifications').insert({
          recipient_id: userId,
          actor_id: administrator.id,
          kind: 'cloud_access',
          title: 'Your FINDAT Cloud password',
          message: `A monthly FINDAT Cloud password was generated for ${displayName}. Open this notification to copy it.`,
          action_state: 'accepted',
          payload: {
            cloud_password: password,
            username: target.username,
            expires_at: expiresAt,
          },
        })
        if (notificationError) throw notificationError
        await audit(admin, administrator, 'Cloud password generated', `${target.username} received Cloud access until ${expiresAt}.`)
        return jsonResponse({ success: true, password, username: target.username, expiresAt })
      }

      if (action === 'suspend_cloud_password') {
        const userId = text(payload?.userId, 50)
        if (!/^[0-9a-f-]{36}$/i.test(userId)) return jsonResponse({ error: 'Invalid account.' }, 400)
        const { data: target, error: targetError } = await admin
          .from('findat_profiles')
          .select('id, username, role')
          .eq('id', userId)
          .maybeSingle()
        if (targetError || !target) return jsonResponse({ error: 'Account not found.' }, 404)
        if (target.role === 'admin') return jsonResponse({ error: 'Administrator Cloud access follows the Administrator account.' }, 403)
        const { error } = await admin.from('findat_cloud_access').update({ active: false, updated_at: new Date().toISOString() }).eq('user_id', userId)
        if (error) throw error
        await admin.from('findat_notifications').insert({
          recipient_id: userId,
          actor_id: administrator.id,
          kind: 'cloud_access',
          title: 'FINDAT Cloud access suspended',
          message: 'Your monthly FINDAT Cloud password has been suspended. Contact an Administrator if access is required.',
          action_state: 'cancelled',
          payload: {},
        })
        await audit(admin, administrator, 'Cloud password suspended', `${target.username} Cloud access was suspended.`)
        return jsonResponse({ success: true })
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
