/* FINDAT Cloud GitHub repository provider.
 *
 * Loaded after shared-cloud.js. When cloud-config.js selects provider: 'github',
 * these wrappers use a secure server-side endpoint. The GitHub token is never
 * placed in browser code.
 */
(() => {
  const supabaseProvider = {
    enabled: window.sharedCloudEnabled,
    publicUrl: window.sharedCloudPublicUrl,
    downloadObject: window.sharedCloudDownloadObject,
    pull: window.sharedCloudPull,
    ensureFresh: window.sharedCloudEnsureFresh,
    pushDiff: window.sharedCloudPushDiff,
    publishLocal: window.sharedCloudPublishLocal,
    initialSync: window.sharedCloudInitialSync,
    startPolling: window.sharedCloudStartPolling,
    status: window.sharedCloudStatus
  };

  function config() {
    return window.FINDAT_CLOUD_CONFIG || {};
  }

  function isGithubSelected() {
    return String(config().provider || '').toLowerCase() === 'github';
  }

  function githubEnabled() {
    const value = config();
    return Boolean(
      value.enabled &&
      isGithubSelected() &&
      String(value.apiEndpoint || '').trim() &&
      String(value.repoOwner || '').trim() &&
      String(value.repoName || '').trim() &&
      !String(value.repoOwner).includes('YOUR_') &&
      !String(value.repoName).includes('YOUR_')
    );
  }

  function apiUrl(action, parameters = {}) {
    const url = new URL(String(config().apiEndpoint || '/api/findat-github'), window.location.href);
    url.searchParams.set('action', action);
    Object.entries(parameters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    });
    return url.toString();
  }

  async function apiFetch(action, options = {}, parameters = {}, label = 'GitHub cloud request') {
    const response = await fetch(apiUrl(action, parameters), {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {})
      }
    });
    if (response.ok) return response;
    let detail = '';
    try {
      const payload = await response.json();
      detail = payload.message || payload.error || JSON.stringify(payload);
    } catch (_) {
      try { detail = await response.text(); } catch (_) { /* no response body */ }
    }
    throw new Error(`${label} failed (${response.status})${detail ? `: ${detail}` : ''}`);
  }

  function emitProgress(detail) {
    window.dispatchEvent(new CustomEvent('findat:cloud-progress', {
      detail: {
        provider: 'github',
        ...detail
      }
    }));
  }

  function publicUrl(entryOrPath) {
    if (!githubEnabled()) return '';
    const objectPath = typeof entryOrPath === 'string'
      ? entryOrPath
      : entryOrPath?.cloudObjectPath || entryOrPath?.object_path || '';
    if (!objectPath) return '';

    const value = config();
    if (value.publicRepository !== false) {
      const owner = encodeURIComponent(String(value.repoOwner).trim());
      const repository = encodeURIComponent(String(value.repoName).trim());
      const branch = encodeURIComponent(String(value.branch || 'main').trim());
      const root = String(value.rootPath || 'findat-cloud').replace(/^\/+|\/+$/g, '');
      const path = [root, objectPath].filter(Boolean).join('/').split('/').map(encodeURIComponent).join('/');
      const version = typeof entryOrPath === 'object' ? entryOrPath?.modified || entryOrPath?.cloudModified || '' : '';
      return `https://raw.githubusercontent.com/${owner}/${repository}/${branch}/${path}${version ? `?v=${encodeURIComponent(version)}` : ''}`;
    }

    return apiUrl('file', { objectPath });
  }

  async function listRows() {
    const response = await apiFetch('list', {}, {}, 'Reading GitHub repository documents');
    const payload = await response.json();
    const expectedRepository = `${config().repoOwner}/${config().repoName}`;
    if (payload?.repository && payload.repository !== expectedRepository) {
      throw new Error(`The backend is connected to ${payload.repository}, but cloud-config.js expects ${expectedRepository}`);
    }
    const rows = Array.isArray(payload) ? payload : payload.rows;
    sharedCloudRuntime.remoteCount = Array.isArray(rows) ? rows.length : 0;
    return Array.isArray(rows) ? rows : [];
  }

  function uploadObject(node, blob, objectPath) {
    const limit = Math.max(1, Number(config().maxFileBytes) || 25 * 1024 * 1024);
    if (blob.size > limit) {
      throw new Error(`${node.name} is ${formatBytes(blob.size)}. This FINDAT GitHub upload is limited to ${formatBytes(limit)} per file.`);
    }

    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('PUT', apiUrl('upload', { objectPath }), true);
      request.setRequestHeader('Content-Type', node.mime || blob.type || 'application/octet-stream');
      request.setRequestHeader('X-Findat-Name', encodeURIComponent(node.name || 'Document'));
      request.upload.addEventListener('progress', event => {
        emitProgress({
          phase: 'upload',
          name: node.name,
          loaded: event.loaded,
          total: event.lengthComputable ? event.total : blob.size
        });
      });
      request.addEventListener('load', () => {
        if (request.status >= 200 && request.status < 300) {
          emitProgress({ phase: 'commit', name: node.name, loaded: blob.size, total: blob.size });
          resolve();
          return;
        }
        let message = request.responseText || `GitHub upload failed (${request.status})`;
        try {
          const payload = JSON.parse(request.responseText || '{}');
          message = payload.message || payload.error || message;
        } catch (_) { /* response is not JSON */ }
        reject(new Error(message));
      });
      request.addEventListener('error', () => reject(new Error(`Could not upload ${node.name} to the GitHub repository`)));
      request.addEventListener('abort', () => reject(new Error(`Upload cancelled for ${node.name}`)));
      request.send(blob);
    });
  }

  async function upsertRows(rows) {
    if (!rows.length) return;
    await apiFetch('upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows })
    }, {}, 'Saving GitHub repository manifest');
  }

  async function deleteRemote(paths, objectPaths) {
    if (!paths.length && !objectPaths.length) return;
    await apiFetch('delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths, objectPaths })
    }, {}, 'Deleting GitHub repository documents');
  }

  async function downloadObject(row) {
    const url = publicUrl(row.object_path || row.cloudObjectPath || '');
    const response = await fetch(url, { headers: config().publicRepository === false ? { Accept: 'application/octet-stream' } : {} });
    if (!response.ok) throw new Error(`Downloading ${row.name || 'document'} failed (${response.status})`);
    return response.blob();
  }

  async function storeRemoteRow(row) {
    const remoteNode = sharedCloudNodeFromRow(row);
    if (remoteNode.type === 'folder') {
      await databasePut({ ...remoteNode, cloudPending: 0 });
      return;
    }
    if (!row.object_path) throw new Error(`GitHub file “${row.name}” has no repository object path`);
    const current = await databaseGet(row.path);
    if (
      current?.type === 'file' &&
      current.cloudSynced &&
      current.cloudObjectPath === row.object_path &&
      current.cloudModified === row.modified &&
      current.blob instanceof Blob
    ) return;

    const blob = await downloadObject(row);
    const packed = await compressBlobForStorage(blob, row.name, row.mime || blob.type);
    await ensureBrowserCapacity(Math.max(0, packed.storedSize - storedSizeOf(current)));
    await databasePut({
      ...remoteNode,
      cloudPending: 0,
      storedSize: packed.storedSize,
      compression: packed.compression,
      compressionVersion: packed.compression ? 1 : 0,
      compressionChecked: 1,
      blob: packed.blob
    });
  }

  async function pull(options = {}) {
    if (!githubEnabled()) return { enabled: false, changed: false, rows: 0 };
    if (sharedCloudRuntime.syncing) return { enabled: true, changed: false, rows: sharedCloudRuntime.remoteCount };
    sharedCloudRuntime.syncing = true;
    try {
      const rows = await listRows();
      const remotePaths = new Set(rows.map(row => row.path));
      const localNodes = await databaseAll();
      const stale = localNodes.filter(node => node.cloudSynced && sharedCloudShareable(node) && !remotePaths.has(node.path));
      if (stale.length) await databaseCommit([], stale.map(node => node.path));

      const ordered = [...rows].sort((left, right) => {
        const depth = String(left.path).split('/').length - String(right.path).split('/').length;
        if (depth) return depth;
        if (left.type !== right.type) return left.type === 'folder' ? -1 : 1;
        return String(left.path).localeCompare(String(right.path));
      });
      for (const row of ordered) await storeRemoteRow(row);

      if (!rows.length && config().bootstrapLocalWhenRemoteEmpty !== false) {
        await publishLocal({ quiet: true });
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

  async function ensureFresh(maxAgeMs = 2500) {
    if (!githubEnabled()) return;
    if (Date.now() - sharedCloudRuntime.lastPullAt < maxAgeMs) return;
    await pull({ quiet: true });
  }

  async function pushDiff(beforeNodes, afterNodes) {
    if (!githubEnabled()) return;
    const before = new Map(beforeNodes.filter(sharedCloudShareable).map(node => [node.path, node]));
    const after = new Map(afterNodes.filter(sharedCloudShareable).map(node => [node.path, node]));
    const changed = [...after.values()].filter(node => sharedCloudNodeFingerprint(node) !== sharedCloudNodeFingerprint(before.get(node.path)));
    const removed = [...before.values()].filter(node => !after.has(node.path) && node.cloudSynced);

    const rows = [];
    const markedNodes = [];
    const folders = changed.filter(node => node.type === 'folder');
    const files = changed.filter(node => node.type === 'file');

    try {
      for (const node of folders) {
        rows.push(sharedCloudRowFromNode(node));
        markedNodes.push({ ...node, cloudSynced: 1, cloudPending: 0, cloudObjectPath: '', cloudModified: node.modified || '' });
      }

      for (const node of files) {
        const objectPath = sharedCloudObjectPathForNode(node);
        const blob = await readLocalFile(node.path);
        emitProgress({ phase: 'prepare', name: node.name, loaded: 0, total: blob.size });
        await uploadObject(node, blob, objectPath);
        rows.push(sharedCloudRowFromNode(node, objectPath));
        markedNodes.push({ ...node, cloudSynced: 1, cloudPending: 0, cloudObjectPath: objectPath, cloudModified: node.modified || '' });
      }

      await upsertRows(rows);
      if (markedNodes.length) await databaseCommit(markedNodes, []);

      await deleteRemote(
        removed.map(node => node.path),
        removed.filter(node => node.type === 'file').map(node => node.cloudObjectPath)
      );

      sharedCloudRuntime.lastSuccessAt = Date.now();
      sharedCloudRuntime.lastPullAt = Date.now();
      sharedCloudRuntime.lastError = '';
      sharedCloudRuntime.remoteCount = Math.max(0, sharedCloudRuntime.remoteCount + changed.filter(node => !before.has(node.path)).length - removed.length);
    } catch (error) {
      sharedCloudRuntime.lastError = error.message;
      throw error;
    }
  }

  async function publishLocal(options = {}) {
    if (!githubEnabled()) throw new Error('GitHub repository storage is not configured');
    const nodes = (await databaseAll()).filter(node => sharedCloudShareable(node) && !node.cloudSynced);
    if (!nodes.length) return { published: 0 };
    await pushDiff([], nodes);
    if (!options.quiet && typeof refreshAllFileViews === 'function') refreshAllFileViews();
    return { published: nodes.length };
  }

  function startPolling() {
    if (!githubEnabled() || sharedCloudRuntime.started) return;
    sharedCloudRuntime.started = true;
    const interval = Math.max(15000, Number(config().refreshIntervalMs) || 30000);
    sharedCloudRuntime.timer = setInterval(() => {
      if (document.hidden || sharedCloudRuntime.syncing) return;
      pull({ quiet: true }).then(() => {
        if (typeof refreshAllFileViews === 'function') refreshAllFileViews();
      }).catch(() => { /* status appears in Settings */ });
    }, interval);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      ensureFresh(5000).then(() => {
        if (typeof refreshAllFileViews === 'function') refreshAllFileViews();
      }).catch(() => { /* offline cache remains available */ });
    });
  }

  async function initialSync() {
    if (!githubEnabled()) return;
    await pull({ quiet: true });
    startPolling();
  }

  function status() {
    if (!isGithubSelected()) return supabaseProvider.status();
    return {
      enabled: githubEnabled(),
      provider: 'github',
      syncing: sharedCloudRuntime.syncing,
      lastSuccessAt: sharedCloudRuntime.lastSuccessAt,
      lastError: sharedCloudRuntime.lastError,
      remoteCount: sharedCloudRuntime.remoteCount,
      publicBucket: config().publicRepository !== false,
      repository: `${config().repoOwner || ''}/${config().repoName || ''}`,
      branch: config().branch || 'main'
    };
  }

  window.sharedCloudEnabled = () => isGithubSelected() ? githubEnabled() : supabaseProvider.enabled();
  window.sharedCloudPublicUrl = entryOrPath => isGithubSelected() ? publicUrl(entryOrPath) : supabaseProvider.publicUrl(entryOrPath);
  window.sharedCloudDownloadObject = row => isGithubSelected() ? downloadObject(row) : supabaseProvider.downloadObject(row);
  window.sharedCloudPull = options => isGithubSelected() ? pull(options) : supabaseProvider.pull(options);
  window.sharedCloudEnsureFresh = maxAgeMs => isGithubSelected() ? ensureFresh(maxAgeMs) : supabaseProvider.ensureFresh(maxAgeMs);
  window.sharedCloudPushDiff = (beforeNodes, afterNodes) => isGithubSelected() ? pushDiff(beforeNodes, afterNodes) : supabaseProvider.pushDiff(beforeNodes, afterNodes);
  window.sharedCloudPublishLocal = options => isGithubSelected() ? publishLocal(options) : supabaseProvider.publishLocal(options);
  window.sharedCloudInitialSync = () => isGithubSelected() ? initialSync() : supabaseProvider.initialSync();
  window.sharedCloudStartPolling = () => isGithubSelected() ? startPolling() : supabaseProvider.startPolling();
  window.sharedCloudStatus = status;
})();
