/* FINDAT Cloud browser profile, lock, sign-in and sign-out support. */
const AURELIA_ACCOUNT_KEY = 'aurelia.account.v1';
const AURELIA_SESSION_KEY = 'aurelia.account.session.v1';
const AURELIA_SIGNED_OUT_KEY = 'aurelia.account.signed-out.v1';
const FIXED_ACCOUNT_USERNAME = 'ADMIN';
const DEFAULT_PROFILE_PICTURE = 'assets/admin-profile.jpg';
const DEFAULT_PROFILE_VERSION = 1;

function accountDefaults() {
  return {
    username: FIXED_ACCOUNT_USERNAME,
    profilePicture: DEFAULT_PROFILE_PICTURE,
    defaultProfileVersion: DEFAULT_PROFILE_VERSION,
    passwordHash: '',
    passwordSalt: '',
    updatedAt: Date.now()
  };
}

function enforceFixedAccountUsername(account) {
  Object.defineProperty(account, 'username', {
    enumerable: true,
    configurable: false,
    get: () => FIXED_ACCOUNT_USERNAME,
    set: () => {}
  });
  return account;
}

function loadAureliaAccount() {
  try {
    const stored = JSON.parse(localStorage.getItem(AURELIA_ACCOUNT_KEY) || '{}') || {};
    const account = { ...accountDefaults(), ...stored };
    account.username = FIXED_ACCOUNT_USERNAME;
    if (stored.defaultProfileVersion !== DEFAULT_PROFILE_VERSION && !stored.profilePicture) {
      account.profilePicture = DEFAULT_PROFILE_PICTURE;
    }
    account.defaultProfileVersion = DEFAULT_PROFILE_VERSION;
    return enforceFixedAccountUsername(account);
  } catch (_) {
    return enforceFixedAccountUsername(accountDefaults());
  }
}

let aureliaAccount = loadAureliaAccount();
try { localStorage.setItem(AURELIA_ACCOUNT_KEY, JSON.stringify(aureliaAccount)); }
catch (_) { /* local storage is optional */ }

function saveAureliaAccount() {
  aureliaAccount.defaultProfileVersion = DEFAULT_PROFILE_VERSION;
  aureliaAccount.updatedAt = Date.now();
  localStorage.setItem(AURELIA_ACCOUNT_KEY, JSON.stringify(aureliaAccount));
  refreshAureliaAccountUI();
}

function accountEscape(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function accountInitials(name = aureliaAccount.username) {
  const parts = String(name || FIXED_ACCOUNT_USERNAME).trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'AD';
}

function profileAvatarMarkup(className = '') {
  const image = aureliaAccount.profilePicture;
  return `<span class="account-avatar ${className}">${image ? `<img src="${image}" alt="${accountEscape(FIXED_ACCOUNT_USERNAME)} profile picture">` : `<span>${accountEscape(accountInitials())}</span>`}</span>`;
}

function randomAccountSalt() {
  const bytes = new Uint8Array(18);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
}

function fallbackPasswordHash(input) {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let round = 0; round < 18000; round += 1) {
    for (let index = 0; index < input.length; index += 1) {
      const code = input.charCodeAt(index) + round;
      first ^= code;
      first = Math.imul(first, 0x01000193);
      second ^= first + code;
      second = Math.imul(second, 0x85ebca6b);
    }
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
}

async function hashAccountPassword(password, salt) {
  const source = `${salt}\u0000${password}`;
  try {
    if (globalThis.crypto?.subtle && globalThis.TextEncoder) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
      return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
    }
  } catch (_) { /* use deterministic fallback */ }
  return fallbackPasswordHash(source);
}

async function verifyAccountPassword(password) {
  if (!aureliaAccount.passwordHash) return true;
  const candidate = await hashAccountPassword(password, aureliaAccount.passwordSalt);
  return candidate === aureliaAccount.passwordHash;
}

function accountHasPassword() {
  return Boolean(aureliaAccount.passwordHash && aureliaAccount.passwordSalt);
}

function setAccountSession(signedIn) {
  try {
    if (signedIn) sessionStorage.setItem(AURELIA_SESSION_KEY, '1');
    else sessionStorage.removeItem(AURELIA_SESSION_KEY);
  } catch (_) { /* session storage is optional */ }
  try { localStorage.setItem(AURELIA_SIGNED_OUT_KEY, signedIn ? '0' : '1'); } catch (_) { /* optional */ }
}

function sessionIsSignedIn() {
  try { return sessionStorage.getItem(AURELIA_SESSION_KEY) === '1'; }
  catch (_) { return false; }
}

