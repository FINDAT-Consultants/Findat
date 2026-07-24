/* FINDAT Cloud persistent multi-workstation desktop */
(() => {
  'use strict';

  const STORAGE_KEY = 'findat.cloud.workstations.v1';
  const MAX_WORKSTATIONS = 24;
  const tabsRoot = qs('#workstationTabs');
  const addButton = qs('#addWorkstationBtn');
  if (!tabsRoot || !addButton) return;

  const defaultState = () => ({
    activeId: 1,
    items: [{ id: 1, name: 'Work Station No.1', path: '/Desktop' }]
  });

  function normalizeState(value) {
    const source = value && typeof value === 'object' ? value : defaultState();
    const seen = new Set();
    const items = Array.isArray(source.items) ? source.items : [];
    const normalized = items
      .map(item => ({
        id: Math.max(1, Number(item?.id) || 0),
        name: String(item?.name || ''),
        path: String(item?.path || '')
      }))
      .filter(item => item.id && !seen.has(item.id) && seen.add(item.id))
      .sort((a, b) => a.id - b.id)
      .map(item => ({
        ...item,
        name: `Work Station No.${item.id}`,
        path: item.id === 1 ? '/Desktop' : `/Workstations/Work Station No.${item.id}`
      }));

    if (!normalized.some(item => item.id === 1)) normalized.unshift({ id: 1, name: 'Work Station No.1', path: '/Desktop' });
    const activeId = normalized.some(item => item.id === Number(source.activeId)) ? Number(source.activeId) : 1;
    return { activeId, items: normalized };
  }

  function loadState() {
    try { return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
    catch (_) { return defaultState(); }
  }

  const state = loadState();

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (_) { /* Workstations still function for the current session. */ }
  }

  function activeItem() {
    return state.items.find(item => item.id === state.activeId) || state.items[0];
  }

  function currentDesktopPath() {
    return activeItem()?.path || '/Desktop';
  }

  function activeWindow(name = '') {
    const selector = `.app-window[data-workstation="${state.activeId}"]${name ? `[data-app="${CSS.escape(name)}"]` : ''}`;
    return qs(selector);
  }

  function visibleActiveWindows() {
    return qsa(`.app-window[data-workstation="${state.activeId}"]`).filter(win => !win.classList.contains('minimized') && !win.hidden);
  }

  window.FINDATWorkstations = {
    get activeId() { return state.activeId; },
    get items() { return state.items.map(item => ({ ...item })); },
    currentDesktopPath,
    switchTo: switchWorkstation,
    add: addWorkstation
  };

  async function ensureWorkstationFolder(item) {
    if (!item || item.id === 1) return;
    try {
      await (driveReadyPromise ||= initializeDrive());
      await ensureFolderChain('/Workstations');
      await ensureFolderChain(item.path);
    } catch (error) {
      toast(`Could not prepare ${item.name}: ${error.message}`);
    }
  }

  async function ensureAllWorkstationFolders() {
    for (const item of state.items) await ensureWorkstationFolder(item);
  }

  function renderTabs() {
    tabsRoot.replaceChildren(...state.items.map(item => {
      const tab = document.createElement('div');
      tab.className = `workstation-tab${item.id === state.activeId ? ' active' : ''}`;
      tab.dataset.workstationId = String(item.id);
      tab.innerHTML = `
        <button class="workstation-switch" type="button" title="Open ${item.name}" aria-label="Open ${item.name}" aria-current="${item.id === state.activeId ? 'page' : 'false'}">
          <span>${item.name}</span>
        </button>
        ${item.id === 1 ? '' : `<button class="workstation-remove" type="button" title="Remove ${item.name}" aria-label="Remove ${item.name}">−</button>`}`;
      qs('.workstation-switch', tab).addEventListener('click', () => switchWorkstation(item.id));
      qs('.workstation-remove', tab)?.addEventListener('click', event => {
        event.stopPropagation();
        removeWorkstation(item.id);
      });
      return tab;
    }));
    addButton.disabled = state.items.length >= MAX_WORKSTATIONS;
    addButton.title = addButton.disabled ? `Maximum of ${MAX_WORKSTATIONS} work stations reached` : 'Add work station';
  }

  function promoteActiveWindowNodes() {
    const active = qsa(`.app-window[data-workstation="${state.activeId}"]`);
    [...active].reverse().forEach(win => windowsEl.prepend(win));
  }

  function updateWindowVisibility() {
    qsa('.app-window').forEach(win => {
      if (!win.dataset.workstation) win.dataset.workstation = '1';
      const belongsHere = Number(win.dataset.workstation) === state.activeId;
      win.classList.toggle('workstation-hidden', !belongsHere);
      if (!belongsHere) win.classList.remove('focused');
    });
    promoteActiveWindowNodes();
  }

  function updateActiveApplicationLabel() {
    const windows = visibleActiveWindows().sort((a, b) => Number(b.style.zIndex || 0) - Number(a.style.zIndex || 0));
    const activeName = qs('#activeAppName');
    if (windows[0]) focusWindow(windows[0]);
    else if (activeName) activeName.textContent = '';
  }

  async function switchWorkstation(id, announce = true) {
    id = Number(id);
    if (!state.items.some(item => item.id === id)) return;
    state.activeId = id;
    saveState();
    await ensureWorkstationFolder(activeItem());
    renderTabs();
    updateWindowVisibility();
    try {
      clearSelection();
      fsState.activeSurface = 'desktop';
      fsState.currentFinder = activeWindow('finder') || null;
      await refreshDesktop();
      requestAnimationFrame(layoutDesktopIcons);
    } catch (_) { /* Filesystem may still be initializing. */ }
    updateActiveApplicationLabel();
    if (announce) toast(`${activeItem().name} active`);
  }

  function nextWorkstationId() {
    const used = new Set(state.items.map(item => item.id));
    let id = 2;
    while (used.has(id)) id += 1;
    return id;
  }

  async function addWorkstation() {
    if (state.items.length >= MAX_WORKSTATIONS) return toast(`A maximum of ${MAX_WORKSTATIONS} work stations is supported`);
    const id = nextWorkstationId();
    const item = { id, name: `Work Station No.${id}`, path: `/Workstations/Work Station No.${id}` };
    state.items.push(item);
    state.items.sort((a, b) => a.id - b.id);
    saveState();
    await ensureWorkstationFolder(item);
    renderTabs();
    await switchWorkstation(id, false);
    toast(`${item.name} created`);
  }

  async function removeWorkstation(id) {
    id = Number(id);
    if (id === 1) return;
    const item = state.items.find(candidate => candidate.id === id);
    if (!item) return;
    if (!await systemConfirm(`Remove ${item.name}?\n\nIts desktop files will be moved to Trash.`, { title: 'Remove Work Station', okLabel: 'Move to Trash' })) return;

    qsa(`.app-window[data-workstation="${id}"]`).forEach(win => win.remove());
    try {
      const existing = await databaseGet(item.path);
      if (existing) await fsRequest('/trash', { method: 'POST', body: JSON.stringify({ path: item.path }) });
    } catch (error) {
      toast(`The work station was removed, but its folder could not be moved to Trash: ${error.message}`);
    }

    state.items = state.items.filter(candidate => candidate.id !== id);
    if (state.activeId === id) state.activeId = 1;
    saveState();
    renderTabs();
    await switchWorkstation(state.activeId, false);
    toast(`${item.name} removed`);
  }

  addButton.addEventListener('click', addWorkstation);

  /* Keep desktop icon positions separate for each work station while preserving old Work Station No.1 positions. */
  const originalDesktopIconKey = desktopIconKey;
  desktopIconKey = function workstationDesktopIconKey(icon) {
    const base = originalDesktopIconKey(icon);
    return state.activeId === 1 || !base ? base : `workstation:${state.activeId}:${base}`;
  };

  /* Use an independent desktop folder for each work station. */
  refreshDesktop = async function workstationRefreshDesktop() {
    try {
      await ensureWorkstationFolder(activeItem());
      const data = await fsRequest('/list', {}, { path: currentDesktopPath() });
      cacheEntries(data.entries);
      const container = qs('#desktopFileIcons');
      if (!container) return;
      container.replaceChildren(...data.entries.map(entry => makeEntryButton(entry, 'desktop')));
      requestAnimationFrame(layoutDesktopIcons);
    } catch (error) {
      toast(`Drive unavailable: ${error.message}`);
    }
  };

  activeDirectory = function workstationActiveDirectory() {
    const focused = qs(`.app-window.focused[data-workstation="${state.activeId}"]`);
    if (focused?.dataset.app === 'finder') return focused.dataset.currentPath || currentDesktopPath();
    if (focused?.dataset.app === 'trash') return '/Trash';
    return currentDesktopPath();
  };

  const originalNavigateFinder = navigateFinder;
  navigateFinder = function workstationNavigateFinder(win, path, pushHistory = true) {
    const requested = path === '/Desktop' && Number(win?.dataset.workstation || state.activeId) === state.activeId ? currentDesktopPath() : path;
    return originalNavigateFinder(win, requested, pushHistory);
  };

  openFinderAt = function workstationOpenFinderAt(path) {
    const requested = path === '/Desktop' ? currentDesktopPath() : path;
    openApp('finder');
    const win = activeWindow('finder');
    if (!win) return;
    if (qs('[data-files-grid]', win)) navigateFinder(win, requested);
    else win.dataset.initialPath = requested;
  };

  const originalRefreshTrash = refreshTrash;
  refreshTrash = function workstationRefreshTrash(win) {
    return originalRefreshTrash(win || activeWindow('trash'));
  };

  refreshAllFileViews = function workstationRefreshAllFileViews() {
    refreshDesktop();
    const finder = activeWindow('finder');
    if (finder) navigateFinder(finder, finder.dataset.currentPath || currentDesktopPath(), false);
    refreshTrash(activeWindow('trash'));
    refreshUsage();
  };

  const priorOpenEntry = openEntry;
  openEntry = async function workstationOpenEntry(entry) {
    if (!entry) return;
    if (entry.type === 'folder') return openFinderAt(entry.path);
    if (entry.mime === 'application/x-aurelia-shortcut' || /\.aurlink$/i.test(entry.name || '')) return priorOpenEntry(entry);
    fsState.viewerEntry = entry;
    const existing = activeWindow('viewer');
    openApp('viewer');
    const win = existing || activeWindow('viewer');
    if (win) renderViewer(win, entry);
  };

  createDesktopShortcuts = async function workstationCreateDesktopShortcuts() {
    if (!fsState.clipboard) {
      try { fsState.clipboard = JSON.parse(sessionStorage.getItem('aurelia.fs.clipboard')); } catch (_) { /* empty */ }
    }
    if (!fsState.clipboard?.paths?.length) return toast('The FINDAT Cloud clipboard is empty');
    let created = 0;
    for (const targetPath of fsState.clipboard.paths) {
      const target = await databaseGet(targetPath);
      if (!target) continue;
      const name = `${target.name} - Shortcut.aurlink`;
      const blob = new Blob([JSON.stringify({ target: targetPath })], { type: 'application/x-aurelia-shortcut' });
      await localUpload(blob, currentDesktopPath(), name, '', 'application/x-aurelia-shortcut');
      created += 1;
    }
    refreshAllFileViews();
    toast(`${created} shortcut${created === 1 ? '' : 's'} created`);
  };

  const originalExecuteDesktopAction = executeDesktopAction;
  executeDesktopAction = function workstationExecuteDesktopAction(action) {
    if (action === 'paste') return pasteClipboard(currentDesktopPath());
    if (action === 'paste-shortcut') return createDesktopShortcuts();
    return originalExecuteDesktopAction(action);
  };

  /* Create independent application windows and activity per work station. */
  const baseFocusWindow = focusWindow;
  focusWindow = function workstationFocusWindow(win) {
    if (!win || Number(win.dataset.workstation || 1) !== state.activeId || win.classList.contains('workstation-hidden')) return;
    /* z-index is sufficient for focus. Re-inserting every window here restarted
       transitions, dropped keyboard focus, and caused the chrome to flicker. */
    baseFocusWindow(win);
  };

  closeWindow = function workstationCloseWindow(win) {
    if (windowIsBusy(win)) return;

    clearWindowTransitionTimer(win);
    win.dataset.windowState = 'closing';
    win.classList.remove('minimizing', 'restoring');
    win.classList.add('closing');

    scheduleWindowTransition(win, () => {
      win.remove();
      const remaining = visibleActiveWindows().sort((a, b) => Number(b.style.zIndex || 0) - Number(a.style.zIndex || 0));
      if (remaining[0]) focusWindow(remaining[0]);
      else {
        const activeName = qs('#activeAppName');
        if (activeName) activeName.textContent = '';
      }
    }, 190);
  };

  openApp = function workstationOpenApp(name) {
    const app = apps[name];
    if (!app) return;
    const existing = activeWindow(name);
    if (existing) {
      restoreWindow(existing);
      existing.classList.remove('workstation-hidden');
      focusWindow(existing);
      return;
    }

    const node = qs('#windowTemplate').content.firstElementChild.cloneNode(true);
    const index = qsa(`.app-window[data-workstation="${state.activeId}"]`).length;
    node.dataset.app = name;
    node.dataset.workstation = String(state.activeId);
    node.style.left = `${Math.min(70 + (index * 31) % 260, Math.max(8, windowsEl.clientWidth - 500))}px`;
    node.style.top = `${Math.min(36 + (index * 24) % 150, Math.max(8, windowsEl.clientHeight - 320))}px`;
    qs('.window-title', node).textContent = app.title;
    qs('.window-body', node).innerHTML = app.html();
    windowsEl.prepend(node);
    wireWindow(node);
    wireApp(node, name);

    if (['excel', 'word', 'powerpoint'].includes(name)) {
      node.dataset.cloudOfficeSized = 'true';
      node.style.width = 'min(1220px, 96vw)';
      node.style.height = 'min(790px, 89vh)';
      requestAnimationFrame(() => {
        node.style.left = `${Math.max(6, (windowsEl.clientWidth - node.offsetWidth) / 2)}px`;
        node.style.top = `${Math.max(6, (windowsEl.clientHeight - node.offsetHeight) / 2)}px`;
      });
    }
    focusWindow(node);
  };

  /* Files dropped on an empty desktop go to the current work station rather than Work Station No.1. */
  window.addEventListener('drop', event => {
    if (state.activeId === 1 || event.target.closest?.('[data-drop-path]')) return;
    const files = [...(event.dataTransfer?.files || [])];
    if (!files.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    fsState.dragDepth = 0;
    qs('#dropOverlay')?.classList.add('hidden');
    uploadFiles(files, currentDesktopPath());
  }, true);

  window.addEventListener('resize', () => requestAnimationFrame(layoutDesktopIcons));

  renderTabs();
  ensureAllWorkstationFolders().finally(() => switchWorkstation(state.activeId, false));
})();
