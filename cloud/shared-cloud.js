/* FINDAT Cloud: Supabase PostgreSQL metadata + Supabase Storage objects. */
const sharedCloudRuntime = {
  syncing: false,
  lastPullAt: 0,
  lastSuccessAt: 0,
  lastHealthAt: 0,
  lastError: '',
  timer: null,
  started: false,
  remoteCount: 0,
  health: null
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
  if (!config.enabled) return 'Supabase cloud is disabled in cloud-config.js';
  if (config.provider !== 'supabase') return 'Supabase is not the selected cloud provider';
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(config.supabaseUrl || '').trim())) {
    return 'The Supabase project URL is missing or invalid';
  }
  if (!apiKey || apiKey.includes('PASTE_') || apiKey.includes('YOUR_')) {
    return 'The browser-safe Supabase Publishable key is not configured';
  }
  if (sharedCloudUnsafeSecretConfigured()) {
    return 'A Supabase Secret key was supplied to browser code. Rotate it and use an sb_publishable_ key instead';
  }
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
  const accessToken = String(config.accessToken || '').trim();
  const headers = { apikey: apiKey };

  // New sb_publishable_ keys are opaque API keys, not JWTs. Send them in the
  // apikey header only. A signed-in user's JWT, or a legacy anon JWT, can be
  // sent as a Bearer token for RLS evaluation.
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  else if (/^eyJ[a-zA-Z0-9_-]*\./.test(apiKey)) headers.Authorization = `Bearer ${apiKey}`;

  return { ...headers, ...extra };
}

function sharedCloudEmitProgress(detail = {}) {
  window.dispatchEvent(new CustomEvent('findat:cloud-progress', {
    detail: { provider: 'supabase', ...detail }
  }));
}

