const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
const desktop = qs('#desktop');
const windowsEl = qs('#windows');
let topZ = 20;
let iconSequence = 0;


const systemDialogQueue = [];
let activeSystemDialog = null;

function dialogTextParts(message, detail = '') {
  const source = String(message ?? '').replace(/\r/g, '');
  const sections = source.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
  if (!sections.length) return { headline: 'FINDAT Cloud', detail: detail ? String(detail).trim() : '' };
  const headline = sections.shift();
  const remainder = [detail, ...sections].filter(Boolean).join('\n\n').trim();
  return { headline, detail: remainder };
}

function ensureSystemDialogHost() {
  let host = qs('#systemDialogHost');
  if (host) return host;
  host = document.createElement('div');
  host.id = 'systemDialogHost';
  host.className = 'system-dialog-host hidden';
  host.innerHTML = `
    <div class="system-dialog-scrim" aria-hidden="true"></div>
    <section class="system-dialog" role="alertdialog" aria-modal="true" aria-labelledby="systemDialogTitle" aria-describedby="systemDialogMessage">
      <div class="system-dialog-icon" aria-hidden="true"><span></span></div>
      <div class="system-dialog-copy">
        <h2 id="systemDialogTitle"></h2>
        <p id="systemDialogMessage" class="system-dialog-message"></p>
        <label class="system-dialog-input-wrap hidden">
          <span class="sr-only">Dialog input</span>
          <input id="systemDialogInput" class="system-dialog-input" type="text" autocomplete="off">
        </label>
      </div>
      <div class="system-dialog-actions">
        <button type="button" class="system-dialog-button secondary" data-dialog-action="cancel">Cancel</button>
        <button type="button" class="system-dialog-button primary" data-dialog-action="ok">OK</button>
      </div>
    </section>`;
  desktop.appendChild(host);
  return host;
}

function pumpSystemDialogs() {
  if (activeSystemDialog || !systemDialogQueue.length) return;
  activeSystemDialog = systemDialogQueue.shift();
  const host = ensureSystemDialogHost();
  const dialog = qs('.system-dialog', host);
  const titleNode = qs('#systemDialogTitle', host);
  const messageNode = qs('#systemDialogMessage', host);
  const inputWrap = qs('.system-dialog-input-wrap', host);
  const input = qs('#systemDialogInput', host);
  const cancelButton = qs('[data-dialog-action="cancel"]', host);
  const okButton = qs('[data-dialog-action="ok"]', host);
  const previousFocus = document.activeElement;
  const { options, resolve } = activeSystemDialog;
  const type = options.type || 'confirm';
  const parts = dialogTextParts(options.message, options.detail);

  titleNode.textContent = options.title || parts.headline || 'FINDAT Cloud';
  messageNode.textContent = options.title ? [parts.headline, parts.detail].filter(Boolean).join('\n\n') : (parts.detail || '');
  messageNode.classList.toggle('hidden', !messageNode.textContent.trim());
  host.classList.remove('hidden');
  host.dataset.open = 'true';
  dialog.dataset.type = type;
  dialog.classList.toggle('destructive', !!options.destructive);

  cancelButton.textContent = options.cancelLabel || 'Cancel';
  okButton.textContent = options.okLabel || (type === 'alert' ? 'OK' : 'OK');
  cancelButton.classList.toggle('hidden', type === 'alert');

  if (type === 'prompt') {
    inputWrap.classList.remove('hidden');
    input.value = options.defaultValue ?? '';
    input.placeholder = options.placeholder || '';
  } else {
    inputWrap.classList.add('hidden');
    input.value = '';
  }

  const finish = value => {
    host.classList.add('hidden');
    delete host.dataset.open;
    dialog.classList.remove('destructive');
    dialog.removeEventListener('keydown', handleKeydown, true);
    cancelButton.removeEventListener('click', onCancel);
    okButton.removeEventListener('click', onOk);
    host.removeEventListener('mousedown', keepFocus, true);
    activeSystemDialog = null;
    if (previousFocus && typeof previousFocus.focus === 'function') {
      requestAnimationFrame(() => previousFocus.focus({ preventScroll: true }));
    }
    resolve(value);
    queueMicrotask(pumpSystemDialogs);
  };

  const onCancel = () => finish(type === 'prompt' ? null : false);
  const onOk = () => finish(type === 'prompt' ? input.value : true);
  const keepFocus = event => {
    if (event.target === host || event.target.classList.contains('system-dialog-scrim')) {
      event.preventDefault();
      (type === 'prompt' ? input : okButton).focus({ preventScroll: true });
    }
  };
  const handleKeydown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (type !== 'alert') onCancel();
      return;
    }
    if (event.key === 'Enter') {
      const tag = event.target?.tagName;
      if (tag === 'TEXTAREA') return;
      if (type === 'prompt' && event.target === input) {
        event.preventDefault();
        onOk();
        return;
      }
      if (event.target === cancelButton) return;
      if (event.target === okButton || event.target === dialog) {
        event.preventDefault();
        onOk();
      }
    }
    if (event.key === 'Tab') {
      const focusable = [cancelButton, okButton, input].filter(node => node && !node.classList.contains('hidden'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  cancelButton.addEventListener('click', onCancel);
  okButton.addEventListener('click', onOk);
  host.addEventListener('mousedown', keepFocus, true);
  dialog.addEventListener('keydown', handleKeydown, true);

  requestAnimationFrame(() => {
    (type === 'prompt' ? input : okButton).focus({ preventScroll: true });
    if (type === 'prompt') input.select();
  });
}

function openSystemDialog(options) {
  return new Promise(resolve => {
    systemDialogQueue.push({ options, resolve });
    pumpSystemDialogs();
  });
}

function systemAlert(message, options = {}) {
  return openSystemDialog({ ...options, type: 'alert', message });
}

function systemConfirm(message, options = {}) {
  return openSystemDialog({ ...options, type: 'confirm', message });
}

function systemPrompt(message, defaultValue = '', options = {}) {
  return openSystemDialog({ ...options, type: 'prompt', message, defaultValue });
}

window.systemAlert = systemAlert;
window.systemConfirm = systemConfirm;
window.systemPrompt = systemPrompt;


let activeSystemProgress = null;
let activeSystemProgressTimer = 0;

function ensureSystemProgressHost() {
  let host = qs('#systemProgressHost');
  if (host) return host;
  host = document.createElement('div');
  host.id = 'systemProgressHost';
  host.className = 'system-progress-host hidden';
  host.innerHTML = `
    <div class="system-progress-scrim" aria-hidden="true"></div>
    <section class="system-progress-card" role="status" aria-live="polite" aria-atomic="true">
      <div class="system-progress-ring" data-system-progress-ring>
        <span data-system-progress-percent>0%</span>
      </div>
      <div class="system-progress-copy">
        <h2 data-system-progress-title>Transferring</h2>
        <p class="system-progress-message" data-system-progress-message>Preparing files…</p>
        <div class="system-progress-bar"><div class="system-progress-bar-fill" data-system-progress-fill></div></div>
        <div class="system-progress-meta">
          <span data-system-progress-state>Transferring…</span>
          <span data-system-progress-inline-percent>0%</span>
        </div>
      </div>
    </section>`;
  desktop.appendChild(host);
  return host;
}

function showSystemProgress(options = {}) {
  const host = ensureSystemProgressHost();
  const card = qs('.system-progress-card', host);
  const ring = qs('[data-system-progress-ring]', host);
  const titleNode = qs('[data-system-progress-title]', host);
  const messageNode = qs('[data-system-progress-message]', host);
  const stateNode = qs('[data-system-progress-state]', host);
  const percentNode = qs('[data-system-progress-percent]', host);
  const inlinePercentNode = qs('[data-system-progress-inline-percent]', host);
  const fillNode = qs('[data-system-progress-fill]', host);
  const token = Symbol('system-progress');
  clearTimeout(activeSystemProgressTimer);
  activeSystemProgress = token;
  host.classList.remove('hidden', 'is-complete', 'is-error');

  const render = (progressValue, details = {}) => {
    if (activeSystemProgress !== token) return;
    const value = Math.max(0, Math.min(100, Math.round(Number(progressValue) || 0)));
    const percent = `${value}%`;
    host.dataset.state = details.stateKind || 'running';
    ring.style.setProperty('--progress', String(value));
    fillNode.style.width = percent;
    percentNode.textContent = percent;
    inlinePercentNode.textContent = percent;
    if (details.title) titleNode.textContent = details.title;
    if (typeof details.message === 'string') messageNode.textContent = details.message;
    if (typeof details.state === 'string') stateNode.textContent = details.state;
  };

  const finish = (progressValue, details = {}, kind = 'complete') => {
    render(progressValue, { ...details, stateKind: kind });
    host.classList.toggle('is-complete', kind === 'complete');
    host.classList.toggle('is-error', kind === 'error');
    activeSystemProgressTimer = window.setTimeout(() => {
      if (activeSystemProgress !== token) return;
      host.classList.add('hidden');
      host.classList.remove('is-complete', 'is-error');
      delete host.dataset.state;
      activeSystemProgress = null;
    }, kind === 'error' ? 1800 : 900);
  };

  render(options.progress ?? 0, {
    title: options.title || 'Transferring',
    message: options.message || 'Preparing files…',
    state: options.state || 'Working…'
  });

  return {
    update(progressValue, details = {}) {
      render(progressValue, details);
    },
    complete(details = {}) {
      finish(100, {
        title: details.title || titleNode.textContent,
        message: details.message || 'Complete',
        state: details.state || 'Complete'
      }, 'complete');
    },
    fail(details = {}) {
      finish(Math.max(0, Number(details.progress) || 0), {
        title: details.title || titleNode.textContent,
        message: details.message || 'Something went wrong',
        state: details.state || 'Failed'
      }, 'error');
    },
    close() {
      if (activeSystemProgress !== token) return;
      clearTimeout(activeSystemProgressTimer);
      host.classList.add('hidden');
      host.classList.remove('is-complete', 'is-error');
      delete host.dataset.state;
      activeSystemProgress = null;
    }
  };
}

window.showSystemProgress = showSystemProgress;


function positionFindatContextMenu(menu, x, y, width = 220) {
  if (!menu) return;
  menu.style.width = `${width}px`;
  menu.classList.remove('hidden');
  const margin = 8;
  const measuredHeight = Math.min(menu.scrollHeight || 180, innerHeight - margin * 2);
  menu.style.left = `${Math.max(margin, Math.min(x, innerWidth - width - margin))}px`;
  menu.style.top = `${Math.max(margin, Math.min(y, innerHeight - measuredHeight - margin))}px`;
}

function editableContextTarget(target) {
  if (!(target instanceof Element)) return null;
  const editable = target.closest('input, textarea, [contenteditable="true"]');
  if (!editable || editable.matches('input[type="color"], input[type="range"], input[type="file"]')) return null;
  return editable;
}

function selectedTextExists(target) {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return Number(target.selectionEnd) > Number(target.selectionStart);
  }
  return Boolean(window.getSelection()?.toString());
}

function focusEditableTarget(target) {
  target?.focus?.({ preventScroll: true });
}

function insertTextIntoEditable(target, text) {
  focusEditableTarget(target);
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = Number.isInteger(target.selectionStart) ? target.selectionStart : target.value.length;
    const end = Number.isInteger(target.selectionEnd) ? target.selectionEnd : start;
    target.setRangeText(text, start, end, 'end');
    target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: text }));
    return;
  }
  document.execCommand('insertText', false, text);
  target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: text }));
}

