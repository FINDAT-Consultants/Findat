'use strict';

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname);
const DATA_ROOT = path.resolve(process.env.FINDAT_DATA_DIR || path.join(ROOT, '.findat-data'));
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Math.max(1, Number(process.env.PORT) || 8080);
const ACCESS_KEY = String(process.env.FINDAT_ACCESS_KEY || '');
const MAX_COMMIT_BYTES = Math.max(1024 * 1024, Number(process.env.FINDAT_MAX_COMMIT_BYTES) || 256 * 1024 * 1024);
const MAX_JSON_BYTES = Math.max(1024 * 1024, Number(process.env.FINDAT_MAX_JSON_BYTES) || 16 * 1024 * 1024);
const MAX_CHANGE_EVENTS = 10000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.zip': 'application/zip', '.fdx': 'application/octet-stream'
};

const workspaceCache = new Map();
const workspaceLocks = new Map();

function nowIso() {
  return new Date().toISOString();
}

function defaultWorkspace() {
  const now = nowIso();
  return {
    version: 1,
    revision: 0,
    createdAt: now,
    updatedAt: now,
    kv: {},
    nodes: {},
    changes: []
  };
}

function safeWorkspaceId(value) {
  const id = String(value || 'main').trim();
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw httpError(400, 'Invalid workspace name');
  return id;
}

function safeVirtualPath(value) {
  const input = String(value || '');
  if (!input.startsWith('/') || input.includes('\0') || input.length > 4096) throw httpError(400, 'Invalid FINDAT drive path');
  const parts = [];
  input.replace(/\\/g, '/').split('/').forEach(part => {
    if (!part || part === '.') return;
    if (part === '..') parts.pop();
    else parts.push(part);
  });
  return `/${parts.join('/')}`;
}