async function sharedCloudFetch(url, options = {}, label = 'Supabase request') {
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

function sharedCloudRestUrl(path = '') {
  return `${sharedCloudBaseUrl()}/rest/v1/${String(path).replace(/^\/+/, '')}`;
}

function sharedCloudStorageObjectUrl(objectPath, publicObject = false) {
  const config = sharedCloudConfig();
  const bucket = encodeURIComponent(config.bucket || 'findat-documents');
  const encodedPath = String(objectPath || '').split('/').map(encodeURIComponent).join('/');
  const mode = publicObject ? 'public/' : '';
  return `${sharedCloudBaseUrl()}/storage/v1/object/${mode}${bucket}/${encodedPath}`;
}

function sharedCloudPublicUrl(entryOrPath) {
  if (!sharedCloudEnabled() || sharedCloudConfig().publicBucket === false) return '';
  const objectPath = typeof entryOrPath === 'string'
    ? entryOrPath
    : entryOrPath?.cloudObjectPath || entryOrPath?.object_path || '';
  return objectPath ? sharedCloudStorageObjectUrl(objectPath, true) : '';
}

function sharedCloudUtf8Base64Url(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function sharedCloudObjectPathForNode(node) {
  const extensionMatch = String(node?.name || '').match(/(\.[a-z0-9]{1,12})$/i);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';
  const pathToken = sharedCloudUtf8Base64Url(node?.path || 'document');
  const revisionToken = sharedCloudUtf8Base64Url(node?.modified || new Date().toISOString());
  return `objects/${pathToken}/${revisionToken}${extension}`;
}

function sharedCloudIsSystemRoot(path) {
  return path === '/' || (typeof SYSTEM_FOLDERS !== 'undefined' && SYSTEM_FOLDERS.some(name => path === `/${name}`));
}

function sharedCloudShareable(node) {
  return Boolean(node?.path && !sharedCloudIsSystemRoot(node.path));
}

function sharedCloudNodeFingerprint(node) {
  if (!node) return '';
  return JSON.stringify([
    node.path, node.parent, node.name, node.type, Number(node.size) || 0,
    node.mime || '', node.modified || '', node.originalPath || ''
  ]);
}

function sharedCloudRowFromNode(node, objectPath = '') {
  const inTrash = String(node.path || '').startsWith('/Trash/');
  return {
    path: node.path,
    parent: node.parent,
    name: node.name,
    type: node.type,
    size: Number(node.size) || 0,
    mime: node.mime || (node.type === 'folder' ? 'inode/directory' : 'application/octet-stream'),
    modified: node.modified || new Date().toISOString(),
    object_path: node.type === 'file' ? objectPath : null,
    original_path: node.originalPath || null,
    deleted_at: inTrash ? (node.deletedAt || node.modified || new Date().toISOString()) : null,
    upload_status: 'ready',
    checksum: node.cloudChecksum || null,
    metadata: {
      source: 'findat-web',
      compression: node.compression || null,
      compression_version: Number(node.compressionVersion) || 0
    }
  };
}

function sharedCloudNodeFromRow(row) {
  return {
    path: row.path,
    parent: row.parent,
    name: row.name,
    type: row.type,
    size: Number(row.size) || 0,
    mime: row.mime || (row.type === 'folder' ? 'inode/directory' : 'application/octet-stream'),
    modified: row.modified || new Date().toISOString(),
    originalPath: row.original_path || undefined,
    deletedAt: row.deleted_at || undefined,
    cloudSynced: 1,
    cloudPending: false,
    cloudObjectPath: row.object_path || '',
    cloudModified: row.modified || '',
    cloudVersion: Number(row.version) || 1,
    cloudChecksum: row.checksum || ''
  };
}

async function sharedCloudDatabaseHealth(force = false) {
  if (!sharedCloudEnabled()) return null;
  if (!force && sharedCloudRuntime.health && Date.now() - sharedCloudRuntime.lastHealthAt < 30000) {
    return sharedCloudRuntime.health;
  }
  const response = await sharedCloudFetch(`${sharedCloudRestUrl('rpc/findat_cloud_health')}`, {
    method: 'POST',
    headers: sharedCloudAuthHeaders({
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }),
    body: '{}'
  }, 'Checking the FINDAT SQL database');
  const health = await response.json();
  sharedCloudRuntime.health = health;
  sharedCloudRuntime.lastHealthAt = Date.now();
  return health;
}

async function sharedCloudListRows() {
  const config = sharedCloudConfig();
  const table = encodeURIComponent(config.table || 'findat_documents');
  const select = [
    'path', 'parent', 'name', 'type', 'size', 'mime', 'modified',
    'object_path', 'original_path', 'created_at', 'updated_at',
    'deleted_at', 'upload_status', 'version', 'checksum', 'metadata'
  ].join(',');
  const url = `${sharedCloudRestUrl(table)}?select=${select}&order=path.asc`;
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const response = await sharedCloudFetch(url, {
      headers: sharedCloudAuthHeaders({
        Accept: 'application/json',
        Range: `${offset}-${offset + pageSize - 1}`
      })
    }, 'Reading documents from the FINDAT SQL database');
    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  sharedCloudRuntime.remoteCount = rows.length;
  return rows;
}

async function sharedCloudUpsertRows(rows) {
  if (!rows.length) return;
  const config = sharedCloudConfig();
  const table = encodeURIComponent(config.table || 'findat_documents');
  sharedCloudEmitProgress({ phase: 'database', name: rows.length === 1 ? rows[0].name : `${rows.length} document records` });
  await sharedCloudFetch(`${sharedCloudRestUrl(table)}?on_conflict=path`, {
    method: 'POST',
    headers: sharedCloudAuthHeaders({
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    }),
    body: JSON.stringify(rows)
  }, 'Saving document metadata to the FINDAT SQL database');
}

async function sharedCloudDeleteRows(paths) {
  const config = sharedCloudConfig();
  const table = encodeURIComponent(config.table || 'findat_documents');
  for (const path of paths) {
    await sharedCloudFetch(`${sharedCloudRestUrl(table)}?path=eq.${encodeURIComponent(path)}`, {
      method: 'DELETE',
      headers: sharedCloudAuthHeaders({ Prefer: 'return=minimal' })
    }, 'Deleting document metadata from the FINDAT SQL database');
  }
}

async function sharedCloudUploadObject(node, blob, objectPath) {
  const limit = Math.max(1, Number(sharedCloudConfig().maxFileBytes) || 50 * 1024 * 1024);
  if (blob.size > limit) {
    throw new Error(`${node.name} is larger than the configured Supabase upload limit`);
  }
  sharedCloudEmitProgress({ phase: 'upload', name: node.name, loaded: 0, total: Math.max(1, blob.size) });
  await sharedCloudFetch(sharedCloudStorageObjectUrl(objectPath), {
    method: 'POST',
    headers: sharedCloudAuthHeaders({
      'Content-Type': node.mime || blob.type || 'application/octet-stream',
      'x-upsert': 'true',
      'cache-control': '3600'
    }),
    body: blob
  }, `Uploading ${node.name} to Supabase Storage`);
  sharedCloudEmitProgress({ phase: 'uploaded', name: node.name, loaded: Math.max(1, blob.size), total: Math.max(1, blob.size) });
}

async function sharedCloudDeleteObjects(objectPaths) {
  const unique = [...new Set(objectPaths.filter(Boolean))];
  if (!unique.length) return;
  const config = sharedCloudConfig();
  const bucket = encodeURIComponent(config.bucket || 'findat-documents');
  for (let index = 0; index < unique.length; index += 100) {
    const prefixes = unique.slice(index, index + 100);
    await sharedCloudFetch(`${sharedCloudBaseUrl()}/storage/v1/object/${bucket}`, {
      method: 'DELETE',
      headers: sharedCloudAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefixes })
    }, 'Deleting document objects from Supabase Storage');
  }
}