function showFindatEditContextMenu(target, x, y) {
  const menu = qs('#contextMenu');
  if (!menu) return;
  const hasSelection = selectedTextExists(target);
  menu.innerHTML = `
    <button type="button" data-findat-edit-action="cut" ${hasSelection ? '' : 'disabled'}><span>Cut</span><kbd>Ctrl+X</kbd></button>
    <button type="button" data-findat-edit-action="copy" ${hasSelection ? '' : 'disabled'}><span>Copy</span><kbd>Ctrl+C</kbd></button>
    <button type="button" data-findat-edit-action="paste"><span>Paste</span><kbd>Ctrl+V</kbd></button>
    <hr>
    <button type="button" data-findat-edit-action="select-all"><span>Select All</span><kbd>Ctrl+A</kbd></button>`;
  positionFindatContextMenu(menu, x, y, 220);

  qsa('[data-findat-edit-action]', menu).forEach(button => button.addEventListener('click', async () => {
    const action = button.dataset.findatEditAction;
    menu.classList.add('hidden');
    focusEditableTarget(target);
    if (action === 'cut') document.execCommand('cut');
    if (action === 'copy') document.execCommand('copy');
    if (action === 'select-all') {
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) target.select();
      else document.execCommand('selectAll');
    }
    if (action === 'paste') {
      try {
        const text = await navigator.clipboard.readText();
        insertTextIntoEditable(target, text);
      } catch (_) {
        toast('Clipboard access was blocked. Press Ctrl+V to paste.');
      }
    }
  }));
}

function showFindatSystemContextMenu(x, y) {
  const menu = qs('#contextMenu');
  if (!menu) return;
  menu.innerHTML = `
    <button type="button" data-findat-system-action="finder"><span>Open FINDAT Cloud</span></button>
    <button type="button" data-findat-system-action="applications"><span>Applications</span></button>
    <hr>
    <button type="button" data-findat-system-action="settings"><span>System Settings</span></button>
    <button type="button" data-findat-system-action="about"><span>About FINDAT Cloud</span></button>`;
  positionFindatContextMenu(menu, x, y, 220);
  qsa('[data-findat-system-action]', menu).forEach(button => button.addEventListener('click', () => {
    menu.classList.add('hidden');
    const action = button.dataset.findatSystemAction;
    if (action === 'finder') openApp('finder');
    if (action === 'applications') openApp('launchpad');
    if (action === 'settings') openApp('settings');
    if (action === 'about') openApp('about');
  }));
}

function handleFindatContextMenu(event) {
  event.preventDefault();
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  /* These surfaces already provide their own FINDAT Cloud menus. */
  if (target.closest('#contextMenu, .system-dialog-host, .excel-tab, .fs-entry, .system-desktop-icon, .finder-file-area, #desktopIcons')) return;

  const editable = editableContextTarget(target);
  if (editable) {
    showFindatEditContextMenu(editable, event.clientX, event.clientY);
    return;
  }

  showFindatSystemContextMenu(event.clientX, event.clientY);
}

document.addEventListener('contextmenu', handleFindatContextMenu);
window.positionFindatContextMenu = positionFindatContextMenu;

/* One transition timer per window prevents rapid clicks from starting
   overlapping close/minimize/restore animations. */
const windowTransitionTimers = new WeakMap();