function accountWasSignedOut() {
  try { return localStorage.getItem(AURELIA_SIGNED_OUT_KEY) === '1'; }
  catch (_) { return false; }
}

function renderSystemAccountMenu() {
  const panel = qs('#systemPanel');
  if (!panel) return;
  panel.querySelector('.system-account-card')?.remove();
  panel.querySelector('[data-action="signout"]')?.remove();
  panel.querySelector('.account-menu-divider')?.remove();

  const heading = qs('h3', panel);
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'system-account-card';
  card.dataset.action = 'profile';
  card.innerHTML = `${profileAvatarMarkup('account-avatar-menu')}<span><b>${accountEscape(aureliaAccount.username)}</b><small>Account Settings</small></span><i>›</i>`;
  heading?.insertAdjacentElement('afterend', card);

  const divider = document.createElement('hr');
  divider.className = 'account-menu-divider';
  card.insertAdjacentElement('afterend', divider);

  const restart = panel.querySelector('[data-action="restart"]');
  const signOut = document.createElement('button');
  signOut.type = 'button';
  signOut.dataset.action = 'signout';
  signOut.textContent = `Sign Out ${aureliaAccount.username}…`;
  restart?.insertAdjacentElement('beforebegin', signOut);
}

function setupAuthScreen() {
  const screen = qs('#lockScreen');
  if (!screen) return;
  screen.innerHTML = `
    <header class="auth-status-bar" aria-label="System status">
      <span class="auth-status-brand"><span class="auth-status-cloud" aria-hidden="true"></span>FINDAT Cloud</span>
      <span class="auth-status-clock"><span id="lockDate"></span><span id="lockTime"></span></span>
    </header>

    <main class="auth-login-stage">
      <section class="auth-large-clock" aria-label="Current date and time">
        <time data-auth-large-time></time>
        <span data-auth-large-date></span>
      </section>
      <section class="account-auth-card" aria-live="polite">
        <div data-auth-avatar></div>
        <h2 data-auth-username></h2>
        <form data-auth-form>
          <label class="auth-password-field">
            <input data-auth-password type="password" autocomplete="current-password" placeholder="Enter Password" aria-label="Password">
          </label>
          <p class="auth-access-line">
            <span data-auth-description></span>
            <button class="auth-arrow-button" id="unlockBtn" type="submit" aria-label="Continue">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h13M13 6l6 6-6 6"></path></svg>
            </button>
          </p>
        </form>
        <p class="account-auth-message" data-auth-message></p>
        <button class="auth-secondary-button" type="button" data-auth-signout>Sign out</button>
      </section>
    </main>

    <footer class="auth-power-actions" aria-label="Power controls">
      <button class="auth-power-button auth-power-shutdown" type="button" data-auth-power="shutdown" aria-label="Shut Down">
        <span class="auth-power-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false"><path d="M12 2.75v8.5"></path><path d="M6.35 6.35a8 8 0 1 0 11.3 0"></path></svg>
        </span>
        <small>Shut Down</small>
      </button>
      <button class="auth-power-button auth-power-restart" type="button" data-auth-power="restart" aria-label="Restart">
        <span class="auth-power-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="8.25"></circle><path class="auth-play-fill" d="m10 8.5 6 3.5-6 3.5Z"></path></svg>
        </span>
        <small>Restart</small>
      </button>
      <button class="auth-power-button auth-power-sleep" type="button" data-auth-power="sleep" aria-label="Sleep">
        <span class="auth-power-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false"><path d="M18.4 15.9A8 8 0 0 1 8.1 5.6 8.15 8.15 0 1 0 18.4 15.9Z"></path></svg>
        </span>
        <small>Sleep</small>
      </button>
    </footer>

    <div class="auth-sleep-screen" aria-hidden="true">
      <span class="auth-sleep-cloud" aria-hidden="true"></span>
      <p>Sleeping… press any key or click to wake FINDAT Cloud</p>
    </div>`;

  const form = qs('[data-auth-form]', screen);
  const password = qs('[data-auth-password]', screen);
  const submitArrow = qs('.auth-arrow-button', screen);

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const message = qs('[data-auth-message]', screen);
    const requiresPassword = accountHasPassword();
    submitArrow.disabled = true;
    submitArrow.classList.add('working');
    if (message) message.textContent = '';
    const accepted = await verifyAccountPassword(requiresPassword ? password.value : '');
    submitArrow.disabled = false;
    submitArrow.classList.remove('working');
    if (!accepted) {
      if (message) message.textContent = 'The password is incorrect.';
      password.select();
      screen.classList.remove('auth-shake');
      void screen.offsetWidth;
      screen.classList.add('auth-shake');
      return;
    }
    setAccountSession(true);
    password.value = '';
    screen.classList.add('auth-leaving');
    setTimeout(() => {
      screen.classList.add('hidden');
      screen.classList.remove('auth-leaving', 'auth-shake');
      desktop.classList.remove('session-locked');
      document.body.classList.remove('auth-gate-visible');
    }, 420);
  });

  qs('[data-auth-signout]', screen)?.addEventListener('click', () => signOutAureliaAccount());

  qsa('[data-auth-power]', screen).forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.authPower;
    if (action === 'restart') {
      setAccountSession(false);
      location.reload();
      return;
    }
    if (action === 'shutdown') {
      setAccountSession(false);
      window.closeFindatCloud?.();
      return;
    }
    if (action === 'sleep') sleepAureliaSystem();
  }));

}

