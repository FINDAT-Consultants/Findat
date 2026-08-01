#!/usr/bin/env node
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticRoot = path.resolve(__dirname, '../cloud');
const port = Number(process.env.PORT || 3000);
const githubToken = String(process.env.GITHUB_TOKEN || '').trim();
const githubApiBaseUrl = String(process.env.GITHUB_API_BASE_URL || 'https://api.github.com').replace(/\/+$/, '');
const owner = String(process.env.GITHUB_OWNER || '').trim();
const repo = String(process.env.GITHUB_REPO || '').trim();
const branch = String(process.env.GITHUB_BRANCH || 'main').trim();
const repositoryRoot = String(process.env.GITHUB_ROOT || 'findat-cloud').replace(/^\/+|\/+$/g, '');
const manifestPath = `${repositoryRoot}/manifest.json`;
const maxFileBytes = Math.max(1, Number(process.env.FINDAT_MAX_FILE_BYTES || 25 * 1024 * 1024));
const allowedOrigins = String(process.env.FINDAT_ALLOWED_ORIGINS || '*').split(',').map(value => value.trim()).filter(Boolean);

if (!githubToken || !owner || !repo) {
  console.warn('FINDAT GitHub storage is not fully configured. Set GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO.');
}

function corsHeaders(request) {
  const origin = String(request.headers.origin || '');
  const allowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin) ? (origin || '*') : allowedOrigins[0] || '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Findat-Name',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders
  });
  response.end(body);
}

function safeRepositoryPath(value, prefix = '') {
  const normalised = String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalised || normalised.includes('\0') || normalised.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('Invalid repository object path');
  }
  if (prefix && !normalised.startsWith(prefix)) throw new Error('Repository object path is outside the allowed area');
  return `${repositoryRoot}/${normalised}`;
}

function githubPathUrl(repositoryPath) {
  const encoded = repositoryPath.split('/').map(encodeURIComponent).join('/');
  return `${githubApiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encoded}`;
}