function clearWindowTransitionTimer(win) {
  const timer = windowTransitionTimers.get(win);
  if (timer) clearTimeout(timer);
  windowTransitionTimers.delete(win);
}

function scheduleWindowTransition(win, callback, delay) {
  clearWindowTransitionTimer(win);
  const timer = setTimeout(() => {
    windowTransitionTimers.delete(win);
    if (win?.isConnected) callback();
  }, delay);
  windowTransitionTimers.set(win, timer);
}

function windowIsBusy(win) {
  return !win || !win.isConnected || ['closing', 'minimizing'].includes(win.dataset.windowState || '');
}

function iconSvg(name) {
  const id = `icon-${name}-${++iconSequence}`;
  const rounded = (content, from, to) => `
    <svg class="app-icon" viewBox="0 0 64 64" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
      <rect x="3" y="3" width="58" height="58" rx="14" fill="url(#${id})"/>
      <path d="M12 5h40a9 9 0 0 1 9 9v2H3v-2a9 9 0 0 1 9-9Z" fill="#fff" opacity=".22"/>
      ${content}
    </svg>`;

  const icons = {
    finder: rounded(`
      <path d="M32 4v56" stroke="#0a5eb7" stroke-width="1.5" opacity=".45"/>
      <path d="M11 22c5-4 12-5 21-5v33c-9 0-16-2-21-7Z" fill="#aee8ff" opacity=".96"/>
      <path d="M32 17c9 0 16 1 21 5v21c-5 5-12 7-21 7Z" fill="#178ce7" opacity=".9"/>
      <circle cx="21" cy="29" r="1.8" fill="#113b66"/><circle cx="42" cy="29" r="1.8" fill="#083e75"/>
      <path d="M18 39c7 5 21 5 28 0" fill="none" stroke="#0e4b7c" stroke-width="2" stroke-linecap="round"/>
      <path d="M32 18c-4 8-5 15-2 21" fill="none" stroke="#0b5da8" stroke-width="1.5" stroke-linecap="round"/>
    `, '#67cfff', '#0f79d3'),
    launchpad: rounded(`
      ${[[21,21],[32,21],[43,21],[21,32],[32,32],[43,32],[21,43],[32,43],[43,43]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="#fff" opacity=".92"/>`).join('')}
    `, '#9198a6', '#414956'),
    browser: rounded(`
      <circle cx="32" cy="32" r="23" fill="#eaf8ff" stroke="#fff" stroke-width="2"/>
      <circle cx="32" cy="32" r="20" fill="none" stroke="#53b7e9" stroke-width="1.4" opacity=".7"/>
      <path d="M40 21 34.6 35 22 43l7.4-14.1Z" fill="#ff4b4f"/>
      <path d="M22 43 29.4 29 40 21l-5.4 14Z" fill="#2088e8" opacity=".95"/>
      <circle cx="32" cy="32" r="3" fill="#fff" stroke="#4e718a" stroke-width="1"/>
    `, '#5bd3ff', '#1277de'),
    messages: rounded(`
      <path d="M14 17h36a9 9 0 0 1 9 9v11a9 9 0 0 1-9 9H31L19 54l3-8h-8a9 9 0 0 1-9-9V26a9 9 0 0 1 9-9Z" fill="#fff"/>
      <circle cx="23" cy="32" r="2.4" fill="#31c955"/><circle cx="32" cy="32" r="2.4" fill="#31c955"/><circle cx="41" cy="32" r="2.4" fill="#31c955"/>
    `, '#52dd72', '#14ad43'),
    mail: rounded(`
      <rect x="10" y="16" width="44" height="34" rx="7" fill="#f8fcff"/>
      <path d="m12 20 20 16 20-16" fill="none" stroke="#3790e9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="m12 47 14-13m26 13L38 34" fill="none" stroke="#7abaf4" stroke-width="2.2" stroke-linecap="round"/>
    `, '#5fc7ff', '#147fe5'),
    maps: rounded(`
      <path d="M8 14 23 8l18 6 15-6v42l-15 6-18-6-15 6Z" fill="#e7f7df"/>
      <path d="M23 8v42m18-36v42" stroke="#b0d8a3" stroke-width="2"/>
      <path d="M6 37c10-10 17 4 27-4s13-6 24-2" fill="none" stroke="#fff" stroke-width="6"/>
      <path d="M6 37c10-10 17 4 27-4s13-6 24-2" fill="none" stroke="#ffbc3d" stroke-width="2"/>
      <path d="M39 18a8 8 0 0 1 8 8c0 6-8 14-8 14s-8-8-8-14a8 8 0 0 1 8-8Z" fill="#ff4e55"/><circle cx="39" cy="26" r="3" fill="#fff"/>
    `, '#86d5ff', '#58b96a'),
    photos: rounded(`
      <circle cx="32" cy="32" r="7" fill="#fff"/>
      ${[0,45,90,135,180,225,270,315].map((a,i)=>`<ellipse cx="32" cy="18" rx="7" ry="12" fill="${['#ff5158','#ff9c35','#ffd332','#67d45a','#36c6d9','#438bf2','#9c55e7','#f04c9d'][i]}" opacity=".92" transform="rotate(${a} 32 32)"/>`).join('')}
      <circle cx="32" cy="32" r="6" fill="#fff"/>
    `, '#ffffff', '#e7ebf0'),
    calendar: `
      <svg class="app-icon" viewBox="0 0 64 64" aria-hidden="true">
        <rect x="3" y="3" width="58" height="58" rx="14" fill="#f8f8fa"/>
        <path d="M3 17V14A11 11 0 0 1 14 3h36a11 11 0 0 1 11 11v3Z" fill="#f54249"/>
        <text x="32" y="13.2" text-anchor="middle" font-size="8" font-weight="700" font-family="Arial" fill="#fff">JUL</text>
        <text x="32" y="47" text-anchor="middle" font-size="30" font-weight="400" font-family="Arial" fill="#1b1b1d">23</text>
      </svg>`,
    notes: rounded(`
      <rect x="11" y="12" width="42" height="41" rx="5" fill="#fff"/>
      <path d="M11 17h42v9H11Z" fill="#ffd43c"/>
      <path d="M17 32h30M17 38h30M17 44h24" stroke="#bdc2ca" stroke-width="2" stroke-linecap="round"/>
    `, '#fff8c4', '#f5c821'),
    music: rounded(`
      <path d="M39 15v27.5a7.5 7.5 0 1 1-4-6.6V22l16-3v19.5a7.5 7.5 0 1 1-4-6.6V12Z" fill="#fff"/>
    `, '#ff5a81', '#c12de0'),
    terminal: rounded(`
      <rect x="9" y="12" width="46" height="40" rx="7" fill="#111820"/>
      <path d="m17 24 8 7-8 7m13 1h15" fill="none" stroke="#eef7ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    `, '#56616d', '#20262d'),
    settings: rounded(`
      <g transform="translate(32 32)" fill="#fff">
        <path d="M4-22 8-20l2 6 6 2 4-2 5 8-3 4 1 6 4 3-4 8-5-1-5 4v5H3l-2-5-6-2-4 2-5-8 3-4-1-6-4-3 4-8 5 1 5-4v-5H4Z" opacity=".95"/>
        <circle r="8" fill="#8a929d"/><circle r="4" fill="#fff"/>
      </g>
    `, '#a7adb5', '#626a74'),
    excel: rounded(`
      <path d="M15 12h34a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H15a6 6 0 0 1-6-6V18a6 6 0 0 1 6-6Z" fill="#fff" opacity=".96"/>
      <path d="M9 19h18v27H9Z" fill="#137d43"/>
      <path d="m14 25 8 14m0-14-8 14" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M32 21h17M32 28h17M32 35h17M32 42h17M39 18v28" stroke="#9bcdb2" stroke-width="2"/>
    `, '#21a366', '#0b6e3b'),
    word: rounded(`
      <path d="M14 12h36a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V18a6 6 0 0 1 6-6Z" fill="#fff" opacity=".96"/>
      <path d="M8 19h20v27H8Z" fill="#185abd"/>
      <path d="m13 25 3.4 14 4-10 4 10L28 25" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M33 22h17M33 29h17M33 36h17M33 43h12" stroke="#9fc0ee" stroke-width="2.2" stroke-linecap="round"/>
    `, '#2b7cd3', '#174ea6'),
    powerpoint: rounded(`
      <path d="M14 12h36a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V18a6 6 0 0 1 6-6Z" fill="#fff" opacity=".96"/>
      <path d="M8 19h21v27H8Z" fill="#c43e1c"/>
      <path d="M15 39V25h6a5 5 0 0 1 0 10h-6m0 0h6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="40" cy="32" r="10" fill="#ee6b46"/><path d="M40 22v10h10" fill="#f8b098"/>
    `, '#f26b38', '#b53317'),
    sql: rounded(`
      <ellipse cx="32" cy="17" rx="18" ry="8" fill="#fff" opacity=".96"/>
      <path d="M14 17v27c0 4.5 8 8 18 8s18-3.5 18-8V17" fill="#fff" opacity=".9"/>
      <ellipse cx="32" cy="17" rx="18" ry="8" fill="none" stroke="#5576db" stroke-width="2"/>
      <path d="M14 28c0 4.5 8 8 18 8s18-3.5 18-8M14 39c0 4.5 8 8 18 8s18-3.5 18-8" fill="none" stroke="#5576db" stroke-width="2"/>
      <text x="32" y="32" text-anchor="middle" font-size="8" font-weight="800" font-family="Arial" fill="#2e4ca7">SQL</text>
    `, '#7d9cff', '#405ac6'),
    colab: rounded(`
      <path d="M19 21c-8 0-11 7-7 13 4 6 13 5 17-2l5-9c3-6 11-7 16-3 5 4 4 12-1 15-5 3-12 1-15-5" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
      <circle cx="17" cy="28" r="4" fill="#ffd66b"/><circle cx="47" cy="28" r="4" fill="#ffd66b"/>
    `, '#f9ab00', '#e8710a'),
    chatgpt: rounded(`
      <g transform="translate(32 32)" fill="none" stroke="#fff" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M0-19c7-4 15 1 15 9 7 1 11 9 7 15-2 4-6 6-10 6-1 8-10 12-17 8-4-2-6-6-6-10-8-1-12-10-8-17 2-4 6-6 10-6 1-3 4-5 9-5Z"/>
        <path d="m-9-14 17 10v19M15-10-2 0l-17-10M12 11-5 1l-17 10M-11 9V-10M-2 19V0"/>
      </g>
    `, '#353b42', '#111417'),
    trash: `
      <svg class="app-icon" viewBox="0 0 64 64" aria-hidden="true">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e9f8ff"/><stop offset="1" stop-color="#a4c9dc"/></linearGradient></defs>
        <path d="M16 17h32l-3 39H19Z" fill="url(#${id})" stroke="#fff" stroke-width="2"/>
        <path d="M13 14h38v6H13Zm10-5h18v5H23Z" fill="#ecf9ff" stroke="#b8d6e4" stroke-width="1"/>
        <path d="M25 25v23m7-23v23m7-23v23" stroke="#79a9c1" stroke-width="2" opacity=".8"/>
      </svg>`,
    drive: `
      <span class="app-icon cloud-app-icon" aria-hidden="true"></span>`,
    document: `
      <svg class="app-icon" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M14 5h25l12 12v42H14Z" fill="#f8fbff" stroke="#d9e2eb" stroke-width="1.5"/>
        <path d="M39 5v13h12" fill="#dce9f5"/>
        <path d="M21 29h23M21 36h23M21 43h18" stroke="#55a0e6" stroke-width="2.4" stroke-linecap="round"/>
      </svg>`
  };
  return icons[name] || icons.launchpad;
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
}

