/* FINDAT Cloud browser-only virtual drive and desktop operations */
const fsState = {
  entries: new Map(),
  selected: new Set(),
  clipboard: null,
  internalClipboardArmed: false,
  activeSurface: 'desktop',
  currentFinder: null,
  viewerEntry: null,
  viewerUrl: null,
  dragDepth: 0,
  cloudOnline: true
};

const originalWireApp = wireApp;
const DRIVE_DB_NAME = 'aurelia-os-browser-drive';
const DRIVE_DB_VERSION = 1;
const DRIVE_STORE = 'nodes';
const LOGICAL_DRIVE_QUOTA = 4 * (1024 ** 4);
const STORAGE_RESERVE_BYTES = 16 * 1024 * 1024;
const COMPRESSION_MIN_BYTES = 1024;
const COMPRESSION_MIN_SAVINGS = 0.04;
const SYSTEM_FOLDERS = ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Music', 'Movies', 'Projects', 'Trash'];
let driveDatabasePromise;
let driveReadyPromise;

const DESKTOP_LAYOUT_KEY = 'aurelia.desktop.icon-layout.v1';
const DESKTOP_ICON_WIDTH = 86;
const DESKTOP_ICON_HEIGHT = 82;
const DESKTOP_ICON_GAP = 12;
let desktopLayout = loadDesktopLayout();

function loadDesktopLayout() {
  try {
    const stored = JSON.parse(localStorage.getItem(DESKTOP_LAYOUT_KEY) || '{}');
    return stored && typeof stored === 'object' ? stored : {};
  } catch (_) {
    return {};
  }
}

function saveDesktopLayout() {
  try {
    localStorage.setItem(DESKTOP_LAYOUT_KEY, JSON.stringify(desktopLayout));
  } catch (_) {
    /* The desktop can still be used when browser storage is unavailable. */
  }
}

function desktopIconKey(icon) {
  if (icon.dataset.desktopKey) return icon.dataset.desktopKey;
  if (icon.classList.contains('fs-entry') && icon.dataset.path) return `file:${icon.dataset.path}`;
  if (icon.dataset.path) return `system:path:${icon.dataset.path}`;
  if (icon.dataset.app) return `system:app:${icon.dataset.app}`;
  return '';
}

function desktopAreaSize() {
  const area = qs('#desktopIcons');
  return {
    width: Math.max(DESKTOP_ICON_WIDTH, area?.clientWidth || innerWidth),
    height: Math.max(DESKTOP_ICON_HEIGHT, area?.clientHeight || innerHeight - 25)
  };
}

function clampDesktopPosition(x, y) {
  const { width, height } = desktopAreaSize();
  return {
    x: Math.max(0, Math.min(Math.round(x), Math.max(0, width - DESKTOP_ICON_WIDTH))),
    y: Math.max(0, Math.min(Math.round(y), Math.max(0, height - DESKTOP_ICON_HEIGHT)))
  };
}

function defaultDesktopPosition(index) {
  const { width, height } = desktopAreaSize();
  const rows = Math.max(1, Math.floor((height - DESKTOP_ICON_GAP) / (DESKTOP_ICON_HEIGHT + DESKTOP_ICON_GAP)));
  const column = Math.floor(index / rows);
  const row = index % rows;
  return clampDesktopPosition(
    width - DESKTOP_ICON_WIDTH - DESKTOP_ICON_GAP - column * (DESKTOP_ICON_WIDTH + DESKTOP_ICON_GAP),
    DESKTOP_ICON_GAP + row * (DESKTOP_ICON_HEIGHT + DESKTOP_ICON_GAP)
  );
}

function selectSystemDesktopIcon(icon, event = {}) {
  const additive = event.metaKey || event.ctrlKey;
  if (!additive) clearSelection();
  if (additive && icon.classList.contains('selected')) icon.classList.remove('selected');
  else icon.classList.add('selected');
  fsState.activeSurface = 'desktop';
}

async function getTrashDesktopStats() {
  const nodes = (await databaseAll()).filter(node => node.path.startsWith('/Trash/'));
  const topLevel = nodes.filter(node => node.parent === '/Trash');
  const fileCount = nodes.filter(node => node.type === 'file').length;
  const folderCount = nodes.filter(node => node.type === 'folder').length;
  const logicalBytes = nodes.reduce((sum, node) => sum + (node.type === 'file' ? Number(node.size) || 0 : 0), 0);
  const storedBytes = nodes.reduce((sum, node) => sum + (node.type === 'file' ? storedSizeOf(node) : 0), 0);
  return {
    empty: topLevel.length === 0,
    topLevelCount: topLevel.length,
    fileCount,
    folderCount,
    logicalBytes,
    storedBytes
  };
}

async function showSystemDesktopContextMenu(icon, x, y) {
  const menu = qs('#contextMenu');
  const isTrash = icon.dataset.path === '/Trash';
  const trashStats = isTrash ? await getTrashDesktopStats() : null;
  const items = isTrash ? [
    ['open-system-icon', 'Open'],
    ['empty-trash', 'Empty Trash', trashStats?.empty],
    ['trash-info', 'Get Info'],
    ['separator'],
    ['reset-icon-position', 'Reset Position']
  ] : [
    ['open-system-icon', 'Open'],
    ['reset-icon-position', 'Reset Position']
  ];
  menu.innerHTML = items.map(item => {
    if (item[0] === 'separator') return '<hr>';
    const [action, label, disabled] = item;
    return `<button data-system-context-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`;
  }).join('');
  menu.classList.remove('hidden');
  positionFindatContextMenu(menu, x, y, 220);
  qsa('[data-system-context-action]', menu).forEach(button => button.addEventListener('click', async () => {
    menu.classList.add('hidden');
    const action = button.dataset.systemContextAction;
    if (action === 'open-system-icon') {
      if (icon.dataset.path === '/') openFinderAt('/');
      else if (icon.dataset.path === '/Trash') openApp('trash');
      else if (icon.dataset.app) openApp(icon.dataset.app);
      return;
    }
    if (action === 'empty-trash') {
      await emptyTrash();
      return;
    }
    if (action === 'trash-info') {
      const stats = trashStats || await getTrashDesktopStats();
      const lines = [
        `${stats.topLevelCount} item${stats.topLevelCount === 1 ? '' : 's'} in Trash`,
        `${stats.fileCount} file${stats.fileCount === 1 ? '' : 's'} · ${stats.folderCount} folder${stats.folderCount === 1 ? '' : 's'}`,
        `Logical size: ${formatBytes(stats.logicalBytes)}`,
        `Compressed local size: ${formatBytes(stats.storedBytes)}`
      ];
      await systemAlert(lines.join('\n'), { title: 'Trash' });
      return;
    }
    if (action === 'reset-icon-position') {
      const key = desktopIconKey(icon);
      delete desktopLayout[key];
      saveDesktopLayout();
      layoutDesktopIcons();
      toast('Desktop icon position reset');
    }
  }));
}

function bindDesktopIconPositioning(icon) {
  if (icon.dataset.desktopPositionBound === 'true') return;
  icon.dataset.desktopPositionBound = 'true';
  icon.draggable = false;

  let suppressClick = false;
  icon.addEventListener('click', event => {
    if (suppressClick) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (icon.classList.contains('system-desktop-icon')) selectSystemDesktopIcon(icon, event);
  }, true);
  icon.addEventListener('dblclick', event => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  if (icon.classList.contains('system-desktop-icon')) {
    icon.addEventListener('contextmenu', event => {
      event.preventDefault();
      event.stopPropagation();
      selectSystemDesktopIcon(icon, event);
      showSystemDesktopContextMenu(icon, event.clientX, event.clientY);
    });
  }

  icon.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const area = qs('#desktopIcons');
    if (!area) return;

    const areaRect = area.getBoundingClientRect();
    const startLeft = Number.parseFloat(icon.style.left) || icon.offsetLeft;
    const startTop = Number.parseFloat(icon.style.top) || icon.offsetTop;
    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;
    let nextPosition = { x: startLeft, y: startTop };

    icon.setPointerCapture?.(event.pointerId);

    const move = moveEvent => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      suppressClick = true;
      icon.classList.add('desktop-icon-dragging');
      nextPosition = clampDesktopPosition(startLeft + dx, startTop + dy);
      icon.style.left = `${nextPosition.x}px`;
      icon.style.top = `${nextPosition.y}px`;
      moveEvent.preventDefault();
    };

    const finish = finishEvent => {
      icon.releasePointerCapture?.(finishEvent.pointerId);
      icon.removeEventListener('pointermove', move);
      icon.removeEventListener('pointerup', finish);
      icon.removeEventListener('pointercancel', finish);
      icon.classList.remove('desktop-icon-dragging');
      if (moved) {
        if (desktopView?.alignGrid) nextPosition = snapDesktopPosition(nextPosition.x, nextPosition.y);
        icon.style.left = `${nextPosition.x}px`;
        icon.style.top = `${nextPosition.y}px`;
        if (desktopView) {
          desktopView.autoArrange = false;
          desktopView.sortBy = 'custom';
          saveDesktopView();
        }
        const key = desktopIconKey(icon);
        if (key) {
          desktopLayout[key] = nextPosition;
          saveDesktopLayout();
        }
        setTimeout(() => { suppressClick = false; }, 0);
      }
    };

    icon.addEventListener('pointermove', move);
    icon.addEventListener('pointerup', finish);
    icon.addEventListener('pointercancel', finish);
  });
}

function layoutDesktopIcons() {
  const area = qs('#desktopIcons');
  if (!area) return;
  const icons = qsa('.desktop-icon', area);
  icons.forEach((icon, index) => {
    bindDesktopIconPositioning(icon);
    const key = desktopIconKey(icon);
    const saved = key ? desktopLayout[key] : null;
    const position = saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)
      ? clampDesktopPosition(saved.x, saved.y)
      : defaultDesktopPosition(index);
    icon.style.left = `${position.x}px`;
    icon.style.top = `${position.y}px`;
  });
}

const MIME_TYPES = {
  txt: 'text/plain', md: 'text/markdown', json: 'application/json', csv: 'text/csv', html: 'text/html',
  css: 'text/css', js: 'text/javascript', py: 'text/x-python', xml: 'application/xml',
  yml: 'text/yaml', yaml: 'text/yaml', log: 'text/plain', pdf: 'application/pdf', png: 'image/png',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', mp4: 'video/mp4', webm: 'video/webm',
  zip: 'application/zip', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Browser storage request failed'));
  });
}

function openDriveDatabase() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('This browser does not support IndexedDB storage'));
  if (!driveDatabasePromise) {
    driveDatabasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DRIVE_DB_NAME, DRIVE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DRIVE_STORE)) {
          const store = db.createObjectStore(DRIVE_STORE, { keyPath: 'path' });
          store.createIndex('parent', 'parent', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open FINDAT Cloud'));
    });
  }
  return driveDatabasePromise;
}

async function databaseGet(path) {
  const db = await openDriveDatabase();
  const tx = db.transaction(DRIVE_STORE, 'readonly');
  return requestResult(tx.objectStore(DRIVE_STORE).get(path));
}

async function databaseAll() {
  const db = await openDriveDatabase();
  const tx = db.transaction(DRIVE_STORE, 'readonly');
  return requestResult(tx.objectStore(DRIVE_STORE).getAll());
}

async function databasePut(node) {
  const db = await openDriveDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRIVE_STORE, 'readwrite');
    tx.objectStore(DRIVE_STORE).put(node);
    tx.oncomplete = () => resolve(node);
    tx.onerror = () => reject(tx.error || new Error('Could not save to FINDAT Cloud'));
    tx.onabort = () => reject(tx.error || new Error('FINDAT Cloud operation was cancelled'));
  });
}

async function databaseCommit(puts = [], deletes = []) {
  const db = await openDriveDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRIVE_STORE, 'readwrite');
    const store = tx.objectStore(DRIVE_STORE);
    deletes.forEach(path => store.delete(path));
    puts.forEach(node => store.put(node));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Could not update FINDAT Cloud'));
    tx.onabort = () => reject(tx.error || new Error('FINDAT Cloud operation was cancelled'));
  });
}

function driveMime(name, provided = '') {
  if (provided) return provided;
  const extension = String(name).split('.').pop().toLowerCase();
  return MIME_TYPES[extension] || 'application/octet-stream';
}

function publicEntry(node) {
  if (!node) return node;
  return {
    name: node.name,
    path: node.path,
    type: node.type,
    size: node.size || 0,
    storedSize: storedSizeOf(node),
    compression: node.compression || '',
    modified: node.modified,
    mime: node.mime,
    shared: Boolean(node.cloudSynced),
    pending: Boolean(node.cloudPending),
    cloudObjectPath: node.cloudObjectPath || ''
  };
}

function validateName(name) {
  const value = String(name || '').trim();
  if (!value) throw new Error('A name is required');
  if (/[\\/\0]/.test(value) || value === '.' || value === '..') throw new Error('Invalid name');
  if (new TextEncoder().encode(value).length > 240) throw new Error('Name is too long');
  return value;
}

function childPath(parent, name) {
  return parent === '/' ? `/${name}` : `${parent}/${name}`;
}

async function uniqueChildPath(parent, name, allNodes = null) {
  const nodes = allNodes || await databaseAll();
  const occupied = new Set(nodes.map(node => node.path));
  let candidate = childPath(parent, name);
  if (!occupied.has(candidate)) return candidate;
  const dot = name.lastIndexOf('.');
  const extension = dot > 0 ? name.slice(dot) : '';
  const stem = dot > 0 ? name.slice(0, dot) : name;
  let number = 2;
  do candidate = childPath(parent, `${stem} ${number++}${extension}`); while (occupied.has(candidate));
  return candidate;
}

async function requireFolder(path) {
  const node = await databaseGet(path);
  if (!node) throw new Error('Folder not found');
  if (node.type !== 'folder') throw new Error('Destination is not a folder');
  return node;
}

async function ensureFolderChain(path) {
  const normalized = normalizeVirtualPath(path);
  if (normalized === '/') return;
  let current = '/';
  for (const part of normalized.split('/').filter(Boolean)) {
    const next = childPath(current, part);
    if (!await databaseGet(next)) {
      await databasePut({ path: next, parent: current, name: part, type: 'folder', size: 0, mime: 'inode/directory', modified: new Date().toISOString() });
    }
    current = next;
  }
}

async function initializeDrive() {
  const now = new Date().toISOString();
  if (!await databaseGet('/')) await databasePut({ path: '/', parent: null, name: 'FINDAT Cloud', type: 'folder', size: 0, mime: 'inode/directory', modified: now });
  for (const name of SYSTEM_FOLDERS) {
    const path = `/${name}`;
    if (!await databaseGet(path)) await databasePut({ path, parent: '/', name, type: 'folder', size: 0, mime: 'inode/directory', modified: now });
  }
  // Remove the previous sample document from existing browser profiles.
  const welcomePath = '/Desktop/Welcome to FINDAT Cloud.txt';
  if (await databaseGet(welcomePath)) {
    await databaseCommit([], [welcomePath]);
  }
  delete desktopLayout[`file:${welcomePath}`];
  saveDesktopLayout();
  if (typeof sharedCloudInitialSync === 'function') {
    try {
      await sharedCloudInitialSync();
      fsState.cloudOnline = true;
    } catch (error) {
      fsState.cloudOnline = false;
      console.warn('Shared FINDAT Cloud is unavailable; using local storage.', error);
    }
  }
  requestPersistentDriveStorage();
  migrateExistingDriveCompression().then(result => {
    if (result.saved > 0) {
      refreshUsage();
      const settingsWindow = qs('.app-window[data-app="settings"]');
      if (settingsWindow) refreshCloudSettingsPanel(settingsWindow);
    }
  }).catch(() => { /* compression is an optimisation, not a startup requirement */ });
}

function getOptionHeader(headers = {}, name) {
  const key = Object.keys(headers).find(item => item.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : '';
}

function decodeHeader(value) {
  if (!value) return '';
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}


const PRECOMPRESSED_EXTENSIONS = new Set([
  'zip', 'rar', '7z', 'gz', 'bz2', 'xz', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif',
  'mp3', 'm4a', 'aac', 'wav', 'flac', 'mp4', 'm4v', 'mov', 'webm', 'mkv', 'pdf',
  'docx', 'xlsx', 'pptx', 'woff', 'woff2'
]);

function storedSizeOf(node) {
  if (!node || node.type !== 'file') return 0;
  if (Number.isFinite(node.storedSize)) return Math.max(0, node.storedSize);
  if (node.blob instanceof Blob) return node.blob.size;
  return Number(node.size) || 0;
}

function compressionSupported() {
  return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
}

function shouldTryCompression(blob, name = '', mime = '') {
  if (!compressionSupported() || !(blob instanceof Blob) || blob.size < COMPRESSION_MIN_BYTES) return false;
  const extension = String(name).split('.').pop()?.toLowerCase() || '';
  const type = String(mime || blob.type || '').toLowerCase();
  if (PRECOMPRESSED_EXTENSIONS.has(extension)) return false;
  if (type.startsWith('audio/') || type.startsWith('video/')) return false;
  if (/^(image\/(?:jpeg|png|gif|webp|avif)|application\/(?:zip|gzip|pdf))$/.test(type)) return false;
  return true;
}

async function compressBlobForStorage(blob, name = '', mime = '') {
  const original = blob instanceof Blob ? blob : new Blob([blob || ''], { type: mime || 'application/octet-stream' });
  if (!shouldTryCompression(original, name, mime)) {
    return { blob: original, compression: '', storedSize: original.size, originalSize: original.size };
  }
  try {
    const compressed = await new Response(original.stream().pipeThrough(new CompressionStream('gzip'))).blob();
    const requiredSaving = Math.max(64, Math.ceil(original.size * COMPRESSION_MIN_SAVINGS));
    if (compressed.size >= original.size - requiredSaving) {
      return { blob: original, compression: '', storedSize: original.size, originalSize: original.size };
    }
    return { blob: compressed, compression: 'gzip', storedSize: compressed.size, originalSize: original.size };
  } catch (_) {
    return { blob: original, compression: '', storedSize: original.size, originalSize: original.size };
  }
}

async function restoreStoredBlob(node) {
  const stored = node?.blob instanceof Blob
    ? node.blob
    : new Blob([node?.blob || ''], { type: node?.compression ? 'application/octet-stream' : node?.mime || 'application/octet-stream' });
  if (node?.compression !== 'gzip') return stored;
  if (typeof DecompressionStream !== 'function') throw new Error('This browser cannot open compressed FINDAT Cloud files');
  try {
    const buffer = await new Response(stored.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    return new Blob([buffer], { type: node.mime || 'application/octet-stream' });
  } catch (_) {
    throw new Error(`Could not decompress ${node.name || 'this file'}`);
  }
}

async function browserStorageEstimate() {
  try {
    const estimate = await navigator.storage?.estimate?.();
    return {
      usage: Number(estimate?.usage) || 0,
      quota: Number(estimate?.quota) || 0
    };
  } catch (_) {
    return { usage: 0, quota: 0 };
  }
}

async function ensureBrowserCapacity(additionalStoredBytes) {
  const additional = Math.max(0, Number(additionalStoredBytes) || 0);
  if (!additional) return;
  const estimate = await browserStorageEstimate();
  if (!estimate.quota) return;
  const reserve = Math.min(STORAGE_RESERVE_BYTES, Math.max(1024 * 1024, estimate.quota * 0.01));
  if (estimate.usage + additional > Math.max(0, estimate.quota - reserve)) {
    throw new Error('Local browser storage is full. Free device space or export and remove files before continuing.');
  }
}

async function requestPersistentDriveStorage() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch (_) { /* persistence remains optional */ }
}

let compressionMigrationPromise;
function migrateExistingDriveCompression() {
  if (compressionMigrationPromise) return compressionMigrationPromise;
  compressionMigrationPromise = (async () => {
    if (!compressionSupported()) return { files: 0, saved: 0 };
    const nodes = await databaseAll();
    let files = 0;
    let saved = 0;
    for (const node of nodes) {
      if (node.type !== 'file' || node.compression || node.compressionChecked === 1 || !(node.blob instanceof Blob)) continue;
      const packed = await compressBlobForStorage(node.blob, node.name, node.mime);
      if (!packed.compression) {
        await databasePut({ ...node, storedSize: storedSizeOf(node), compressionChecked: 1 });
        continue;
      }
      await databasePut({
        ...node,
        size: Number(node.size) || packed.originalSize,
        storedSize: packed.storedSize,
        compression: packed.compression,
        compressionVersion: 1,
        compressionChecked: 1,
        blob: packed.blob
      });
      files += 1;
      saved += Math.max(0, packed.originalSize - packed.storedSize);
    }
    return { files, saved };
  })().finally(() => { compressionMigrationPromise = null; });
  return compressionMigrationPromise;
}

async function localList(path) {
  await requireFolder(path);
  const all = await databaseAll();
  const entries = all.filter(node => node.parent === path)
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) : a.type === 'folder' ? -1 : 1))
    .map(publicEntry);
  return { path, entries };
}