async function githubRequest(repositoryPath, options = {}, raw = false) {
  if (!githubToken || !owner || !repo) throw new Error('GitHub backend environment variables are not configured');
  const headers = {
    Authorization: `Bearer ${githubToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'FINDAT-Cloud-Repository-Storage',
    Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
    ...(options.headers || {})
  };
  const method = String(options.method || 'GET').toUpperCase();
  const requestUrl = method === 'GET'
    ? `${githubPathUrl(repositoryPath)}?ref=${encodeURIComponent(branch)}`
    : githubPathUrl(repositoryPath);
  const response = await fetch(requestUrl, { ...options, headers });
  if (response.ok) return response;
  if (response.status === 404) return null;
  let detail = '';
  try {
    const payload = await response.json();
    detail = payload.message || JSON.stringify(payload);
  } catch (_) {
    detail = await response.text();
  }
  const error = new Error(`GitHub API request failed (${response.status})${detail ? `: ${detail}` : ''}`);
  error.statusCode = response.status;
  throw error;
}

async function getContentMetadata(repositoryPath) {
  const response = await githubRequest(repositoryPath);
  return response ? response.json() : null;
}

async function putContent(repositoryPath, bytes, message, existingSha = '') {
  const payload = {
    message,
    content: Buffer.from(bytes).toString('base64'),
    branch
  };
  if (existingSha) payload.sha = existingSha;
  const response = await githubRequest(repositoryPath, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response.json();
}

async function upsertContent(repositoryPath, bytes, message) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const current = await getContentMetadata(repositoryPath);
      return await putContent(repositoryPath, bytes, message, current?.sha || '');
    } catch (error) {
      lastError = error;
      if (![409, 422].includes(error.statusCode) || attempt === 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function deleteContent(repositoryPath, message) {
  const current = await getContentMetadata(repositoryPath);
  if (!current?.sha) return false;
  const response = await githubRequest(repositoryPath, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sha: current.sha, branch })
  });
  await response.json();
  return true;
}

function decodeBase64Content(payload) {
  return Buffer.from(String(payload?.content || '').replace(/\n/g, ''), 'base64');
}

async function readManifestWithSha() {
  const payload = await getContentMetadata(manifestPath);
  if (!payload) return { rows: [], sha: '' };
  const bytes = decodeBase64Content(payload);
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch (_) {
    throw new Error('The FINDAT manifest in GitHub is not valid JSON');
  }
  const rows = Array.isArray(parsed) ? parsed : parsed.rows;
  return { rows: Array.isArray(rows) ? rows : [], sha: payload.sha || '' };
}

async function updateManifest(mutator, message) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const current = await readManifestWithSha();
      const nextRows = await mutator([...current.rows]);
      const document = {
        version: 1,
        repository: `${owner}/${repo}`,
        branch,
        updatedAt: new Date().toISOString(),
        rows: nextRows.sort((left, right) => String(left.path).localeCompare(String(right.path)))
      };
      return await putContent(manifestPath, Buffer.from(`${JSON.stringify(document, null, 2)}\n`), message, current.sha);
    } catch (error) {
      lastError = error;
      if (![409, 422].includes(error.statusCode) || attempt === 4) throw error;
      await new Promise(resolve => setTimeout(resolve, 120 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function readBody(request, limit = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) {
      const error = new Error(`Request exceeds the ${Math.round(limit / 1024 / 1024)} MB server limit`);
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function validatedRow(row) {
  if (!row || typeof row !== 'object') throw new Error('Invalid manifest row');
  const virtualPath = String(row.path || '');
  if (!virtualPath.startsWith('/') || virtualPath.includes('\0')) throw new Error('Invalid FINDAT document path');
  const type = row.type === 'folder' ? 'folder' : 'file';
  const objectPath = type === 'file' ? String(row.object_path || '') : '';
  if (type === 'file') safeRepositoryPath(objectPath, 'objects/');
  return {
    path: virtualPath,
    parent: row.parent == null ? null : String(row.parent),
    name: String(row.name || ''),
    type,
    size: Math.max(0, Number(row.size) || 0),
    mime: String(row.mime || (type === 'folder' ? 'inode/directory' : 'application/octet-stream')),
    modified: String(row.modified || new Date().toISOString()),
    object_path: objectPath || null,
    original_path: row.original_path ? String(row.original_path) : null
  };
}

async function handleApi(request, response, url) {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') {
    response.writeHead(204, cors);
    response.end();
    return;
  }

  const action = String(url.searchParams.get('action') || 'health');
  if (action === 'health' && request.method === 'GET') {
    sendJson(response, 200, {
      ok: Boolean(githubToken && owner && repo),
      repository: `${owner}/${repo}`,
      branch,
      rootPath: repositoryRoot,
      maxFileBytes
    }, cors);
    return;
  }

  if (action === 'list' && request.method === 'GET') {
    const manifest = await readManifestWithSha();
    sendJson(response, 200, { rows: manifest.rows, repository: `${owner}/${repo}`, branch }, cors);
    return;
  }

  if (action === 'file' && request.method === 'GET') {
    const repositoryPath = safeRepositoryPath(url.searchParams.get('objectPath'), 'objects/');
    const githubResponse = await githubRequest(repositoryPath, {}, true);
    if (!githubResponse) {
      sendJson(response, 404, { message: 'Document not found in GitHub repository' }, cors);
      return;
    }
    const bytes = Buffer.from(await githubResponse.arrayBuffer());
    response.writeHead(200, {
      ...cors,
      'Content-Type': githubResponse.headers.get('content-type') || 'application/octet-stream',
      'Content-Length': bytes.length,
      'Cache-Control': 'private, max-age=60'
    });
    response.end(bytes);
    return;
  }

  if (action === 'upload' && request.method === 'PUT') {
    const objectPath = String(url.searchParams.get('objectPath') || '');
    const repositoryPath = safeRepositoryPath(objectPath, 'objects/');
    const bytes = await readBody(request, maxFileBytes);
    const name = decodeURIComponent(String(request.headers['x-findat-name'] || path.posix.basename(objectPath)));
    const result = await upsertContent(repositoryPath, bytes, `FINDAT Cloud: upload ${name}`);
    sendJson(response, 200, { ok: true, path: repositoryPath, commit: result?.commit?.sha || '' }, cors);
    return;
  }

  if (action === 'upsert' && request.method === 'POST') {
    const body = JSON.parse((await readBody(request, 2 * 1024 * 1024)).toString('utf8') || '{}');
    const rows = Array.isArray(body.rows) ? body.rows.map(validatedRow) : [];
    await updateManifest(currentRows => {
      const map = new Map(currentRows.map(row => [row.path, row]));
      rows.forEach(row => map.set(row.path, row));
      return [...map.values()];
    }, `FINDAT Cloud: update ${rows.length} manifest item${rows.length === 1 ? '' : 's'}`);
    sendJson(response, 200, { ok: true, upserted: rows.length }, cors);
    return;
  }

  if (action === 'delete' && request.method === 'POST') {
    const body = JSON.parse((await readBody(request, 2 * 1024 * 1024)).toString('utf8') || '{}');
    const paths = [...new Set((Array.isArray(body.paths) ? body.paths : []).map(String))];
    const objectPaths = [...new Set((Array.isArray(body.objectPaths) ? body.objectPaths : []).filter(Boolean).map(String))];
    for (const objectPath of objectPaths) {
      await deleteContent(safeRepositoryPath(objectPath, 'objects/'), `FINDAT Cloud: delete ${path.posix.basename(objectPath)}`);
    }
    await updateManifest(currentRows => currentRows.filter(row => !paths.includes(String(row.path))), `FINDAT Cloud: remove ${paths.length} manifest item${paths.length === 1 ? '' : 's'}`);
    sendJson(response, 200, { ok: true, deleted: paths.length, objectsDeleted: objectPaths.length }, cors);
    return;
  }

  sendJson(response, 404, { message: 'FINDAT GitHub API action not found' }, cors);
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

async function serveStatic(response, url) {
  const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const resolved = path.resolve(staticRoot, `.${requested}`);
  if (!resolved.startsWith(staticRoot + path.sep) && resolved !== path.join(staticRoot, 'index.html')) {
    sendJson(response, 403, { message: 'Forbidden' });
    return;
  }
  let info;
  try {
    info = await stat(resolved);
  } catch (_) {
    sendJson(response, 404, { message: 'File not found' });
    return;
  }
  const filePath = info.isDirectory() ? path.join(resolved, 'index.html') : resolved;
  const fileInfo = await stat(filePath);
  response.writeHead(200, {
    'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Content-Length': fileInfo.size,
    'Cache-Control': path.basename(filePath) === 'cloud-config.js' ? 'no-store' : 'public, max-age=300'
  });
  createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/api/findat-github') await handleApi(request, response, url);
    else await serveStatic(response, url);
  } catch (error) {
    console.error(error);
    sendJson(response, Number(error.statusCode) || 500, { message: error.message || 'Unexpected server error' }, corsHeaders(request));
  }
});

server.listen(port, () => {
  console.log(`FINDAT Cloud is running at http://localhost:${port}`);
  console.log(`GitHub destination: ${owner || '<owner>'}/${repo || '<repository>'} (${branch})/${repositoryRoot}`);
});