function workspacePaths(id) {
  const dir = path.join(DATA_ROOT, id);
  return {
    dir,
    metadata: path.join(dir, 'workspace.json'),
    blobs: path.join(dir, 'blobs')
  };
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function ensureWorkspaceDirs(id) {
  const paths = workspacePaths(id);
  await fsp.mkdir(paths.blobs, { recursive: true });
  return paths;
}

async function loadWorkspace(id) {
  if (workspaceCache.has(id)) return workspaceCache.get(id);
  const paths = await ensureWorkspaceDirs(id);
  let meta;
  try {
    meta = JSON.parse(await fsp.readFile(paths.metadata, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    meta = defaultWorkspace();
    await saveWorkspaceFile(paths.metadata, meta);
  }
  meta = {
    ...defaultWorkspace(),
    ...meta,
    kv: meta?.kv && typeof meta.kv === 'object' ? meta.kv : {},
    nodes: meta?.nodes && typeof meta.nodes === 'object' ? meta.nodes : {},
    changes: Array.isArray(meta?.changes) ? meta.changes : []
  };
  const record = { id, paths, meta };
  workspaceCache.set(id, record);
  return record;
}

async function saveWorkspaceFile(filename, meta) {
  const temporary = `${filename}.${process.pid}.${Date.now()}.tmp`;
  await fsp.mkdir(path.dirname(filename), { recursive: true });
  await fsp.writeFile(temporary, JSON.stringify(meta));
  await fsp.rename(temporary, filename);
}

async function saveWorkspace(record) {
  record.meta.updatedAt = nowIso();
  await saveWorkspaceFile(record.paths.metadata, record.meta);
}

function withWorkspaceLock(id, task) {
  const previous = workspaceLocks.get(id) || Promise.resolve();
  const current = previous.catch(() => {}).then(task);
  const tracked = current.finally(() => {
    if (workspaceLocks.get(id) === tracked) workspaceLocks.delete(id);
  });
  workspaceLocks.set(id, tracked);
  return current;
}

function appendChanges(meta, clientId, events) {
  if (!events.length) return meta.revision;
  meta.revision = Math.max(0, Number(meta.revision) || 0) + 1;
  const revision = meta.revision;
  const timestamp = nowIso();
  events.forEach(event => meta.changes.push({ ...event, revision, clientId, timestamp }));
  if (meta.changes.length > MAX_CHANGE_EVENTS) meta.changes.splice(0, meta.changes.length - MAX_CHANGE_EVENTS);
  return revision;
}

function sendJson(res, status, value, headers = {}) {
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(body);
}

function sendText(res, status, value, headers = {}) {
  const body = Buffer.from(String(value));
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(body);
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireApiAccess(req) {
  if (!ACCESS_KEY) return;
  const supplied = req.headers['x-findat-key'] || '';
  if (!safeEqual(supplied, ACCESS_KEY)) throw httpError(401, 'A valid FINDAT shared workspace access key is required');
}

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw httpError(413, `Request exceeds the ${Math.round(limit / 1024 / 1024)} MB limit`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  const body = await readBody(req, MAX_JSON_BYTES);
  try {
    return body.length ? JSON.parse(body.toString('utf8')) : {};
  } catch (_) {
    throw httpError(400, 'Invalid JSON request');
  }
}

function publicSnapshot(meta) {
  return {
    empty: Number(meta.revision) === 0 && Object.keys(meta.kv).length === 0 && Object.keys(meta.nodes).length === 0,
    revision: Number(meta.revision) || 0,
    kv: { ...meta.kv },
    nodes: Object.values(meta.nodes)
  };
}

async function writeBlobIfNeeded(blobsDir, buffer) {
  const blobId = crypto.createHash('sha256').update(buffer).digest('hex');
  const filename = path.join(blobsDir, blobId);
  try {
    await fsp.access(filename);
  } catch (_) {
    const temporary = `${filename}.${process.pid}.${Date.now()}.tmp`;
    await fsp.writeFile(temporary, buffer);
    try {
      await fsp.rename(temporary, filename);
    } catch (error) {
      await fsp.rm(temporary, { force: true });
      if (error.code !== 'EEXIST') throw error;
    }
  }
  return blobId;
}

async function garbageCollectBlobs(record) {
  const referenced = new Set(Object.values(record.meta.nodes).map(node => node.blobId).filter(Boolean));
  let files = [];
  try { files = await fsp.readdir(record.paths.blobs); } catch (_) { return; }
  await Promise.all(files.filter(name => /^[a-f0-9]{64}$/.test(name) && !referenced.has(name)).map(name => fsp.rm(path.join(record.paths.blobs, name), { force: true })));
}

function parseCommitPayload(buffer) {
  if (buffer.length < 4) throw httpError(400, 'Incomplete shared drive commit');
  const headerLength = buffer.readUInt32BE(0);
  if (headerLength < 2 || headerLength > 8 * 1024 * 1024 || 4 + headerLength > buffer.length) throw httpError(400, 'Invalid shared drive commit header');
  let header;
  try { header = JSON.parse(buffer.subarray(4, 4 + headerLength).toString('utf8')); }
  catch (_) { throw httpError(400, 'Invalid shared drive commit metadata'); }
  const binary = buffer.subarray(4 + headerLength);
  const puts = Array.isArray(header.puts) ? header.puts : [];
  const deletes = Array.isArray(header.deletes) ? header.deletes : [];
  if (puts.length + deletes.length > 20000) throw httpError(413, 'Too many changes in one FINDAT drive commit');
  return { header, puts, deletes, binary };
}

async function handleCommit(req, res, url) {
  requireApiAccess(req);
  const workspaceId = safeWorkspaceId(url.searchParams.get('workspace'));
  const buffer = await readBody(req, MAX_COMMIT_BYTES);
  const parsed = parseCommitPayload(buffer);
  const clientId = String(req.headers['x-findat-client'] || parsed.header.clientId || 'unknown').slice(0, 160);

  const result = await withWorkspaceLock(workspaceId, async () => {
    const record = await loadWorkspace(workspaceId);
    const prepared = [];
    for (const source of parsed.puts) {
      const node = { ...source };
      delete node.dataOffset;
      delete node.dataLength;
      delete node.blob;
      node.path = safeVirtualPath(source.path);
      node.parent = source.parent === null || source.parent === undefined ? null : safeVirtualPath(source.parent);
      node.name = String(source.name || path.posix.basename(node.path) || 'FINDAT Cloud').slice(0, 512);
      node.type = source.type === 'file' ? 'file' : 'folder';
      if (node.type === 'file') {
        const offset = Number(source.dataOffset);
        const length = Number(source.dataLength);
        if (!Number.isInteger(offset) || !Number.isInteger(length) || offset < 0 || length < 0 || offset + length > parsed.binary.length) throw httpError(400, `Invalid file data for ${node.path}`);
        const content = parsed.binary.subarray(offset, offset + length);
        node.blobId = await writeBlobIfNeeded(record.paths.blobs, content);
        node.storedSize = content.length;
      } else {
        delete node.blobId;
        node.size = 0;
        node.storedSize = 0;
      }
      prepared.push(node);
    }

    const events = [];
    for (const rawPath of parsed.deletes) {
      const virtualPath = safeVirtualPath(rawPath);
      if (record.meta.nodes[virtualPath]) {
        delete record.meta.nodes[virtualPath];
        events.push({ kind: 'node', path: virtualPath, deleted: true });
      }
    }
    for (const node of prepared) {
      record.meta.nodes[node.path] = node;
      events.push({ kind: 'node', path: node.path, deleted: false });
    }
    const revision = appendChanges(record.meta, clientId, events);
    await saveWorkspace(record);
    await garbageCollectBlobs(record);
    return { ok: true, revision, changed: events.length };
  });
  sendJson(res, 200, result);
}

async function handleKv(req, res, url) {
  requireApiAccess(req);
  const workspaceId = safeWorkspaceId(url.searchParams.get('workspace'));
  const body = await readJson(req);
  const entries = body.entries && typeof body.entries === 'object' && !Array.isArray(body.entries) ? body.entries : {};
  const clientId = String(req.headers['x-findat-client'] || body.clientId || 'unknown').slice(0, 160);
  if (Object.keys(entries).length > 5000) throw httpError(413, 'Too many settings in one update');

  const result = await withWorkspaceLock(workspaceId, async () => {
    const record = await loadWorkspace(workspaceId);
    const events = [];
    for (const [key, value] of Object.entries(entries)) {
      if (key.length > 512 || (!key.startsWith('aurelia.') && !key.startsWith('findat.cloud.'))) continue;
      if (value === null) {
        if (Object.prototype.hasOwnProperty.call(record.meta.kv, key)) {
          delete record.meta.kv[key];
          events.push({ kind: 'kv', key, deleted: true });
        }
      } else {
        const text = String(value);
        if (Buffer.byteLength(text) > 12 * 1024 * 1024) throw httpError(413, `Shared setting ${key} is too large`);
        if (record.meta.kv[key] !== text) {
          record.meta.kv[key] = text;
          events.push({ kind: 'kv', key, deleted: false });
        }
      }
    }
    const revision = appendChanges(record.meta, clientId, events);
    await saveWorkspace(record);
    return { ok: true, revision, changed: events.length };
  });
  sendJson(res, 200, result);
}

async function handleBootstrap(req, res, url) {
  requireApiAccess(req);
  const workspaceId = safeWorkspaceId(url.searchParams.get('workspace'));
  const record = await loadWorkspace(workspaceId);
  sendJson(res, 200, publicSnapshot(record.meta));
}

async function handleChanges(req, res, url) {
  requireApiAccess(req);
  const workspaceId = safeWorkspaceId(url.searchParams.get('workspace'));
  const since = Math.max(0, Number(url.searchParams.get('since')) || 0);
  const record = await loadWorkspace(workspaceId);
  const meta = record.meta;
  const oldestRevision = meta.changes.length ? Number(meta.changes[0].revision) || 0 : Number(meta.revision) || 0;
  if (since > Number(meta.revision) || (meta.changes.length && since < oldestRevision - 1)) {
    return sendJson(res, 200, { reset: true, ...publicSnapshot(meta) });
  }

  const kvLatest = new Map();
  const nodeLatest = new Map();
  for (const change of meta.changes) {
    if (Number(change.revision) <= since) continue;
    if (change.kind === 'kv') kvLatest.set(change.key, change);
    if (change.kind === 'node') nodeLatest.set(change.path, change);
  }
  const kvChanges = [...kvLatest.values()].map(change => ({
    key: change.key,
    deleted: Boolean(change.deleted),
    value: change.deleted ? null : meta.kv[change.key],
    clientId: change.clientId,
    revision: change.revision
  }));
  const nodeChanges = [...nodeLatest.values()].map(change => ({
    path: change.path,
    deleted: Boolean(change.deleted) || !meta.nodes[change.path],
    node: change.deleted ? null : meta.nodes[change.path] || null,
    clientId: change.clientId,
    revision: change.revision
  }));
  sendJson(res, 200, { reset: false, revision: Number(meta.revision) || 0, kvChanges, nodeChanges });
}

async function handleBlob(req, res, url) {
  requireApiAccess(req);
  const workspaceId = safeWorkspaceId(url.searchParams.get('workspace'));
  const virtualPath = safeVirtualPath(url.searchParams.get('path'));
  const record = await loadWorkspace(workspaceId);
  const node = record.meta.nodes[virtualPath];
  if (!node || node.type !== 'file' || !node.blobId) throw httpError(404, 'Shared file not found');
  const filename = path.join(record.paths.blobs, node.blobId);
  const stat = await fsp.stat(filename).catch(() => null);
  if (!stat) throw httpError(404, 'Shared file content not found');
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  fs.createReadStream(filename).pipe(res);
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/sync/config' && req.method === 'GET') {
    return sendJson(res, 200, {
      enabled: true,
      requiresKey: Boolean(ACCESS_KEY),
      storage: 'durable-server-workspace',
      maxCommitBytes: MAX_COMMIT_BYTES
    });
  }
  if (url.pathname === '/api/sync/bootstrap' && req.method === 'GET') return handleBootstrap(req, res, url);
  if (url.pathname === '/api/sync/changes' && req.method === 'GET') return handleChanges(req, res, url);
  if (url.pathname === '/api/sync/blob' && req.method === 'GET') return handleBlob(req, res, url);
  if (url.pathname === '/api/sync/kv' && req.method === 'POST') return handleKv(req, res, url);
  if (url.pathname === '/api/sync/commit' && req.method === 'POST') return handleCommit(req, res, url);
  throw httpError(404, 'FINDAT shared storage API route not found');
}

function contentType(filename) {
  return MIME_TYPES[path.extname(filename).toLowerCase()] || 'application/octet-stream';
}

async function serveStatic(req, res, url) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch (_) { throw httpError(400, 'Invalid URL'); }
  if (pathname.includes('\0') || pathname.startsWith('/.findat-data')) throw httpError(404, 'Not found');
  if (pathname === '/') pathname = '/index.html';
  let filename = path.resolve(ROOT, `.${pathname}`);
  if (!filename.startsWith(`${ROOT}${path.sep}`) && filename !== ROOT) throw httpError(403, 'Forbidden');
  let stat = await fsp.stat(filename).catch(() => null);
  if (stat?.isDirectory()) {
    filename = path.join(filename, 'index.html');
    stat = await fsp.stat(filename).catch(() => null);
  }
  if (!stat?.isFile()) throw httpError(404, 'Not found');

  const headers = {
    'Content-Type': contentType(filename),
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cache-Control': /\.(?:html|js|mjs|css)$/i.test(filename) ? 'no-cache' : 'public, max-age=3600'
  };

  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) throw httpError(416, 'Invalid range');
    let start = match[1] ? Number(match[1]) : 0;
    let end = match[2] ? Number(match[2]) : stat.size - 1;
    if (!match[1] && match[2]) {
      const suffix = Number(match[2]);
      start = Math.max(0, stat.size - suffix);
      end = stat.size - 1;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= stat.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      return res.end();
    }
    end = Math.min(end, stat.size - 1);
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Content-Length': end - start + 1
    });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(filename, { start, end }).pipe(res);
  }

  res.writeHead(200, { ...headers, 'Content-Length': stat.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(filename).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else if (req.method === 'GET' || req.method === 'HEAD') await serveStatic(req, res, url);
    else throw httpError(405, 'Method not allowed');
  } catch (error) {
    const status = Number(error.status) || 500;
    if (status >= 500) console.error(error);
    if (!res.headersSent) sendText(res, status, status >= 500 ? 'Internal FINDAT server error' : error.message, status === 401 ? { 'WWW-Authenticate': 'FINDAT-Workspace' } : {});
    else res.destroy();
  }
});

server.requestTimeout = 10 * 60 * 1000;
server.headersTimeout = 65 * 1000;

async function start() {
  await fsp.mkdir(DATA_ROOT, { recursive: true });
  server.listen(PORT, HOST, () => {
    console.log(`FINDAT Cloud shared workspace running at http://localhost:${PORT}`);
    console.log(`Persistent data directory: ${DATA_ROOT}`);
    console.log(ACCESS_KEY ? 'Workspace access key protection: enabled' : 'Workspace access key protection: disabled');
  });
}

start().catch(error => {
  console.error('Could not start FINDAT Cloud:', error);
  process.exitCode = 1;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