function launchItems() {
  const productivityApps = [
    { name: 'excel', title: 'MS Excel' },
    { name: 'word', title: 'MS Word' },
    { name: 'powerpoint', title: 'PowerPoint' }
  ];

  return productivityApps
    .map(app => `<button class="launch-item" data-open="${app.name}">${iconSvg(app.name)}<span>${app.title}</span></button>`)
    .join('');
}

const apps = {
  finder: {
    title: 'Finder',
    html: () => `<div class="finder">
      <aside class="sidebar"><h5>Favorites</h5><button class="active">◉ AirDrop</button><button>◷ Recents</button><button>▦ Applications</button><button>▣ Desktop</button><button>▤ Documents</button><button>⇩ Downloads</button><h5>Locations</h5><button>▰ FINDAT Cloud HD</button></aside>
      <main class="file-area"><div class="toolbar"><h2>Recents</h2><div class="toolbar-actions"><button>‹</button><button>›</button><button>▦</button></div></div>
      <div class="files-grid"><button class="file-card" data-open="notes"><span class="file-symbol document">▤</span>Welcome.txt</button><button class="file-card"><span class="file-symbol folder">▰</span>Projects</button><button class="file-card" data-open="photos"><span class="file-symbol folder">◉</span>Wallpapers</button><button class="file-card" data-open="music"><span class="file-symbol folder">♫</span>Music</button><button class="file-card"><span class="file-symbol folder">▶</span>Movies</button><button class="file-card" data-open="terminal"><span class="file-symbol package">◆</span>FINDAT Cloud</button></div></main>
    </div>`
  },
  launchpad: { title: 'Launchpad', html: () => `<div class="launchpad-app"><h2>Applications</h2><div class="launch-grid">${launchItems()}</div></div>` },
  browser: {
    title: 'Aurora',
    html: () => `<div class="browser-app"><div class="browser-toolbar"><button aria-label="Back">‹</button><button aria-label="Forward">›</button><input value="findat://start" aria-label="Address"><button aria-label="Reload">↻</button></div><div class="browser-page"><div class="hero"><div class="browser-orb">${iconSvg('browser')}</div><h1>Good ${greeting()}</h1><p>Explore your smooth new web desktop.</p></div><div class="quick-links"><button>⌕<small>Search</small></button><button>▤<small>News</small></button><button>☁<small>Cloud</small></button><button>✦<small>Design</small></button></div></div></div>`
  },
  messages: {
    title: 'Messages',
    html: () => `<div class="messages-app"><aside class="conversation-list"><h3>Messages</h3><div class="conversation"><b>FINDAT Cloud Assistant</b><br><small>Welcome to your OS</small></div></aside><main class="chat"><div class="chat-history"><div class="bubble incoming">The interface now uses smoother glass, motion and window transitions.</div></div><form class="chat-input"><input placeholder="Message"><button aria-label="Send">↑</button></form></main></div>`
  },
  mail: {
    title: 'Mail',
    html: () => `<div class="mail-app"><aside class="mail-list"><h3>Inbox</h3><div class="mail-row"><b>Welcome</b><br><small>FINDAT Cloud · Today</small></div></aside><main class="mail-view"><header><h2>Welcome to FINDAT Cloud</h2><small>From: FINDAT Cloud Team</small></header><div class="mail-body"><p>Your desktop has been refined with subtler translucency, cleaner proportions and smoother animations.</p><p>Open Applications from the desktop or FINDAT Cloud menu, move windows, and try Control Center.</p></div></main></div>`
  },
  maps: { title: 'Maps', html: () => `<div class="maps-app"><div class="map-grid"></div><div class="map-water"></div><div class="map-route"></div><div class="map-pin"></div><input class="map-search" placeholder="Search Maps"></div>` },
  photos: {
    title: 'Photos',
    html: () => `<div class="photos-app"><aside class="sidebar"><h3>Photos</h3><button class="active">Library</button><button>Memories</button><button>People & Pets</button><button>Places</button><h5>Albums</h5><button>Favorites</button><button>Recents</button></aside><main class="photo-grid">${[['#ffb56b','#cb4e8f'],['#4cc3f2','#2158bd'],['#fde17f','#ef704f'],['#52c98b','#196db8'],['#9366df','#e05a93'],['#f2a45f','#e14f56'],['#5fc7db','#5458bd'],['#d3f082','#3baa7d'],['#f5c476','#9552d1'],['#78d5f1','#2978cf']].map(([c1,c2])=>`<div class="photo-tile" style="--c1:${c1};--c2:${c2}"></div>`).join('')}</main></div>`
  },
  calendar: {
    title: 'Calendar',
    html: () => `<div class="calendar-app"><aside class="sidebar"><h3>Calendar</h3><button class="active">Today</button><h5>Calendars</h5><button>● Personal</button><button>● School</button><button>● Projects</button></aside><main class="calendar-main"><div class="calendar-header"><h2>July 2026</h2><span>Month</span></div><div class="calendar-week">${Array.from({length:35},(_,i)=>{const day=i-2; const value=day<=0?30+day:day; return `<div class="calendar-day ${day===23?'today':''} ${day<=0?'muted':''}">${value}</div>`}).join('')}</div></main></div>`
  },
  notes: {
    title: 'Notes',
    html: () => `<div class="notes-app"><aside class="notes-list"><h3>Notes</h3><div class="note-item"><b>Welcome</b><br><small>Your refined desktop</small></div></aside><main class="note-editor"><h2>Welcome to FINDAT Cloud</h2><textarea id="noteText">FINDAT Cloud now has a smoother desktop presentation inspired by modern desktop interfaces.\n\nThe wallpaper is drawn entirely with CSS gradients. No generated pictures or external image assets are used.\n\nOpen Applications from the desktop, then try the window animations, Control Center, and built-in apps.</textarea></main></div>`
  },
  music: {
    title: 'Music',
    html: () => `<div class="music-app"><aside class="music-list"><h3>Music</h3><div class="music-row"><b>Listen Now</b><br><small>FINDAT Cloud Mix</small></div></aside><main class="music-main"><div class="album-panel"><div class="album-art">♫</div><div><b>Sunrise Interface</b><br><small>FINDAT Cloud Sessions</small></div></div><div class="player"><input type="range" value="32"><div class="player-controls"><button>◀</button><button class="play-button">▶</button><button>▶▶</button></div><span>2:18</span></div></main></div>`
  },
  terminal: {
    title: 'Terminal',
    html: () => `<div class="terminal-app"><div class="terminal-output">FINDAT Cloud Terminal v2.1\nFINDAT Cloud workspace ready.\nType 'help' for commands.\n\n</div><form class="terminal-line"><span>guest@findat ~ %&nbsp;</span><input autofocus autocomplete="off" spellcheck="false"></form></div>`
  },
  sql: {
    title: 'SQL Workbench',
    html: () => `<div class="sql-app">
      <aside class="sql-sidebar">
        <div class="sql-brand">${iconSvg('sql')}<div><b>SQL Workspace</b><small>Local demo database</small></div></div>
        <h5>SCHEMAS</h5>
        <button class="active">▾ aurelia</button>
        <button class="sql-table-button" data-sql-sample="users">▦ users</button>
        <button class="sql-table-button" data-sql-sample="documents">▦ documents</button>
      </aside>
      <main class="sql-workspace">
        <div class="sql-toolbar"><button data-sql-run>▶ Run query</button><button data-sql-clear>Clear</button><span>Browser-only SQL simulator</span></div>
        <textarea class="sql-editor" spellcheck="false">SELECT * FROM users;</textarea>
        <div class="sql-results">
          <div class="sql-result-title">Query results</div>
          <div class="sql-result-grid" data-sql-results>
            <div class="sql-result-empty">Run a supported SELECT query to display results.</div>
          </div>
        </div>
      </main>
    </div>`
  },
  settings: {
    title: 'System Settings',
    html: () => `<div class="settings-app"><aside class="sidebar"><h3>Settings</h3><button class="active">Appearance</button><button>Desktop</button><button>Control Center</button><button>Wallpaper</button></aside><main class="settings-content"><h2>Appearance</h2><div class="settings-card"><b>Theme</b><p>Choose the visual appearance for windows and controls.</p><div class="segmented"><button data-theme="light">Light</button><button data-theme="dark">Dark</button></div></div><div class="settings-card"><b>Accent color</b><p><input id="accentPicker" type="color" value="${getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0a84ff'}"></p></div><div class="settings-card"><b>Motion</b><p>Window transitions are enabled. Your operating system’s reduced-motion setting is respected automatically.</p></div><div class="settings-card"><b>About</b><p>FINDAT Cloud 2.1 · HTML, CSS and JavaScript.</p></div></main></div>`
  },
  trash: { title: 'Trash', html: () => `<div class="trash-app"><div class="empty-icon">${iconSvg('trash')}</div><h2>Trash is Empty</h2><p>Items moved to Trash will appear here.</p></div>` },
  about: { title: 'About This OS', html: () => `<div class="about"><div class="about-logo"><span class="aurelia-symbol"></span></div><h1>FINDAT Cloud</h1><p>Version 2.1 Browser Edition</p><p>An original browser desktop inspired by the clarity, depth and motion of modern desktop operating systems.</p><small>Built with HTML, CSS and JavaScript. No Apple assets are included.</small></div>` }
};