async function localStat(path) {
  const node = await databaseGet(path);
  if (!node) throw new Error('Item not found');
  return publicEntry(node);
}

async function localUsage() {
  const all = await databaseAll();
  const logicalUsed = all.reduce((sum, node) => sum + (node.type === 'file' ? Number(node.size) || 0 : 0), 0);
  const storedUsed = all.reduce((sum, node) => sum + storedSizeOf(node), 0);
  const estimate = await browserStorageEstimate();
  const browserUsed = estimate.usage || storedUsed;
  const browserQuota = estimate.quota || 0;
  return {
    used: logicalUsed,
    logicalUsed,
    stored: storedUsed,
    quota: LOGICAL_DRIVE_QUOTA,
    free: Math.max(0, LOGICAL_DRIVE_QUOTA - logicalUsed),
    saved: Math.max(0, logicalUsed - storedUsed),
    browserUsed,
    browserQuota,
    browserFree: browserQuota ? Math.max(0, browserQuota - browserUsed) : 0
  };
}

async function localFolder(parent, name) {
  parent = normalizeVirtualPath(parent);
  await requireFolder(parent);
  name = validateName(name);
  const path = await uniqueChildPath(parent, name);
  const node = { path, parent, name: basename(path), type: 'folder', size: 0, mime: 'inode/directory', modified: new Date().toISOString() };
  await databasePut(node);
  return publicEntry(node);
}

async function localUpload(blobValue, parent, name, relativePath = '', mime = '') {
  parent = normalizeVirtualPath(parent);
  await requireFolder(parent);
  const blob = blobValue instanceof Blob ? blobValue : new Blob([blobValue || ''], { type: mime || 'application/octet-stream' });
  const relativeParts = String(relativePath || '').replace(/\\/g, '/').split('/').filter(Boolean);
  if (relativeParts.length > 1) {
    for (const part of relativeParts.slice(0, -1)) {
      const valid = validateName(part);
      const folderPath = childPath(parent, valid);
      if (!await databaseGet(folderPath)) await databasePut({ path: folderPath, parent, name: valid, type: 'folder', size: 0, mime: 'inode/directory', modified: new Date().toISOString() });
      parent = folderPath;
    }
  }
  name = validateName(name);
  const path = await uniqueChildPath(parent, name);
  const resolvedMime = driveMime(name, mime || blob.type);
  const packed = await compressBlobForStorage(blob, name, resolvedMime);
  const usage = await localUsage();
  if (usage.logicalUsed + blob.size > LOGICAL_DRIVE_QUOTA) throw new Error('FINDAT Cloud 4 TB virtual capacity exceeded');
  await requestPersistentDriveStorage();
  await ensureBrowserCapacity(packed.storedSize);
  const node = {
    path,
    parent,
    name: basename(path),
    type: 'file',
    size: blob.size,
    storedSize: packed.storedSize,
    compression: packed.compression,
    compressionVersion: packed.compression ? 1 : 0,
    compressionChecked: 1,
    mime: resolvedMime,
    modified: new Date().toISOString(),
    cloudPending: Boolean(typeof sharedCloudEnabled === 'function' && sharedCloudEnabled()),
    blob: packed.blob
  };
  await databasePut(node);
  return publicEntry(node);
}

async function localWrite(path, content) {
  path = normalizeVirtualPath(path);
  const parent = parentPath(path);
  await requireFolder(parent);
  const current = await databaseGet(path);
  if (current?.type === 'folder') throw new Error('Cannot overwrite a folder');
  const mime = driveMime(path, current?.mime || '');
  const blob = new Blob([String(content ?? '')], { type: mime });
  const packed = await compressBlobForStorage(blob, basename(path), mime);
  const usage = await localUsage();
  const nextLogicalUsed = usage.logicalUsed - (Number(current?.size) || 0) + blob.size;
  if (nextLogicalUsed > LOGICAL_DRIVE_QUOTA) throw new Error('FINDAT Cloud 4 TB virtual capacity exceeded');
  await ensureBrowserCapacity(Math.max(0, packed.storedSize - storedSizeOf(current)));
  const node = {
    path,
    parent,
    name: basename(path),
    type: 'file',
    size: blob.size,
    storedSize: packed.storedSize,
    compression: packed.compression,
    compressionVersion: packed.compression ? 1 : 0,
    compressionChecked: 1,
    mime,
    modified: new Date().toISOString(),
    cloudPending: Boolean(typeof sharedCloudEnabled === 'function' && sharedCloudEnabled()),
    blob: packed.blob
  };
  await databasePut(node);
  return publicEntry(node);
}

async function subtree(path) {
  const all = await databaseAll();
  return all.filter(node => node.path === path || node.path.startsWith(`${path}/`));
}

async function localTransfer(source, destination, moving) {
  source = normalizeVirtualPath(source);
  destination = normalizeVirtualPath(destination);
  if (source === '/') throw new Error('Cannot move the drive root');
  await requireFolder(destination);
  const sourceNode = await databaseGet(source);
  if (!sourceNode) throw new Error('Item not found');
  if (source === destination || destination.startsWith(`${source}/`)) throw new Error('Cannot place a folder inside itself');
  const all = await databaseAll();
  const destinationPath = await uniqueChildPath(destination, sourceNode.name, all);
  const descendants = all.filter(node => node.path === source || node.path.startsWith(`${source}/`));
  if (!moving) {
    const addedLogical = descendants.reduce((sum, node) => sum + (node.type === 'file' ? Number(node.size) || 0 : 0), 0);
    const addedStored = descendants.reduce((sum, node) => sum + storedSizeOf(node), 0);
    const usage = await localUsage();
    if (usage.logicalUsed + addedLogical > LOGICAL_DRIVE_QUOTA) throw new Error('FINDAT Cloud 4 TB virtual capacity exceeded');
    await ensureBrowserCapacity(addedStored);
  }
  const now = new Date().toISOString();
  const puts = descendants.map(node => {
    const path = destinationPath + node.path.slice(source.length);
    const parent = node.path === source ? destination : destinationPath + node.parent.slice(source.length);
    const next = { ...node, path, parent, name: basename(path), modified: now };
    if (moving) {
      next.cloudPreviousPath = node.path;
      next.cloudPreviousObjectPath = node.cloudObjectPath || '';
    } else {
      next.cloudSynced = 0;
      next.cloudPending = Boolean(typeof sharedCloudEnabled === 'function' && sharedCloudEnabled());
      next.cloudObjectPath = '';
      next.cloudModified = '';
      next.cloudPreviousPath = '';
      next.cloudPreviousObjectPath = '';
    }
    return next;
  });
  await databaseCommit(puts, moving ? descendants.map(node => node.path) : []);
  return publicEntry(puts[0]);
}

async function localRename(path, name) {
  path = normalizeVirtualPath(path);
  if (path === '/') throw new Error('Cannot rename the drive root');
  name = validateName(name);
  const node = await databaseGet(path);
  if (!node) throw new Error('Item not found');
  const destinationPath = childPath(node.parent, name);
  if (await databaseGet(destinationPath)) throw new Error('An item with that name already exists');
  const descendants = await subtree(path);
  const now = new Date().toISOString();
  const puts = descendants.map(item => {
    const newPath = destinationPath + item.path.slice(path.length);
    const newParent = item.path === path ? node.parent : destinationPath + item.parent.slice(path.length);
    return {
      ...item,
      path: newPath,
      parent: newParent,
      name: basename(newPath),
      modified: now,
      cloudPreviousPath: item.path,
      cloudPreviousObjectPath: item.cloudObjectPath || ''
    };
  });
  await databaseCommit(puts, descendants.map(item => item.path));
  return publicEntry(puts[0]);
}

async function localTrash(path) {
  path = normalizeVirtualPath(path);
  const node = await databaseGet(path);
  if (!node) throw new Error('Item not found');
  if (node.parent === '/') throw new Error('Cannot trash a top-level system folder');
  const moved = await localTransfer(path, '/Trash', true);
  const stored = await databaseGet(moved.path);
  stored.originalPath = path;
  await databasePut(stored);
  return publicEntry(stored);
}

async function localRestore(path) {
  path = normalizeVirtualPath(path);
  const node = await databaseGet(path);
  if (!node || node.parent !== '/Trash') throw new Error('Only Trash items can be restored');
  const original = node.originalPath || `/Desktop/${node.name}`;
  await ensureFolderChain(parentPath(original));
  return localTransfer(path, parentPath(original), true);
}

async function localDelete(path) {
  path = normalizeVirtualPath(path);
  if (path === '/') throw new Error('Cannot delete the drive root');
  const descendants = await subtree(path);
  if (!descendants.length) throw new Error('Item not found');
  await databaseCommit([], descendants.map(node => node.path));
  return { ok: true };
}

async function localEmptyTrash() {
  const descendants = (await databaseAll()).filter(node => node.path.startsWith('/Trash/'));
  await databaseCommit([], descendants.map(node => node.path));
  return { ok: true };
}

async function readLocalFile(path) {
  const node = await databaseGet(normalizeVirtualPath(path));
  if (!node || node.type !== 'file') throw new Error('File not found');
  if (!(node.blob instanceof Blob) && node.cloudObjectPath && typeof sharedCloudDownloadObject === 'function') {
    const blob = await sharedCloudDownloadObject({
      name: node.name,
      object_path: node.cloudObjectPath
    });
    const packed = await compressBlobForStorage(blob, node.name, node.mime || blob.type);
    await databasePut({
      ...node,
      storedSize: packed.storedSize,
      compression: packed.compression,
      compressionVersion: packed.compression ? 1 : 0,
      compressionChecked: 1,
      blob: packed.blob
    });
    return blob;
  }
  return restoreStoredBlob(node);
}

async function markCloudChangesPending(beforeNodes, afterNodes) {
  if (!(typeof sharedCloudEnabled === 'function' && sharedCloudEnabled())) return afterNodes;
  const before = new Map((beforeNodes || []).map(node => [node.path, node]));
  const pending = [];
  for (const node of afterNodes) {
    if (!(typeof sharedCloudShareable === 'function' && sharedCloudShareable(node))) continue;
    const previous = before.get(node.path);
    const changed = !previous ||
      (typeof sharedCloudNodeFingerprint === 'function' &&
        sharedCloudNodeFingerprint(node) !== sharedCloudNodeFingerprint(previous));
    if (!changed) continue;
    pending.push({ ...node, cloudSynced: 0, cloudPending: true });
  }
  if (pending.length) {
    await databaseCommit(pending, []);
    const pendingByPath = new Map(pending.map(node => [node.path, node]));
    return afterNodes.map(node => pendingByPath.get(node.path) || node);
  }
  return afterNodes;
}

async function fsRequest(route, options = {}, params = {}) {
  setCloudBusy(true);
  try {
    await (driveReadyPromise ||= initializeDrive());
    const method = String(options.method || 'GET').toUpperCase();
    const body = typeof options.body === 'string' && options.body ? JSON.parse(options.body) : {};
    const mutating = method !== 'GET';
    let beforeNodes = null;
    if (mutating && typeof sharedCloudEnabled === 'function' && sharedCloudEnabled()) {
      await sharedCloudEnsureFresh();
      beforeNodes = await databaseAll();
    }
    let result;
    if (method === 'GET' && route === '/list') result = await localList(normalizeVirtualPath(params.path || '/'));
    else if (method === 'GET' && route === '/stat') result = await localStat(normalizeVirtualPath(params.path || '/'));
    else if (method === 'GET' && route === '/usage') result = await localUsage();
    else if (method === 'POST' && route === '/folder') result = await localFolder(body.path || '/', body.name);
    else if (method === 'POST' && route === '/upload') {
      const headers = options.headers || {};
      const name = decodeHeader(getOptionHeader(headers, 'X-File-Name-B64')) || getOptionHeader(headers, 'X-File-Name') || options.body?.name || 'Untitled';
      const target = decodeHeader(getOptionHeader(headers, 'X-Target-Path-B64')) || getOptionHeader(headers, 'X-Target-Path') || '/';
      const relative = decodeHeader(getOptionHeader(headers, 'X-Relative-Path-B64')) || getOptionHeader(headers, 'X-Relative-Path') || '';
      result = await localUpload(options.body, target, name, relative, getOptionHeader(headers, 'Content-Type'));
    }
    else if (method === 'POST' && route === '/write') result = await localWrite(body.path, body.content);
    else if (method === 'POST' && route === '/copy') result = await localTransfer(body.source, body.destination, false);
    else if (method === 'POST' && route === '/move') result = await localTransfer(body.source, body.destination, true);
    else if (method === 'POST' && route === '/rename') result = await localRename(body.path, body.name);
    else if (method === 'POST' && route === '/trash') result = await localTrash(body.path);
    else if (method === 'POST' && route === '/restore') result = await localRestore(body.path);
    else if (method === 'POST' && route === '/empty-trash') result = await localEmptyTrash();
    else if (method === 'DELETE' && route === '') result = await localDelete(params.path);
    else throw new Error('Browser drive operation not found');
    if (mutating && beforeNodes && typeof sharedCloudPushDiff === 'function') {
      let afterNodes = await databaseAll();
      afterNodes = await markCloudChangesPending(beforeNodes, afterNodes);
      if (route === '/upload' && typeof refreshAllFileViews === 'function') refreshAllFileViews();
      await sharedCloudPushDiff(beforeNodes, afterNodes);
      if (result?.path) {
        const synced = await databaseGet(result.path);
        if (synced) result = publicEntry(synced);
      }
    }
    fsState.cloudOnline = true;
    return result;
  } catch (error) {
    fsState.cloudOnline = false;
    setCloudBusy(false, true);
    throw error;
  } finally {
    setCloudBusy(false);
  }
}

function setCloudBusy(busy, failed = false) {
  const indicator = qs('#cloudStatus');
  if (!indicator) return;
  indicator.classList.toggle('syncing', busy);
  indicator.classList.toggle('offline', failed || !fsState.cloudOnline);
  indicator.textContent = failed || !fsState.cloudOnline ? '◌' : busy ? '↻' : '☁';
  const shared = typeof sharedCloudEnabled === 'function' && sharedCloudEnabled();
  indicator.title = failed || !fsState.cloudOnline
    ? shared ? 'Shared FINDAT Cloud unavailable; local files remain available' : 'FINDAT Cloud storage unavailable'
    : busy ? shared ? 'Syncing shared FINDAT Cloud' : 'Saving to FINDAT Cloud'
      : shared ? 'Shared FINDAT Cloud is connected' : 'FINDAT Cloud local workspace ready';
}

function encodeHeader(value) {
  const bytes = new TextEncoder().encode(value || '');
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function formatBytes(bytes) {
  if (!bytes) return '0 bytes';
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const index = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** index);
  return `${value.toFixed(index === 0 || value >= 10 ? 0 : 1)} ${units[index]}`;
}

function normalizeVirtualPath(path, base = '/') {
  const source = path?.startsWith('/') ? path : `${base.replace(/\/$/, '')}/${path || ''}`;
  const parts = [];
  source.replace(/\\/g, '/').split('/').forEach(part => {
    if (!part || part === '.') return;
    if (part === '..') parts.pop();
    else parts.push(part);
  });
  return `/${parts.join('/')}`;
}

function parentPath(path) {
  const normalized = normalizeVirtualPath(path);
  const parts = normalized.split('/').filter(Boolean);
  parts.pop();
  return `/${parts.join('/')}` || '/';
}

function basename(path) {
  return normalizeVirtualPath(path).split('/').filter(Boolean).pop() || 'FINDAT Cloud';
}