async function sharedCloudDownloadObject(row) {
  const publicUrl = sharedCloudConfig().publicBucket === false ? '' : sharedCloudPublicUrl(row.object_path);
  const response = await sharedCloudFetch(publicUrl || sharedCloudStorageObjectUrl(row.object_path), {
    headers: publicUrl ? {} : sharedCloudAuthHeaders()
  }, `Downloading ${row.name} from Supabase Storage`);
  return response.blob();
}

async function sharedCloudStoreRemoteRow(row) {
  const remoteNode = sharedCloudNodeFromRow(row);
  if (remoteNode.type === 'folder') {
    await databasePut(remoteNode);
    return;
  }
  if (!row.object_path) throw new Error(`SQL record for “${row.name}” has no Supabase Storage object path`);
  const current = await databaseGet(row.path);
  if (
    current?.type === 'file' &&
    current.cloudSynced &&
    !current.cloudPending &&
    current.cloudObjectPath === row.object_path &&
    current.cloudModified === row.modified &&
    current.blob instanceof Blob
  ) return;

  const blob = await sharedCloudDownloadObject(row);
  const packed = await compressBlobForStorage(blob, row.name, row.mime || blob.type);
  await ensureBrowserCapacity(Math.max(0, packed.storedSize - storedSizeOf(current)));
  await databasePut({
    ...remoteNode,
    storedSize: packed.storedSize,
    compression: packed.compression,
    compressionVersion: packed.compression ? 1 : 0,
    compressionChecked: 1,
    blob: packed.blob
  });
}

