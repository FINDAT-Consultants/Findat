/* FINDAT Cloud: Supabase Storage-only provider.
 *
 * The application does not use a custom PostgreSQL document table. File-system
 * paths are encoded into Storage object keys, while the actual file bytes live
 * directly in the configured Supabase Storage bucket.
 */
const sharedCloudRuntime = {
  syncing: false,
  lastPullAt: 0,
  lastSuccessAt: 0,
  lastHealthAt: 0,
  lastError: '',
  timer: null,
  started: false,
  remoteCount: 0,
  health: null,
  lastFullListAt: 0,
  manifestGeneratedAt: ''
};

function sharedCloudConfig() {
  return window.FINDAT_CLOUD_CONFIG || {};
}

function sharedCloudApiKey() {
  const config = sharedCloudConfig();
  return String(config.publishableKey || config.anonKey || '').trim();
}

function sharedCloudUnsafeSecretConfigured() {
  return /^sb_secret_/i.test(sharedCloudApiKey());
}

function sharedCloudConfigurationError() {
  const config = sharedCloudConfig();
  const apiKey = sharedCloudApiKey();
  if (!config.enabled) return 'FINDAT Cloud storage is disabled';
  if (String(config.provider || '').toLowerCase() !== 'supabase') return 'FINDAT Cloud storage is not selected';
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(config.supabaseUrl || '').trim())) {
    return 'The FINDAT Cloud connection address is missing or invalid';
  }
  if (!apiKey || apiKey.includes('PASTE_') || apiKey.includes('YOUR_')) {
    return 'The FINDAT Cloud connection key is not configured';
  }
  if (sharedCloudUnsafeSecretConfigured()) {
    return 'The Cloud connection uses an unsafe key. Replace it with a browser-safe key.';
  }
  if (!String(config.bucket || '').trim()) return 'The FINDAT Cloud storage area is not configured';
  return '';
}

function sharedCloudEnabled() {
  return !sharedCloudConfigurationError();
}

function sharedCloudBaseUrl() {
  return String(sharedCloudConfig().supabaseUrl || '').replace(/\/+$/, '');
}

function sharedCloudAuthHeaders(extra = {}) {
  const config = sharedCloudConfig();
  const apiKey = sharedCloudApiKey();
  const accessToken = String(window.FINDAT_CLOUD_ACCESS_TOKEN || config.accessToken || '').trim();
  const headers = { apikey: apiKey };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  else if (/^eyJ[a-zA-Z0-9_-]*\./.test(apiKey)) headers.Authorization = `Bearer ${apiKey}`;
  return { ...headers, ...extra };
}

function sharedCloudEmitProgress(detail = {}) {
  window.dispatchEvent(new CustomEvent('findat:cloud-progress', {
    detail: { provider: 'supabase', mode: 'storage-only', ...detail }
  }));
}

async function sharedCloudFetch(url, options = {}, label = 'FINDAT Cloud request') {
  const response = await fetch(url, options);
  if (response.ok) return response;
  let detail = '';
  try {
    const payload = await response.json();
    detail = payload.message || payload.error_description || payload.error || payload.msg || JSON.stringify(payload);
  } catch (_) {
    try { detail = await response.text(); } catch (_) { /* no response body */ }
  }
  throw new Error(`${label} failed (${response.status})${detail ? `: ${detail}` : ''}`);
}

function sharedCloudBucket() {
  return String(sharedCloudConfig().bucket || 'findat-documents').trim();
}

function sharedCloudRoot() {
  return String(sharedCloudConfig().objectRoot || 'findat-v1').replace(/^\/+|\/+$/g, '') || 'findat-v1';
}

function sharedCloudFilesPrefix() {
  return `${sharedCloudRoot()}/files`;
}

function sharedCloudFoldersPrefix() {
  return `${sharedCloudRoot()}/folders`;
}

function sharedCloudIndexObjectPath() {
  return `${sharedCloudRoot()}/index.json`;
}

const SHARED_CLOUD_INDEX_FORMAT = 'findat-storage-index-v1';

function sharedCloudManifestNode(node) {
  return {
    path: node.path,
    parent: node.parent,
    name: node.name,
    type: node.type,
    size: Number(node.size) || 0,
    mime: node.type === 'file'
      ? (typeof driveMime === 'function' ? driveMime(node.name, node.mime || '') : node.mime || 'application/octet-stream')
      : 'inode/directory',
    modified: node.modified || node.cloudModified || new Date().toISOString(),
    originalPath: node.originalPath || '',
    cloudObjectPath: node.cloudObjectPath || '',
    cloudModified: node.cloudModified || node.modified || '',
    cloudVersion: node.cloudVersion || '',
    cloudChecksum: node.cloudChecksum || ''
  };
}

