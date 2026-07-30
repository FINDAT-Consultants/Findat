import { Webhook } from 'npm:standardwebhooks@^1'
import { Resend } from 'npm:resend@^6'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') ?? '')
const hookSecret = (Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '').replace('v1,whsec_', '')
const fromAddress = Deno.env.get('FINDAT_AUTH_FROM_EMAIL') ?? 'FINDAT Consultants <onboarding@resend.dev>'

type HookPayload = {
  user: {
    email: string
    new_email?: string
    user_metadata?: Record<string, unknown>
  }
  email_data: {
    token: string
    token_hash: string
    token_new?: string
    token_hash_new?: string
    redirect_to?: string
    email_action_type: string
    site_url?: string
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character)
}

function emailCopy(action: string): { subject: string; heading: string; message: string } {
  switch (action) {
    case 'signup':
      return { subject: 'Confirm your FINDAT account', heading: 'Confirm your FINDAT account', message: 'Enter this one-time code in FINDAT to finish creating your account.' }
    case 'recovery':
      return { subject: 'Your FINDAT password recovery code', heading: 'Reset your FINDAT password', message: 'Enter this one-time code in FINDAT, then choose a new password.' }
    case 'magiclink':
      return { subject: 'Your FINDAT sign-in code', heading: 'FINDAT login verification', message: 'Enter this one-time code in FINDAT to complete your secure login.' }
    case 'email_change':
      return { subject: 'Confirm your FINDAT email change', heading: 'Confirm your email change', message: 'Enter this one-time code in FINDAT to confirm the requested email change.' }
    case 'reauthentication':
      return { subject: 'Your FINDAT security code', heading: 'Confirm this security action', message: 'Enter this one-time code in FINDAT to continue.' }
    case 'invite':
      return { subject: 'Your FINDAT invitation code', heading: 'You have been invited to FINDAT', message: 'Enter this one-time code in FINDAT to accept the invitation.' }
    default:
      return { subject: 'Your FINDAT verification code', heading: 'FINDAT verification', message: 'Enter this one-time code in FINDAT to continue.' }
  }
}

function buildHtml(code: string, action: string, displayName = ''): string {
  const copy = emailCopy(action)
  const greeting = displayName ? `<p style="margin:0 0 16px;color:#34445a">Hello ${escapeHtml(displayName)},</p>` : ''
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f6f9;font-family:Arial,sans-serif;color:#26374e"><div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e0e5ec;border-radius:18px;overflow:hidden"><div style="padding:24px 28px;background:linear-gradient(125deg,#1d2b42,#33435b 62%,#9c4a1f 150%);color:#ffffff"><div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.8">FINDAT Consultants</div><h1 style="margin:10px 0 0;font-size:24px">${escapeHtml(copy.heading)}</h1></div><div style="padding:28px">${greeting}<p style="margin:0 0 20px;line-height:1.6;color:#59677b">${escapeHtml(copy.message)}</p><div style="margin:24px 0;padding:18px;border-radius:12px;background:#fff5ea;border:1px solid #f4c38f;text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:#b95412">${escapeHtml(code)}</div><p style="margin:0 0 10px;line-height:1.6;color:#59677b">This code can be used once. Do not share it with anyone.</p><p style="margin:0;color:#8a95a6;font-size:12px;line-height:1.5">If you did not request this message, you may safely ignore it.</p></div></div></body></html>`
}

async function sendCode(to: string, token: string, action: string, displayName = ''): Promise<void> {
  const copy = emailCopy(action)
  const { error } = await resend.emails.send({
    from: fromAddress,
    to: [to],
    subject: copy.subject,
    html: buildHtml(token, action, displayName),
    text: `${copy.heading}\n\n${copy.message}\n\nCode: ${token}\n\nThis code can be used once. Do not share it.`,
  })
  if (error) throw error
}

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!hookSecret) return Response.json({ error: { message: 'SEND_EMAIL_HOOK_SECRET is not configured.' } }, { status: 500 })
  if (!Deno.env.get('RESEND_API_KEY')) return Response.json({ error: { message: 'RESEND_API_KEY is not configured.' } }, { status: 500 })

  const rawBody = await request.text()
  try {
    const webhook = new Webhook(hookSecret)
    const payload = webhook.verify(rawBody, Object.fromEntries(request.headers)) as HookPayload
    const { user, email_data: emailData } = payload
    const action = String(emailData.email_action_type || 'verification')
    const metadata = user.user_metadata ?? {}
    const displayName = String(metadata.full_name ?? metadata.name ?? metadata.first_name ?? '').trim()

    if (action === 'email_change' && emailData.token_new && user.new_email) {
      await sendCode(user.email, emailData.token, action, displayName)
      await sendCode(user.new_email, emailData.token_new, action, displayName)
    } else {
      await sendCode(user.email, emailData.token, action, displayName)
    }

    return Response.json({}, { status: 200 })
  } catch (error) {
    console.error('findat-send-auth-email', error)
    return Response.json({ error: { message: error instanceof Error ? error.message : 'Email hook failed.' } }, { status: 401 })
  }
})
