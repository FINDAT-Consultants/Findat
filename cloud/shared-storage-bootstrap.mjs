/* FINDAT Cloud shared-storage bootstrap.
   When the package is served by the bundled server, browser state and the
   virtual drive are mirrored to one durable workspace for all authorised
   devices. If the API is unavailable, FINDAT Cloud continues in local mode. */

const API_ROOT = '/api/sync';
const WORKSPACE = new URLSearchParams(location.search).get('workspace') || 'main';
const DRIVE_DB_NAME = 'aurelia-os-browser-drive';
const DRIVE_DB_VERSION = 1;
const DRIVE_STORE = 'nodes';
const SYNC_DB_NAME = 'findat-shared-sync-v1';
const SYNC_DB_VERSION = 1;
const OUTBOX_STORE = 'outbox';
const KV_OUTBOX_KEY = 'findat.shared.kv-outbox.v1';
const ACCESS_KEY_SESSION = 'findat.shared.access-key.v1';
const SCRIPT_LIST = [
  'app.js',
  'filesystem.js',
  'vendor/jszip.min.js',
  'vendor/pptxgen.min.js',
  'productivity.js',
  'profile.js',
  'fullscreen.js',
  'workstations.js'
];

const nativeStorage = {
  getItem: Storage.prototype.getItem,
  setItem: Storage.prototype.setItem,
  removeItem: Storage.prototype.removeItem,
  clear: Storage.prototype.clear
};

function nativeGet(storage, key) {
  return nativeStorage.getItem.call(storage, key);
}
function nativeSet(storage, key, value) {
  return nativeStorage.setItem.call(storage, key, value);
}
function nativeRemove(storage, key) {
  return nativeStorage.removeItem.call(storage, key);
}

