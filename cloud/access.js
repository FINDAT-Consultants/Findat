(() => {
  'use strict';
  const gate = document.getElementById('cloudAccessGate');
  const form = document.getElementById('cloudAccessForm');
  const username = document.getElementById('cloudAccessUsername');
  const password = document.getElementById('cloudAccessPassword');
  const submit = document.getElementById('cloudAccessSubmit');
  const status = document.getElementById('cloudAccessStatus');
  const welcome = document.getElementById('cloudAccessWelcome');
  const help = document.getElementById('cloudAccessHelp');
  const config = window.FINDAT_CLOUD_CONFIG || {};
  let account = null;
  let accessToken = '';
  let unlocked = false;

  function setStatus(message = '', state = '') {
    if (!status) return;
    status.textContent = message;
    status.className = `cloud-access-status${state ? ` is-${state}` : ''}`;
  }
  function accountName(value) {
    return value?.displayName || `${value?.firstName || ''} ${value?.lastName || ''}`.trim() || value?.username || 'FINDAT member';
  }
  function updateAccount() {
    if (username) username.value = account?.username || '';
    if (welcome) welcome.textContent = account ? `Welcome, ${accountName(account)}. Enter your password to unlock the Cloud desktop.` : 'Sign in to the FINDAT website before opening Cloud.';
    if (help) help.textContent = account?.role === 'admin'
      ? 'Use your normal FINDAT Administrator password.'
      : 'Use the monthly Cloud password sent to your FINDAT notification bell. It expires at the end of the month.';
    if (password) { password.value = ''; password.disabled = !account || !accessToken; }
    if (submit) submit.disabled = !account || !accessToken;
  }
  function lockCloud(message = '') {
    unlocked = false;
    gate?.classList.remove('is-unlocked');
    gate?.removeAttribute('aria-hidden');
    document.documentElement.classList.add('cloud-is-locked');
    if (password) password.value = '';
    setStatus(message, message ? 'info' : '');
    setTimeout(() => password?.focus(), 50);
  }
  function unlockCloud(response) {
    unlocked = true;
    window.FINDAT_CLOUD_ACCESS_TOKEN = accessToken;
    gate?.classList.add('is-unlocked');
    gate?.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('cloud-is-locked');
    setStatus('Cloud unlocked.', 'success');
    window.dispatchEvent(new CustomEvent('findat-cloud:unlocked', { detail: response || {} }));
  }
  window.FINDAT_LOCK_CLOUD = () => lockCloud('Cloud locked. Enter your password to continue.');

  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.data?.type !== 'findat-cloud:session') return;
    account = event.data.account || null;
    accessToken = String(event.data.accessToken || '');
    window.FINDAT_CLOUD_ACCESS_TOKEN = accessToken;
    updateAccount();
    if (!unlocked) setStatus(account ? '' : 'Open Cloud from a signed-in FINDAT account.', account ? '' : 'error');
  });

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!account || !accessToken) { setStatus('Sign in to the FINDAT website first.', 'error'); return; }
    const secret = String(password?.value || '');
    if (!secret) { setStatus('Enter your password.', 'error'); return; }
    submit.disabled = true;
    setStatus('Verifying Cloud access…', 'info');
    try {
      const response = await fetch(`${String(config.supabaseUrl || '').replace(/\/$/, '')}/functions/v1/findat-cloud-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: String(config.publishableKey || config.anonKey || ''),
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ identifier: account.username || account.email || '', password: secret })
      });
      let body = {};
      try { body = await response.json(); } catch { body = {}; }
      if (!response.ok || body.success !== true) throw new Error(body.error || 'Cloud access could not be verified.');
      if (password) password.value = '';
      unlockCloud(body);
    } catch (error) {
      if (password) { password.value = ''; password.focus(); }
      setStatus(error.message || 'Cloud access could not be verified.', 'error');
    } finally {
      submit.disabled = false;
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && unlocked) lockCloud('Cloud locked.');
  });
  updateAccount();
  lockCloud('Waiting for your signed-in FINDAT account…');
  if (window.parent !== window) window.parent.postMessage({ type: 'findat-cloud:ready' }, location.origin);
})();