async function sharedCloudPull(options = {}) {
  if (!sharedCloudEnabled()) return { enabled: false, changed: false, rows: 0 };
  if (sharedCloudRuntime.syncing) return { enabled: true, changed: false, rows: sharedCloudRuntime.remoteCount };
  sharedCloudRuntime.syncing = true;
  try {
    await sharedCloudDatabaseHealth();
    const rows = await sharedCloudListRows();
    const remotePaths = new Set(rows.map(row => row.path));
    const localNodes = await databaseAll();
    const stale = localNodes.filter(node =>
      node.cloudSynced &&
      !node.cloudPending &&
      sharedCloudShareable(node) &&
      !remotePaths.has(node.path)
    );
    if (stale.length) await databaseCommit([], stale.map(node => node.path));

    const ordered = [...rows].sort((left, right) => {
      const depth = String(left.path).split('/').length - String(right.path).split('/').length;
      if (depth) return depth;
      if (left.type !== right.type) return left.type === 'folder' ? -1 : 1;
      return String(left.path).localeCompare(String(right.path));
    });
    for (const row of ordered) await sharedCloudStoreRemoteRow(row);

    if (!rows.length && sharedCloudConfig().bootstrapLocalWhenRemoteEmpty !== false) {
      await sharedCloudPublishLocal({ quiet: true });
    }

    sharedCloudRuntime.lastPullAt = Date.now();
    sharedCloudRuntime.lastSuccessAt = Date.now();
    sharedCloudRuntime.lastError = '';
    if (!options.quiet && typeof refreshAllFileViews === 'function') refreshAllFileViews();
    return { enabled: true, changed: Boolean(stale.length || rows.length), rows: rows.length };
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
  const before = new Map(beforeNodes.filter(sharedCloudShareable).map(node => [node.path, node]));
  const after = new Map(afterNodes.filter(sharedCloudShareable).map(node => [node.path, node]));
  const changed = [...after.values()].filter(node =>
    node.cloudPending ||
    !node.cloudSynced ||
    sharedCloudNodeFingerprint(node) !== sharedCloudNodeFingerprint(before.get(node.path))
  );
  const removed = [...before.values()].filter(node => !after.has(node.path) && (node.cloudSynced || node.cloudObjectPath));

  const rows = [];
  const markedNodes = [];
  const newlyUploadedObjects = [];
  const supersededObjects = [];
  const previousPaths = [];
  let metadataSaved = false;

  try {
    const folders = changed.filter(node => node.type === 'folder');
    const files = changed.filter(node => node.type === 'file');

    for (const node of folders) {
      rows.push(sharedCloudRowFromNode(node));
      if (node.cloudPreviousPath) previousPaths.push(node.cloudPreviousPath);
      markedNodes.push({
        ...node,
        cloudSynced: 1,
        cloudPending: false,
        cloudObjectPath: '',
        cloudModified: node.modified || '',
        cloudPreviousPath: '',
        cloudPreviousObjectPath: ''
      });
    }

    for (const node of files) {
      const objectPath = sharedCloudObjectPathForNode(node);
      const blob = await readLocalFile(node.path);
      await sharedCloudUploadObject(node, blob, objectPath);
      newlyUploadedObjects.push(objectPath);
      rows.push(sharedCloudRowFromNode(node, objectPath));

      const previous = before.get(node.path);
      if (previous?.cloudObjectPath && previous.cloudObjectPath !== objectPath) {
        supersededObjects.push(previous.cloudObjectPath);
      }
      if (node.cloudPreviousObjectPath && node.cloudPreviousObjectPath !== objectPath) {
        supersededObjects.push(node.cloudPreviousObjectPath);
      }
      if (node.cloudPreviousPath) previousPaths.push(node.cloudPreviousPath);

      markedNodes.push({
        ...node,
        cloudSynced: 1,
        cloudPending: false,
        cloudObjectPath: objectPath,
        cloudModified: node.modified || '',
        cloudPreviousPath: '',
        cloudPreviousObjectPath: ''
      });
    }

    await sharedCloudUpsertRows(rows);
    metadataSaved = true;
    if (markedNodes.length) await databaseCommit(markedNodes, []);

    const removedObjects = removed
      .filter(node => node.type === 'file')
      .map(node => node.cloudObjectPath);
    const removedPaths = [...new Set([
      ...removed.map(node => node.path),
      ...previousPaths
    ])].filter(path => path && !after.has(path));
    await sharedCloudDeleteObjects([...supersededObjects, ...removedObjects]);
    await sharedCloudDeleteRows(removedPaths);

    sharedCloudRuntime.lastSuccessAt = Date.now();
    sharedCloudRuntime.lastPullAt = Date.now();
    sharedCloudRuntime.lastError = '';
    sharedCloudRuntime.remoteCount = Math.max(
      0,
      sharedCloudRuntime.remoteCount +
      changed.filter(node => !before.has(node.path)).length -
      removed.length
    );
    sharedCloudRuntime.health = null;
  } catch (error) {
    if (!metadataSaved && newlyUploadedObjects.length) {
      try { await sharedCloudDeleteObjects(newlyUploadedObjects); } catch (_) { /* preserve original failure */ }
    }
    sharedCloudRuntime.lastError = error.message;
    throw error;
  }
}

async function sharedCloudPublishLocal(options = {}) {
  if (!sharedCloudEnabled()) throw new Error('Supabase cloud is not configured');
  const nodes = (await databaseAll()).filter(node => sharedCloudShareable(node) && (!node.cloudSynced || node.cloudPending));
  if (!nodes.length) return { published: 0 };
  await sharedCloudPushDiff([], nodes);
  if (!options.quiet && typeof refreshAllFileViews === 'function') refreshAllFileViews();
  return { published: nodes.length };
}

async function sharedCloudInitialSync() {
  if (!sharedCloudEnabled()) return;
  await sharedCloudDatabaseHealth(true);
  await sharedCloudPull({ quiet: true });
  sharedCloudStartPolling();
}

function sharedCloudStartPolling() {
  if (!sharedCloudEnabled() || sharedCloudRuntime.started) return;
  sharedCloudRuntime.started = true;
  const interval = Math.max(15000, Number(sharedCloudConfig().refreshIntervalMs) || 30000);
  sharedCloudRuntime.timer = setInterval(() => {
    if (document.hidden || sharedCloudRuntime.syncing) return;
    sharedCloudPull({ quiet: true }).then(() => {
      if (typeof refreshAllFileViews === 'function') refreshAllFileViews();
    }).catch(() => { /* the local cache remains available */ });
  }, interval);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    sharedCloudEnsureFresh(5000).then(() => {
      if (typeof refreshAllFileViews === 'function') refreshAllFileViews();
    }).catch(() => { /* offline use remains available */ });
  });
}

function sharedCloudStatus() {
  let project = '';
  try { project = new URL(sharedCloudConfig().supabaseUrl || '').hostname; } catch (_) { /* invalid URL is reported as disabled */ }
  return {
    enabled: sharedCloudEnabled(),
    configurationError: sharedCloudConfigurationError(),
    provider: 'supabase',
    project,
    table: sharedCloudConfig().table || 'findat_documents',
    bucket: sharedCloudConfig().bucket || 'findat-documents',
    syncing: sharedCloudRuntime.syncing,
    lastSuccessAt: sharedCloudRuntime.lastSuccessAt,
    lastError: sharedCloudRuntime.lastError,
    remoteCount: sharedCloudRuntime.remoteCount,
    publicBucket: sharedCloudConfig().publicBucket !== false,
    health: sharedCloudRuntime.health
  };
}