function makeClientId() {
  return globalThis.crypto?.randomUUID?.() || `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const state = {
  enabled: false,
  online: false,
  bootstrapping: true,
  applyingRemote: false,
  requiresKey: false,
  accessKey: nativeGet(sessionStorage, ACCESS_KEY_SESSION) || '',
  clientId: makeClientId(),
  revision: 0,
  polling: false,
  reloadScheduled: false,
  kvTimer: 0,
  kvPending: new Map(),
  status: 'Local browser storage'
};

function isSharedKey(key) {
  const value = String(key || '');
  if (value === 'aurelia.account.signed-out.v1') return false;
  return value.startsWith('aurelia.') || value.startsWith('findat.cloud.');
}

function loadPersistedKvOutbox() {
  try {
    const parsed = JSON.parse(nativeGet(localStorage, KV_OUTBOX_KEY) || '{}');
    Object.entries(parsed || {}).forEach(([key, value]) => {
      if (isSharedKey(key)) state.kvPending.set(key, value === null ? null : String(value));
    });
  } catch (_) {
    nativeRemove(localStorage, KV_OUTBOX_KEY);
  }
}

function persistKvOutbox() {
  const value = Object.fromEntries(state.kvPending);
  if (Object.keys(value).length) nativeSet(localStorage, KV_OUTBOX_KEY, JSON.stringify(value));
  else nativeRemove(localStorage, KV_OUTBOX_KEY);
}

loadPersistedKvOutbox();

function emitStatus(detail = {}) {
  const payload = {
    enabled: state.enabled,
    online: state.online,
    status: state.status,
    revision: state.revision,
    ...detail
  };
  window.dispatchEvent(new CustomEvent('findat-sync-status', { detail: payload }));
}

function setOnline(online, status) {
  state.online = Boolean(online);
  state.status = status || (state.online ? 'Shared workspace synchronized' : state.enabled ? 'Shared workspace offline — changes queued' : 'Local browser storage');
  emitStatus();
}

function endpoint(path, query = {}) {
  const url = new URL(`${API_ROOT}${path}`, location.origin);
  url.searchParams.set('workspace', WORKSPACE);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  return url;
}

async function promptForAccessKey() {
  const value = window.prompt('Enter the FINDAT shared workspace access key:');
  if (value === null) throw new Error('Shared workspace access was cancelled');
  state.accessKey = value.trim();
  nativeSet(sessionStorage, ACCESS_KEY_SESSION, state.accessKey);
}

async function apiFetch(path, options = {}, query = {}, mayPrompt = true) {
  const headers = new Headers(options.headers || {});
  headers.set('X-FINDAT-Client', state.clientId);
  if (state.accessKey) headers.set('X-FINDAT-Key', state.accessKey);
  let response = await fetch(endpoint(path, query), { ...options, headers, cache: 'no-store' });
  if (response.status === 401 && state.requiresKey && mayPrompt) {
    await promptForAccessKey();
    headers.set('X-FINDAT-Key', state.accessKey);
    response = await fetch(endpoint(path, query), { ...options, headers, cache: 'no-store' });
  }
  return response;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Browser storage request failed'));
  });
}

function openDriveDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DRIVE_DB_NAME, DRIVE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRIVE_STORE)) {
        const store = db.createObjectStore(DRIVE_STORE, { keyPath: 'path' });
        store.createIndex('parent', 'parent', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open the local FINDAT drive mirror'));
  });
}

function openSyncDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_DB_NAME, SYNC_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) db.createObjectStore(OUTBOX_STORE, { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open the FINDAT sync queue'));
  });
}

async function localDriveNodes() {
  if (!('indexedDB' in window)) return [];
  const db = await openDriveDatabase();
  const tx = db.transaction(DRIVE_STORE, 'readonly');
  return requestResult(tx.objectStore(DRIVE_STORE).getAll());
}

async function replaceLocalDrive(nodes) {
  if (!('indexedDB' in window)) return;
  const db = await openDriveDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DRIVE_STORE, 'readwrite');
    const store = tx.objectStore(DRIVE_STORE);
    store.clear();
    nodes.forEach(node => store.put(node));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Could not update the local FINDAT drive mirror'));
    tx.onabort = () => reject(tx.error || new Error('Local FINDAT drive update was cancelled'));
  });
}

async function applyLocalDriveChanges(puts, deletes) {
  if (!('indexedDB' in window)) return;
  const db = await openDriveDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DRIVE_STORE, 'readwrite');
    const store = tx.objectStore(DRIVE_STORE);
    deletes.forEach(path => store.delete(path));
    puts.forEach(node => store.put(node));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Could not apply shared FINDAT drive changes'));
    tx.onabort = () => reject(tx.error || new Error('Shared FINDAT drive update was cancelled'));
  });
}

async function outboxAdd(payload) {
  const db = await openSyncDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite');
    tx.objectStore(OUTBOX_STORE).add({ createdAt: Date.now(), payload });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Could not queue FINDAT changes'));
  });
}

async function outboxAll() {
  const db = await openSyncDatabase();
  const tx = db.transaction(OUTBOX_STORE, 'readonly');
  return requestResult(tx.objectStore(OUTBOX_STORE).getAll());
}

async function outboxDelete(id) {
  const db = await openSyncDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite');
    tx.objectStore(OUTBOX_STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Could not clear a synchronized FINDAT change'));
  });
}

function publicNodeMetadata(node, dataOffset = 0, dataLength = 0) {
  const copy = {};
  Object.entries(node || {}).forEach(([key, value]) => {
    if (key !== 'blob') copy[key] = value;
  });
  copy.dataOffset = dataOffset;
  copy.dataLength = dataLength;
  return copy;
}

async function createCommitPayload(puts = [], deletes = []) {
  const binaryParts = [];
  const metadata = [];
  let offset = 0;
  for (const source of puts) {
    const node = { ...source };
    if (node.type === 'file') {
      const blob = node.blob instanceof Blob ? node.blob : new Blob([node.blob || ''], { type: node.compression ? 'application/octet-stream' : node.mime || 'application/octet-stream' });
      const buffer = await blob.arrayBuffer();
      metadata.push(publicNodeMetadata(node, offset, buffer.byteLength));
      binaryParts.push(buffer);
      offset += buffer.byteLength;
    } else metadata.push(publicNodeMetadata(node, offset, 0));
  }
  const header = new TextEncoder().encode(JSON.stringify({ clientId: state.clientId, puts: metadata, deletes: [...deletes] }));
  const prefix = new Uint8Array(4);
  new DataView(prefix.buffer).setUint32(0, header.byteLength, false);
  return new Blob([prefix, header, ...binaryParts], { type: 'application/octet-stream' });
}

async function sendCommitPayload(payload) {
  const response = await apiFetch('/commit', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/octet-stream' } });
  if (!response.ok) throw new Error((await response.text()) || `Shared drive update failed (${response.status})`);
  const result = await response.json();
  state.revision = Math.max(state.revision, Number(result.revision) || 0);
  setOnline(true, 'Shared workspace synchronized');
  return result;
}

async function flushFileOutbox() {
  if (!state.enabled) return;
  const rows = await outboxAll();
  for (const row of rows) {
    await sendCommitPayload(row.payload);
    await outboxDelete(row.id);
  }
}

async function commitNodes(puts = [], deletes = []) {
  if (!state.enabled || state.bootstrapping || state.applyingRemote || (!puts.length && !deletes.length)) return { localOnly: !state.enabled };
  const payload = await createCommitPayload(puts, deletes);
  try {
    await flushFileOutbox();
    return await sendCommitPayload(payload);
  } catch (error) {
    await outboxAdd(payload);
    setOnline(false, 'Shared workspace offline — drive changes queued');
    console.warn('[FINDAT Shared Storage] Drive change queued:', error);
    return { queued: true };
  }
}

function localSharedEntries() {
  const result = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && isSharedKey(key)) result[key] = nativeGet(localStorage, key);
  }
  return result;
}

async function flushKvOutbox() {
  if (!state.enabled || !state.kvPending.size) return;
  const entries = Object.fromEntries(state.kvPending);
  const response = await apiFetch('/kv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: state.clientId, entries })
  });
  if (!response.ok) throw new Error((await response.text()) || `Shared settings update failed (${response.status})`);
  const result = await response.json();
  Object.keys(entries).forEach(key => {
    if (state.kvPending.get(key) === entries[key]) state.kvPending.delete(key);
  });
  persistKvOutbox();
  state.revision = Math.max(state.revision, Number(result.revision) || 0);
  setOnline(true, 'Shared workspace synchronized');
}

function scheduleKvFlush(delay = 140) {
  persistKvOutbox();
  clearTimeout(state.kvTimer);
  state.kvTimer = setTimeout(() => {
    flushKvOutbox().catch(error => {
      setOnline(false, 'Shared workspace offline — settings queued');
      console.warn('[FINDAT Shared Storage] Settings change queued:', error);
    });
  }, delay);
}

function patchLocalStorage() {
  Storage.prototype.setItem = function findatSharedSetItem(key, value) {
    const result = nativeStorage.setItem.call(this, key, value);
    if (this === localStorage && !state.applyingRemote && isSharedKey(key)) {
      state.kvPending.set(String(key), String(value));
      scheduleKvFlush();
    }
    return result;
  };
  Storage.prototype.removeItem = function findatSharedRemoveItem(key) {
    const result = nativeStorage.removeItem.call(this, key);
    if (this === localStorage && !state.applyingRemote && isSharedKey(key)) {
      state.kvPending.set(String(key), null);
      scheduleKvFlush();
    }
    return result;
  };
  Storage.prototype.clear = function findatSharedClear() {
    if (this !== localStorage || state.applyingRemote) return nativeStorage.clear.call(this);
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key) keys.push(key);
    }
    keys.forEach(key => {
      if (key !== KV_OUTBOX_KEY) nativeRemove(localStorage, key);
      if (isSharedKey(key)) state.kvPending.set(key, null);
    });
    scheduleKvFlush();
  };
}

function applyRemoteKv(kv, replace = false) {
  state.applyingRemote = true;
  try {
    if (replace) {
      const keys = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && isSharedKey(key)) keys.push(key);
      }
      keys.forEach(key => nativeRemove(localStorage, key));
    }
    Object.entries(kv || {}).forEach(([key, value]) => {
      if (!isSharedKey(key)) return;
      if (value === null || value === undefined) nativeRemove(localStorage, key);
      else nativeSet(localStorage, key, String(value));
    });
  } finally {
    state.applyingRemote = false;
  }
}

async function downloadNode(node) {
  if (node.type !== 'file') return { ...node };
  const response = await apiFetch('/blob', {}, { path: node.path });
  if (!response.ok) throw new Error(`Could not download ${node.name || node.path}`);
  const buffer = await response.arrayBuffer();
  return {
    ...node,
    blob: new Blob([buffer], { type: node.compression ? 'application/octet-stream' : node.mime || 'application/octet-stream' })
  };
}

async function mapWithConcurrency(items, limit, task) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await task(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, Math.max(1, items.length)) }, worker));
  return output;
}

async function applySnapshot(snapshot) {
  applyRemoteKv(snapshot.kv || {}, true);
  const nodes = await mapWithConcurrency(snapshot.nodes || [], 4, downloadNode);
  state.applyingRemote = true;
  try {
    await replaceLocalDrive(nodes);
  } finally {
    state.applyingRemote = false;
  }
  state.revision = Number(snapshot.revision) || 0;
}

async function seedEmptyServer() {
  const entries = localSharedEntries();
  if (Object.keys(entries).length) {
    const response = await apiFetch('/kv', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: state.clientId, entries })
    });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    state.revision = Math.max(state.revision, Number(result.revision) || 0);
  }
  const nodes = await localDriveNodes();
  if (nodes.length) await sendCommitPayload(await createCommitPayload(nodes, []));
}

async function bootstrapSharedStorage() {
  let configResponse;
  try {
    configResponse = await fetch(endpoint('/config'), { cache: 'no-store' });
  } catch (_) {
    return false;
  }
  if (!configResponse.ok) return false;
  const config = await configResponse.json().catch(() => null);
  if (!config?.enabled) return false;

  state.enabled = true;
  state.requiresKey = Boolean(config.requiresKey);
  if (state.requiresKey && !state.accessKey) await promptForAccessKey();

  try {
    await flushKvOutbox();
    await flushFileOutbox();
    const response = await apiFetch('/bootstrap');
    if (!response.ok) throw new Error((await response.text()) || `Shared workspace bootstrap failed (${response.status})`);
    const snapshot = await response.json();
    if (snapshot.empty) {
      state.revision = Number(snapshot.revision) || 0;
      await seedEmptyServer();
    } else await applySnapshot(snapshot);
    setOnline(true, 'Shared workspace synchronized');
    return true;
  } catch (error) {
    setOnline(false, 'Shared workspace unavailable — using local mirror');
    console.warn('[FINDAT Shared Storage] Startup sync failed:', error);
    return true;
  }
}

function scheduleRemoteReload() {
  if (state.reloadScheduled) return;
  state.reloadScheduled = true;
  nativeSet(sessionStorage, 'findat.shared.remote-refresh.v1', '1');
  const announce = () => {
    if (typeof window.toast === 'function') window.toast('Shared workspace updated on another device');
  };
  announce();
  setTimeout(() => location.reload(), 900);
}

async function applyChanges(result) {
  if (result.reset) {
    await applySnapshot(result);
    scheduleRemoteReload();
    return;
  }
  const foreignKv = (result.kvChanges || []).filter(change => change.clientId !== state.clientId);
  const foreignNodes = (result.nodeChanges || []).filter(change => change.clientId !== state.clientId);
  if (!foreignKv.length && !foreignNodes.length) {
    state.revision = Number(result.revision) || state.revision;
    return;
  }

  const kv = {};
  foreignKv.forEach(change => { kv[change.key] = change.deleted ? null : change.value; });
  applyRemoteKv(kv, false);

  const deletes = foreignNodes.filter(change => change.deleted).map(change => change.path);
  const puts = await mapWithConcurrency(
    foreignNodes.filter(change => !change.deleted && change.node),
    4,
    change => downloadNode(change.node)
  );
  state.applyingRemote = true;
  try {
    await applyLocalDriveChanges(puts, deletes);
  } finally {
    state.applyingRemote = false;
  }
  state.revision = Number(result.revision) || state.revision;
  scheduleRemoteReload();
}

async function pollChanges() {
  if (!state.enabled || state.polling || document.visibilityState === 'hidden') return;
  state.polling = true;
  try {
    await flushKvOutbox();
    await flushFileOutbox();
    const response = await apiFetch('/changes', {}, { since: state.revision }, false);
    if (response.status === 401) throw new Error('Shared workspace access key is no longer accepted');
    if (!response.ok) throw new Error(`Shared workspace check failed (${response.status})`);
    await applyChanges(await response.json());
    setOnline(true, 'Shared workspace synchronized');
  } catch (error) {
    setOnline(false, 'Shared workspace offline — changes queued');
    console.warn('[FINDAT Shared Storage] Poll failed:', error);
  } finally {
    state.polling = false;
  }
}

async function loadClassicScript(src) {
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.body.append(script);
  });
}

window.FINDATSharedStorage = {
  get enabled() { return state.enabled; },
  get online() { return state.online; },
  get status() { return state.status; },
  get revision() { return state.revision; },
  get workspace() { return WORKSPACE; },
  commitNodes,
  flush: async () => { await flushKvOutbox(); await flushFileOutbox(); },
  reconnect: pollChanges
};

await bootstrapSharedStorage();
patchLocalStorage();
state.bootstrapping = false;

for (const src of SCRIPT_LIST) await loadClassicScript(src);

window.addEventListener('online', pollChanges);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') pollChanges();
});
setInterval(pollChanges, 3000);
setTimeout(() => emitStatus(), 0);

window.addEventListener('pagehide', () => {
  if (state.kvPending.size) {
    persistKvOutbox();
    fetch(endpoint('/kv'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FINDAT-Client': state.clientId,
        ...(state.accessKey ? { 'X-FINDAT-Key': state.accessKey } : {})
      },
      body: JSON.stringify({ clientId: state.clientId, entries: Object.fromEntries(state.kvPending) }),
      keepalive: true
    }).catch(() => {});
  }
});
