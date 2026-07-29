/* FINDAT Cloud manual fullscreen controls. */
(() => {
  'use strict';

  const toggleButton = document.getElementById('fullscreenToggleBtn');
  const systemPanel = document.getElementById('systemPanel');
  let requestPending = false;

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function isFullscreen() {
    return Boolean(fullscreenElement());
  }

  function updateFullscreenButton() {
    if (!toggleButton) return;
    const active = isFullscreen();
    toggleButton.classList.toggle('active', active);
    toggleButton.setAttribute('aria-pressed', String(active));
    toggleButton.setAttribute('aria-label', active ? 'Exit full screen' : 'Enter full screen');
    toggleButton.title = active ? 'Exit full screen' : 'Enter full screen';
  }

  async function enterFullscreen() {
    if (isFullscreen() || requestPending) return;
    requestPending = true;
    try {
      const root = document.documentElement;
      if (root.requestFullscreen) {
        await root.requestFullscreen({ navigationUI: 'hide' });
      } else if (root.webkitRequestFullscreen) {
        root.webkitRequestFullscreen();
      } else {
        window.toast?.('Full screen is not supported by this browser');
      }
    } catch (_) {
      window.toast?.('The browser could not enter full screen');
    } finally {
      requestPending = false;
      updateFullscreenButton();
    }
  }

  async function exitFullscreen() {
    if (!isFullscreen() || requestPending) return;
    requestPending = true;
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    } catch (_) {
      window.toast?.('The browser could not exit full screen');
    } finally {
      requestPending = false;
      updateFullscreenButton();
    }
  }

  async function toggleFullscreen() {
    if (isFullscreen()) await exitFullscreen();
    else await enterFullscreen();
  }

  function eraseCloudInterface() {
    try {
      document.title = '';
      document.documentElement.innerHTML = '<head><meta name="theme-color" content="#000000"><title></title></head><body></body>';
      document.documentElement.style.cssText = 'margin:0;width:100%;height:100%;background:#000;overflow:hidden';
      document.body.style.cssText = 'margin:0;width:100%;height:100%;background:#000;overflow:hidden';
    } catch (_) { /* final fallback is intentionally blank */ }
  }

  async function closeCloudCompletely() {
    systemPanel?.classList.add('hidden');
    if (isFullscreen()) await exitFullscreen();

    if (window.parent !== window) {
      window.parent.postMessage({ type: 'findat-cloud:exit' }, '*');
      return;
    }

    try { window.open('', '_self'); } catch (_) { /* optional close assist */ }
    try { window.close(); } catch (_) { /* browser may block scripted closing */ }

    window.setTimeout(() => {
      if (window.closed) return;
      try {
        window.location.replace('about:blank');
      } catch (_) {
        eraseCloudInterface();
      }
      window.setTimeout(() => {
        if (!window.closed && document.body) eraseCloudInterface();
      }, 80);
    }, 40);
  }

  window.closeFindatCloud = closeCloudCompletely;

  toggleButton?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    toggleFullscreen();
  });

  systemPanel?.addEventListener('click', event => {
    const button = event.target.closest('[data-action="exit-cloud"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closeCloudCompletely();
  }, true);

  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
  window.addEventListener('load', updateFullscreenButton);

  // No automatic fullscreen requests and no global click/key interception.
  // The desktop keeps working normally before, during, and after fullscreen mode.
})();