function fileGlyph(entry) {
  if (entry.type === 'folder') return '<span class="virtual-icon folder-icon"><i></i></span>';
  const extension = entry.name.split('.').pop()?.toLowerCase();
  const glyphs = {
    pdf: ['PDF', 'pdf'], doc: ['DOC', 'doc'], docx: ['DOC', 'doc'], xls: ['XLS', 'sheet'], xlsx: ['XLS', 'sheet'],
    ppt: ['PPT', 'slides'], pptx: ['PPT', 'slides'], aurlink: ['↗', 'shortcut'], zip: ['ZIP', 'archive'], rar: ['RAR', 'archive'],
    txt: ['TXT', 'text'], md: ['MD', 'text'], js: ['JS', 'code'], html: ['HTML', 'code'], css: ['CSS', 'code'],
    png: ['IMG', 'image'], jpg: ['IMG', 'image'], jpeg: ['IMG', 'image'], gif: ['GIF', 'image'], webp: ['IMG', 'image'], svg: ['SVG', 'image'],
    mp3: ['♫', 'audio'], wav: ['♫', 'audio'], m4a: ['♫', 'audio'], mp4: ['▶', 'video'], webm: ['▶', 'video']
  };
  const [label, kind] = glyphs[extension] || ['FILE', 'generic'];
  return `<span class="virtual-icon file-icon ${kind}"><i>${label}</i></span>`;
}

function cacheEntries(entries) {
  entries.forEach(entry => fsState.entries.set(entry.path, entry));
}

function clearSelection() {
  fsState.selected.clear();
  qsa('.fs-entry.selected, .system-desktop-icon.selected').forEach(node => node.classList.remove('selected'));
}

function selectEntry(entry, node, event = {}) {
  const additive = event.metaKey || event.ctrlKey;
  if (!additive) clearSelection();
  if (additive && fsState.selected.has(entry.path)) {
    fsState.selected.delete(entry.path);
    node.classList.remove('selected');
  } else {
    fsState.selected.add(entry.path);
    node.classList.add('selected');
  }
  fsState.activeSurface = node.closest('.app-window')?.dataset.app === 'finder' ? 'finder' : node.closest('.app-window')?.dataset.app === 'trash' ? 'trash' : 'desktop';
}

function selectedEntries() {
  return [...fsState.selected].map(path => fsState.entries.get(path)).filter(Boolean);
}

function makeEntryButton(entry, surface = 'finder') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = surface === 'desktop' ? 'desktop-icon virtual-desktop-file fs-entry' : 'file-card virtual-file-card fs-entry';
  button.dataset.path = entry.path;
  button.dataset.type = entry.type;
  button.draggable = surface !== 'desktop';
  const cloudProvider = typeof sharedCloudStatus === 'function' ? sharedCloudStatus().provider : '';
  const pendingTitle = cloudProvider === 'supabase'
    ? 'Uploading to Supabase Storage and SQL database'
    : 'Uploading to shared cloud';
  const storedTitle = cloudProvider === 'supabase'
    ? 'Stored in Supabase Storage and PostgreSQL'
    : 'Stored in shared cloud';
  const cloudBadge = entry.pending
    ? `<span class="pending-cloud-badge" title="${pendingTitle}"><i></i></span>`
    : entry.shared ? `<span class="shared-cloud-badge" title="${storedTitle}">☁</span>` : '';
  button.innerHTML = `${fileGlyph(entry)}${cloudBadge}<small class="entry-name">${escapeHtml(entry.name)}</small>`;
  button.title = `${entry.name}${entry.type === 'file' ? ` · ${formatBytes(entry.size)}` : ''}${entry.pending ? ` · ${pendingTitle}` : entry.shared ? ` · ${storedTitle}` : ''}`;
  button.addEventListener('click', event => selectEntry(entry, button, event));
  button.addEventListener('dblclick', event => {
    event.preventDefault();
    openEntry(entry);
  });
  button.addEventListener('contextmenu', event => {
    event.preventDefault();
    if (!fsState.selected.has(entry.path)) selectEntry(entry, button, event);
    showContextMenu(event.clientX, event.clientY, entry, surface);
  });
  button.addEventListener('dragstart', event => {
    if (!fsState.selected.has(entry.path)) selectEntry(entry, button, event);
    const paths = [...fsState.selected];
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData('application/x-aurelia-paths', JSON.stringify(paths));
    event.dataTransfer.setData('text/plain', paths.join('\n'));
    button.classList.add('drag-source');
  });
  button.addEventListener('dragend', () => button.classList.remove('drag-source'));

  if (entry.type === 'folder') {
    button.dataset.dropPath = entry.path;
    button.addEventListener('dragover', event => {
      if (event.dataTransfer.types.includes('application/x-aurelia-paths') || event.dataTransfer.types.includes('Files')) {
        event.preventDefault();
        event.dataTransfer.dropEffect = event.altKey ? 'copy' : 'move';
        button.classList.add('drop-target');
      }
    });
    button.addEventListener('dragleave', () => button.classList.remove('drop-target'));
    button.addEventListener('drop', async event => {
      button.classList.remove('drop-target');
      const raw = event.dataTransfer.getData('application/x-aurelia-paths');
      const localFiles = [...(event.dataTransfer.files || [])];
      if (!raw && !localFiles.length) return;
      event.preventDefault();
      event.stopPropagation();
      if (localFiles.length) {
        uploadFiles(localFiles, entry.path);
        return;
      }
      try {
        const paths = JSON.parse(raw);
        await transferPaths(paths, entry.path, event.altKey ? 'copy' : 'move');
      } catch (error) {
        toast(error.message);
      }
    });
  }
  return button;
}

async function refreshDesktop() {
  try {
    const data = await fsRequest('/list', {}, { path: '/Desktop' });
    cacheEntries(data.entries);
    const container = qs('#desktopFileIcons');
    if (!container) return;
    container.replaceChildren(...data.entries.map(entry => makeEntryButton(entry, 'desktop')));
    requestAnimationFrame(layoutDesktopIcons);
  } catch (error) {
    toast(`Drive unavailable: ${error.message}`);
  }
}

function finderMarkup() {
  return `<div class="finder virtual-finder">
    <aside class="sidebar finder-sidebar">
      <h5>Favorites</h5>
      <button data-fs-path="/Desktop">▣ Desktop</button>
      <button data-fs-path="/Documents">▤ Documents</button>
      <button data-fs-path="/Downloads">⇩ Downloads</button>
      <button data-fs-path="/Pictures">◉ Pictures</button>
      <button data-fs-path="/Music">♫ Music</button>
      <button data-fs-path="/Movies">▶ Movies</button>
      <h5>Locations</h5>
      <button data-fs-path="/">☁ FINDAT Cloud</button>
      <button data-fs-path="/Trash">♲ Trash</button>
      <div class="sidebar-storage"><span>FINDAT Cloud</span><div class="storage-color-bar sidebar-storage-bar" aria-label="Used and free storage"><i class="used-space-segment" data-sidebar-usage></i><i class="free-space-segment" data-sidebar-free></i></div><div class="storage-color-legend"><span class="used">Used</span><span class="free">Free</span></div><small data-sidebar-usage-label>Loading…</small></div>
    </aside>
    <main class="file-area finder-file-area" data-drop-path="/Desktop">
      <div class="finder-toolbar">
        <div class="finder-nav"><button data-nav="back" aria-label="Back">‹</button><button data-nav="forward" aria-label="Forward">›</button></div>
        <div class="path-pill"><span>☁</span><b data-path-label>Desktop</b></div>
        <div class="finder-actions">
          <button data-finder-action="new-folder" title="New folder">＋</button>
          <button data-finder-action="upload" title="Import files">⇩</button>
          <input data-finder-search type="search" placeholder="Search">
        </div>
      </div>
      <div class="files-grid virtual-files-grid" data-files-grid tabindex="0"></div>
      <div class="finder-empty hidden" data-finder-empty><span>☁</span><b>This folder is empty</b><small>Drop or paste files here, or use the import button.</small></div>
      <footer class="finder-status"><span data-item-count>0 items</span><span data-folder-status>FINDAT Cloud</span></footer>
    </main>
  </div>`;
}

function trashMarkup() {
  return `<div class="trash-browser" data-drop-path="/Trash">
    <div class="trash-toolbar"><h2>Trash</h2><div><button data-trash-action="restore">Restore</button><button class="danger" data-trash-action="empty">Empty Trash</button></div></div>
    <div class="files-grid virtual-files-grid trash-grid" data-trash-grid></div>
    <div class="finder-empty hidden" data-trash-empty><span>♲</span><b>Trash is empty</b><small>Items moved to Trash appear here.</small></div>
  </div>`;
}

function viewerMarkup() {
  return `<div class="viewer-app"><div class="viewer-toolbar"><div data-viewer-meta></div><div><button data-viewer-action="share" class="hidden">Copy Shared Link</button><button data-viewer-action="save" class="hidden">Save</button><button data-viewer-action="download">Download</button></div></div><div class="viewer-content" data-viewer-content><div class="viewer-loading">Opening file…</div></div></div>`;
}

apps.finder.html = finderMarkup;
apps.trash.html = trashMarkup;
apps.viewer = { title: 'Preview', html: viewerMarkup };
apps.settings.html = fullSettingsMarkup;
apps.about.html = () => `<div class="about"><div class="about-logo"><span class="aurelia-symbol"></span></div><h1>FINDAT Cloud</h1><p>Version 4.0 Cloud Office Edition</p><p>A cloud-style web desktop with a persistent FINDAT Cloud workspace, file import, clipboard operations and desktop-style window management.</p><small>Built with HTML, CSS and JavaScript. It runs directly from index.html and runs as a self-contained HTML, CSS and JavaScript application.</small></div>`;

async function navigateFinder(win, path, pushHistory = true) {
  const targetPath = normalizeVirtualPath(path);
  const requestId = (win._navRequestId || 0) + 1;
  win._navRequestId = requestId;
  try {
    const data = await fsRequest('/list', {}, { path: targetPath });
    if (win._navRequestId !== requestId) return;
    cacheEntries(data.entries);
    win.dataset.currentPath = data.path;
    fsState.currentFinder = win;
    fsState.activeSurface = 'finder';
    clearSelection();

    if (!win._history) {
      win._history = [data.path];
      win._historyIndex = 0;
    } else if (pushHistory && win._history[win._historyIndex] !== data.path) {
      win._history = win._history.slice(0, win._historyIndex + 1);
      win._history.push(data.path);
      win._historyIndex = win._history.length - 1;
    }

    const grid = qs('[data-files-grid]', win);
    grid.replaceChildren(...data.entries.map(entry => makeEntryButton(entry, 'finder')));
    win._allEntries = data.entries;
    qs('[data-path-label]', win).textContent = data.path === '/' ? 'FINDAT Cloud' : basename(data.path);
    qs('.finder-file-area', win).dataset.dropPath = data.path;
    qs('[data-item-count]', win).textContent = `${data.entries.length} item${data.entries.length === 1 ? '' : 's'}`;
    qs('[data-folder-status]', win).textContent = data.path;
    qs('[data-finder-empty]', win).classList.toggle('hidden', data.entries.length !== 0);
    qsa('[data-fs-path]', win).forEach(button => button.classList.toggle('active', button.dataset.fsPath === data.path));
    qs('[data-nav="back"]', win).disabled = win._historyIndex <= 0;
    qs('[data-nav="forward"]', win).disabled = win._historyIndex >= win._history.length - 1;
    qs('.window-title', win).textContent = data.path === '/' ? 'FINDAT Cloud' : basename(data.path);
    refreshUsage(win);
  } catch (error) {
    toast(error.message);
  }
}

function filterFinder(win, query) {
  const normalized = query.trim().toLowerCase();
  const entries = (win._allEntries || []).filter(entry => entry.name.toLowerCase().includes(normalized));
  const grid = qs('[data-files-grid]', win);
  grid.replaceChildren(...entries.map(entry => makeEntryButton(entry, 'finder')));
  qs('[data-item-count]', win).textContent = `${entries.length} item${entries.length === 1 ? '' : 's'}`;
  qs('[data-finder-empty]', win).classList.toggle('hidden', entries.length !== 0);
}

function initFinder(win) {
  qsa('[data-fs-path]', win).forEach(button => button.addEventListener('click', () => navigateFinder(win, button.dataset.fsPath)));
  qs('[data-nav="back"]', win).addEventListener('click', () => {
    if (win._historyIndex <= 0) return;
    win._historyIndex -= 1;
    navigateFinder(win, win._history[win._historyIndex], false);
  });
  qs('[data-nav="forward"]', win).addEventListener('click', () => {
    if (win._historyIndex >= win._history.length - 1) return;
    win._historyIndex += 1;
    navigateFinder(win, win._history[win._historyIndex], false);
  });
  qs('[data-finder-action="new-folder"]', win).addEventListener('click', () => createFolder(win.dataset.currentPath || '/Desktop'));
  qs('[data-finder-action="upload"]', win).addEventListener('click', () => qs('#fileUploadInput').click());
  qs('[data-finder-search]', win).addEventListener('input', event => filterFinder(win, event.target.value));
  const area = qs('.finder-file-area', win);
  area.addEventListener('click', event => { if (!event.target.closest('.fs-entry')) clearSelection(); });
  area.addEventListener('contextmenu', event => {
    if (event.target.closest('.fs-entry')) return;
    event.preventDefault();
    clearSelection();
    showContextMenu(event.clientX, event.clientY, null, 'finder');
  });
  navigateFinder(win, win.dataset.initialPath || '/Desktop');
}

async function refreshTrash(win = qs('.app-window[data-app="trash"]')) {
  if (!win) return;
  try {
    const data = await fsRequest('/list', {}, { path: '/Trash' });
    cacheEntries(data.entries);
    const grid = qs('[data-trash-grid]', win);
    grid.replaceChildren(...data.entries.map(entry => makeEntryButton(entry, 'trash')));
    qs('[data-trash-empty]', win).classList.toggle('hidden', data.entries.length !== 0);
  } catch (error) {
    toast(error.message);
  }
}

function initTrash(win) {
  qs('[data-trash-action="restore"]', win).addEventListener('click', restoreSelected);
  qs('[data-trash-action="empty"]', win).addEventListener('click', emptyTrash);
  qs('.trash-browser', win).addEventListener('click', event => { if (!event.target.closest('.fs-entry, button')) clearSelection(); });
  refreshTrash(win);
}

function openEntry(entry) {
  if (entry.type === 'folder') {
    openFinderAt(entry.path);
    return;
  }
  fsState.viewerEntry = entry;
  const existing = qs('.app-window[data-app="viewer"]');
  openApp('viewer');
  const win = existing || qs('.app-window[data-app="viewer"]');
  if (win) renderViewer(win, entry);
}

function openFinderAt(path) {
  openApp('finder');
  const win = qs('.app-window[data-app="finder"]');
  if (!win) return;
  if (qs('[data-files-grid]', win)) navigateFinder(win, path);
  else win.dataset.initialPath = path;
}

async function objectUrlForEntry(entry) {
  if (fsState.viewerUrl) {
    URL.revokeObjectURL(fsState.viewerUrl);
    fsState.viewerUrl = null;
  }
  const blob = await readLocalFile(entry.path);
  fsState.viewerUrl = URL.createObjectURL(blob);
  return fsState.viewerUrl;
}

async function previewUrlForEntry(entry) {
  const sharedUrl = typeof sharedCloudPublicUrl === 'function' ? sharedCloudPublicUrl(entry) : '';
  if (sharedUrl) {
    if (fsState.viewerUrl) {
      URL.revokeObjectURL(fsState.viewerUrl);
      fsState.viewerUrl = null;
    }
    return sharedUrl;
  }
  return objectUrlForEntry(entry);
}

async function copySharedLink(entry) {
  const url = typeof sharedCloudPublicUrl === 'function' ? sharedCloudPublicUrl(entry) : '';
  if (!url) return toast('This file is not published to the shared cloud');
  try {
    await navigator.clipboard.writeText(url);
    toast('Shared link copied');
  } catch (_) {
    const input = document.createElement('textarea');
    input.value = url;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    toast(copied ? 'Shared link copied' : 'Could not copy the shared link');
  }
}

function isTextEntry(entry) {
  return entry.mime?.startsWith('text/') || /\.(txt|md|json|csv|html|css|js|rb|py|xml|yml|yaml|log)$/i.test(entry.name);
}