function sharedCloudNodeFromManifest(value) {
  if (!value || typeof value !== 'object') return null;
  const path = String(value.path || '');
  const type = value.type === 'folder' ? 'folder' : value.type === 'file' ? 'file' : '';
  if (!path.startsWith('/') || !type || sharedCloudIsSystemRoot(path)) return null;
  const name = sharedCloudBasename(path);
  const modified = String(value.modified || value.cloudModified || new Date().toISOString());
  const objectPath = type === 'file'
    ? String(value.cloudObjectPath || sharedCloudObjectPathForNode({ path, name, type }))
    : String(value.cloudObjectPath || '');
  if (type === 'file' && !sharedCloudManagedObjectPath(objectPath)) return null;
  return {
    path,
    parent: sharedCloudParent(path),
    name,
    type,
    size: type === 'file' ? Number(value.size) || 0 : 0,
    mime: type === 'file'
      ? (typeof driveMime === 'function' ? driveMime(name, value.mime || '') : value.mime || 'application/octet-stream')
      : 'inode/directory',
    modified,
    originalPath: String(value.originalPath || ''),
    cloudSynced: 1,
    cloudPending: false,
    cloudObjectPath: objectPath,
    cloudModified: String(value.cloudModified || modified),
    cloudVersion: String(value.cloudVersion || ''),
    cloudChecksum: String(value.cloudChecksum || '')
  };
}

