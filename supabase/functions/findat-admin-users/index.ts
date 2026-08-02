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
      avatar_url: String(user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? ''),
      role: roleFromUser(user),
      active: ['admin', 'consultant', 'client'].includes(String(user?.app_metadata?.findat_role ?? '').toLowerCase()),
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


type DeliveryStatus = 'sent' | 'skipped' | 'failed'
type ChannelDelivery = { status: DeliveryStatus; detail: string }
type ActivationDelivery = {
  email: ChannelDelivery
  whatsapp: ChannelDelivery
  passwordSetupLinkCreated: boolean
}

function env(name: string): string {
  return String(Deno.env.get(name) ?? '').trim()
}

function htmlEscape(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function displayName(profile: any): string {
  return `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || profile?.username || 'FINDAT user'
}

function normaliseWhatsAppNumber(rawPhone: unknown): string {
  let digits = String(rawPhone ?? '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  const countryCode = env('WHATSAPP_DEFAULT_COUNTRY_CODE').replace(/\D/g, '') || '260'
  if (digits.startsWith('0') && countryCode) digits = `${countryCode}${digits.slice(1)}`
  return digits
}

async function passwordSetupLink(admin: any, email: string): Promise<string> {
  const params: any = { type: 'recovery', email }
  const redirectTo = env('FINDAT_PASSWORD_SETUP_REDIRECT_URL') || env('FINDAT_SITE_URL')
  if (redirectTo) params.options = { redirectTo }
  const { data, error } = await admin.auth.admin.generateLink(params)
  if (error) throw error
  return String(data?.properties?.action_link ?? data?.properties?.actionLink ?? '')
}

async function sendActivationEmail(profile: any, setupLink: string): Promise<ChannelDelivery> {
  const apiKey = env('RESEND_API_KEY')
  const from = env('FINDAT_ACTIVATION_EMAIL_FROM')
  const email = text(profile?.email, 254).toLowerCase()
  if (!email) return { status: 'skipped', detail: 'No registered email address.' }
  if (!apiKey || !from) {
    return { status: 'skipped', detail: 'RESEND_API_KEY or FINDAT_ACTIVATION_EMAIL_FROM is not configured.' }
  }

  const name = displayName(profile)
  const username = text(profile?.username, 30)
  const siteUrl = env('FINDAT_SITE_URL')
  const linkLine = setupLink
    ? `Set or reset your password securely: ${setupLink}`
    : siteUrl
      ? `Open FINDAT: ${siteUrl}`
      : 'Open FINDAT and use Forgot Username or Password if you need to reset your password.'
  const plainText = [
    `Hello ${name},`,
    '',
    'Your FINDAT account has been activated by an Administrator.',
    `Username: ${username}`,
    'Password: use the password you created during registration. FINDAT does not send or store readable passwords.',
    linkLine,
    '',
    'You can now sign in to FINDAT.',
  ].join('\n')
  const secureLink = setupLink
    ? `<p><a href="${htmlEscape(setupLink)}" style="display:inline-block;padding:11px 16px;border-radius:8px;background:#172554;color:#fff;text-decoration:none;font-weight:700">Set or reset password securely</a></p>`
    : ''
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#172033;line-height:1.55"><div style="max-width:620px;margin:auto;padding:24px"><h2>Your FINDAT account is active</h2><p>Hello ${htmlEscape(name)},</p><p>An Administrator has reviewed and activated your FINDAT account.</p><p><strong>Username:</strong> ${htmlEscape(username)}</p><p><strong>Password:</strong> use the password you created during registration. For security, FINDAT never sends readable passwords by email or WhatsApp.</p>${secureLink}<p>You can now sign in to FINDAT.</p></div></body></html>`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Your FINDAT account has been activated',
        text: plainText,
        html,
      }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(String(result?.message ?? result?.error ?? `Email provider returned ${response.status}.`))
    }
    return { status: 'sent', detail: 'Activation email sent.' }
  } catch (error) {
    return { status: 'failed', detail: error instanceof Error ? error.message : 'Activation email failed.' }
  }
}

async function sendActivationWhatsApp(profile: any, setupLink: string): Promise<ChannelDelivery> {
  const accessToken = env('WHATSAPP_ACCESS_TOKEN')
  const phoneNumberId = env('WHATSAPP_PHONE_NUMBER_ID')
  const templateName = env('WHATSAPP_ACTIVATION_TEMPLATE_NAME') || 'findat_account_activated'
  const templateLanguage = env('WHATSAPP_TEMPLATE_LANGUAGE') || 'en_US'
  const graphVersion = env('WHATSAPP_GRAPH_API_VERSION') || 'v21.0'
  const phone = normaliseWhatsAppNumber(profile?.phone)
  if (!phone) return { status: 'skipped', detail: 'No valid WhatsApp telephone number.' }
  if (!accessToken || !phoneNumberId) {
    return { status: 'skipped', detail: 'WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured.' }
  }

  const name = displayName(profile)
  const username = text(profile?.username, 30)
  const link = setupLink || env('FINDAT_SITE_URL') || 'Use FINDAT password recovery'
  try {
    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLanguage },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: name },
              { type: 'text', text: username },
              { type: 'text', text: link },
            ],
          }],
        },
      }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(String(result?.error?.message ?? result?.message ?? `WhatsApp provider returned ${response.status}.`))
    }
    return { status: 'sent', detail: 'Activation WhatsApp message sent.' }
  } catch (error) {
    return { status: 'failed', detail: error instanceof Error ? error.message : 'Activation WhatsApp message failed.' }
  }
}