async function renderViewer(win, entry) {
  fsState.viewerEntry = entry;
  qs('.window-title', win).textContent = entry.name;
  qs('[data-viewer-meta]', win).innerHTML = `<b>${escapeHtml(entry.name)}</b><small>${formatBytes(entry.size)} · ${new Date(entry.modified).toLocaleString()}</small>`;
  const content = qs('[data-viewer-content]', win);
  const save = qs('[data-viewer-action="save"]', win);
  const share = qs('[data-viewer-action="share"]', win);
  save.classList.add('hidden');
  share?.classList.toggle('hidden', !(typeof sharedCloudPublicUrl === 'function' && sharedCloudPublicUrl(entry)));
  content.innerHTML = '<div class="viewer-loading">Opening file…</div>';

  try {
    const blob = await readLocalFile(entry.path);
    if (entry.mime?.startsWith('image/')) {
      const url = await previewUrlForEntry(entry);
      content.innerHTML = `<div class="media-preview"><img src="${url}" alt="${escapeHtml(entry.name)}"></div>`;
    } else if (entry.mime?.startsWith('audio/')) {
      const url = await previewUrlForEntry(entry);
      content.innerHTML = `<div class="media-preview audio-preview">${fileGlyph(entry)}<h2>${escapeHtml(entry.name)}</h2><audio controls autoplay src="${url}"></audio></div>`;
    } else if (entry.mime?.startsWith('video/')) {
      const url = await previewUrlForEntry(entry);
      content.innerHTML = `<div class="media-preview"><video controls src="${url}"></video></div>`;
    } else if (entry.mime === 'application/pdf') {
      const url = await previewUrlForEntry(entry);
      content.innerHTML = `<iframe class="pdf-preview" src="${url}" title="${escapeHtml(entry.name)}"></iframe>`;
    } else if (isTextEntry(entry)) {
      const textValue = await blob.text();
      content.innerHTML = '<textarea class="text-file-editor" spellcheck="false"></textarea>';
      qs('.text-file-editor', content).value = textValue;
      save.classList.remove('hidden');
    } else {
      content.innerHTML = `<div class="generic-preview">${fileGlyph(entry)}<h2>${escapeHtml(entry.name)}</h2><p>This file type does not have an in-browser preview.</p><button data-generic-download>Download to this computer</button></div>`;
      qs('[data-generic-download]', content).addEventListener('click', () => downloadEntry(entry));
    }
  } catch (error) {
    content.innerHTML = `<div class="generic-preview"><h2>Could not open file</h2><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function initViewer(win) {
  qs('[data-viewer-action="share"]', win).addEventListener('click', () => fsState.viewerEntry && copySharedLink(fsState.viewerEntry));
  qs('[data-viewer-action="download"]', win).addEventListener('click', () => fsState.viewerEntry && downloadEntry(fsState.viewerEntry));
  qs('[data-viewer-action="save"]', win).addEventListener('click', async () => {
    const entry = fsState.viewerEntry;
    const editor = qs('.text-file-editor', win);
    if (!entry || !editor) return;
    try {
      const updated = await fsRequest('/write', { method: 'POST', body: JSON.stringify({ path: entry.path, content: editor.value }) });
      fsState.entries.set(updated.path, updated);
      toast(typeof sharedCloudEnabled === 'function' && sharedCloudEnabled() ? 'Saved and synchronised' : 'Saved to browser drive');
      refreshAllFileViews();
    } catch (error) {
      toast(error.message);
    }
  });
  if (fsState.viewerEntry) renderViewer(win, fsState.viewerEntry);
}

async function createFolder(path = activeDirectory()) {
  const name = await systemPrompt('Name the new folder:', 'New Folder', { title: 'New Folder', okLabel: 'Create' });
  if (!name) return;
  try {
    await fsRequest('/folder', { method: 'POST', body: JSON.stringify({ path, name }) });
    toast(`Created ${name}`);
    refreshAllFileViews();
  } catch (error) {
    toast(error.message);
  }
}

function activeDirectory() {
  const focused = qs('.app-window.focused');
  if (focused?.dataset.app === 'finder') return focused.dataset.currentPath || '/Desktop';
  if (focused?.dataset.app === 'trash') return '/Trash';
  return '/Desktop';
}


function activeDirectoryLabel(path) {
  path = normalizeVirtualPath(path || '/Desktop');
  if (path === '/') return 'FINDAT Cloud';
  if (path === '/Desktop') return 'Desktop';
  return basename(path) || 'Folder';
}

function uploadRecord(item) {
  const file = item?.file instanceof Blob ? item.file : item;
  const name = String(item?.name || file?.name || 'Clipboard Item');
  const relativePath = String(item?.relativePath || file?.webkitRelativePath || '');
  return { file, name, relativePath };
}

function progressPercent(current, total, floor = 4, ceiling = 98) {
  if (!total) return ceiling;
  return Math.max(floor, Math.min(ceiling, Math.round(floor + (ceiling - floor) * (current / total))));
}

async function deleteProgressUnits(entries) {
  const units = new Map();
  let total = 0;
  for (const entry of entries) {
    try {
      const count = Math.max(1, (await subtree(entry.path)).length);
      units.set(entry.path, count);
      total += count;
    } catch (_) {
      units.set(entry.path, 1);
      total += 1;
    }
  }
  return { units, total: Math.max(total, entries.length, 1) };
}

async function uploadFiles(files, targetPath = activeDirectory()) {
  const list = [...files].map(uploadRecord).filter(item => item.file instanceof Blob);
  if (!list.length) return;

  const destinationLabel = activeDirectoryLabel(targetPath);
  const totalBytes = Math.max(1, list.reduce((sum, item) => sum + Math.max(1, Number(item.file?.size) || 0), 0));
  const progress = typeof showSystemProgress === 'function'
    ? showSystemProgress({
        title: 'Uploading documents',
        message: `Preparing ${list.length} item${list.length === 1 ? '' : 's'} for ${destinationLabel}`,
        state: 'Saving locally…',
        progress: 3
      })
    : null;

  let completed = 0;
  let transferredBytes = 0;
  let currentBaseBytes = 0;
  const failures = [];
  const cloudProgressHandler = event => {
    const detail = event.detail || {};
    if (!['github', 'supabase'].includes(detail.provider)) return;

    if (detail.provider === 'supabase' && detail.phase === 'database') {
      progress?.update(97, {
        title: 'Saving to Supabase SQL',
        message: detail.name || 'Document metadata',
        state: 'Writing the PostgreSQL document record…'
      });
      return;
    }

    if (detail.provider === 'supabase' && detail.phase === 'fallback') {
      progress?.update(35, {
        title: 'Using Supabase Storage fallback',
        message: detail.name || 'Document storage',
        state: 'The S3 route was unavailable; continuing through the secured Storage API…'
      });
      return;
    }

    const loaded = Math.max(0, Number(detail.loaded) || 0);
    const currentTotal = Math.max(1, Number(detail.total) || 1);
    const boundedLoaded = Math.min(loaded, currentTotal);
    const overallLoaded = Math.min(totalBytes, currentBaseBytes + boundedLoaded);
    const value = progressPercent(overallLoaded, totalBytes, 10, 96);
    const supabase = detail.provider === 'supabase';
    progress?.update(value, {
      title: supabase ? 'Uploading to Supabase Storage' : 'Uploading to GitHub',
      message: detail.name || (supabase ? 'Transferring document bytes' : 'Committing document to the repository'),
      state: supabase
        ? (detail.phase === 'uploaded' ? 'Storage upload complete; saving SQL metadata…' : 'Uploading document bytes…')
        : (detail.phase === 'commit' ? 'Creating repository commit…' : 'Uploading document…')
    });
  };
  window.addEventListener('findat:cloud-progress', cloudProgressHandler);

  try {
    for (const item of list) {
      currentBaseBytes = transferredBytes;
      progress?.update(progressPercent(transferredBytes, totalBytes, 3, 9), {
        title: 'Uploading documents',
        message: item.name,
        state: `Saving ${completed + 1} of ${list.length} locally…`
      });
      try {
        await fsRequest('/upload', {
          method: 'POST',
          headers: {
            'Content-Type': item.file.type || 'application/octet-stream',
            'X-File-Name-B64': encodeHeader(item.name),
            'X-Target-Path-B64': encodeHeader(targetPath),
            'X-Relative-Path-B64': encodeHeader(item.relativePath)
          },
          body: item.file
        });
        completed += 1;
        transferredBytes += Math.max(1, Number(item.file?.size) || 0);
        progress?.update(progressPercent(transferredBytes, totalBytes), {
          title: typeof sharedCloudStatus === 'function' && sharedCloudStatus().provider === 'github'
            ? 'Stored in GitHub'
            : (typeof sharedCloudStatus === 'function' && sharedCloudStatus().provider === 'supabase'
              ? 'Stored in Supabase'
              : 'Documents uploaded'),
          message: item.name,
          state: `${completed} of ${list.length} complete`
        });
      } catch (error) {
        failures.push(`${item.name}: ${error.message}`);
      }
    }
  } finally {
    window.removeEventListener('findat:cloud-progress', cloudProgressHandler);
  }

  refreshAllFileViews();

  if (!completed) {
    progress?.fail({
      title: 'Upload failed',
      message: failures[0] || 'No documents were uploaded',
      state: 'Saved locally; Supabase upload remains pending',
      progress: 100
    });
    if (failures[0]) toast(failures[0]);
    return;
  }

  if (failures.length) toast(failures[0]);
  const cloudProvider = typeof sharedCloudStatus === 'function' ? sharedCloudStatus().provider : '';
  const githubActive = cloudProvider === 'github';
  const supabaseActive = cloudProvider === 'supabase';
  progress?.complete({
    title: githubActive ? 'Stored in GitHub' : (supabaseActive ? 'Stored in Supabase' : 'Upload complete'),
    message: githubActive
      ? `${completed} item${completed === 1 ? '' : 's'} committed to the repository`
      : (supabaseActive
        ? `${completed} item${completed === 1 ? '' : 's'} uploaded to Storage and recorded in the Supabase SQL database`
        : `${completed} item${completed === 1 ? '' : 's'} transferred to ${destinationLabel}`),
    state: failures.length ? 'Complete with warnings' : 'Complete'
  });
}
function copySelection(mode = 'copy') {
  const entries = selectedEntries();
  if (!entries.length) {
    toast('Select a file or folder first');
    return;
  }
  fsState.clipboard = { mode, paths: entries.map(entry => entry.path) };
  fsState.internalClipboardArmed = true;
  sessionStorage.setItem('aurelia.fs.clipboard', JSON.stringify(fsState.clipboard));
  toast(`${mode === 'cut' ? 'Cut' : 'Copied'} ${entries.length} item${entries.length === 1 ? '' : 's'}`);
}

async function pasteClipboard(destination = activeDirectory()) {
  if (!fsState.clipboard) {
    try { fsState.clipboard = JSON.parse(sessionStorage.getItem('aurelia.fs.clipboard')); } catch (_) { /* empty */ }
  }
  if (!fsState.clipboard?.paths?.length) {
    toast('The FINDAT Cloud clipboard is empty');
    return;
  }
  try {
    await transferPaths(fsState.clipboard.paths, destination, fsState.clipboard.mode);
    if (fsState.clipboard.mode === 'cut') {
      fsState.clipboard = null;
      sessionStorage.removeItem('aurelia.fs.clipboard');
    }
  } catch (error) {
    toast(error.message);
  }
}

async function transferPaths(paths, destination, mode = 'copy') {
  let transferred = 0;
  for (const source of paths) {
    const moving = mode === 'cut' || mode === 'move';
    if (source === destination || destination.startsWith(`${source}/`)) throw new Error('A folder cannot be placed inside itself');
    if (moving && parentPath(source) === destination) continue;
    await fsRequest(`/${moving ? 'move' : 'copy'}`,  {
      method: 'POST', body: JSON.stringify({ source, destination })
    });
    transferred += 1;
  }
  if (!transferred) {
    toast('Items are already in this folder');
    return;
  }
  toast(`${mode === 'cut' || mode === 'move' ? 'Moved' : 'Copied'} ${transferred} item${transferred === 1 ? '' : 's'}`);
  clearSelection();
  refreshAllFileViews();
}

async function renameSelected() {
  const entries = selectedEntries();
  if (entries.length !== 1) {
    toast('Select one item to rename');
    return;
  }
  const entry = entries[0];
  const name = await systemPrompt('Rename item:', entry.name, { title: 'Rename Item', okLabel: 'Rename' });
  if (!name || name === entry.name) return;
  try {
    await fsRequest('/rename', { method: 'POST', body: JSON.stringify({ path: entry.path, name }) });
    clearSelection();
    toast('Item renamed');
    refreshAllFileViews();
  } catch (error) {
    toast(error.message);
  }
}

async function duplicateSelected() {
  const entries = selectedEntries();
  if (!entries.length) return toast('Select an item first');
  try {
    for (const entry of entries) {
      await fsRequest('/copy', { method: 'POST', body: JSON.stringify({ source: entry.path, destination: parentPath(entry.path) }) });
    }
    toast('Duplicate created');
    refreshAllFileViews();
  } catch (error) {
    toast(error.message);
  }
}

async function trashSelected() {
  const entries = selectedEntries();
  if (!entries.length) return toast('Select an item first');
  const permanent = entries.every(entry => parentPath(entry.path) === '/Trash');
  if (permanent && !await systemConfirm(`Permanently delete ${entries.length} selected item(s)?`, { title: 'Delete Selected Items', okLabel: 'Delete', destructive: true })) return;

  const { units, total } = await deleteProgressUnits(entries);
  const progress = typeof showSystemProgress === 'function'
    ? showSystemProgress({
        title: permanent ? 'Deleting' : 'Deleting',
        message: permanent ? `Removing ${entries.length} item${entries.length === 1 ? '' : 's'} permanently` : `Moving ${entries.length} item${entries.length === 1 ? '' : 's'} to Trash`,
        state: permanent ? 'Deleting…' : 'Moving to Trash…',
        progress: 4
      })
    : null;

  let processed = 0;
  try {
    for (const entry of entries) {
      progress?.update(progressPercent(processed, total), {
        title: permanent ? 'Deleting' : 'Deleting',
        message: entry.name,
        state: permanent ? 'Deleting…' : 'Moving to Trash…'
      });
      if (permanent) await fsRequest('', { method: 'DELETE' }, { path: entry.path });
      else await fsRequest('/trash', { method: 'POST', body: JSON.stringify({ path: entry.path }) });
      processed += units.get(entry.path) || 1;
      progress?.update(progressPercent(processed, total), {
        title: permanent ? 'Deleting' : 'Deleting',
        message: entry.name,
        state: permanent ? 'Deleting…' : 'Moving to Trash…'
      });
    }
    clearSelection();
    refreshAllFileViews();
    progress?.complete({
      title: permanent ? 'Deleting' : 'Deleting',
      message: permanent ? `${entries.length} item${entries.length === 1 ? '' : 's'} deleted permanently` : `${entries.length} item${entries.length === 1 ? '' : 's'} moved to Trash`,
      state: 'Complete'
    });
  } catch (error) {
    progress?.fail({ title: 'Deleting', message: error.message, state: 'Failed', progress: progressPercent(processed, total) });
    toast(error.message);
  }
}

async function restoreSelected() {
  const entries = selectedEntries().filter(entry => parentPath(entry.path) === '/Trash');
  if (!entries.length) return toast('Select an item in Trash');
  try {
    for (const entry of entries) await fsRequest('/restore', { method: 'POST', body: JSON.stringify({ path: entry.path }) });
    clearSelection();
    toast('Restored from Trash');
    refreshAllFileViews();
  } catch (error) {
    toast(error.message);
  }
}

async function emptyTrash() {
  const trashData = await fsRequest('/list', {}, { path: '/Trash' });
  if (!trashData.entries.length) return toast('Trash is already empty');
  if (!await systemConfirm('Permanently delete everything in Trash?', { title: 'Empty Trash', okLabel: 'Delete', destructive: true })) return;

  const progress = typeof showSystemProgress === 'function'
    ? showSystemProgress({
        title: 'Deleting',
        message: `Removing ${trashData.entries.length} item${trashData.entries.length === 1 ? '' : 's'} from Trash`,
        state: 'Deleting…',
        progress: 8
      })
    : null;

  try {
    progress?.update(34, { title: 'Deleting', message: 'Preparing Trash items…', state: 'Deleting…' });
    await fsRequest('/empty-trash', { method: 'POST', body: '{}' });
    clearSelection();
    refreshAllFileViews();
    progress?.complete({
      title: 'Deleting',
      message: 'Trash emptied',
      state: 'Complete'
    });
  } catch (error) {
    progress?.fail({ title: 'Deleting', message: error.message, state: 'Failed', progress: 100 });
    toast(error.message);
  }
}

async function downloadEntry(entry) {
  if (!entry || entry.type === 'folder') {
    toast('Folder download is not available in this build');
    return;
  }
  try {
    const blob = await readLocalFile(entry.path);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = entry.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    toast(error.message);
  }
}

function downloadSelected() {
  const entries = selectedEntries();
  if (!entries.length) return toast('Select a file first');
  entries.forEach((entry, index) => setTimeout(() => downloadEntry(entry), index * 180));
}

async function refreshUsage(root = document) {
  try {
    const usage = await fsRequest('/usage');
    const ratio = usage.quota ? Math.min(100, usage.logicalUsed / usage.quota * 100) : 0;
    const freeRatio = Math.max(0, 100 - ratio);
    const localDetail = usage.browserQuota
      ? `${formatBytes(usage.browserFree)} local browser space available`
      : `${formatBytes(usage.stored)} stored locally`;
    qsa('[data-storage-bar], [data-sidebar-usage], [data-cloud-used-bar]', root).forEach(bar => {
      bar.style.width = ratio > 0 ? `max(4px, ${ratio}%)` : '0%';
      bar.title = `${formatBytes(usage.logicalUsed)} logical · ${formatBytes(usage.stored)} compressed locally`;
    });
    qsa('[data-storage-free-bar], [data-sidebar-free], [data-cloud-free-bar]', root).forEach(bar => {
      bar.style.width = `${freeRatio}%`;
      bar.title = `${formatBytes(usage.free)} free of ${formatBytes(usage.quota)}`;
    });
    qsa('[data-storage-label]', root).forEach(label => {
      label.textContent = `${formatBytes(usage.logicalUsed)} logical of ${formatBytes(usage.quota)} · ${formatBytes(usage.stored)} stored locally`;
      label.title = localDetail;
    });
    qsa('[data-sidebar-usage-label]', root).forEach(label => {
      label.textContent = `Used ${formatBytes(usage.logicalUsed)} · Free ${formatBytes(usage.free)}`;
      label.title = `${formatBytes(usage.logicalUsed)} used of ${formatBytes(usage.quota)} · ${localDetail}`;
    });
    qsa('[data-used-space]', root).forEach(label => {
      label.textContent = formatBytes(usage.logicalUsed);
      label.title = `${formatBytes(usage.stored)} compressed locally`;
    });
    qsa('[data-free-space]', root).forEach(label => {
      label.textContent = formatBytes(usage.free);
      label.title = `Free space in the ${formatBytes(usage.quota)} virtual workspace`;
    });
  } catch (_) { /* browser storage status already reflects error */ }
}

function refreshAllFileViews() {
  refreshDesktop();
  const finder = qs('.app-window[data-app="finder"]');
  if (finder) navigateFinder(finder, finder.dataset.currentPath || '/Desktop', false);
  refreshTrash();
  refreshUsage();
}


function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not encode file'));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  const comma = dataUrl.indexOf(',');
  const header = dataUrl.slice(0, comma);
  const data = dataUrl.slice(comma + 1);
  const mime = /data:([^;]+)/.exec(header)?.[1] || 'application/octet-stream';
  const binary = atob(data);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

async function exportDrive() {
  try {
    toast('Preparing drive export…');
    const nodes = await databaseAll();
    const exported = [];
    for (const node of nodes) {
      const item = { ...node };
      if (item.blob instanceof Blob) item.data = await blobToDataUrl(item.blob);
      delete item.blob;
      exported.push(item);
    }
    const payload = new Blob([JSON.stringify({ format: 'aurelia-drive-v1', exportedAt: new Date().toISOString(), nodes: exported })], { type: 'application/json' });
    const url = URL.createObjectURL(payload);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FINDAT-Cloud-Drive-${new Date().toISOString().slice(0, 10)}.findat.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Drive export downloaded');
  } catch (error) {
    toast(error.message);
  }
}

async function importDriveFile(file) {
  if (!file) return;
  if (!await systemConfirm('Importing a drive image will replace the current FINDAT Cloud workspace. Continue?', { title: 'Import Drive Image', okLabel: 'Import', destructive: true })) return;
  try {
    const payload = JSON.parse(await file.text());
    if (payload.format !== 'aurelia-drive-v1' || !Array.isArray(payload.nodes)) throw new Error('This is not a valid FINDAT Cloud backup');
    const nodes = [];
    for (const item of payload.nodes) {
      const node = { ...item };
      delete node.data;
      if (item.type === 'file') node.blob = item.data ? await dataUrlToBlob(item.data) : new Blob([], { type: item.mime || 'application/octet-stream' });
      nodes.push(node);
    }
    const existing = await databaseAll();
    await databaseCommit(nodes, existing.map(node => node.path));
    driveReadyPromise = initializeDrive();
    await driveReadyPromise;
    await migrateExistingDriveCompression();
    clearSelection();
    refreshAllFileViews();
    toast('Drive image imported');
  } catch (error) {
    toast(error.message);
  }
}

function showContextMenu(x, y, entry = null, surface = fsState.activeSurface) {
  const menu = qs('#contextMenu');
  const inTrash = entry && parentPath(entry.path) === '/Trash';
  const items = entry ? [
    ['open', entry.type === 'folder' ? 'Open Folder' : 'Open'],
    ['copy', 'Copy'], ['cut', 'Cut'], ['duplicate', 'Duplicate'],
    ['rename', 'Rename'], ['download', 'Download'],
    ...(entry.type === 'file' && entry.shared ? [['share-link', 'Copy Shared Link']] : []),
    [inTrash ? 'restore' : 'trash', inTrash ? 'Restore' : 'Move to Trash'],
    ...(inTrash ? [['delete', 'Delete Permanently']] : [])
  ] : [
    ['new-folder', 'New Folder'], ['paste', 'Paste'], ['upload', 'Import Files…'], ['upload-folder', 'Import Folder…']
  ];
  menu.innerHTML = items.map(([action, label]) => `<button data-context-action="${action}">${label}</button>`).join('');
  menu.classList.remove('hidden');
  const width = 190;
  const height = items.length * 34 + 12;
  menu.style.left = `${Math.min(x, innerWidth - width - 8)}px`;
  menu.style.top = `${Math.min(y, innerHeight - height - 8)}px`;
  menu.dataset.surface = surface;
  qsa('[data-context-action]', menu).forEach(button => button.addEventListener('click', () => {
    menu.classList.add('hidden');
    executeFsAction(button.dataset.contextAction, entry);
  }));
}

function executeFsAction(action, entry = null) {
  if (entry && !fsState.selected.has(entry.path)) {
    clearSelection();
    fsState.selected.add(entry.path);
  }
  const actions = {
    open: () => entry && openEntry(entry),
    'new-folder': () => createFolder(),
    upload: () => qs('#fileUploadInput').click(),
    'upload-folder': () => qs('#folderUploadInput').click(),
    copy: () => copySelection('copy'),
    cut: () => copySelection('cut'),
    paste: () => pasteClipboard(),
    rename: renameSelected,
    duplicate: duplicateSelected,
    download: downloadSelected,
    'share-link': () => entry && copySharedLink(entry),
    trash: trashSelected,
    delete: trashSelected,
    restore: restoreSelected,
    'select-all': selectAllVisible,
    'export-drive': exportDrive,
    'import-drive': () => qs('#driveImageInput').click()
  };
  actions[action]?.();
  qsa('.menu-panel').forEach(panel => panel.classList.add('hidden'));
}

function selectAllVisible() {
  clearSelection();
  const focused = qs('.app-window.focused');
  const root = focused?.dataset.app === 'finder' || focused?.dataset.app === 'trash' ? focused : qs('#desktopFileIcons');
  qsa('.fs-entry', root).forEach(node => {
    fsState.selected.add(node.dataset.path);
    node.classList.add('selected');
  });
}

function parseCommandLine(line) {
  const result = [];
  line.replace(/"([^"]*)"|'([^']*)'|(\S+)/g, (_, doubleQuoted, singleQuoted, plain) => {
    result.push(doubleQuoted ?? singleQuoted ?? plain);
    return '';
  });
  return result;
}

async function runVirtualCommand(line, win) {
  const [command = '', ...args] = parseCommandLine(line.trim());
  const cwd = win.dataset.cwd || '/';
  const resolve = value => normalizeVirtualPath(value || '.', cwd);
  switch (command) {
    case '': return '';
    case 'help': return 'Commands: help, pwd, ls [path], cd <path>, mkdir <name>, touch <file>, cat <file>, rm <path>, cp <source> <folder>, mv <source> <folder>, open <path|app>, download <file>, storage, date, echo, whoami, version, clear';
    case 'pwd': return cwd;
    case 'date': return new Date().toString();
    case 'echo': return args.join(' ');
    case 'whoami': return 'guest';
    case 'storage': { const usage = await localUsage(); return `Used Space: ${formatBytes(usage.logicalUsed)} · Free Space: ${formatBytes(usage.free)} · Capacity: ${formatBytes(usage.quota)} · Compressed locally: ${formatBytes(usage.stored)}${usage.browserQuota ? ` · Browser space available: ${formatBytes(usage.browserFree)}` : ''}`; }
    case 'version': return 'FINDAT Cloud 2.2 Browser Edition';
    case 'ls': {
      const data = await fsRequest('/list', {}, { path: resolve(args[0]) });
      return data.entries.map(entry => `${entry.type === 'folder' ? 'd' : '-'}  ${entry.name}`).join('\n');
    }
    case 'cd': {
      const target = resolve(args[0] || '/');
      const stat = await fsRequest('/stat', {}, { path: target });
      if (stat.type !== 'folder') throw new Error('cd: not a directory');
      win.dataset.cwd = target;
      updateTerminalPrompt(win);
      return '';
    }
    case 'mkdir': {
      if (!args[0]) throw new Error('mkdir: name required');
      const target = resolve(args[0]);
      await fsRequest('/folder', { method: 'POST', body: JSON.stringify({ path: parentPath(target), name: basename(target) }) });
      refreshAllFileViews();
      return `created ${target}`;
    }
    case 'touch': {
      if (!args[0]) throw new Error('touch: file required');
      const target = resolve(args[0]);
      await fsRequest('/write', { method: 'POST', body: JSON.stringify({ path: target, content: '' }) });
      refreshAllFileViews();
      return `created ${target}`;
    }
    case 'cat': {
      if (!args[0]) throw new Error('cat: file required');
      const blob = await readLocalFile(resolve(args[0]));
      return (await blob.text()).slice(0, 10000);
    }
    case 'rm': {
      if (!args[0]) throw new Error('rm: path required');
      const target = resolve(args[0]);
      if (parentPath(target) === '/Trash') await fsRequest('', { method: 'DELETE' }, { path: target });
      else await fsRequest('/trash', { method: 'POST', body: JSON.stringify({ path: target }) });
      refreshAllFileViews();
      return parentPath(target) === '/Trash' ? 'deleted permanently' : 'moved to Trash';
    }
    case 'cp':
    case 'mv': {
      if (args.length < 2) throw new Error(`${command}: source and destination required`);
      await fsRequest(command === 'cp' ? '/copy' : '/move', { method: 'POST', body: JSON.stringify({ source: resolve(args[0]), destination: resolve(args[1]) }) });
      refreshAllFileViews();
      return command === 'cp' ? 'copied' : 'moved';
    }
    case 'open': {
      if (!args[0]) return openApp('finder'), 'Opening Finder';
      if (apps[args[0]]) return openApp(args[0]), `Opening ${apps[args[0]].title}`;
      const stat = await fsRequest('/stat', {}, { path: resolve(args[0]) });
      openEntry(stat);
      return `Opening ${stat.name}`;
    }
    case 'download': {
      if (!args[0]) throw new Error('download: file required');
      const stat = await fsRequest('/stat', {}, { path: resolve(args[0]) });
      downloadEntry(stat);
      return `Downloading ${stat.name}`;
    }
    default: return `command not found: ${command}`;
  }
}

function updateTerminalPrompt(win) {
  const cwd = win.dataset.cwd || '/';
  const promptNode = qs('.terminal-line span', win);
  if (promptNode) promptNode.textContent = `guest@findat ${cwd} % `;
}

function initTerminal(win) {
  win.dataset.cwd = '/';
  const form = qs('form', win);
  const input = qs('input', win);
  const output = qs('.terminal-output', win);
  output.textContent = "FINDAT Cloud Terminal 2.0\nSandboxed virtual-drive shell connected. Type 'help'.\n\n";
  updateTerminalPrompt(win);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const command = input.value.trim();
    if (!command) return;
    output.textContent += `guest@findat ${win.dataset.cwd || '/'} % ${command}\n`;
    input.value = '';
    if (command === 'clear') {
      output.textContent = '';
      return;
    }
    try {
      const result = await runVirtualCommand(command, win);
      if (result) output.textContent += `${result}\n`;
    } catch (error) {
      output.textContent += `${error.message}\n`;
    }
    output.scrollTop = output.scrollHeight;
  });
}

wireApp = function enhancedWireApp(win, name) {
  if (name === 'finder') return initFinder(win);
  if (name === 'trash') return initTrash(win);
  if (name === 'viewer') return initViewer(win);
  if (name === 'terminal') return initTerminal(win);
  originalWireApp(win, name);
  if (name === 'settings') {
    refreshUsage(win);
    qsa('[data-drive-action]', win).forEach(button => button.addEventListener('click', () => button.dataset.driveAction === 'export' ? exportDrive() : qs('#driveImageInput').click()));
  }
};


function isEditableClipboardTarget(target) {
  return target instanceof Element && Boolean(target.closest('input, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]'));
}

function clipboardRecord(file, relativePath = '') {
  return {
    file,
    name: file?.name || basename(relativePath) || 'Clipboard Item',
    relativePath: String(relativePath || '').replace(/\\/g, '/')
  };
}

async function readClipboardEntry(entry, prefix = '') {
  if (!entry) return [];
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    return [clipboardRecord(file, `${prefix}${file.name}`)];
  }
  if (!entry.isDirectory) return [];
  const directoryPrefix = `${prefix}${entry.name}/`;
  const reader = entry.createReader();
  const children = [];
  while (true) {
    const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    if (!batch.length) break;
    children.push(...batch);
  }
  const nested = await Promise.all(children.map(child => readClipboardEntry(child, directoryPrefix)));
  return nested.flat();
}

async function readClipboardHandle(handle, prefix = '') {
  if (!handle) return [];
  if (handle.kind === 'file') {
    const file = await handle.getFile();
    return [clipboardRecord(file, `${prefix}${file.name}`)];
  }
  if (handle.kind !== 'directory') return [];
  const directoryPrefix = `${prefix}${handle.name}/`;
  const records = [];
  for await (const child of handle.values()) records.push(...await readClipboardHandle(child, directoryPrefix));
  return records;
}

async function externalClipboardFiles(clipboardData) {
  const items = [...(clipboardData?.items || [])].filter(item => item.kind === 'file');
  if (!items.length) return [];

  const handlePromises = items
    .filter(item => typeof item.getAsFileSystemHandle === 'function')
    .map(item => item.getAsFileSystemHandle().catch(() => null));
  if (handlePromises.length) {
    const handles = (await Promise.all(handlePromises)).filter(Boolean);
    if (handles.length) {
      const records = (await Promise.all(handles.map(handle => readClipboardHandle(handle)))).flat();
      if (records.length) return records;
    }
  }

  const entries = items.map(item => item.webkitGetAsEntry?.()).filter(Boolean);
  if (entries.length) {
    const records = (await Promise.all(entries.map(entry => readClipboardEntry(entry)))).flat();
    if (records.length) return records;
  }

  return items.map(item => item.getAsFile()).filter(Boolean).map(file => clipboardRecord(file));
}

function clipboardTimestamp() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map(value => String(value).padStart(2, '0')).join('-');
  return `${date} ${time}`;
}

async function pasteExternalClipboard(event) {
  if (isEditableClipboardTarget(event.target)) return false;

  const targetPath = activeDirectory();
  if (fsState.internalClipboardArmed && fsState.clipboard?.paths?.length) {
    await pasteClipboard(targetPath);
    if (fsState.clipboard?.mode === 'cut' || !fsState.clipboard) fsState.internalClipboardArmed = false;
    return true;
  }

  const externalFiles = await externalClipboardFiles(event.clipboardData);
  if (externalFiles.length) {
    fsState.internalClipboardArmed = false;
    toast(`Pasting ${externalFiles.length} item${externalFiles.length === 1 ? '' : 's'} from your computer…`);
    await uploadFiles(externalFiles, targetPath);
    return true;
  }

  const plainText = event.clipboardData?.getData('text/plain') || '';
  const htmlText = event.clipboardData?.getData('text/html') || '';
  const content = plainText || htmlText;
  if (!content) return false;

  event.preventDefault();
  fsState.internalClipboardArmed = false;
  const extension = plainText ? 'txt' : 'html';
  const mime = plainText ? 'text/plain;charset=utf-8' : 'text/html;charset=utf-8';
  const name = `Pasted Clipboard ${clipboardTimestamp()}.${extension}`;
  await uploadFiles([clipboardRecord(new File([content], name, { type: mime }), name)], targetPath);
  return true;
}

function bindFilesystemUI() {
  const fileInput = qs('#fileUploadInput');
  const folderInput = qs('#folderUploadInput');
  const driveInput = qs('#driveImageInput');
  fileInput.addEventListener('change', () => { uploadFiles(fileInput.files); fileInput.value = ''; });
  folderInput.addEventListener('change', () => { uploadFiles(folderInput.files); folderInput.value = ''; });
  driveInput.addEventListener('change', () => { importDriveFile(driveInput.files[0]); driveInput.value = ''; });

  qs('#fileMenuBtn')?.addEventListener('click', event => { event.stopPropagation(); togglePanel('#filePanel'); });
  qsa('[data-fs-action]').forEach(button => button.addEventListener('click', () => executeFsAction(button.dataset.fsAction)));
  const cloudStatus = qs('#cloudStatus');
  if (cloudStatus) cloudStatus.addEventListener('click', () => openFinderAt('/'));

  qs('#desktopIcons').addEventListener('click', event => {
    if (!event.target.closest('.fs-entry, .system-desktop-icon')) {
      fsState.activeSurface = 'desktop';
      clearSelection();
    }
  });
  qs('#desktopIcons').addEventListener('contextmenu', event => {
    if (event.target.closest('.fs-entry, .system-desktop-icon')) return;
    event.preventDefault();
    fsState.activeSurface = 'desktop';
    showContextMenu(event.clientX, event.clientY, null, 'desktop');
  });

  qsa('.system-desktop-icon').forEach(button => button.addEventListener('dblclick', event => {
    event.preventDefault();
    event.stopPropagation();
    if (button.dataset.path === '/') openFinderAt('/');
    else if (button.dataset.path === '/Trash') openApp('trash');
    else if (button.dataset.app) openApp(button.dataset.app);
  }));

  document.addEventListener('click', event => {
    if (!event.target.closest('#contextMenu')) qs('#contextMenu').classList.add('hidden');
  });

  document.addEventListener('keydown', event => {
    const editing = event.target.matches('input, textarea, [contenteditable="true"]');
    if (editing) return;
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === 'c') { event.preventDefault(); copySelection('copy'); }
    if (modifier && event.key.toLowerCase() === 'x') { event.preventDefault(); copySelection('cut'); }
    if (modifier && event.key.toLowerCase() === 'v') return;
    if (modifier && event.key.toLowerCase() === 'a') { event.preventDefault(); selectAllVisible(); }
    if (modifier && event.shiftKey && event.key.toLowerCase() === 'n') { event.preventDefault(); createFolder(); }
    if (event.key === 'F2') { event.preventDefault(); renameSelected(); }
    if (event.key === 'Delete' || event.key === 'Backspace' && modifier) { event.preventDefault(); trashSelected(); }
    if (event.key === 'Enter' && selectedEntries().length === 1) { event.preventDefault(); openEntry(selectedEntries()[0]); }
    if (event.key === 'Escape') { clearSelection(); qs('#contextMenu').classList.add('hidden'); }
  });

  document.addEventListener('paste', event => {
    const editable = isEditableClipboardTarget(event.target);
    const clipboardItems = [...(event.clipboardData?.items || [])];
    const hasExternalFiles = clipboardItems.some(item => item.kind === 'file');
    const hasExternalText = Boolean(event.clipboardData?.getData('text/plain') || event.clipboardData?.getData('text/html'));
    const hasInternalItems = Boolean(fsState.internalClipboardArmed && fsState.clipboard?.paths?.length);
    if (!editable && (hasInternalItems || hasExternalFiles || hasExternalText)) event.preventDefault();
    pasteExternalClipboard(event).catch(error => toast(`Could not paste from your computer: ${error.message}`));
  });

  window.addEventListener('blur', () => { fsState.internalClipboardArmed = false; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) fsState.internalClipboardArmed = false;
  });

  window.addEventListener('dragenter', event => {
    if (!event.dataTransfer?.types?.includes('Files')) return;
    fsState.dragDepth += 1;
    qs('#dropOverlay').classList.remove('hidden');
  });
  window.addEventListener('dragover', event => {
    if (event.dataTransfer?.types?.includes('Files')) event.preventDefault();
  });
  window.addEventListener('dragleave', event => {
    if (!event.dataTransfer?.types?.includes('Files')) return;
    fsState.dragDepth = Math.max(0, fsState.dragDepth - 1);
    if (fsState.dragDepth === 0) qs('#dropOverlay').classList.add('hidden');
  });
  window.addEventListener('drop', event => {
    fsState.dragDepth = 0;
    qs('#dropOverlay').classList.add('hidden');
    const files = [...(event.dataTransfer?.files || [])];
    if (!files.length) return;
    event.preventDefault();
    const target = event.target.closest('[data-drop-path]')?.dataset.dropPath || '/Desktop';
    uploadFiles(files, target).catch(error => toast(error.message));
  });

  const savedClipboard = sessionStorage.getItem('aurelia.fs.clipboard');
  if (savedClipboard) {
    try { fsState.clipboard = JSON.parse(savedClipboard); } catch (_) { /* ignore */ }
  }

  layoutDesktopIcons();
  const persistVisibleDesktopPositions = () => {
    qsa('.desktop-icon', qs('#desktopIcons')).forEach(icon => {
      const key = desktopIconKey(icon);
      if (!key) return;
      const x = Number.parseFloat(icon.style.left);
      const y = Number.parseFloat(icon.style.top);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      desktopLayout[key] = clampDesktopPosition(x, y);
    });
    saveDesktopLayout();
  };

  window.addEventListener('resize', () => {
    layoutDesktopIcons();
    persistVisibleDesktopPositions();
  });
  window.addEventListener('pagehide', persistVisibleDesktopPositions);
  window.addEventListener('beforeunload', persistVisibleDesktopPositions);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistVisibleDesktopPositions();
  });

  driveReadyPromise = initializeDrive();
  driveReadyPromise.then(() => { refreshDesktop(); refreshUsage(); }).catch(error => toast(error.message));
}


/* Desktop context menu, view controls and personalization */
const DESKTOP_VIEW_PREFS_KEY = 'aurelia.desktop.view.v2';
const PERSONALIZATION_KEY = 'aurelia.personalization.v2';
const CUSTOM_WALLPAPER_KEY = 'aurelia.wallpaper.custom.v1';

let desktopView = loadDesktopView();
let personalization = loadPersonalization();

function loadDesktopView() {
  const defaults = {
    iconSize: 'medium', autoArrange: false, alignGrid: true, showIcons: true, sortBy: 'custom',
    systemIcons: { drive: true, applications: true, trash: true }
  };
  try {
    const stored = JSON.parse(localStorage.getItem(DESKTOP_VIEW_PREFS_KEY) || '{}') || {};
    return { ...defaults, ...stored, systemIcons: { ...defaults.systemIcons, ...(stored.systemIcons || {}) } };
  } catch (_) { return defaults; }
}

function saveDesktopView() {
  try { localStorage.setItem(DESKTOP_VIEW_PREFS_KEY, JSON.stringify(desktopView)); } catch (_) { /* optional persistence */ }
}

function loadPersonalization() {
  const defaults = { wallpaper: 'sunrise', theme: 'system', accent: '#0a84ff', brightness: 100, scale: 100, reduceMotion: false, wallpaperFit: 'cover', transparency: 82 };
  try { return { ...defaults, ...(JSON.parse(localStorage.getItem(PERSONALIZATION_KEY) || '{}') || {}) }; }
  catch (_) { return defaults; }
}

function savePersonalization() {
  try { localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(personalization)); } catch (_) { /* optional persistence */ }
}

function desktopIconMetrics() {
  const sizes = {
    small: { width: 72, height: 68, gap: 8, glyph: 36, fileScale: .78 },
    medium: { width: 86, height: 82, gap: 12, glyph: 46, fileScale: 1 },
    large: { width: 112, height: 104, gap: 14, glyph: 62, fileScale: 1.25 }
  };
  return sizes[desktopView.iconSize] || sizes.medium;
}

function desktopAreaSize() {
  const area = qs('#desktopIcons');
  const metrics = desktopIconMetrics();
  return {
    width: Math.max(metrics.width, area?.clientWidth || innerWidth),
    height: Math.max(metrics.height, area?.clientHeight || innerHeight - 25)
  };
}

function clampDesktopPosition(x, y) {
  const { width, height } = desktopAreaSize();
  const metrics = desktopIconMetrics();
  return {
    x: Math.max(0, Math.min(Math.round(x), Math.max(0, width - metrics.width))),
    y: Math.max(0, Math.min(Math.round(y), Math.max(0, height - metrics.height)))
  };
}

function snapDesktopPosition(x, y) {
  const metrics = desktopIconMetrics();
  const stepX = metrics.width + metrics.gap;
  const stepY = metrics.height + metrics.gap;
  return clampDesktopPosition(Math.round(x / stepX) * stepX, Math.round(y / stepY) * stepY);
}

function defaultDesktopPosition(index) {
  const { width, height } = desktopAreaSize();
  const metrics = desktopIconMetrics();
  const rows = Math.max(1, Math.floor((height - metrics.gap) / (metrics.height + metrics.gap)));
  const column = Math.floor(index / rows);
  const row = index % rows;
  return clampDesktopPosition(
    width - metrics.width - metrics.gap - column * (metrics.width + metrics.gap),
    metrics.gap + row * (metrics.height + metrics.gap)
  );
}

function desktopIconMeta(icon) {
  const entry = icon.dataset.path ? fsState.entries.get(icon.dataset.path) : null;
  const name = (qs('small', icon)?.textContent || entry?.name || '').trim();
  let type = entry?.type || 'application';
  if (icon.dataset.path === '/' || icon.dataset.path === '/Trash') type = 'folder';
  return {
    name,
    type,
    modified: entry?.modified ? new Date(entry.modified).getTime() : 0,
    size: Number(entry?.size || 0),
    system: icon.classList.contains('system-desktop-icon') ? 0 : 1
  };
}

function orderedDesktopIcons(area) {
  const icons = qsa('.desktop-icon', area).filter(icon => !icon.classList.contains('system-icon-hidden'));
  if (!desktopView.autoArrange && desktopView.sortBy === 'custom') return icons;
  const mode = desktopView.sortBy === 'custom' ? 'name' : desktopView.sortBy;
  return icons.sort((left, right) => {
    const a = desktopIconMeta(left), b = desktopIconMeta(right);
    if (mode === 'type') return a.type.localeCompare(b.type) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    if (mode === 'modified') return b.modified - a.modified || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    if (mode === 'size') return b.size - a.size || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

function applyDesktopView(relayout = true) {
  const area = qs('#desktopIcons');
  if (!area) return;
  const metrics = desktopIconMetrics();
  area.dataset.iconSize = desktopView.iconSize;
  area.classList.toggle('desktop-icons-hidden', !desktopView.showIcons);
  area.style.setProperty('--desktop-icon-width', `${metrics.width}px`);
  area.style.setProperty('--desktop-icon-height', `${metrics.height}px`);
  area.style.setProperty('--desktop-icon-glyph', `${metrics.glyph}px`);
  area.style.setProperty('--desktop-file-scale', String(metrics.fileScale));
  const systemVisibility = desktopView.systemIcons || {};
  const visibilityMap = {
    'system:drive': systemVisibility.drive !== false,
    'system:applications': systemVisibility.applications !== false,
    'system:trash': systemVisibility.trash !== false
  };
  Object.entries(visibilityMap).forEach(([key, visible]) => {
    const icon = qs(`[data-desktop-key="${key}"]`, area);
    if (icon) icon.classList.toggle('system-icon-hidden', !visible);
  });
  if (relayout) layoutDesktopIcons();
}

function systemDesktopPosition(index, count) {
  const metrics = desktopIconMetrics();
  const { height } = desktopAreaSize();
  const leftInset = Math.max(10, metrics.gap);
  const topInset = 10;
  const bottomInset = 12;
  const desiredStep = metrics.height + Math.max(28, Math.round(metrics.height * .45));
  const availableStep = count > 1
    ? Math.max(metrics.height, (height - topInset - bottomInset - metrics.height) / (count - 1))
    : 0;
  const step = count > 1 ? Math.min(desiredStep, availableStep) : 0;
  return clampDesktopPosition(leftInset, topInset + index * step);
}

function layoutDesktopIcons() {
  const area = qs('#desktopIcons');
  if (!area) return;
  const icons = orderedDesktopIcons(area);
  const systemOrder = { 'system:drive': 0, 'system:applications': 1, 'system:trash': 2 };
  const systemIcons = icons
    .filter(icon => icon.classList.contains('system-desktop-icon'))
    .sort((left, right) => (systemOrder[left.dataset.desktopKey] ?? 99) - (systemOrder[right.dataset.desktopKey] ?? 99));
  const fileIcons = icons.filter(icon => !icon.classList.contains('system-desktop-icon'));

  /* Keep the three workstation controls in a clean left-hand column, matching
     the reference desktop. Their old saved coordinates are deliberately
     replaced so they cannot reopen scattered or stacked on top of each other. */
  systemIcons.forEach((icon, index) => {
    bindDesktopIconPositioning(icon);
    const position = systemDesktopPosition(index, systemIcons.length);
    icon.style.left = `${position.x}px`;
    icon.style.top = `${position.y}px`;
    const key = desktopIconKey(icon);
    if (key) desktopLayout[key] = position;
  });

  /* User files retain their existing arrangement on the right-hand side. */
  fileIcons.forEach((icon, index) => {
    bindDesktopIconPositioning(icon);
    const key = desktopIconKey(icon);
    const saved = key ? desktopLayout[key] : null;
    let position;
    if (desktopView.autoArrange || desktopView.sortBy !== 'custom') {
      position = defaultDesktopPosition(index);
    } else if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      position = desktopView.alignGrid ? snapDesktopPosition(saved.x, saved.y) : clampDesktopPosition(saved.x, saved.y);
    } else {
      position = defaultDesktopPosition(index);
    }
    icon.style.left = `${position.x}px`;
    icon.style.top = `${position.y}px`;
    if (key && (desktopView.autoArrange || desktopView.alignGrid)) desktopLayout[key] = position;
  });
  saveDesktopLayout();
}

function setDesktopIconSize(size) {
  desktopView.iconSize = ['small', 'medium', 'large'].includes(size) ? size : 'medium';
  saveDesktopView();
  applyDesktopView();
  toast(`${desktopView.iconSize[0].toUpperCase()}${desktopView.iconSize.slice(1)} desktop icons`);
}

function setDesktopSort(sortBy) {
  desktopView.sortBy = sortBy;
  desktopView.autoArrange = sortBy !== 'custom';
  saveDesktopView();
  layoutDesktopIcons();
  toast(sortBy === 'custom' ? 'Custom icon arrangement' : `Sorted by ${sortBy === 'type' ? 'item type' : sortBy}`);
}

function toggleDesktopViewOption(option) {
  if (option === 'showIcons') desktopView.showIcons = !desktopView.showIcons;
  if (option === 'alignGrid') desktopView.alignGrid = !desktopView.alignGrid;
  if (option === 'autoArrange') {
    desktopView.autoArrange = !desktopView.autoArrange;
    if (desktopView.autoArrange && desktopView.sortBy === 'custom') desktopView.sortBy = 'name';
    if (!desktopView.autoArrange) desktopView.sortBy = 'custom';
  }
  saveDesktopView();
  applyDesktopView();
}

function menuCheck(active) { return `<span class="context-check">${active ? '✓' : ''}</span>`; }

function showDesktopContextMenu(x, y) {
  const menu = qs('#contextMenu');
  const hasClipboard = Boolean(fsState.clipboard?.paths?.length || sessionStorage.getItem('aurelia.fs.clipboard'));
  const hasSelection = selectedEntries().length > 0;
  menu.classList.toggle('submenu-left', x > innerWidth - 430);
  menu.innerHTML = `
    <div class="context-menu-item has-submenu">
      <button type="button"><span>View</span><span class="context-arrow">›</span></button>
      <div class="context-submenu">
        <button data-desktop-action="view-large">${menuCheck(desktopView.iconSize === 'large')}<span>Large icons</span></button>
        <button data-desktop-action="view-medium">${menuCheck(desktopView.iconSize === 'medium')}<span>Medium icons</span></button>
        <button data-desktop-action="view-small">${menuCheck(desktopView.iconSize === 'small')}<span>Small icons</span></button>
        <hr>
        <button data-desktop-action="toggle-auto">${menuCheck(desktopView.autoArrange)}<span>Auto arrange icons</span></button>
        <button data-desktop-action="toggle-grid">${menuCheck(desktopView.alignGrid)}<span>Align icons to grid</span></button>
        <button data-desktop-action="toggle-icons">${menuCheck(desktopView.showIcons)}<span>Show desktop icons</span></button>
      </div>
    </div>
    <div class="context-menu-item has-submenu">
      <button type="button"><span>Sort by</span><span class="context-arrow">›</span></button>
      <div class="context-submenu">
        <button data-desktop-action="sort-name">${menuCheck(desktopView.sortBy === 'name')}<span>Name</span></button>
        <button data-desktop-action="sort-type">${menuCheck(desktopView.sortBy === 'type')}<span>Item type</span></button>
        <button data-desktop-action="sort-modified">${menuCheck(desktopView.sortBy === 'modified')}<span>Date modified</span></button>
        <button data-desktop-action="sort-size">${menuCheck(desktopView.sortBy === 'size')}<span>Size</span></button>
        <button data-desktop-action="sort-custom">${menuCheck(desktopView.sortBy === 'custom')}<span>Custom</span></button>
      </div>
    </div>
    <button data-desktop-action="refresh"><span>Refresh</span></button>
    <hr>
    <button data-desktop-action="paste" ${hasClipboard ? '' : 'disabled'}><span>Paste</span></button>
    <button data-desktop-action="paste-shortcut" ${hasClipboard ? '' : 'disabled'}><span>Paste shortcut</span></button>
    <button data-desktop-action="copy" ${hasSelection ? '' : 'disabled'}><span>Copy</span></button>
    <hr>
    <button data-desktop-action="display-settings"><span>Display settings</span></button>
    <button data-desktop-action="personalize"><span>Personalize</span></button>`;
  menu.classList.remove('hidden');
  const width = 220;
  const height = 300;
  menu.style.left = `${Math.max(8, Math.min(x, innerWidth - width - 8))}px`;
  menu.style.top = `${Math.max(30, Math.min(y, innerHeight - height - 8))}px`;
  menu.dataset.surface = 'desktop';
  qsa('[data-desktop-action]', menu).forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    if (button.disabled) return;
    menu.classList.add('hidden');
    executeDesktopAction(button.dataset.desktopAction);
  }));
}

async function createDesktopShortcuts() {
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
    await localUpload(blob, '/Desktop', name, '', 'application/x-aurelia-shortcut');
    created += 1;
  }
  refreshAllFileViews();
  toast(`${created} shortcut${created === 1 ? '' : 's'} created`);
}

const openEntryWithoutShortcutSupport = openEntry;
openEntry = async function(entry) {
  if (entry?.mime === 'application/x-aurelia-shortcut' || /\.aurlink$/i.test(entry?.name || '')) {
    try {
      const payload = JSON.parse(await (await readLocalFile(entry.path)).text());
      const target = await databaseGet(payload.target);
      if (!target) throw new Error('The shortcut target is no longer available');
      openEntry(publicEntry(target));
    } catch (error) { toast(error.message); }
    return;
  }
  return openEntryWithoutShortcutSupport(entry);
};

function executeDesktopAction(action) {
  const actions = {
    'view-large': () => setDesktopIconSize('large'),
    'view-medium': () => setDesktopIconSize('medium'),
    'view-small': () => setDesktopIconSize('small'),
    'toggle-auto': () => toggleDesktopViewOption('autoArrange'),
    'toggle-grid': () => toggleDesktopViewOption('alignGrid'),
    'toggle-icons': () => toggleDesktopViewOption('showIcons'),
    'sort-name': () => setDesktopSort('name'),
    'sort-type': () => setDesktopSort('type'),
    'sort-modified': () => setDesktopSort('modified'),
    'sort-size': () => setDesktopSort('size'),
    'sort-custom': () => setDesktopSort('custom'),
    refresh: async () => { await refreshDesktop(); layoutDesktopIcons(); toast('Desktop refreshed'); },
    paste: () => pasteClipboard('/Desktop'),
    'paste-shortcut': createDesktopShortcuts,
    copy: () => copySelection('copy'),
    'display-settings': () => openApp('displaysettings'),
    personalize: () => openApp('personalize')
  };
  actions[action]?.();
}

const showContextMenuWithoutDesktopOptions = showContextMenu;
showContextMenu = function(x, y, entry = null, surface = fsState.activeSurface) {
  if (!entry && surface === 'desktop') return showDesktopContextMenu(x, y);
  return showContextMenuWithoutDesktopOptions(x, y, entry, surface);
};

function applyThemePreference(choice = personalization.theme) {
  personalization.theme = choice;
  const resolved = choice === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : choice;
  setTheme(resolved);
  savePersonalization();
}

function applyWallpaper(name = personalization.wallpaper) {
  const wallpaper = qs('.wallpaper');
  if (!wallpaper) return;
  personalization.wallpaper = name;
  desktop.dataset.wallpaper = name;
  wallpaper.style.backgroundImage = '';
  wallpaper.style.backgroundSize = '';
  wallpaper.style.backgroundPosition = '';
  wallpaper.style.backgroundRepeat = '';
  if (name === 'custom') {
    const data = localStorage.getItem(CUSTOM_WALLPAPER_KEY);
    if (data) {
      wallpaper.style.backgroundImage = `url(${JSON.stringify(data)})`;
      wallpaper.style.backgroundSize = personalization.wallpaperFit || 'cover';
      wallpaper.style.backgroundPosition = 'center';
      wallpaper.style.backgroundRepeat = 'no-repeat';
    } else {
      personalization.wallpaper = 'sunrise';
      desktop.dataset.wallpaper = 'sunrise';
    }
  }
  savePersonalization();
}

function applyPersonalization() {
  document.documentElement.style.setProperty('--accent', personalization.accent || '#0a84ff');
  document.documentElement.style.setProperty('--brightness', String(Number(personalization.brightness || 100) / 100));
  document.documentElement.style.setProperty('--ui-font-size', `${14 * Number(personalization.scale || 100) / 100}px`);
  document.documentElement.style.setProperty('--surface-opacity', String(Math.max(.58, Math.min(.98, Number(personalization.transparency || 82) / 100))));
  desktop.classList.toggle('reduce-motion', Boolean(personalization.reduceMotion));
  const brightness = qs('#brightness');
  if (brightness) brightness.value = personalization.brightness || 100;
  applyThemePreference(personalization.theme || 'system');
  applyWallpaper(personalization.wallpaper || 'sunrise');
  applyDesktopView(false);
}

function compressWallpaper(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      try {
        const maxWidth = 1920, maxHeight = 1080;
        const ratio = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', .82));
      } catch (error) { URL.revokeObjectURL(url); reject(error); }
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('The selected wallpaper could not be read')); };
    image.src = url;
  });
}



/* Fully functional unified Settings application */
const CONTROL_CENTER_PREFS_KEY = 'aurelia.control-center.v1';
const SETTINGS_SECTION_KEY = 'aurelia.settings.section.v1';
let controlCenterPreferences = loadControlCenterPreferences();

function loadControlCenterPreferences() {
  const defaults = { showFocus: true, showDarkMode: true, showBrightness: true, showSound: true, sound: 46, focusEnabled: false };
  try { return { ...defaults, ...(JSON.parse(localStorage.getItem(CONTROL_CENTER_PREFS_KEY) || '{}') || {}) }; }
  catch (_) { return defaults; }
}

function saveControlCenterPreferences() {
  try { localStorage.setItem(CONTROL_CENTER_PREFS_KEY, JSON.stringify(controlCenterPreferences)); } catch (_) { /* optional */ }
}

function applyControlCenterPreferences() {
  const focus = qs('#focusToggle');
  const dark = qs('#darkToggle');
  const brightness = qs('#brightness');
  const sound = qs('#soundSlider');
  focus?.classList.toggle('control-hidden', !controlCenterPreferences.showFocus);
  dark?.classList.toggle('control-hidden', !controlCenterPreferences.showDarkMode);
  brightness?.closest('.slider-card')?.classList.toggle('control-hidden', !controlCenterPreferences.showBrightness);
  sound?.closest('.slider-card')?.classList.toggle('control-hidden', !controlCenterPreferences.showSound);
  if (sound) sound.value = String(controlCenterPreferences.sound ?? 46);
  if (focus) {
    focus.classList.toggle('active', Boolean(controlCenterPreferences.focusEnabled));
    const label = qs('small', focus);
    if (label) label.textContent = controlCenterPreferences.focusEnabled ? 'On' : 'Off';
  }
  const grid = qs('#controlCenter .control-grid');
  if (grid) grid.classList.toggle('control-hidden', !controlCenterPreferences.showFocus && !controlCenterPreferences.showDarkMode);
}

function settingsToggleRow(label, description, key, checked) {
  return `<section class="settings-card settings-control-row"><div><b>${label}</b><small>${description}</small></div><label class="switch"><input type="checkbox" data-settings-toggle="${key}" ${checked ? 'checked' : ''}><span></span></label></section>`;
}

function appearanceSettingsMarkup() {
  const accents = ['#0a84ff','#5e5ce6','#bf5af2','#ff375f','#ff9f0a','#30d158','#64d2ff','#8e8e93'];
  return `<div class="settings-section" data-settings-panel="appearance">
    <div class="settings-heading"><div><h2>Appearance</h2><p>Choose how FINDAT Cloud windows, controls and motion appear.</p></div><span class="settings-heading-icon">✦</span></div>
    <section class="settings-card">
      <b>Theme</b><p>Use a light, dark or system-matched interface.</p>
      <div class="settings-theme-grid">
        ${['light','dark','system'].map(theme => `<button data-settings-theme="${theme}" class="${personalization.theme === theme ? 'selected' : ''}"><i class="theme-preview ${theme}"></i><span>${theme[0].toUpperCase()}${theme.slice(1)}</span></button>`).join('')}
      </div>
    </section>
    <section class="settings-card">
      <b>Accent colour</b><p>Used for selections, buttons and highlights.</p>
      <div class="accent-options">${accents.map(color => `<button data-settings-accent="${color}" class="${String(personalization.accent).toLowerCase() === color ? 'selected' : ''}" style="--swatch:${color}" aria-label="Use ${color}"></button>`).join('')}<label class="custom-accent"><input id="accentPicker" type="color" value="${personalization.accent || '#0a84ff'}"><span>Custom</span></label></div>
    </section>
    <section class="settings-card">
      <div class="settings-range-heading"><div><b>Window transparency</b><small>Adjust the glass effect used by FINDAT Cloud windows.</small></div><output data-settings-transparency-output>${personalization.transparency || 82}%</output></div>
      <input data-settings-transparency type="range" min="58" max="98" value="${personalization.transparency || 82}">
    </section>
    ${settingsToggleRow('Animation effects', 'Animate windows, menus and transitions.', 'animations', !personalization.reduceMotion)}
    <button class="settings-secondary-button" data-settings-reset="appearance">Reset appearance</button>
  </div>`;
}

function desktopSettingsMarkup() {
  const wallpapers = [['sunrise','Sunrise'],['ocean','Ocean'],['aurora','Aurora'],['graphite','Graphite'],['cloudblue','Cloud Blue']];
  const systemIcons = desktopView.systemIcons || { drive: true, applications: true, trash: true };
  return `<div class="settings-section" data-settings-panel="desktop">
    <div class="settings-heading"><div><h2>Desktop</h2><p>Control wallpaper, desktop icons and file arrangement.</p></div><span class="settings-heading-icon">▣</span></div>
    <section class="settings-card">
      <b>Wallpaper</b><p>Select a built-in background or upload your own image.</p>
      <div class="wallpaper-choice-grid settings-wallpapers">
        ${wallpapers.map(([id,label]) => `<button data-settings-wallpaper="${id}" class="wallpaper-choice wallpaper-${id} ${personalization.wallpaper === id ? 'selected' : ''}"><i></i><span>${label}</span></button>`).join('')}
        <button data-settings-wallpaper-upload class="wallpaper-choice wallpaper-custom ${personalization.wallpaper === 'custom' ? 'selected' : ''}"><i>＋</i><span>Custom</span></button>
      </div>
    </section>
    <section class="settings-card settings-control-row"><div><b>Wallpaper fit</b><small>Choose how a custom wallpaper fills the screen.</small></div><select data-settings-wallpaper-fit><option value="cover" ${personalization.wallpaperFit === 'cover' ? 'selected' : ''}>Fill</option><option value="contain" ${personalization.wallpaperFit === 'contain' ? 'selected' : ''}>Fit</option><option value="auto" ${personalization.wallpaperFit === 'auto' ? 'selected' : ''}>Center</option></select></section>
    <section class="settings-card settings-control-row"><div><b>Desktop icon size</b><small>Change the size of files and system icons.</small></div><select data-settings-icon-size><option value="small" ${desktopView.iconSize === 'small' ? 'selected' : ''}>Small</option><option value="medium" ${desktopView.iconSize === 'medium' ? 'selected' : ''}>Medium</option><option value="large" ${desktopView.iconSize === 'large' ? 'selected' : ''}>Large</option></select></section>
    <section class="settings-card settings-control-row"><div><b>Sort desktop by</b><small>Arrange icons automatically using the selected rule.</small></div><select data-settings-sort><option value="custom" ${desktopView.sortBy === 'custom' ? 'selected' : ''}>Custom</option><option value="name" ${desktopView.sortBy === 'name' ? 'selected' : ''}>Name</option><option value="type" ${desktopView.sortBy === 'type' ? 'selected' : ''}>Item type</option><option value="modified" ${desktopView.sortBy === 'modified' ? 'selected' : ''}>Date modified</option><option value="size" ${desktopView.sortBy === 'size' ? 'selected' : ''}>Size</option></select></section>
    ${settingsToggleRow('Show desktop icons', 'Display files and shortcuts on the desktop.', 'show-icons', desktopView.showIcons)}
    ${settingsToggleRow('Align icons to grid', 'Keep manually moved icons aligned.', 'align-grid', desktopView.alignGrid)}
    ${settingsToggleRow('Auto arrange icons', 'Automatically place icons in organised columns.', 'auto-arrange', desktopView.autoArrange)}
    <section class="settings-card"><b>System icons</b><p>Choose which FINDAT Cloud shortcuts appear on the desktop.</p><div class="system-icon-options">
      <label><input type="checkbox" data-system-icon="drive" ${systemIcons.drive !== false ? 'checked' : ''}><span>☁ FINDAT Cloud</span></label>
      <label><input type="checkbox" data-system-icon="applications" ${systemIcons.applications !== false ? 'checked' : ''}><span>▦ Applications</span></label>
      <label><input type="checkbox" data-system-icon="trash" ${systemIcons.trash !== false ? 'checked' : ''}><span>♲ Trash</span></label>
    </div></section>
    <div class="settings-button-row"><button class="settings-secondary-button" data-settings-open-desktop>Open Desktop folder</button><button class="settings-secondary-button" data-settings-reset-positions>Reset icon positions</button></div>
  </div>`;
}

function controlCenterSettingsMarkup() {
  return `<div class="settings-section" data-settings-panel="control-center">
    <div class="settings-heading"><div><h2>Control Center</h2><p>Choose the controls shown in the menu-bar Control Center.</p></div><span class="settings-heading-icon">⌁</span></div>
    <section class="settings-card control-center-preview"><div><b>Preview</b><small>Changes are applied immediately.</small></div><button data-settings-open-control>Open Control Center</button></section>
    ${settingsToggleRow('Focus', 'Show the Focus on/off control.', 'control-focus', controlCenterPreferences.showFocus)}
    ${settingsToggleRow('Dark Mode', 'Show the quick light and dark appearance control.', 'control-dark', controlCenterPreferences.showDarkMode)}
    ${settingsToggleRow('Display brightness', 'Show the desktop brightness slider.', 'control-brightness', controlCenterPreferences.showBrightness)}
    ${settingsToggleRow('Sound', 'Show the sound level slider.', 'control-sound', controlCenterPreferences.showSound)}
    <section class="settings-card"><div class="settings-range-heading"><div><b>Default sound level</b><small>Saved for the FINDAT Cloud Control Center.</small></div><output data-settings-sound-output>${controlCenterPreferences.sound}%</output></div><input data-settings-sound type="range" min="0" max="100" value="${controlCenterPreferences.sound}"></section>
    <button class="settings-secondary-button" data-settings-reset="control-center">Reset Control Center</button>
  </div>`;
}

function cloudSettingsMarkup() {
  return `<div class="settings-section" data-settings-panel="cloud">
    <div class="settings-heading"><div><h2>FINDAT Cloud</h2><p>Manage local caching, shared website documents, imports and backups.</p></div><span class="settings-heading-icon cloud-heading-logo"></span></div>
    <section class="settings-card cloud-overview-card">
      <div class="cloud-status-line"><span class="cloud-status-dot"></span><div><b data-cloud-status-title>FINDAT Cloud is ready</b><small data-cloud-status-detail>Checking workspace…</small></div></div>
      <div class="storage-meter cloud-settings-meter storage-color-bar" aria-label="Used and free storage"><i class="used-space-segment" data-storage-bar></i><i class="free-space-segment" data-storage-free-bar></i></div>
      <div class="storage-color-legend cloud-storage-legend"><span class="used">Used Space</span><span class="free">Free Space</span></div>
      <small data-storage-label>Calculating storage…</small>
      <div class="cloud-space-grid">
        <div class="cloud-space-card used"><span>Used Space</span><b data-used-space data-cloud-used-space>—</b><div class="cloud-space-mini-bar"><i data-cloud-used-bar></i></div><small>Logical data in FINDAT Cloud</small></div>
        <div class="cloud-space-card free"><span>Free Space</span><b data-free-space data-cloud-free-space>—</b><div class="cloud-space-mini-bar"><i data-cloud-free-bar></i></div><small>Available in the 4 TB workspace</small></div>
      </div>
      <div class="cloud-stat-grid"><div><b data-cloud-files>—</b><small>Files</small></div><div><b data-cloud-folders>—</b><small>Folders</small></div><div><b data-cloud-protection>Checking</b><small>Storage protection</small></div></div>
    </section>
    <section class="settings-card"><b>Supabase SQL database and document storage</b><p data-shared-cloud-status>The Supabase database and Storage configuration is being checked.</p><div class="settings-button-row"><button data-cloud-action="sync">Sync Now</button><button data-cloud-action="publish-local">Retry Pending Uploads</button></div><small>Document bytes are stored in the findat-documents bucket. Names, folders, paths, sizes, MIME types, Trash state and storage locations are saved in the PostgreSQL findat_documents table.</small></section>
    <section class="settings-card"><b>Workspace</b><p>Open the cloud drive or import files directly into FINDAT Cloud.</p><div class="settings-button-row"><button data-cloud-action="open">Open FINDAT Cloud</button><button data-cloud-action="upload">Import Files</button></div></section>
    <section class="settings-card"><b>Backup and restore</b><p>Download a full workspace backup or restore a previous FINDAT Cloud backup.</p><div class="settings-button-row"><button data-cloud-action="export">Export Cloud Backup</button><button data-cloud-action="import">Import Cloud Backup</button></div></section>
    <section class="settings-card"><b>Storage protection</b><p>Ask the browser to protect FINDAT Cloud data from automatic cleanup when supported.</p><button class="settings-secondary-button" data-cloud-action="persist">Request persistent storage</button></section>
    <section class="settings-card danger-settings-card"><b>Trash</b><p>Permanently remove all items currently in Trash.</p><button data-cloud-action="empty-trash">Empty Trash</button></section>
    <button class="settings-secondary-button" data-cloud-action="refresh">Refresh cloud status</button>
  </div>`;
}

function fullSettingsMarkup() {
  const active = localStorage.getItem(SETTINGS_SECTION_KEY) || 'appearance';
  return `<div class="settings-app full-settings-app">
    <aside class="sidebar settings-navigation"><div class="settings-nav-title"><span class="aurelia-symbol"></span><div><h3>Settings</h3><small>FINDAT Cloud</small></div></div>
      <button data-settings-section="appearance" class="${active === 'appearance' ? 'active' : ''}"><span>✦</span>Appearance</button>
      <button data-settings-section="desktop" class="${active === 'desktop' ? 'active' : ''}"><span>▣</span>Desktop</button>
      <button data-settings-section="control-center" class="${active === 'control-center' ? 'active' : ''}"><span>⌁</span>Control Center</button>
      <button data-settings-section="cloud" class="${active === 'cloud' ? 'active' : ''}"><span>☁</span>FINDAT Cloud</button>
    </aside>
    <main class="settings-content" data-settings-content></main>
  </div>`;
}

function settingsPanelMarkup(section) {
  if (section === 'desktop') return desktopSettingsMarkup();
  if (section === 'control-center') return controlCenterSettingsMarkup();
  if (section === 'cloud') return cloudSettingsMarkup();
  return appearanceSettingsMarkup();
}

function renderSettingsSection(win, section = 'appearance') {
  const allowed = ['appearance','desktop','control-center','cloud'];
  if (!allowed.includes(section)) section = 'appearance';
  try { localStorage.setItem(SETTINGS_SECTION_KEY, section); } catch (_) { /* optional */ }
  qsa('[data-settings-section]', win).forEach(button => button.classList.toggle('active', button.dataset.settingsSection === section));
  const content = qs('[data-settings-content]', win);
  if (!content) return;
  content.innerHTML = settingsPanelMarkup(section);
  bindSettingsSection(win, section);
}

function syncAppearanceSelection(win) {
  qsa('[data-settings-theme]', win).forEach(button => button.classList.toggle('selected', button.dataset.settingsTheme === personalization.theme));
  qsa('[data-settings-accent]', win).forEach(button => button.classList.toggle('selected', button.dataset.settingsAccent.toLowerCase() === String(personalization.accent).toLowerCase()));
}

function bindSettingsSection(win, section) {
  if (section === 'appearance') {
    qsa('[data-settings-theme]', win).forEach(button => button.addEventListener('click', () => {
      applyThemePreference(button.dataset.settingsTheme);
      syncAppearanceSelection(win);
    }));
    qsa('[data-settings-accent]', win).forEach(button => button.addEventListener('click', () => {
      personalization.accent = button.dataset.settingsAccent;
      document.documentElement.style.setProperty('--accent', personalization.accent);
      localStorage.setItem('aurelia.accent', personalization.accent);
      const picker = qs('#accentPicker', win); if (picker) picker.value = personalization.accent;
      savePersonalization(); syncAppearanceSelection(win);
    }));
    qs('#accentPicker', win)?.addEventListener('input', event => {
      personalization.accent = event.target.value;
      document.documentElement.style.setProperty('--accent', personalization.accent);
      localStorage.setItem('aurelia.accent', personalization.accent);
      savePersonalization(); syncAppearanceSelection(win);
    });
    const transparency = qs('[data-settings-transparency]', win);
    const transparencyOutput = qs('[data-settings-transparency-output]', win);
    transparency?.addEventListener('input', () => {
      personalization.transparency = Number(transparency.value);
      if (transparencyOutput) transparencyOutput.textContent = `${transparency.value}%`;
      document.documentElement.style.setProperty('--surface-opacity', String(personalization.transparency / 100));
      savePersonalization();
    });
    qs('[data-settings-toggle="animations"]', win)?.addEventListener('change', event => {
      personalization.reduceMotion = !event.target.checked;
      desktop.classList.toggle('reduce-motion', personalization.reduceMotion);
      savePersonalization();
    });
    qs('[data-settings-reset="appearance"]', win)?.addEventListener('click', () => {
      personalization.theme = 'system'; personalization.accent = '#0a84ff'; personalization.transparency = 82; personalization.reduceMotion = false;
      savePersonalization(); applyPersonalization(); renderSettingsSection(win, 'appearance'); toast('Appearance settings reset');
    });
  }

  if (section === 'desktop') {
    qsa('[data-settings-wallpaper]', win).forEach(button => button.addEventListener('click', () => {
      applyWallpaper(button.dataset.settingsWallpaper);
      qsa('.wallpaper-choice', win).forEach(item => item.classList.toggle('selected', item === button));
    }));
    qs('[data-settings-wallpaper-upload]', win)?.addEventListener('click', () => qs('#wallpaperInput')?.click());
    qs('[data-settings-wallpaper-fit]', win)?.addEventListener('change', event => { personalization.wallpaperFit = event.target.value; savePersonalization(); applyWallpaper(personalization.wallpaper); });
    qs('[data-settings-icon-size]', win)?.addEventListener('change', event => setDesktopIconSize(event.target.value));
    qs('[data-settings-sort]', win)?.addEventListener('change', event => setDesktopSort(event.target.value));
    qs('[data-settings-toggle="show-icons"]', win)?.addEventListener('change', event => { desktopView.showIcons = event.target.checked; saveDesktopView(); applyDesktopView(); });
    qs('[data-settings-toggle="align-grid"]', win)?.addEventListener('change', event => { desktopView.alignGrid = event.target.checked; saveDesktopView(); applyDesktopView(); });
    qs('[data-settings-toggle="auto-arrange"]', win)?.addEventListener('change', event => {
      desktopView.autoArrange = event.target.checked;
      if (desktopView.autoArrange && desktopView.sortBy === 'custom') desktopView.sortBy = 'name';
      if (!desktopView.autoArrange) desktopView.sortBy = 'custom';
      saveDesktopView(); applyDesktopView(); renderSettingsSection(win, 'desktop');
    });
    qsa('[data-system-icon]', win).forEach(input => input.addEventListener('change', () => {
      desktopView.systemIcons = { ...(desktopView.systemIcons || {}), [input.dataset.systemIcon]: input.checked };
      saveDesktopView(); applyDesktopView();
    }));
    qs('[data-settings-open-desktop]', win)?.addEventListener('click', () => openFinderAt('/Desktop'));
    qs('[data-settings-reset-positions]', win)?.addEventListener('click', () => {
      desktopLayout = {}; saveDesktopLayout(); desktopView.autoArrange = false; desktopView.sortBy = 'custom'; saveDesktopView(); layoutDesktopIcons(); renderSettingsSection(win, 'desktop'); toast('Desktop icon positions reset');
    });
  }

  if (section === 'control-center') {
    const mapping = { 'control-focus':'showFocus', 'control-dark':'showDarkMode', 'control-brightness':'showBrightness', 'control-sound':'showSound' };
    Object.entries(mapping).forEach(([toggle,key]) => qs(`[data-settings-toggle="${toggle}"]`, win)?.addEventListener('change', event => {
      controlCenterPreferences[key] = event.target.checked; saveControlCenterPreferences(); applyControlCenterPreferences();
    }));
    qs('[data-settings-open-control]', win)?.addEventListener('click', event => { event.stopPropagation(); qs('#controlCenter')?.classList.remove('hidden'); });
    const sound = qs('[data-settings-sound]', win), output = qs('[data-settings-sound-output]', win);
    sound?.addEventListener('input', () => {
      controlCenterPreferences.sound = Number(sound.value); if (output) output.textContent = `${sound.value}%`; const slider = qs('#soundSlider'); if (slider) slider.value = sound.value; saveControlCenterPreferences();
    });
    qs('[data-settings-reset="control-center"]', win)?.addEventListener('click', () => {
      controlCenterPreferences = { showFocus:true, showDarkMode:true, showBrightness:true, showSound:true, sound:46, focusEnabled:false };
      saveControlCenterPreferences(); applyControlCenterPreferences(); renderSettingsSection(win, 'control-center'); toast('Control Center reset');
    });
  }

  if (section === 'cloud') {
    qsa('[data-cloud-action]', win).forEach(button => button.addEventListener('click', async () => {
      const action = button.dataset.cloudAction;
      try {
        if (action === 'open') openFinderAt('/');
        if (action === 'upload') qs('#fileUploadInput')?.click();
        if (action === 'export') await exportDrive();
        if (action === 'import') qs('#driveImageInput')?.click();
        if (action === 'empty-trash') await emptyTrash();
        if (action === 'sync') {
          if (!(typeof sharedCloudEnabled === 'function' && sharedCloudEnabled())) throw new Error('Configure cloud-config.js before using shared sync');
          await sharedCloudPull();
          toast('Supabase SQL database and Storage are up to date');
        }
        if (action === 'publish-local') {
          if (!(typeof sharedCloudEnabled === 'function' && sharedCloudEnabled())) throw new Error('Configure cloud-config.js before publishing files');
          const result = await sharedCloudPublishLocal();
          toast(result.published ? `${result.published} pending item${result.published === 1 ? '' : 's'} saved to Supabase` : 'No Supabase uploads are pending');
        }
        if (action === 'refresh' && typeof sharedCloudEnabled === 'function' && sharedCloudEnabled()) {
          await sharedCloudDatabaseHealth(true);
          await sharedCloudPull();
          toast('Supabase SQL and Storage status refreshed');
        }
        if (action === 'persist') {
          if (!navigator.storage?.persist) return toast('Persistent storage is not supported by this browser');
          const granted = await navigator.storage.persist();
          toast(granted ? 'FINDAT Cloud storage is protected' : 'The browser did not grant persistent storage');
        }
      } catch (error) {
        toast(error.message || 'Cloud action failed');
      }
      if (action === 'refresh' || action === 'sync' || action === 'publish-local' || action === 'persist' || action === 'empty-trash') refreshCloudSettingsPanel(win);
    }));
    refreshCloudSettingsPanel(win);
  }
}

async function refreshCloudSettingsPanel(win) {
  const panel = qs('[data-settings-panel="cloud"]', win);
  if (!panel) return;
  try {
    await driveReadyPromise;
    const [usage, nodes] = await Promise.all([localUsage(), databaseAll()]);
    const files = nodes.filter(node => node.type === 'file').length;
    const folders = nodes.filter(node => node.type === 'folder').length;
    const ratio = usage.quota ? Math.min(100, usage.logicalUsed / usage.quota * 100) : 0;
    const freeRatio = Math.max(0, 100 - ratio);
    qs('[data-storage-bar]', panel)?.style.setProperty('width', ratio > 0 ? `max(4px, ${ratio}%)` : '0%');
    qs('[data-storage-free-bar]', panel)?.style.setProperty('width', `${freeRatio}%`);
    qs('[data-cloud-used-bar]', panel)?.style.setProperty('width', ratio > 0 ? `max(4px, ${ratio}%)` : '0%');
    qs('[data-cloud-free-bar]', panel)?.style.setProperty('width', `${freeRatio}%`);
    const storageLabel = qs('[data-storage-label]', panel); if (storageLabel) { storageLabel.textContent = `Used ${formatBytes(usage.logicalUsed)} of ${formatBytes(usage.quota)} · ${formatBytes(usage.stored)} compressed locally`; storageLabel.title = usage.browserQuota ? `${formatBytes(usage.browserFree)} local browser space available` : 'Physical capacity is controlled by the browser and device'; }
    const usedSpace = qs('[data-cloud-used-space]', panel); if (usedSpace) usedSpace.textContent = formatBytes(usage.logicalUsed);
    const freeSpace = qs('[data-cloud-free-space]', panel); if (freeSpace) freeSpace.textContent = formatBytes(usage.free);
    const fileLabel = qs('[data-cloud-files]', panel); if (fileLabel) fileLabel.textContent = String(files);
    const folderLabel = qs('[data-cloud-folders]', panel); if (folderLabel) folderLabel.textContent = String(folders);
    const sharedStatus = typeof sharedCloudStatus === 'function' ? sharedCloudStatus() : { enabled: false };
    const statusTitle = qs('[data-cloud-status-title]', panel);
    const detail = qs('[data-cloud-status-detail]', panel);
    const sharedLine = qs('[data-shared-cloud-status]', panel);
    if (sharedStatus.enabled) {
      if (statusTitle) statusTitle.textContent = sharedStatus.lastError ? 'Shared cloud needs attention' : 'Shared FINDAT Cloud is connected';
      if (detail) detail.textContent = sharedStatus.lastError || `${sharedStatus.remoteCount} shared items · ${files + folders} cached locally · ${formatBytes(usage.saved)} saved by compression`;
      if (sharedLine) {
        const destination = sharedStatus.provider === 'github'
          ? `GitHub repository ${sharedStatus.repository || ''}${sharedStatus.branch ? ` on ${sharedStatus.branch}` : ''}`
          : `Supabase PostgreSQL table ${sharedStatus.table || 'findat_documents'} and Storage bucket ${sharedStatus.bucket || 'findat-documents'}`;
        const sqlHealth = sharedStatus.health?.database === 'ok' && sharedStatus.health?.bucket_exists
          ? ' SQL database and bucket checks passed.'
          : '';
        sharedLine.textContent = sharedStatus.lastError
          ? `The browser is using its local cache because sync failed: ${sharedStatus.lastError}`
          : `Connected to ${destination}.${sqlHealth} ${sharedStatus.remoteCount} shared items are available to website visitors${sharedStatus.lastSuccessAt ? `; last synced ${new Date(sharedStatus.lastSuccessAt).toLocaleString()}` : ''}.`;
      }
      qs('.cloud-status-dot', panel)?.classList.toggle('error', Boolean(sharedStatus.lastError));
    } else {
      qs('.cloud-status-dot', panel)?.classList.remove('error');
      if (statusTitle) statusTitle.textContent = 'Local FINDAT Cloud is ready';
      if (detail) detail.textContent = `4 TB virtual workspace · ${files + folders} local items · ${formatBytes(usage.saved)} saved by compression`;
      if (sharedLine) {
        const selectedProvider = String(window.FINDAT_CLOUD_CONFIG?.provider || '').toLowerCase();
        if (selectedProvider === 'supabase') {
          const hasUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(window.FINDAT_CLOUD_CONFIG?.supabaseUrl || '').trim());
          const key = String(window.FINDAT_CLOUD_CONFIG?.publishableKey || window.FINDAT_CLOUD_CONFIG?.anonKey || '').trim();
          sharedLine.textContent = !hasUrl
            ? 'Supabase is selected, but the project URL is missing or invalid in cloud-config.js.'
            : /^sb_secret_/i.test(key)
              ? 'Unsafe configuration blocked: rotate the exposed Secret key and use the browser-safe sb_publishable_ key instead.'
              : (!key || key.includes('PASTE_') || key.includes('YOUR_'))
                ? 'Supabase project URL is configured. Paste the browser-safe Publishable key into cloud-config.js to finish connecting.'
                : 'Supabase is configured but currently unavailable. Check the PostgreSQL migration, RLS policies and network connection.';
        } else {
          sharedLine.textContent = 'Shared storage is off. Configure the selected provider in cloud-config.js, then set enabled to true.';
        }
      }
    }
    let persisted = false;
    try { persisted = Boolean(await navigator.storage?.persisted?.()); } catch (_) { /* optional */ }
    const protection = qs('[data-cloud-protection]', panel); if (protection) protection.textContent = persisted ? 'Protected' : 'Standard';
  } catch (error) {
    qs('.cloud-status-dot', panel)?.classList.add('error');
    const title = qs('[data-cloud-status-title]', panel); if (title) title.textContent = 'FINDAT Cloud needs attention';
    const detail = qs('[data-cloud-status-detail]', panel); if (detail) detail.textContent = error.message;
  }
}

function initFullSettings(win) {
  qsa('[data-settings-section]', win).forEach(button => button.addEventListener('click', () => renderSettingsSection(win, button.dataset.settingsSection)));
  renderSettingsSection(win, localStorage.getItem(SETTINGS_SECTION_KEY) || 'appearance');
}

function displaySettingsMarkup() {
  return `<div class="system-settings-panel display-settings-panel">
    <aside><div class="settings-app-title"><span>▣</span><div><b>Display settings</b><small>FINDAT Cloud display</small></div></div></aside>
    <main>
      <h1>Display</h1>
      <section class="modern-settings-card">
        <div><b>Brightness</b><small>Adjust the brightness of the FINDAT Cloud desktop.</small></div>
        <output data-display-brightness-output>${personalization.brightness}%</output>
        <input data-display-brightness type="range" min="55" max="115" value="${personalization.brightness}">
      </section>
      <section class="modern-settings-card settings-row">
        <div><b>Scale</b><small>Change text and interface sizing.</small></div>
        <select data-display-scale>${[90,100,110,125].map(value => `<option value="${value}" ${Number(personalization.scale) === value ? 'selected' : ''}>${value}%</option>`).join('')}</select>
      </section>
      <section class="modern-settings-card settings-row">
        <div><b>Desktop icon size</b><small>Choose the default size of desktop files and shortcuts.</small></div>
        <select data-display-icons><option value="small" ${desktopView.iconSize === 'small' ? 'selected' : ''}>Small</option><option value="medium" ${desktopView.iconSize === 'medium' ? 'selected' : ''}>Medium</option><option value="large" ${desktopView.iconSize === 'large' ? 'selected' : ''}>Large</option></select>
      </section>
      <section class="modern-settings-card settings-row">
        <div><b>Animation effects</b><small>Turn window and menu animations on or off.</small></div>
        <label class="switch"><input data-display-motion type="checkbox" ${personalization.reduceMotion ? '' : 'checked'}><span></span></label>
      </section>
      <button class="settings-reset-button" data-display-reset>Reset display settings</button>
    </main>
  </div>`;
}

function personalizeMarkup() {
  const wallpapers = [
    ['sunrise', 'Sunrise'], ['ocean', 'Ocean'], ['aurora', 'Aurora'], ['graphite', 'Graphite'], ['cloudblue', 'Cloud Blue']
  ];
  return `<div class="system-settings-panel personalize-panel">
    <aside><div class="settings-app-title"><span>✦</span><div><b>Personalize</b><small>Background and theme</small></div></div></aside>
    <main>
      <h1>Personalization</h1>
      <section class="modern-settings-card">
        <div><b>Theme</b><small>Choose how FINDAT Cloud windows and controls appear.</small></div>
        <div class="theme-choice-grid">
          ${['light','dark','system'].map(theme => `<button data-personal-theme="${theme}" class="${personalization.theme === theme ? 'selected' : ''}"><i class="theme-preview ${theme}"></i><span>${theme[0].toUpperCase()}${theme.slice(1)}</span></button>`).join('')}
        </div>
      </section>
      <section class="modern-settings-card">
        <div><b>Wallpaper</b><small>Select a built-in wallpaper or use one from your computer.</small></div>
        <div class="wallpaper-choice-grid">
          ${wallpapers.map(([id,label]) => `<button data-wallpaper-choice="${id}" class="wallpaper-choice wallpaper-${id} ${personalization.wallpaper === id ? 'selected' : ''}"><i></i><span>${label}</span></button>`).join('')}
          <button data-wallpaper-upload class="wallpaper-choice wallpaper-custom ${personalization.wallpaper === 'custom' ? 'selected' : ''}"><i>＋</i><span>Custom</span></button>
        </div>
      </section>
      <section class="modern-settings-card settings-row">
        <div><b>Wallpaper fit</b><small>Choose how a custom image fills the display.</small></div>
        <select data-wallpaper-fit><option value="cover" ${personalization.wallpaperFit === 'cover' ? 'selected' : ''}>Fill</option><option value="contain" ${personalization.wallpaperFit === 'contain' ? 'selected' : ''}>Fit</option><option value="auto" ${personalization.wallpaperFit === 'auto' ? 'selected' : ''}>Center</option></select>
      </section>
      <section class="modern-settings-card settings-row">
        <div><b>Accent color</b><small>Used for selections, controls and highlights.</small></div>
        <input data-personal-accent type="color" value="${personalization.accent || '#0a84ff'}">
      </section>
    </main>
  </div>`;
}

apps.displaysettings = { title: 'Display Settings', html: displaySettingsMarkup };
apps.personalize = { title: 'Personalize', html: personalizeMarkup };

function initDisplaySettings(win) {
  const brightness = qs('[data-display-brightness]', win);
  const output = qs('[data-display-brightness-output]', win);
  brightness?.addEventListener('input', () => {
    personalization.brightness = Number(brightness.value);
    output.textContent = `${brightness.value}%`;
    document.documentElement.style.setProperty('--brightness', String(personalization.brightness / 100));
    const controlBrightness = qs('#brightness');
    if (controlBrightness) controlBrightness.value = brightness.value;
    savePersonalization();
  });
  qs('[data-display-scale]', win)?.addEventListener('change', event => {
    personalization.scale = Number(event.target.value);
    document.documentElement.style.setProperty('--ui-font-size', `${14 * personalization.scale / 100}px`);
    savePersonalization();
  });
  qs('[data-display-icons]', win)?.addEventListener('change', event => setDesktopIconSize(event.target.value));
  qs('[data-display-motion]', win)?.addEventListener('change', event => {
    personalization.reduceMotion = !event.target.checked;
    desktop.classList.toggle('reduce-motion', personalization.reduceMotion);
    savePersonalization();
  });
  qs('[data-display-reset]', win)?.addEventListener('click', () => {
    personalization.brightness = 100;
    personalization.scale = 100;
    personalization.reduceMotion = false;
    desktopView.iconSize = 'medium';
    savePersonalization(); saveDesktopView(); applyPersonalization(); applyDesktopView();
    closeWindow(win);
    setTimeout(() => openApp('displaysettings'), 240);
    toast('Display settings reset');
  });
}

function initPersonalize(win) {
  qsa('[data-personal-theme]', win).forEach(button => button.addEventListener('click', () => {
    applyThemePreference(button.dataset.personalTheme);
    qsa('[data-personal-theme]', win).forEach(item => item.classList.toggle('selected', item === button));
  }));
  qsa('[data-wallpaper-choice]', win).forEach(button => button.addEventListener('click', () => {
    applyWallpaper(button.dataset.wallpaperChoice);
    qsa('.wallpaper-choice', win).forEach(item => item.classList.toggle('selected', item === button));
  }));
  qs('[data-wallpaper-upload]', win)?.addEventListener('click', () => qs('#wallpaperInput')?.click());
  qs('[data-wallpaper-fit]', win)?.addEventListener('change', event => {
    personalization.wallpaperFit = event.target.value;
    savePersonalization(); applyWallpaper(personalization.wallpaper);
  });
  qs('[data-personal-accent]', win)?.addEventListener('input', event => {
    personalization.accent = event.target.value;
    document.documentElement.style.setProperty('--accent', personalization.accent);
    localStorage.setItem('aurelia.accent', personalization.accent);
    savePersonalization();
  });
}

const wireAppBeforePersonalization = wireApp;
wireApp = function(win, name) {
  wireAppBeforePersonalization(win, name);
  if (name === 'settings') initFullSettings(win);
  if (name === 'displaysettings') initDisplaySettings(win);
  if (name === 'personalize') initPersonalize(win);
};

const wallpaperInput = qs('#wallpaperInput');
wallpaperInput?.addEventListener('change', async () => {
  const file = wallpaperInput.files?.[0];
  wallpaperInput.value = '';
  if (!file) return;
  try {
    const data = await compressWallpaper(file);
    localStorage.setItem(CUSTOM_WALLPAPER_KEY, data);
    personalization.wallpaper = 'custom';
    savePersonalization();
    applyWallpaper('custom');
    const personalizeWindow = qs('.app-window[data-app="personalize"]');
    if (personalizeWindow) {
      closeWindow(personalizeWindow);
      setTimeout(() => openApp('personalize'), 240);
    }
    toast('Custom wallpaper applied');
  } catch (error) {
    toast(error.name === 'QuotaExceededError' ? 'Wallpaper is too large for browser storage' : error.message);
  }
});

matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
  if (personalization.theme === 'system') applyThemePreference('system');
});

qs('#brightness')?.addEventListener('input', event => {
  personalization.brightness = Number(event.target.value);
  savePersonalization();
});
qs('#darkToggle')?.addEventListener('click', () => {
  personalization.theme = desktop.classList.contains('dark') ? 'dark' : 'light';
  savePersonalization();
});
qs('#focusToggle')?.addEventListener('click', () => {
  controlCenterPreferences.focusEnabled = qs('#focusToggle')?.classList.contains('active') || false;
  saveControlCenterPreferences();
});
qs('#soundSlider')?.addEventListener('input', event => {
  controlCenterPreferences.sound = Number(event.target.value);
  saveControlCenterPreferences();
});

applyPersonalization();
applyControlCenterPreferences();

bindFilesystemUI();
