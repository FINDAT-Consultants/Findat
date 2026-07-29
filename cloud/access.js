/* Authenticated FINDAT Cloud access bridge from the parent FINDAT workspace. */
(() => {
  'use strict';
  let context = null;
  let readyResolve;
  const ready = new Promise(resolve => { readyResolve = resolve; });

  function workstations() {
    return Array.isArray(context?.workstations) ? context.workstations : [];
  }

  async function rpc(name, body) {
    if (!context?.supabaseUrl || !context?.publishableKey || !context?.accessToken) {
      throw new Error('Your FINDAT session is not available in Cloud. Close Cloud, sign in again and reopen it.');
    }
    const response = await fetch(`${context.supabaseUrl}/rest/v1/rpc/${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: context.publishableKey,
        Authorization: `Bearer ${context.accessToken}`,
      },
      body: JSON.stringify(body || {}),
    });
    let payload = null;
    try { payload = await response.json(); } catch { /* empty response */ }
    if (!response.ok) throw new Error(payload?.message || payload?.error || `Cloud access request failed (${response.status}).`);
    return payload;
  }

  window.FINDATCloudAccess = {
    ready,
    isManaged: () => Boolean(context?.user),
    user: () => context?.user || null,
    getWorkstations: () => workstations().map(item => ({ ...item })),
    async verifyPassword(workstationId, password) {
      if (!workstationId) return false;
      return Boolean(await rpc('findat_verify_workstation_password', {
        p_workstation_id: workstationId,
        p_password: String(password || ''),
      }));
    },
  };

  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent) return;
    if (event.data?.type !== 'findat-cloud:session') return;
    context = {
      supabaseUrl: String(event.data.supabaseUrl || ''),
      publishableKey: String(event.data.publishableKey || ''),
      accessToken: String(event.data.accessToken || ''),
      user: event.data.user || null,
      workstations: Array.isArray(event.data.workstations) ? event.data.workstations : [],
    };
    readyResolve?.(context);
    readyResolve = null;
    window.dispatchEvent(new CustomEvent('findat-cloud:access-ready', { detail: context }));
  });

  try { window.parent.postMessage({ type: 'findat-cloud:ready' }, location.origin); } catch { /* standalone Cloud */ }
})();