function sleepAureliaSystem() {
  const screen = qs('#lockScreen');
  if (!screen || screen.classList.contains('auth-sleeping')) return;
  screen.classList.add('auth-sleeping');
  document.body.classList.add('findat-cloud-sleeping');
  const wake = event => {
    if (event?.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
    screen.classList.remove('auth-sleeping');
    document.body.classList.remove('findat-cloud-sleeping');
    screen.removeEventListener('pointerdown', wake, true);
    document.removeEventListener('keydown', wake, true);
    updateClock();
    setTimeout(() => {
      const focusTarget = accountHasPassword() ? qs('[data-auth-password]', screen) : qs('.auth-arrow-button', screen);
      focusTarget?.focus({ preventScroll: true });
    }, 120);
  };
  setTimeout(() => {
    screen.addEventListener('pointerdown', wake, true);
    document.addEventListener('keydown', wake, true);
  }, 280);
}

function updateAuthScreen(mode = 'lock') {
  const screen = qs('#lockScreen');
  if (!screen) return;
  screen.dataset.mode = mode;
  const avatar = qs('[data-auth-avatar]', screen);
  const username = qs('[data-auth-username]', screen);
  const description = qs('[data-auth-description]', screen);
  const passwordField = qs('.auth-password-field', screen);
  const password = qs('[data-auth-password]', screen);
  const primary = qs('.auth-arrow-button', screen);
  const signOut = qs('[data-auth-signout]', screen);
  const hasPassword = accountHasPassword();

  if (avatar) avatar.innerHTML = profileAvatarMarkup('account-avatar-lock');
  if (username) username.textContent = aureliaAccount.username;
  if (description) {
    description.textContent = hasPassword
      ? 'Enter your password to access FINDAT Cloud'
      : 'Click the arrow to access FINDAT Cloud';
  }
  screen.classList.toggle('auth-no-password', !hasPassword);
  if (passwordField) passwordField.classList.toggle('hidden', !hasPassword);
  if (primary) primary.setAttribute('aria-label', hasPassword ? (mode === 'signin' ? 'Sign In' : 'Unlock') : 'Enter FINDAT Cloud');
  if (signOut) signOut.classList.toggle('hidden', mode === 'signin' || mode === 'signedout');
  if (password) {
    password.value = '';
    password.type = 'password';
  }
  const message = qs('[data-auth-message]', screen);
  if (message) message.textContent = '';
  updateClock();
}

function showAccountGate(mode = 'lock') {
  const screen = qs('#lockScreen');
  if (!screen) return;
  updateAuthScreen(mode);
  screen.classList.remove('hidden', 'auth-leaving', 'auth-sleeping');
  desktop.classList.add('session-locked');
  document.body.classList.add('auth-gate-visible');
  setTimeout(() => {
    const focusTarget = accountHasPassword() ? qs('[data-auth-password]', screen) : qs('.auth-arrow-button', screen);
    focusTarget?.focus({ preventScroll: true });
  }, 120);
}

function lockAureliaAccount() {
  qs('#systemPanel')?.classList.add('hidden');
  showAccountGate('lock');
}

function signOutAureliaAccount() {
  setAccountSession(false);
  qsa('.app-window').forEach(windowNode => windowNode.remove());
  const activeName = qs('#activeAppName');
  if (activeName) activeName.textContent = '';
  qsa('.popover, .control-center, .context-menu').forEach(panel => panel.classList.add('hidden'));
  showAccountGate('signedout');
}

function openProfileSettings() {
  try { localStorage.setItem(SETTINGS_SECTION_KEY, 'profile'); } catch (_) { /* optional */ }
  openApp('settings');
  requestAnimationFrame(() => {
    const windowNode = qs('.app-window[data-app="settings"]');
    if (windowNode) renderSettingsSection(windowNode, 'profile');
  });
}

function refreshAureliaAccountUI() {
  renderSystemAccountMenu();
  const settingsWindow = qs('.app-window[data-app="settings"]');
  if (settingsWindow && qs('[data-settings-panel="profile"]', settingsWindow)) renderSettingsSection(settingsWindow, 'profile');
  const screen = qs('#lockScreen');
  if (screen && !screen.classList.contains('hidden')) updateAuthScreen(screen.dataset.mode || 'lock');
}

function profileSettingsMarkup() {
  return `<div class="settings-section" data-settings-panel="profile">
    <div class="settings-heading"><div><h2>Profile Account</h2><p>Manage the FINDAT Cloud profile picture, password and session.</p></div><span class="settings-heading-icon">●</span></div>
    <section class="settings-card profile-overview-card">
      ${profileAvatarMarkup('account-avatar-settings')}
      <div class="profile-overview-copy"><b>${accountEscape(aureliaAccount.username)}</b><small>${accountHasPassword() ? 'Password protected account' : 'Account has no password'}</small></div>
      <div class="profile-photo-actions"><button type="button" data-account-photo>Change Picture</button><button type="button" data-account-photo-remove ${aureliaAccount.profilePicture ? '' : 'disabled'}>Remove</button></div>
    </section>
    <section class="settings-card">
      <b>Account name</b><p>This system account name is fixed and cannot be changed.</p>
      <div class="account-settings-form">
        <label><span>Account name</span><input type="text" value="${accountEscape(FIXED_ACCOUNT_USERNAME)}" readonly aria-readonly="true" tabindex="-1"></label>
      </div>
    </section>
    <section class="settings-card">
      <b>${accountHasPassword() ? 'Change password' : 'Create password'}</b><p>${accountHasPassword() ? 'Enter the current password before choosing a new one.' : 'Add a password to protect sign-in and unlocking.'}</p>
      <form class="account-settings-form" data-account-password-form>
        ${accountHasPassword() ? '<label><span>Current password</span><input name="currentPassword" type="password" autocomplete="current-password" required></label>' : ''}
        <label><span>New password</span><input name="newPassword" type="password" minlength="4" maxlength="128" autocomplete="new-password" required></label>
        <label><span>Confirm password</span><input name="confirmPassword" type="password" minlength="4" maxlength="128" autocomplete="new-password" required></label>
        <div class="account-form-actions"><button type="submit">${accountHasPassword() ? 'Change Password' : 'Create Password'}</button>${accountHasPassword() ? '<button type="button" class="settings-secondary-button" data-account-remove-password>Remove Password</button>' : ''}</div>
      </form>
    </section>
    <section class="settings-card account-session-card">
      <div><b>Session</b><small>Lock the desktop without closing it, or sign out of the account.</small></div>
      <div class="settings-button-row"><button type="button" data-account-lock>Lock</button><button type="button" data-account-signout>Sign Out</button></div>
    </section>
    <p class="account-storage-note">This browser-only profile is stored on this device. Passwords are stored as a salted hash, not as readable text.</p>
  </div>`;
}

const settingsMarkupBeforeAccount = fullSettingsMarkup;
fullSettingsMarkup = function() {
  const active = localStorage.getItem(SETTINGS_SECTION_KEY) || 'appearance';
  return `<div class="settings-app full-settings-app">
    <aside class="sidebar settings-navigation"><div class="settings-nav-title"><span class="aurelia-symbol"></span><div><h3>Settings</h3><small>FINDAT Cloud</small></div></div>
      <button data-settings-section="profile" class="${active === 'profile' ? 'active' : ''}"><span class="settings-profile-avatar">${aureliaAccount.profilePicture ? `<img src="${aureliaAccount.profilePicture}" alt="${accountEscape(FIXED_ACCOUNT_USERNAME)} profile picture">` : accountEscape(accountInitials())}</span>Profile</button>
      <button data-settings-section="appearance" class="${active === 'appearance' ? 'active' : ''}"><span>✦</span>Appearance</button>
      <button data-settings-section="desktop" class="${active === 'desktop' ? 'active' : ''}"><span>▣</span>Desktop</button>
      <button data-settings-section="control-center" class="${active === 'control-center' ? 'active' : ''}"><span>⌁</span>Control Center</button>
      <button data-settings-section="cloud" class="${active === 'cloud' ? 'active' : ''}"><span>☁</span>FINDAT Cloud</button>
    </aside>
    <main class="settings-content" data-settings-content></main>
  </div>`;
};
apps.settings.html = fullSettingsMarkup;

const settingsPanelBeforeAccount = settingsPanelMarkup;
settingsPanelMarkup = function(section) {
  if (section === 'profile') return profileSettingsMarkup();
  return settingsPanelBeforeAccount(section);
};

renderSettingsSection = function(win, section = 'appearance') {
  const allowed = ['profile', 'appearance', 'desktop', 'control-center', 'cloud'];
  if (!allowed.includes(section)) section = 'appearance';
  try { localStorage.setItem(SETTINGS_SECTION_KEY, section); } catch (_) { /* optional */ }
  qsa('[data-settings-section]', win).forEach(button => button.classList.toggle('active', button.dataset.settingsSection === section));
  const content = qs('[data-settings-content]', win);
  if (!content) return;
  content.innerHTML = settingsPanelMarkup(section);
  bindSettingsSection(win, section);
};

const bindSettingsBeforeAccount = bindSettingsSection;
bindSettingsSection = function(win, section) {
  if (section !== 'profile') {
    bindSettingsBeforeAccount(win, section);
    return;
  }

  qs('[data-account-photo]', win)?.addEventListener('click', () => qs('#profilePictureInput')?.click());
  qs('[data-account-photo-remove]', win)?.addEventListener('click', () => {
    aureliaAccount.profilePicture = '';
    saveAureliaAccount();
    toast('Profile picture removed');
  });

  qs('[data-account-password-form]', win)?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (accountHasPassword() && !await verifyAccountPassword(String(data.get('currentPassword') || ''))) return toast('Current password is incorrect');
    const next = String(data.get('newPassword') || '');
    const confirm = String(data.get('confirmPassword') || '');
    if (next.length < 4) return toast('Password must contain at least 4 characters');
    if (next !== confirm) return toast('The new passwords do not match');
    const salt = randomAccountSalt();
    aureliaAccount.passwordSalt = salt;
    aureliaAccount.passwordHash = await hashAccountPassword(next, salt);
    setAccountSession(true);
    saveAureliaAccount();
    form.reset();
    toast('Password updated');
  });

  qs('[data-account-remove-password]', win)?.addEventListener('click', async () => {
    const current = await systemPrompt('Enter the current password to remove password protection:', '', { title: 'Remove Password Protection', okLabel: 'Continue', placeholder: 'Current password' });
    if (current === null) return;
    if (!await verifyAccountPassword(current)) return toast('Current password is incorrect');
    aureliaAccount.passwordHash = '';
    aureliaAccount.passwordSalt = '';
    setAccountSession(true);
    saveAureliaAccount();
    toast('Password protection removed');
  });

  qs('[data-account-lock]', win)?.addEventListener('click', () => lockAureliaAccount());
  qs('[data-account-signout]', win)?.addEventListener('click', () => signOutAureliaAccount());
};