async function sendActivationMessages(admin: any, profile: any): Promise<ActivationDelivery> {
  let setupLink = ''
  try {
    setupLink = await passwordSetupLink(admin, text(profile?.email, 254).toLowerCase())
  } catch (error) {
    console.error('FINDAT password setup link generation failed', error)
  }

  const [email, whatsapp] = await Promise.all([
    sendActivationEmail(profile, setupLink),
    sendActivationWhatsApp(profile, setupLink),
  ])
  return { email, whatsapp, passwordSetupLinkCreated: Boolean(setupLink) }
}

async function completeApprovalNotifications(admin: any, profile: any, administrator: any) {
  const reviewer = displayName(administrator)
  const applicant = displayName(profile)
  const { error } = await admin
    .from('findat_notifications')
    .update({
      action_state: 'accepted',
      message: `Account approved: ${applicant} (@${profile.username}) was activated by ${reviewer}.`,
      is_read: true,
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('title', `account_approval:${profile.id}`)
    .eq('action_state', 'pending')
  if (error) console.error('FINDAT approval notification completion failed', error)
}

function deliverySummary(delivery: ActivationDelivery): string {
  return `Email ${delivery.email.status}; WhatsApp ${delivery.whatsapp.status}.`
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
          .select('id, username, email, first_name, last_name, phone, organisation, country, region, role, active, avatar_url, cover_url, bio, industry, qualifications, job_title, place_of_work, created_at, updated_at')
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
        if (!['consultant', 'client'].includes(role)) {
          return jsonResponse({ error: 'Administrators can create only Consultant or Client accounts. Promote a Consultant separately when required.' }, 400)
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
            .select('id, username, email, first_name, last_name, phone, organisation, country, region, role, active, avatar_url, cover_url, bio, industry, qualifications, job_title, place_of_work, created_at, updated_at')
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
          .select('id, username, email, first_name, last_name, phone, role, active')
          .eq('id', userId)
          .maybeSingle()
        if (targetError || !target) return jsonResponse({ error: 'Account not found.' }, 404)
        if (target.role === 'admin') return jsonResponse({ error: 'Administrator accounts are protected from this control.' }, 403)

        const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true })
        if (error) throw error
        const { error: profileError } = await admin.from('findat_profiles').update({ active: true }).eq('id', userId)
        if (profileError) throw profileError

        const delivery = target.active === false
          ? await sendActivationMessages(admin, target)
          : {
              email: { status: 'skipped', detail: 'Account was already active.' } as ChannelDelivery,
              whatsapp: { status: 'skipped', detail: 'Account was already active.' } as ChannelDelivery,
              passwordSetupLinkCreated: false,
            }
        await completeApprovalNotifications(admin, target, administrator)
        await audit(admin, administrator, 'Account email confirmed', `${target.username} was confirmed and activated by an Administrator. ${deliverySummary(delivery)}`)
        return jsonResponse({ success: true, delivery })
      }

      if (action === 'change_password') {
        const userId = text(payload?.userId, 50)
        const password = String(payload?.password ?? '')
        if (!/^[0-9a-f-]{36}$/i.test(userId) || password.length < 8 || password.length > 256) {
          return jsonResponse({ error: 'Enter a valid account and password of at least 8 characters.' }, 400)
        }
        const { data: target, error: targetError } = await admin
          .from('findat_profiles')
          .select('id, username, email, first_name, last_name, phone, role, active')
          .eq('id', userId)
          .maybeSingle()
        if (targetError || !target) return jsonResponse({ error: 'Account not found.' }, 404)
        if (target.role === 'admin') {
          return jsonResponse({ error: 'Administrator credentials are protected. Use the secure recovery flow for the Administrator account.' }, 403)
        }

        const { error } = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true })
        if (error) throw error
        const { error: profileError } = await admin.from('findat_profiles').update({ active: true }).eq('id', userId)
        if (profileError) throw profileError

        const delivery = target.active === false
          ? await sendActivationMessages(admin, target)
          : {
              email: { status: 'skipped', detail: 'Password changed for an already active account.' } as ChannelDelivery,
              whatsapp: { status: 'skipped', detail: 'Password changed for an already active account.' } as ChannelDelivery,
              passwordSetupLinkCreated: false,
            }
        await completeApprovalNotifications(admin, target, administrator)
        await audit(admin, administrator, 'Account password replaced', `${target.username} password replaced by an Administrator. ${deliverySummary(delivery)}`)
        return jsonResponse({ success: true, emailConfirmed: true, delivery })
      }

      if (action === 'set_active') {
        const userId = text(payload?.userId, 50)
        const active = payload?.active === true
        if (!/^[0-9a-f-]{36}$/i.test(userId)) return jsonResponse({ error: 'Invalid account.' }, 400)

        const { data: target, error: targetError } = await admin
          .from('findat_profiles')
          .select('id, username, email, first_name, last_name, phone, role, active')
          .eq('id', userId)
          .maybeSingle()
        if (targetError || !target) return jsonResponse({ error: 'Account not found.' }, 404)
        if (target.role === 'admin') return jsonResponse({ error: 'Administrator accounts are protected from this control.' }, 403)

        if (active) {
          const { error: authError } = await admin.auth.admin.updateUserById(userId, { email_confirm: true })
          if (authError) throw authError
        }
        const { error } = await admin.from('findat_profiles').update({ active }).eq('id', userId)
        if (error) throw error

        let delivery: ActivationDelivery | null = null
        if (active && target.active === false) {
          delivery = await sendActivationMessages(admin, target)
          await completeApprovalNotifications(admin, target, administrator)
        }
        await audit(
          admin,
          administrator,
          active ? 'Account activated' : 'Account suspended',
          `${target.username} ${active ? 'activated and email-confirmed' : 'suspended'} by an Administrator.${delivery ? ` ${deliverySummary(delivery)}` : ''}`,
        )
        return jsonResponse({ success: true, delivery })
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