async function sharedCloudReadManifest() {
  const objectPath = sharedCloudIndexObjectPath();
  const publicObject = sharedCloudConfig().publicBucket !== false;
  let url = sharedCloudStorageObjectUrl(objectPath, publicObject);
  // A small rolling query value avoids a stale CDN response without making the
  // metadata index unique on every request. Document bytes are unaffected.
  if (publicObject) url += `?m=${Math.floor(Date.now() / 15000)}`;
  const response = await fetch(url, {
    headers: publicObject ? {} : sharedCloudAuthHeaders({ Accept: 'application/json' }),
    cache: 'no-store'
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch (_) { /* no body */ }
    throw new Error(`Reading the FINDAT document index failed (${response.status})${detail ? `: ${detail}` : ''}`);
  }
  const payload = await response.json();
  if (payload?.format !== SHARED_CLOUD_INDEX_FORMAT || !Array.isArray(payload.nodes)) return null;
  const nodes = payload.nodes.map(sharedCloudNodeFromManifest).filter(Boolean);
  sharedCloudRuntime.manifestGeneratedAt = String(payload.generatedAt || '');
  sharedCloudRuntime.remoteCount = nodes.length;
  return { nodes, source: 'manifest', generatedAt: sharedCloudRuntime.manifestGeneratedAt };
}

async function sharedCloudWriteManifest(nodes = null) {
  const source = Array.isArray(nodes) ? nodes : await databaseAll();
  const entries = source
    .filter(node => sharedCloudShareable(node) && node.cloudSynced && !node.cloudPending)
    .map(sharedCloudManifestNode)
    .sort((left, right) => String(left.path).localeCompare(String(right.path)));
  const generatedAt = new Date().toISOString();
  const payload = new Blob([JSON.stringify({
    format: SHARED_CLOUD_INDEX_FORMAT,
    generatedAt,
    nodes: entries
  })], { type: 'application/json' });
  await sharedCloudFetch(sharedCloudStorageObjectUrl(sharedCloudIndexObjectPath()), {
    method: 'POST',
    headers: sharedCloudAuthHeaders({
      'Content-Type': 'application/json',
      'x-upsert': 'true',
      'cache-control': '15'
    }),
    body: payload
  }, 'Updating the FINDAT document index');
  sharedCloudRuntime.manifestGeneratedAt = generatedAt;
  sharedCloudRuntime.remoteCount = entries.length;
  return entries.length;
}

async function sharedCloudRefreshManifestQuietly() {
  try {
    await sharedCloudWriteManifest();
    return true;
  } catch (error) {
    // The index only accelerates discovery on phones. The actual Storage
    // objects remain authoritative, so a transient index failure must not roll
    // back a successfully uploaded document.
    console.warn('Could not refresh the FINDAT document index.', error);
    return false;
  }
}

function sharedCloudStorageObjectUrl(objectPath, publicObject = false) {
  const bucket = encodeURIComponent(sharedCloudBucket());
  const encodedPath = String(objectPath || '').split('/').map(encodeURIComponent).join('/');
  const mode = publicObject ? 'public/' : '';
  return `${sharedCloudBaseUrl()}/storage/v1/object/${mode}${bucket}/${encodedPath}`;
}

function sharedCloudPublicUrl(entryOrPath) {
  if (!sharedCloudEnabled() || sharedCloudConfig().publicBucket === false) return '';
  const objectPath = typeof entryOrPath === 'string'
    ? entryOrPath
    : entryOrPath?.cloudObjectPath || entryOrPath?.object_path || '';
  if (!objectPath) return '';
  const version = typeof entryOrPath === 'object'
    ? String(entryOrPath?.cloudModified || entryOrPath?.modified || '')
    : '';
  const url = sharedCloudStorageObjectUrl(objectPath, true);
  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}

function sharedCloudUtf8Base64Url(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function sharedCloudBase64UrlUtf8(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function sharedCloudFileExtension(name) {
  const match = String(name || '').match(/(\.[a-z0-9]{1,12})$/i);
  return match ? match[1].toLowerCase() : '';
}

function sharedCloudObjectPathForNode(node) {
  const token = sharedCloudUtf8Base64Url(node?.path || '');
  if (node?.type === 'folder') return `${sharedCloudFoldersPrefix()}/${token}.folder`;
  return `${sharedCloudFilesPrefix()}/${token}${sharedCloudFileExtension(node?.name)}`;
}

function sharedCloudManagedObjectPath(objectPath) {
  const path = String(objectPath || '');
  return path.startsWith(`${sharedCloudFilesPrefix()}/`) || path.startsWith(`${sharedCloudFoldersPrefix()}/`);
}

function sharedCloudVirtualPathFromObjectPath(objectPath) {
  const path = String(objectPath || '');
  let prefix = '';
  if (path.startsWith(`${sharedCloudFilesPrefix()}/`)) prefix = `${sharedCloudFilesPrefix()}/`;
  else if (path.startsWith(`${sharedCloudFoldersPrefix()}/`)) prefix = `${sharedCloudFoldersPrefix()}/`;
  else return '';
  const name = path.slice(prefix.length).split('/')[0];
  const token = name.includes('.') ? name.slice(0, name.indexOf('.')) : name;
  try {
    const decoded = sharedCloudBase64UrlUtf8(token);
    return decoded.startsWith('/') ? decoded : '';
  } catch (_) {
    return '';
  }
}

function sharedCloudIsSystemRoot(path) {
  return path === '/' || (typeof SYSTEM_FOLDERS !== 'undefined' && SYSTEM_FOLDERS.some(name => path === `/${name}`));
}

function sharedCloudShareable(node) {
  return Boolean(node?.path && !sharedCloudIsSystemRoot(node.path));
}

function sharedCloudNeedsManagedObject(node) {
  // Files must always have a Storage object. Folder keys are optional when the
  // folder already exists implicitly through child object paths; only newly
  // created or pending folders need a zero-byte marker.
  return node?.type === 'file' && !sharedCloudManagedObjectPath(node.cloudObjectPath);
}

function sharedCloudNodeFingerprint(node) {
  if (!node) return '';
  return JSON.stringify([
    node.path, node.parent, node.name, node.type, Number(node.size) || 0,
    node.mime || '', node.modified || '', node.originalPath || ''
  ]);
}

function sharedCloudMimeFromStorage(item, fallbackName = '') {
  const metadata = item?.metadata || {};
  return metadata.mimetype || metadata.mimeType || metadata.contentType ||
    (typeof driveMime === 'function' ? driveMime(fallbackName) : 'application/octet-stream');
}

function sharedCloudSizeFromStorage(item) {
  const metadata = item?.metadata || {};
  return Number(metadata.size ?? metadata.contentLength ?? 0) || 0;
}

function sharedCloudParent(path) {
  if (typeof parentPath === 'function') return parentPath(path);
  const value = String(path || '/');
  if (value === '/') return null;
  const index = value.lastIndexOf('/');
  return index <= 0 ? '/' : value.slice(0, index);
}

function sharedCloudBasename(path) {
  if (typeof basename === 'function') return basename(path);
  return String(path || '').split('/').filter(Boolean).pop() || '';
}

function sharedCloudNodeFromStorageItem(item, objectPath, type) {
  const path = sharedCloudVirtualPathFromObjectPath(objectPath);
  if (!path || sharedCloudIsSystemRoot(path)) return null;
  const modified = item?.updated_at || item?.created_at || new Date().toISOString();
  return {
    path,
    parent: sharedCloudParent(path),
    name: sharedCloudBasename(path),
    type,
    size: type === 'file' ? sharedCloudSizeFromStorage(item) : 0,
    mime: type === 'file' ? sharedCloudMimeFromStorage(item, sharedCloudBasename(path)) : 'inode/directory',
    modified,
    cloudSynced: 1,
    cloudPending: false,
    cloudObjectPath: objectPath,
    cloudModified: modified,
    cloudVersion: String(item?.id || item?.version || ''),
    cloudChecksum: item?.metadata?.eTag || item?.metadata?.etag || ''
  };
}

async function sharedCloudListPrefix(prefix) {
  const bucket = encodeURIComponent(sharedCloudBucket());
  const cleanPrefix = String(prefix || '').replace(/\/+$/, '');
  const rows = [];
  const limit = 1000;
  for (let offset = 0; ; offset += limit) {
    const response = await sharedCloudFetch(`${sharedCloudBaseUrl()}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: sharedCloudAuthHeaders({
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify({
        prefix: `${cleanPrefix}/`,
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' }
      })
    }, `Listing ${cleanPrefix} in FINDAT Cloud`);
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error('FINDAT Cloud returned an invalid document list');
    for (const item of page) {
      if (!item || item.id === null) continue;
      const name = String(item.name || '');
      const objectPath = name.startsWith(`${cleanPrefix}/`) ? name : `${cleanPrefix}/${name}`;
      rows.push({ ...item, objectPath });
    }
    if (page.length < limit) break;
  }
  return rows;
}

async function sharedCloudListStorageNodes(options = {}) {
  if (!options.forceList) {
    try {
      const manifest = await sharedCloudReadManifest();
      if (manifest) return manifest;
    } catch (error) {
      console.warn('The fast FINDAT document index was unavailable; falling back to a full Storage listing.', error);
    }
  }

  const [files, folderMarkers] = await Promise.all([
    sharedCloudListPrefix(sharedCloudFilesPrefix()),
    sharedCloudListPrefix(sharedCloudFoldersPrefix())
  ]);
  const byPath = new Map();
  for (const item of folderMarkers) {
    const node = sharedCloudNodeFromStorageItem(item, item.objectPath, 'folder');
    if (node) byPath.set(node.path, node);
  }
  for (const item of files) {
    const node = sharedCloudNodeFromStorageItem(item, item.objectPath, 'file');
    if (node) byPath.set(node.path, node);
  }

  // Supabase folders are object-key prefixes, not physical directories. Build
  // missing parent folders from each stored path so all devices see the same
  // hierarchy even when a folder marker was not needed.
  for (const node of [...byPath.values()]) {
    let current = sharedCloudParent(node.path);
    while (current && current !== '/' && !sharedCloudIsSystemRoot(current)) {
      if (!byPath.has(current)) {
        byPath.set(current, {
          path: current,
          parent: sharedCloudParent(current),
          name: sharedCloudBasename(current),
          type: 'folder',
          size: 0,
          mime: 'inode/directory',
          modified: node.modified,
          cloudSynced: 1,
          cloudPending: false,
          cloudObjectPath: '',
          cloudModified: node.modified,
          cloudVersion: '',
          cloudChecksum: ''
        });
      }
      current = sharedCloudParent(current);
    }
  }

  const nodes = [...byPath.values()];
  sharedCloudRuntime.remoteCount = nodes.length;
  sharedCloudRuntime.lastFullListAt = Date.now();
  // Build the compact index for subsequent phone and tablet visits. Do not
  // delay this first full load while the index object is written.
  sharedCloudWriteManifest(nodes).catch(error => console.warn('Could not create the FINDAT document index.', error));
  return { nodes, source: 'list', generatedAt: '' };
}

// Kept under the previous function name because the settings panel already
// calls it. It now checks only Supabase Storage and makes no Data API request.
async function sharedCloudDatabaseHealth(force = false) {
  if (!sharedCloudEnabled()) return null;
  if (!force && sharedCloudRuntime.health && Date.now() - sharedCloudRuntime.lastHealthAt < 30000) {
    return sharedCloudRuntime.health;
  }
  const files = await sharedCloudListPrefix(sharedCloudFilesPrefix());
  const health = {
    ok: true,
    mode: 'storage-only',
    provider: 'FINDAT Cloud storage',
    bucket: sharedCloudBucket(),
    bucket_exists: true,
    object_root: sharedCloudRoot(),
    sample_count: files.length
  };
  sharedCloudRuntime.health = health;
  sharedCloudRuntime.lastHealthAt = Date.now();
  return health;
}

async function sharedCloudUploadObject(node, blob, objectPath) {
  const limit = Math.max(1, Number(sharedCloudConfig().maxFileBytes) || 50 * 1024 * 1024);
  if (blob.size > limit) throw new Error(`${node.name} is larger than the configured Cloud upload limit`);
  sharedCloudEmitProgress({ phase: 'upload', name: node.name, loaded: 0, total: Math.max(1, blob.size) });
  await sharedCloudFetch(sharedCloudStorageObjectUrl(objectPath), {
    method: 'POST',
    headers: sharedCloudAuthHeaders({
      'Content-Type': node.mime || blob.type || 'application/octet-stream',
      'x-upsert': 'true',
      'cache-control': '0'
    }),
    body: blob
  }, `Uploading ${node.name} to FINDAT Cloud`);
  sharedCloudEmitProgress({ phase: 'uploaded', name: node.name, loaded: Math.max(1, blob.size), total: Math.max(1, blob.size) });
}

async function sharedCloudUploadFolderMarker(node, objectPath) {
  const marker = new Blob([], { type: 'application/x-findat-folder' });
  sharedCloudEmitProgress({ phase: 'upload', name: node.name, loaded: 0, total: 1 });
  await sharedCloudFetch(sharedCloudStorageObjectUrl(objectPath), {
    method: 'POST',
    headers: sharedCloudAuthHeaders({
      'Content-Type': marker.type,
      'x-upsert': 'true',
      'cache-control': '0'
    }),
    body: marker
  }, `Saving folder ${node.name} to FINDAT Cloud`);
  sharedCloudEmitProgress({ phase: 'uploaded', name: node.name, loaded: 1, total: 1 });
}

async function sharedCloudDeleteObjects(objectPaths) {
  const unique = [...new Set(objectPaths.filter(path => sharedCloudManagedObjectPath(path)))];
  if (!unique.length) return;
  const bucket = encodeURIComponent(sharedCloudBucket());
  for (let index = 0; index < unique.length; index += 1000) {
    const prefixes = unique.slice(index, index + 1000);
    await sharedCloudFetch(`${sharedCloudBaseUrl()}/storage/v1/object/${bucket}`, {
      method: 'DELETE',
      headers: sharedCloudAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefixes })
    }, 'Deleting documents directly from FINDAT Cloud');
  }
}

async function sharedCloudDownloadObject(row) {
  const objectPath = row?.object_path || row?.cloudObjectPath || '';
  if (!objectPath) throw new Error(`No Cloud document is available for ${row?.name || 'this document'}`);
  const publicUrl = sharedCloudConfig().publicBucket === false ? '' : sharedCloudPublicUrl({
    cloudObjectPath: objectPath,
    cloudModified: row?.cloudModified || row?.modified || ''
  });
  const response = await sharedCloudFetch(publicUrl || sharedCloudStorageObjectUrl(objectPath), {
    headers: publicUrl ? {} : sharedCloudAuthHeaders()
  }, `Downloading ${row?.name || 'document'} from FINDAT Cloud`);
  return response.blob();
}

async function sharedCloudStoreRemoteNode(remoteNode) {
  const current = await databaseGet(remoteNode.path);
  const staged = typeof peekPendingCloudPayload === 'function' ? peekPendingCloudPayload(remoteNode.path) : null;
  if (current?.cloudPending || staged instanceof Blob) return;
  // Supabase is the source of truth. Only metadata is kept in IndexedDB so the
  // desktop can render icons; document bytes are downloaded on demand.
  await databasePut({
    ...current,
    ...remoteNode,
    storedSize: 0,
    compression: '',
    compressionVersion: 0,
    compressionChecked: 1,
    blob: undefined,
    cloudSourceObjectPath: ''
  });
}

async function sharedCloudPull(options = {}) {
  if (!sharedCloudEnabled()) return { enabled: false, changed: false, rows: 0 };
  if (sharedCloudRuntime.syncing) return { enabled: true, changed: false, rows: sharedCloudRuntime.remoteCount };
  sharedCloudRuntime.syncing = true;
  try {
    const shouldForceList = Boolean(options.forceList) || Boolean(
      sharedCloudRuntime.lastFullListAt && Date.now() - sharedCloudRuntime.lastFullListAt > 5 * 60 * 1000
    );
    const listing = await sharedCloudListStorageNodes({ forceList: shouldForceList });
    const remoteNodes = listing.nodes;
    const remotePaths = new Set(remoteNodes.map(node => node.path));
    const localNodes = await databaseAll();
    // Only a full Storage listing is authoritative enough to remove metadata.
    // A compact index can briefly lag behind another device's write.
    const stale = listing.source === 'list' ? localNodes.filter(node =>
      node.cloudSynced &&
      !node.cloudPending &&
      sharedCloudShareable(node) &&
      sharedCloudManagedObjectPath(node.cloudObjectPath) &&
      !remotePaths.has(node.path)
    ) : [];
    if (stale.length) await databaseCommit([], stale.map(node => node.path));

    const ordered = [...remoteNodes].sort((left, right) => {
      const depth = String(left.path).split('/').length - String(right.path).split('/').length;
      if (depth) return depth;
      if (left.type !== right.type) return left.type === 'folder' ? -1 : 1;
      return String(left.path).localeCompare(String(right.path));
    });
    for (const node of ordered) await sharedCloudStoreRemoteNode(node);

    // Migrate files left pending by the previous SQL-metadata build directly
    // into Storage, even when the bucket already contains other documents.
    let pending = (await databaseAll()).filter(node =>
      sharedCloudShareable(node) &&
      (!node.cloudSynced || node.cloudPending || sharedCloudNeedsManagedObject(node))
    );
    // A tab closed during an upload can leave metadata without either a cloud
    // object or an in-memory payload. Remove that incomplete icon rather than
    // pretending the document was saved locally.
    const orphanedPending = pending.filter(node =>
      node.type === 'file' &&
      !(node.blob instanceof Blob) &&
      !node.cloudObjectPath &&
      !node.cloudSourceObjectPath &&
      !(typeof peekPendingCloudPayload === 'function' && peekPendingCloudPayload(node.path) instanceof Blob)
    );
    if (orphanedPending.length) {
      await databaseCommit([], orphanedPending.map(node => node.path));
      const orphanedPaths = new Set(orphanedPending.map(node => node.path));
      pending = pending.filter(node => !orphanedPaths.has(node.path));
    }
    if (pending.length) await sharedCloudPushDiff([], pending);

    sharedCloudRuntime.lastPullAt = Date.now();
    sharedCloudRuntime.lastSuccessAt = Date.now();
    sharedCloudRuntime.lastError = '';
    sharedCloudRuntime.health = {
      ok: true,
      mode: 'storage-only',
      provider: 'FINDAT Cloud storage',
      bucket: sharedCloudBucket(),
      bucket_exists: true,
      object_root: sharedCloudRoot(),
      sample_count: remoteNodes.filter(node => node.type === 'file').length,
      discovery: listing.source
    };
    sharedCloudRuntime.lastHealthAt = Date.now();
    if (!options.quiet && typeof refreshAllFileViews === 'function') refreshAllFileViews();
    return { enabled: true, changed: Boolean(stale.length || remoteNodes.length || pending.length), rows: remoteNodes.length, source: listing.source };
  } catch (error) {
    sharedCloudRuntime.lastError = error.message;
    throw error;
  } finally {
    sharedCloudRuntime.syncing = false;
  }
}

async function sharedCloudEnsureFresh(maxAgeMs = 2500) {
  if (!sharedCloudEnabled()) return;
  if (Date.now() - sharedCloudRuntime.lastPullAt < maxAgeMs) return;
  await sharedCloudPull({ quiet: true });
}

async function sharedCloudPushDiff(beforeNodes, afterNodes) {
  if (!sharedCloudEnabled()) return;
  const before = new Map((beforeNodes || []).filter(sharedCloudShareable).map(node => [node.path, node]));
  const after = new Map((afterNodes || []).filter(sharedCloudShareable).map(node => [node.path, node]));
  const changed = [...after.values()].filter(node =>
    node.cloudPending ||
    !node.cloudSynced ||
    sharedCloudNeedsManagedObject(node) ||
    sharedCloudNodeFingerprint(node) !== sharedCloudNodeFingerprint(before.get(node.path))
  );
  const removed = [...before.values()].filter(node => !after.has(node.path) && (node.cloudSynced || node.cloudObjectPath));

  const markedNodes = [];
  const oldObjectPaths = [];
  const createdObjectPaths = [];
  const existingBeforeObjects = new Set([...before.values()].map(node => node.cloudObjectPath).filter(Boolean));

  try {
    const folders = changed.filter(node => node.type === 'folder');
    const files = changed.filter(node => node.type === 'file');

    for (const node of folders) {
      const objectPath = sharedCloudObjectPathForNode(node);
      await sharedCloudUploadFolderMarker(node, objectPath);
      if (!existingBeforeObjects.has(objectPath)) createdObjectPaths.push(objectPath);
      if (node.cloudPreviousObjectPath && node.cloudPreviousObjectPath !== objectPath) oldObjectPaths.push(node.cloudPreviousObjectPath);
      if (node.cloudObjectPath && node.cloudObjectPath !== objectPath) oldObjectPaths.push(node.cloudObjectPath);
      markedNodes.push({
        ...node,
        blob: undefined,
        cloudSynced: 1,
        cloudPending: false,
        cloudObjectPath: objectPath,
        cloudModified: new Date().toISOString(),
        cloudPreviousPath: '',
        cloudPreviousObjectPath: '',
        cloudSourceObjectPath: ''
      });
    }

    for (const node of files) {
      const objectPath = sharedCloudObjectPathForNode(node);
      const staged = typeof peekPendingCloudPayload === 'function' ? peekPendingCloudPayload(node.path) : null;
      const blob = staged instanceof Blob
        ? staged
        : node.cloudSourceObjectPath
          ? await sharedCloudDownloadObject({ name: node.name, object_path: node.cloudSourceObjectPath })
          : await readLocalFile(node.path);
      await sharedCloudUploadObject(node, blob, objectPath);
      if (typeof releasePendingCloudPayload === 'function') releasePendingCloudPayload(node.path);
      if (!existingBeforeObjects.has(objectPath)) createdObjectPaths.push(objectPath);
      if (node.cloudPreviousObjectPath && node.cloudPreviousObjectPath !== objectPath) oldObjectPaths.push(node.cloudPreviousObjectPath);
      if (node.cloudObjectPath && node.cloudObjectPath !== objectPath) oldObjectPaths.push(node.cloudObjectPath);
      markedNodes.push({
        ...node,
        storedSize: 0,
        compression: '',
        compressionVersion: 0,
        compressionChecked: 1,
        blob: undefined,
        cloudSynced: 1,
        cloudPending: false,
        cloudObjectPath: objectPath,
        cloudModified: new Date().toISOString(),
        cloudPreviousPath: '',
        cloudPreviousObjectPath: '',
        cloudSourceObjectPath: ''
      });
    }

    const removedObjects = removed.map(node => node.cloudObjectPath).filter(Boolean);
    await sharedCloudDeleteObjects([...oldObjectPaths, ...removedObjects]);
    if (markedNodes.length) await databaseCommit(markedNodes, []);
    const manifestUpdated = changed.length || removed.length
      ? await sharedCloudRefreshManifestQuietly()
      : false;

    sharedCloudRuntime.lastSuccessAt = Date.now();
    sharedCloudRuntime.lastPullAt = Date.now();
    sharedCloudRuntime.lastError = '';
    if (!manifestUpdated) {
      sharedCloudRuntime.remoteCount = Math.max(
        0,
        sharedCloudRuntime.remoteCount + changed.filter(node => !before.has(node.path)).length - removed.length
      );
    }
    sharedCloudRuntime.health = null;
  } catch (error) {
    for (const node of changed) {
      if (typeof releasePendingCloudPayload === 'function') releasePendingCloudPayload(node.path);
    }
    // Clean up only newly created paths. Existing paths may have been replaced,
    // so deleting them would risk destroying the previous cloud copy.
    if (createdObjectPaths.length) {
      try { await sharedCloudDeleteObjects(createdObjectPaths); } catch (_) { /* preserve original failure */ }
    }
    sharedCloudRuntime.lastError = error.message;
    throw error;
  }
}

async function sharedCloudPublishLocal(options = {}) {
  if (!sharedCloudEnabled()) throw new Error('FINDAT Cloud storage is not configured');
  const nodes = (await databaseAll()).filter(node =>
    sharedCloudShareable(node) &&
    (!node.cloudSynced || node.cloudPending || sharedCloudNeedsManagedObject(node))
  );
  if (!nodes.length) return { published: 0 };
  await sharedCloudPushDiff([], nodes);
  if (!options.quiet && typeof refreshAllFileViews === 'function') refreshAllFileViews();
  return { published: nodes.length };
}

async function sharedCloudInitialSync() {
  if (!sharedCloudEnabled()) return;
  // The compact index usually makes the first phone render one small request.
  // Draw those results immediately, then complete an authoritative full object
  // listing before allowing a write to begin. This keeps startup fast without
  // allowing an early upload to overwrite a newer remote index.
  await sharedCloudPull({ quiet: true });
  if (typeof refreshAllFileViews === 'function') refreshAllFileViews();
  sharedCloudStartPolling();
  await new Promise(resolve => setTimeout(resolve, 1200));
  try {
    await sharedCloudPull({ quiet: true, forceList: true });
    if (typeof refreshAllFileViews === 'function') refreshAllFileViews();
  } catch (_) {
    // The fast index remains usable; the normal polling cycle will retry the
    // full reconciliation when the network permits it.
  }
}

function sharedCloudStartPolling() {
  if (!sharedCloudEnabled() || sharedCloudRuntime.started) return;
  sharedCloudRuntime.started = true;
  const interval = Math.max(15000, Number(sharedCloudConfig().refreshIntervalMs) || 30000);
  sharedCloudRuntime.timer = setInterval(() => {
    if (document.hidden || sharedCloudRuntime.syncing) return;
    sharedCloudPull({ quiet: true }).then(() => {
      if (typeof refreshAllFileViews === 'function') refreshAllFileViews();
    }).catch(() => { /* metadata remains visible; document bytes stay remote */ });
  }, interval);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    sharedCloudEnsureFresh(5000).then(() => {
      if (typeof refreshAllFileViews === 'function') refreshAllFileViews();
    }).catch(() => { /* the next manual or scheduled sync will retry */ });
  });
}

function sharedCloudStatus() {
  let project = '';
  try { project = new URL(sharedCloudConfig().supabaseUrl || '').hostname; } catch (_) { /* configuration error is reported separately */ }
  return {
    enabled: sharedCloudEnabled(),
    configurationError: sharedCloudConfigurationError(),
    provider: 'supabase',
    mode: 'storage-only',
    project,
    table: '',
    bucket: sharedCloudBucket(),
    objectRoot: sharedCloudRoot(),
    syncing: sharedCloudRuntime.syncing,
    lastSuccessAt: sharedCloudRuntime.lastSuccessAt,
    lastError: sharedCloudRuntime.lastError,
    remoteCount: sharedCloudRuntime.remoteCount,
    publicBucket: sharedCloudConfig().publicBucket !== false,
    storageTransport: 'rest',
    localFileCache: false,
    documentIndex: sharedCloudIndexObjectPath(),
    manifestGeneratedAt: sharedCloudRuntime.manifestGeneratedAt,
    health: sharedCloudRuntime.health
  };
}

/* Cloud-synchronised desktop personalization.
 * These objects live outside the documents index so they never appear as
 * desktop files. The existing findat-v1/% Storage policies cover them.
 */
const SHARED_CLOUD_PERSONALIZATION_FORMAT = 'findat-personalization-v1';

function sharedCloudPersonalizationObjectPath() {
  return `${sharedCloudRoot()}/settings/personalization.json`;
}

function sharedCloudCustomWallpaperObjectPath() {
  return `${sharedCloudRoot()}/settings/custom-wallpaper.jpg`;
}

function sharedCloudCustomWallpaperPublicUrl(version = '') {
  if (!sharedCloudEnabled() || sharedCloudConfig().publicBucket === false) return '';
  const url = sharedCloudStorageObjectUrl(sharedCloudCustomWallpaperObjectPath(), true);
  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}

async function sharedCloudReadPersonalization() {
  if (!sharedCloudEnabled()) return null;
  const objectPath = sharedCloudPersonalizationObjectPath();
  const publicObject = sharedCloudConfig().publicBucket !== false;
  let url = sharedCloudStorageObjectUrl(objectPath, publicObject);
  if (publicObject) url += `?p=${Date.now()}`;
  const response = await fetch(url, {
    headers: publicObject ? {} : sharedCloudAuthHeaders({ Accept: 'application/json' }),
    cache: 'no-store'
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch (_) { /* no response body */ }
    throw new Error(`Reading FINDAT personalization failed (${response.status})${detail ? `: ${detail}` : ''}`);
  }
  const payload = await response.json();
  if (!payload || payload.format !== SHARED_CLOUD_PERSONALIZATION_FORMAT || !payload.personalization) return null;
  return payload;
}

async function sharedCloudWritePersonalization(personalization) {
  if (!sharedCloudEnabled()) throw new Error('FINDAT Cloud storage is not configured');
  const payload = new Blob([JSON.stringify({
    format: SHARED_CLOUD_PERSONALIZATION_FORMAT,
    updatedAt: String(personalization?.wallpaperUpdatedAt || new Date().toISOString()),
    personalization
  })], { type: 'application/json' });
  await sharedCloudFetch(sharedCloudStorageObjectUrl(sharedCloudPersonalizationObjectPath()), {
    method: 'POST',
    headers: sharedCloudAuthHeaders({
      'Content-Type': 'application/json',
      'x-upsert': 'true',
      'cache-control': '0'
    }),
    body: payload
  }, 'Saving FINDAT personalization');
  return true;
}

async function sharedCloudUploadCustomWallpaper(blob) {
  if (!sharedCloudEnabled()) throw new Error('FINDAT Cloud storage is not configured');
  if (!(blob instanceof Blob) || !blob.size) throw new Error('The selected wallpaper is empty');
  const limit = Math.max(1, Number(sharedCloudConfig().maxWallpaperBytes) || 8 * 1024 * 1024);
  if (blob.size > limit) throw new Error('The wallpaper is larger than the configured Cloud limit');
  const version = `${Date.now()}-${blob.size}`;
  sharedCloudEmitProgress({ phase: 'upload', name: 'Custom wallpaper', loaded: 0, total: blob.size });
  await sharedCloudFetch(sharedCloudStorageObjectUrl(sharedCloudCustomWallpaperObjectPath()), {
    method: 'POST',
    headers: sharedCloudAuthHeaders({
      'Content-Type': blob.type || 'image/jpeg',
      'x-upsert': 'true',
      'cache-control': '31536000'
    }),
    body: blob
  }, 'Uploading the custom wallpaper');
  sharedCloudEmitProgress({ phase: 'uploaded', name: 'Custom wallpaper', loaded: blob.size, total: blob.size });
  return {
    objectPath: sharedCloudCustomWallpaperObjectPath(),
    version,
    publicUrl: sharedCloudCustomWallpaperPublicUrl(version)
  };
}