function compressProfilePicture(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) return reject(new Error('Choose an image file'));
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      try {
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        const sourceX = Math.max(0, (image.naturalWidth - side) / 2);
        const sourceY = Math.max(0, (image.naturalHeight - side) / 2);
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        context.drawImage(image, sourceX, sourceY, side, side, 0, 0, 256, 256);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', .88));
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The selected picture could not be read'));
    };
    image.src = url;
  });
}

const profileInput = document.createElement('input');
profileInput.id = 'profilePictureInput';
profileInput.type = 'file';
profileInput.accept = 'image/*';
profileInput.hidden = true;
document.body.append(profileInput);
profileInput.addEventListener('change', async () => {
  const file = profileInput.files?.[0];
  profileInput.value = '';
  if (!file) return;
  try {
    aureliaAccount.profilePicture = await compressProfilePicture(file);
    saveAureliaAccount();
    toast('Profile picture updated');
  } catch (error) {
    toast(error.message || 'Could not update profile picture');
  }
});

setupAuthScreen();
renderSystemAccountMenu();

qs('#systemPanel')?.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  const action = button?.dataset.action;
  if (!['profile', 'lock', 'signout'].includes(action)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (action === 'profile') openProfileSettings();
  if (action === 'lock') lockAureliaAccount();
  if (action === 'signout') signOutAureliaAccount();
  qs('#systemPanel')?.classList.add('hidden');
}, true);

window.addEventListener('load', () => {
  setAccountSession(false);
  showAccountGate('signin');
});