function renderStaticIcons() {
  qsa('.desktop-app-icon').forEach(node => {
    node.innerHTML = iconSvg(node.dataset.icon);
  });
}

function ensureDateTimePanel() {
  let panel = qs('#dateTimePanel');
  if (panel) return panel;

  panel = document.createElement('aside');
  panel.id = 'dateTimePanel';
  panel.className = 'date-time-panel hidden';
  panel.setAttribute('aria-label', 'Date and time');
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <section class="date-time-status-card">
      <div class="date-time-status-copy">
        <small id="dateTimeWeekday">Today</small>
        <strong id="dateTimeLargeDate">--</strong>
        <span id="dateTimeFullDate">Loading date…</span>
      </div>
      <div class="date-time-status-side">
        <span class="date-time-status-icon" aria-hidden="true">☁</span>
        <b>FINDAT Cloud</b>
        <small>System ready</small>
      </div>
    </section>
    <div class="date-time-widget-grid">
      <section class="analog-clock-widget" aria-label="Local clock">
        <div class="analog-clock-face" aria-hidden="true">
          <span class="clock-number n12">12</span><span class="clock-number n1">1</span><span class="clock-number n2">2</span>
          <span class="clock-number n3">3</span><span class="clock-number n4">4</span><span class="clock-number n5">5</span>
          <span class="clock-number n6">6</span><span class="clock-number n7">7</span><span class="clock-number n8">8</span>
          <span class="clock-number n9">9</span><span class="clock-number n10">10</span><span class="clock-number n11">11</span>
          <i id="analogHourHand" class="analog-hand hour-hand"></i>
          <i id="analogMinuteHand" class="analog-hand minute-hand"></i>
          <i id="analogSecondHand" class="analog-hand second-hand"></i>
          <i class="analog-clock-pin"></i>
        </div>
        <strong>Local Time</strong>
        <small id="analogClockDigital">--:--</small>
      </section>
      <section class="calendar-widget" aria-label="Monthly calendar">
        <header class="calendar-widget-header">
          <span id="calendarMonthName">Month</span>
          <strong id="calendarYear">----</strong>
        </header>
        <div class="calendar-weekdays" aria-hidden="true">
          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
        </div>
        <div id="calendarDays" class="calendar-days"></div>
      </section>
    </div>`;
  desktop.appendChild(panel);
  return panel;
}

function renderCalendarWidget(date = new Date()) {
  const daysRoot = qs('#calendarDays');
  if (!daysRoot) return;
  const year = date.getFullYear();
  const month = date.getMonth();
  const today = date.getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const dayOffset = index - firstWeekday + 1;
    let value = dayOffset;
    let muted = false;
    let current = true;
    if (dayOffset <= 0) {
      value = previousMonthDays + dayOffset;
      muted = true;
      current = false;
    } else if (dayOffset > daysInMonth) {
      value = dayOffset - daysInMonth;
      muted = true;
      current = false;
    }
    cells.push(`<span class="${muted ? 'muted' : ''} ${current && value === today ? 'today' : ''}">${value}</span>`);
  }

  qs('#calendarMonthName').textContent = date.toLocaleDateString([], { month: 'long' });
  qs('#calendarYear').textContent = String(year);
  daysRoot.innerHTML = cells.join('');
}

function updateDateTimePanel(date = new Date()) {
  const hourDegrees = ((date.getHours() % 12) + date.getMinutes() / 60) * 30;
  const minuteDegrees = (date.getMinutes() + date.getSeconds() / 60) * 6;
  const secondDegrees = date.getSeconds() * 6;
  const hourHand = qs('#analogHourHand');
  const minuteHand = qs('#analogMinuteHand');
  const secondHand = qs('#analogSecondHand');
  if (hourHand) hourHand.style.transform = `translateX(-50%) rotate(${hourDegrees}deg)`;
  if (minuteHand) minuteHand.style.transform = `translateX(-50%) rotate(${minuteDegrees}deg)`;
  if (secondHand) secondHand.style.transform = `translateX(-50%) rotate(${secondDegrees}deg)`;

  const weekday = qs('#dateTimeWeekday');
  const largeDate = qs('#dateTimeLargeDate');
  const fullDate = qs('#dateTimeFullDate');
  const digital = qs('#analogClockDigital');
  if (weekday) weekday.textContent = date.toLocaleDateString([], { weekday: 'long' });
  if (largeDate) largeDate.textContent = String(date.getDate());
  if (fullDate) fullDate.textContent = date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  if (digital) digital.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const panel = qs('#dateTimePanel');
  const calendarStamp = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  if (panel && panel.dataset.calendarStamp !== calendarStamp) {
    panel.dataset.calendarStamp = calendarStamp;
    renderCalendarWidget(date);
  }
}

function updateClock() {
  const date = new Date();
  const menuClock = qs('#menuClock');
  const lockTime = qs('#lockTime');
  const lockDate = qs('#lockDate');
  if (menuClock) menuClock.textContent = date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (lockTime) lockTime.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (lockDate) lockDate.textContent = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  qsa('[data-auth-large-time]').forEach(node => {
    node.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    node.dateTime = date.toISOString();
  });
  qsa('[data-auth-large-date]').forEach(node => {
    node.textContent = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  });
  updateDateTimePanel(date);
}

function openApp(name) {
  const app = apps[name];
  if (!app) return;

  const existing = qs(`.app-window[data-app="${name}"]`);
  if (existing) {
    restoreWindow(existing);
    focusWindow(existing);
    return;
  }

  const node = qs('#windowTemplate').content.firstElementChild.cloneNode(true);
  const index = windowsEl.children.length;
  node.dataset.app = name;
  node.style.left = `${Math.min(70 + (index * 31) % 260, Math.max(8, windowsEl.clientWidth - 500))}px`;
  node.style.top = `${Math.min(36 + (index * 24) % 150, Math.max(8, windowsEl.clientHeight - 320))}px`;
  qs('.window-title', node).textContent = app.title;
  qs('.window-body', node).innerHTML = app.html();
  windowsEl.appendChild(node);
  wireWindow(node);
  wireApp(node, name);
  focusWindow(node);
}

function focusWindow(win) {
  qsa('.app-window').forEach(item => item.classList.remove('focused'));
  win.classList.add('focused');
  win.style.zIndex = String(++topZ);
  const activeAppName = qs('#activeAppName');
  if (activeAppName) activeAppName.textContent = apps[win.dataset.app]?.title || 'FINDAT Cloud';
}

function closeWindow(win) {
  if (windowIsBusy(win)) return;

  clearWindowTransitionTimer(win);
  win.dataset.windowState = 'closing';
  win.classList.remove('minimizing', 'restoring');
  win.classList.add('closing');

  scheduleWindowTransition(win, () => {
    win.remove();
    const remaining = qsa('.app-window:not(.workstation-hidden)').filter(item => !item.hidden)
      .sort((a, b) => Number(b.style.zIndex || 0) - Number(a.style.zIndex || 0));
    if (remaining[0]) focusWindow(remaining[0]);
    else {
      const activeAppName = qs('#activeAppName');
      if (activeAppName) activeAppName.textContent = '';
    }
  }, 190);
}

function minimizeWindow(win) {
  if (windowIsBusy(win) || win.hidden || win.classList.contains('minimized')) return;

  clearWindowTransitionTimer(win);
  win.dataset.windowState = 'minimizing';
  win.classList.remove('closing', 'restoring');
  win.classList.add('minimizing');

  scheduleWindowTransition(win, () => {
    win.hidden = true;
    win.classList.remove('minimizing', 'focused');
    win.classList.add('minimized');
    win.dataset.windowState = 'minimized';

    const remaining = qsa('.app-window:not(.workstation-hidden)').filter(item => !item.hidden)
      .sort((a, b) => Number(b.style.zIndex || 0) - Number(a.style.zIndex || 0));
    if (remaining[0]) focusWindow(remaining[0]);
  }, 250);
}

function restoreWindow(win) {
  if (!win || !win.isConnected || (!win.hidden && !win.classList.contains('minimized'))) return;

  clearWindowTransitionTimer(win);
  win.hidden = false;
  win.dataset.windowState = 'restoring';
  win.classList.remove('minimized', 'minimizing', 'closing');
  win.classList.add('restoring');

  scheduleWindowTransition(win, () => {
    win.classList.remove('restoring');
    delete win.dataset.windowState;
  }, 310);
}

function toggleMaximize(win) {
  if (windowIsBusy(win) || win.hidden) return;

  clearWindowTransitionTimer(win);
  win.classList.remove('restoring');
  delete win.dataset.windowState;

  const control = qs('.maximize', win);
  if (!win.classList.contains('maximized')) {
    win.dataset.previousGeometry = JSON.stringify({
      left: win.style.left,
      top: win.style.top,
      width: win.style.width,
      height: win.style.height
    });
    win.classList.add('maximized');
    control?.setAttribute('aria-label', 'Restore');
    control?.setAttribute('title', 'Restore');
  } else {
    win.classList.remove('maximized');
    try {
      const geometry = JSON.parse(win.dataset.previousGeometry || '{}');
      for (const property of ['left', 'top', 'width', 'height']) {
        win.style[property] = typeof geometry[property] === 'string' ? geometry[property] : '';
      }
    } catch (_) { /* keep current geometry */ }
    control?.setAttribute('aria-label', 'Maximize');
    control?.setAttribute('title', 'Maximize');
  }
}

function wireWindow(win) {
  if (!win || win.dataset.windowWired === 'true') return;
  win.dataset.windowWired = 'true';

  /* Window controls are handled once by the delegated controller below.
     Keeping them out of per-window wiring prevents duplicate actions. */
  win.addEventListener('pointerdown', event => {
    if (event.button === 0 && !event.target.closest('.traffic-lights button')) focusWindow(win);
  });
  qs('.window-titlebar', win).addEventListener('dblclick', event => {
    if (!event.target.closest('.traffic-lights button')) toggleMaximize(win);
  });
  wireDrag(win, qs('.window-titlebar', win));
  wireResize(win, qs('.resize-handle', win));
}

function wireDrag(win, handle) {
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let frame = 0;
  let latestEvent = null;

  const move = event => {
    latestEvent = event;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      const e = latestEvent;
      const maxLeft = Math.max(0, windowsEl.clientWidth - win.offsetWidth);
      const maxTop = Math.max(0, windowsEl.clientHeight - 46);
      win.style.left = `${Math.min(maxLeft, Math.max(0, startLeft + e.clientX - startX))}px`;
      win.style.top = `${Math.min(maxTop, Math.max(0, startTop + e.clientY - startY))}px`;
      frame = 0;
    });
  };

  const end = event => {
    win.classList.remove('dragging');
    handle.releasePointerCapture?.(event.pointerId);
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', end);
    handle.removeEventListener('pointercancel', end);
  };

  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button') || win.classList.contains('maximized')) return;
    focusWindow(win);
    startX = event.clientX;
    startY = event.clientY;
    startLeft = win.offsetLeft;
    startTop = win.offsetTop;
    win.classList.add('dragging');
    handle.setPointerCapture?.(event.pointerId);
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  });
}

function wireResize(win, handle) {
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;

  const move = event => {
    const maxWidth = windowsEl.clientWidth - win.offsetLeft;
    const maxHeight = windowsEl.clientHeight - win.offsetTop;
    win.style.width = `${Math.min(maxWidth, Math.max(350, startWidth + event.clientX - startX))}px`;
    win.style.height = `${Math.min(maxHeight, Math.max(245, startHeight + event.clientY - startY))}px`;
  };

  const end = event => {
    win.classList.remove('resizing');
    handle.releasePointerCapture?.(event.pointerId);
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', end);
    handle.removeEventListener('pointercancel', end);
  };

  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0 || win.classList.contains('maximized')) return;
    event.stopPropagation();
    startX = event.clientX;
    startY = event.clientY;
    startWidth = win.offsetWidth;
    startHeight = win.offsetHeight;
    win.classList.add('resizing');
    handle.setPointerCapture?.(event.pointerId);
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  });
}

function wireApp(win, name) {
  qsa('[data-open]', win).forEach(button => button.addEventListener('click', () => openApp(button.dataset.open)));
  qsa('[data-web-url]', win).forEach(button => button.addEventListener('click', () => {
    const opened = window.open(button.dataset.webUrl, '_blank', 'noopener,noreferrer');
    if (!opened) toast('Allow pop-ups to open this web app');
  }));

  if (name === 'sql') {
    const editor = qs('.sql-editor', win);
    const results = qs('[data-sql-results]', win);
    const datasets = {
      users: [
        { id: 1, name: 'Simon', role: 'Administrator' },
        { id: 2, name: 'FINDAT Cloud User', role: 'Analyst' },
        { id: 3, name: 'Cloud Guest', role: 'Viewer' }
      ],
      documents: [
        { id: 101, name: 'Budget.xlsx', type: 'spreadsheet' },
        { id: 102, name: 'Report.docx', type: 'document' },
        { id: 103, name: 'Presentation.pptx', type: 'presentation' }
      ]
    };

    const renderRows = rows => {
      const columns = Object.keys(rows[0] || {});
      if (!columns.length) {
        results.innerHTML = '<div class="sql-result-empty">The query returned no rows.</div>';
        return;
      }
      results.innerHTML = `<table><thead><tr>${columns.map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map(column => `<td>${escapeHtml(String(row[column]))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    };

    qs('[data-sql-run]', win).addEventListener('click', () => {
      const query = editor.value.trim().replace(/\s+/g, ' ').toLowerCase();
      if (/^select \* from users;?$/.test(query)) renderRows(datasets.users);
      else if (/^select \* from documents;?$/.test(query)) renderRows(datasets.documents);
      else results.innerHTML = '<div class="sql-result-error">Supported demo queries: SELECT * FROM users; or SELECT * FROM documents;</div>';
    });
    qs('[data-sql-clear]', win).addEventListener('click', () => {
      editor.value = '';
      results.innerHTML = '<div class="sql-result-empty">Editor cleared.</div>';
      editor.focus();
    });
    qsa('[data-sql-sample]', win).forEach(button => button.addEventListener('click', () => {
      editor.value = `SELECT * FROM ${button.dataset.sqlSample};`;
      editor.focus();
    }));
  }

  if (name === 'notes') {
    const textarea = qs('#noteText', win);
    textarea.value = localStorage.getItem('aurelia.note') || textarea.value;
    textarea.addEventListener('input', () => localStorage.setItem('aurelia.note', textarea.value));
  }

  if (name === 'terminal') {
    const form = qs('form', win);
    const input = qs('input', win);
    const output = qs('.terminal-output', win);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const command = input.value.trim();
      output.textContent += `guest@findat ~ % ${command}\n${runCommand(command)}\n`;
      input.value = '';
      output.scrollTop = output.scrollHeight;
    });
  }

  if (name === 'settings') {
    const syncThemeButtons = () => qsa('[data-theme]', win).forEach(button => button.classList.toggle('selected', desktop.classList.contains('dark') === (button.dataset.theme === 'dark')));
    qsa('[data-theme]', win).forEach(button => button.addEventListener('click', () => { setTheme(button.dataset.theme); syncThemeButtons(); }));
    syncThemeButtons();
    const picker = qs('#accentPicker', win);
    picker?.addEventListener('input', () => {
      document.documentElement.style.setProperty('--accent', picker.value);
      localStorage.setItem('aurelia.accent', picker.value);
    });
  }

  if (name === 'messages') {
    const form = qs('form', win);
    const input = qs('input', win);
    const history = qs('.chat-history', win);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      history.insertAdjacentHTML('beforeend', `<div class="bubble" style="margin-top:8px">${escapeHtml(value)}</div>`);
      input.value = '';
      history.scrollTop = history.scrollHeight;
    });
  }

  if (name === 'browser') {
    const input = qs('.browser-toolbar input', win);
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      toast(`Opened ${input.value || 'findat://start'}`);
    });
  }

  if (name === 'music') {
    const play = qs('.play-button', win);
    play.addEventListener('click', () => {
      play.textContent = play.textContent === '▶' ? 'Ⅱ' : '▶';
      toast(play.textContent === 'Ⅱ' ? 'Now playing' : 'Paused');
    });
  }
}

function runCommand(commandLine) {
  const [command, ...args] = commandLine.split(/\s+/);
  const commands = {
    help: 'Commands: help, date, echo, clear, ls, whoami, storage, version, open [app]',
    date: () => new Date().toString(),
    echo: () => args.join(' '),
    ls: 'Applications  Documents  Downloads  Pictures  Browser Drive',
    whoami: 'guest',
    storage: 'FINDAT Cloud: ready',
    version: 'FINDAT Cloud 2.1 Browser Edition'
  };
  if (!command) return '';
  if (command === 'clear') {
    qsa('.terminal-output').forEach(output => { output.textContent = ''; });
    return '';
  }
  if (command === 'open') {
    openApp(args[0]);
    return apps[args[0]] ? `Opening ${apps[args[0]].title}` : `Unknown app: ${args[0] || ''}`;
  }
  const value = commands[command];
  return typeof value === 'function' ? value() : value ?? `command not found: ${command}`;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function setTheme(theme) {
  const dark = theme === 'dark';
  desktop.classList.toggle('dark', dark);
  localStorage.setItem('aurelia.theme', dark ? 'dark' : 'light');
  const button = qs('#darkToggle');
  button.classList.toggle('active', dark);
  qs('small', button).textContent = dark ? 'On' : 'Off';
}

function togglePanel(selector) {
  const target = selector === '#dateTimePanel' ? ensureDateTimePanel() : qs(selector);
  if (!target) return false;
  qsa('.popover, .control-center, .date-time-panel').forEach(panel => {
    if (panel !== target) {
      panel.classList.add('hidden');
      panel.setAttribute('aria-hidden', 'true');
    }
  });
  target.classList.toggle('hidden');
  const isOpen = !target.classList.contains('hidden');
  target.setAttribute('aria-hidden', String(!isOpen));
  const clockButton = qs('#clockBtn');
  if (clockButton) clockButton.setAttribute('aria-expanded', String(!ensureDateTimePanel().classList.contains('hidden')));
  return isOpen;
}

function toast(message) {
  const node = qs('#toast');
  node.textContent = message;
  node.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.add('hidden'), 1800);
}

function restorePreferences() {
  const theme = localStorage.getItem('aurelia.theme');
  if (theme) setTheme(theme);
  else if (matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
  const accent = localStorage.getItem('aurelia.accent');
  if (accent) document.documentElement.style.setProperty('--accent', accent);
  const brightness = localStorage.getItem('aurelia.brightness');
  if (brightness) {
    qs('#brightness').value = brightness;
    document.documentElement.style.setProperty('--brightness', String(Number(brightness) / 100));
  }
}

renderStaticIcons();
restorePreferences();
ensureDateTimePanel();
updateClock();
setInterval(updateClock, 1000);

qs('#systemMenuBtn').addEventListener('click', event => { event.stopPropagation(); togglePanel('#systemPanel'); });
qs('#controlCenterBtn').addEventListener('click', event => { event.stopPropagation(); togglePanel('#controlCenter'); });
qs('#clockBtn')?.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  const isOpen = togglePanel('#dateTimePanel');
  if (isOpen) updateDateTimePanel(new Date());
});
qs('#focusToggle').addEventListener('click', event => {
  event.currentTarget.classList.toggle('active');
  qs('small', event.currentTarget).textContent = event.currentTarget.classList.contains('active') ? 'On' : 'Off';
  toast(event.currentTarget.classList.contains('active') ? 'Focus enabled' : 'Focus disabled');
});
qs('#darkToggle').addEventListener('click', () => setTheme(desktop.classList.contains('dark') ? 'light' : 'dark'));
qs('#brightness').addEventListener('input', event => {
  const value = event.target.value;
  document.documentElement.style.setProperty('--brightness', String(Number(value) / 100));
  localStorage.setItem('aurelia.brightness', value);
});

qs('#systemPanel').addEventListener('click', event => {
  const action = event.target.dataset.action;
  if (!action) return;
  if (action === 'about') openApp('about');
  if (action === 'settings') openApp('settings');
  if (action === 'applications') openApp('launchpad');
  if (action === 'lock') window.FINDAT_LOCK_CLOUD?.();
  if (action === 'restart') location.reload();
  qs('#systemPanel').classList.add('hidden');
});

qs('#unlockBtn').addEventListener('click', () => window.FINDAT_LOCK_CLOUD?.());
document.addEventListener('click', event => {
  if (!event.target.closest('.popover, .control-center, .menu-bar')) qsa('.popover, .control-center').forEach(panel => panel.classList.add('hidden'));
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const panel = qs('#dateTimePanel');
  if (!panel?.classList.contains('hidden')) {
    panel.classList.add('hidden');
    panel.setAttribute('aria-hidden', 'true');
    qs('#clockBtn')?.setAttribute('aria-expanded', 'false');
  }
});
window.addEventListener('resize', () => {
  qsa('.app-window').forEach(win => {
    if (win.classList.contains('maximized')) return;
    win.style.left = `${Math.max(0, Math.min(win.offsetLeft, windowsEl.clientWidth - Math.min(win.offsetWidth, windowsEl.clientWidth)))}px`;
    win.style.top = `${Math.max(0, Math.min(win.offsetTop, windowsEl.clientHeight - 46))}px`;
  });
});

window.addEventListener('load', () => {
  setTimeout(() => {
    const boot = qs('#boot-screen');
    boot.style.opacity = '0';
    boot.style.visibility = 'hidden';
    setTimeout(() => boot.remove(), 700);
  }, 1450);
});

/* Single delegated window-control controller.
   It covers every existing and future window without duplicate listeners. */
(() => {
  'use strict';

  const keyboardClickGuards = new WeakMap();

  function controlFromEvent(event) {
    const target = event.target;
    return target instanceof Element ? target.closest('.traffic-lights button[data-window-action]') : null;
  }

  function runWindowControl(event) {
    const control = controlFromEvent(event);
    if (!control || control.disabled) return;

    if (event.type === 'click' && keyboardClickGuards.has(control)) {
      clearTimeout(keyboardClickGuards.get(control));
      keyboardClickGuards.delete(control);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const win = control.closest('.app-window');
    if (!win || !win.isConnected) return;

    event.preventDefault();
    event.stopPropagation();

    const action = control.dataset.windowAction;
    if (action === 'close') {
      closeWindow(win);
      return;
    }
    if (action === 'minimize') {
      minimizeWindow(win);
      return;
    }
    if (action === 'maximize') {
      toggleMaximize(win);
      if (win.isConnected && !win.hidden) focusWindow(win);
    }
  }

  /* Capture makes the controls immune to app-content handlers, while one
     listener avoids the previous capture/local-listener collision. */
  document.addEventListener('click', runWindowControl, true);

  document.addEventListener('keydown', event => {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
    const control = controlFromEvent(event);
    if (!control || control.disabled) return;

    const existingTimer = keyboardClickGuards.get(control);
    if (existingTimer) clearTimeout(existingTimer);
    const timer = setTimeout(() => keyboardClickGuards.delete(control), 500);
    keyboardClickGuards.set(control, timer);
    runWindowControl(event);
  }, true);

})();
