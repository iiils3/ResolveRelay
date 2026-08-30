import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 3000);
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mbhiaqhlhxjibuckdikq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_AEzTVMOcLg26Q6ZoRw62Dw_jtOCDGCI';
const AI_UPSTREAM_BASE = (process.env.AI_UPSTREAM_BASE || 'https://resolverelai.netlify.app').replace(/\/$/, '');
const MAX_BODY = 512 * 1024;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_API_REQUESTS = 80;
const apiRoutes = new Set(['/api/claim-assist', '/api/merchant-support', '/api/claim-package', '/api/claim-chat']);
const buckets = new Map();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
}

function json(res, status, payload) {
  securityHeaders(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function getIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function allowRate(req) {
  const now = Date.now();
  const ip = getIp(req);
  const current = buckets.get(ip);
  if (!current || now - current.startedAt > WINDOW_MS) {
    buckets.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_API_REQUESTS;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Payload too large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function authenticate(req) {
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) return null;
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: auth },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/health') {
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed' });
    return json(res, 200, { ok: true, service: 'resolverelay-render', upstreamConfigured: Boolean(AI_UPSTREAM_BASE) });
  }
  if (!apiRoutes.has(url.pathname)) return json(res, 404, { error: 'Not found' });
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!allowRate(req)) return json(res, 429, { error: 'Too many requests. Please retry shortly.' });

  const user = await authenticate(req);
  if (!user) return json(res, 401, { error: 'Authentication required' });

  try {
    const body = await readBody(req);
    const upstream = await fetch(`${AI_UPSTREAM_BASE}${url.pathname}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: String(req.headers.authorization || ''),
        'X-ResolveRelay-Relay': 'render-production',
      },
      body,
      signal: AbortSignal.timeout(25000),
    });
    const payload = await upstream.arrayBuffer();
    securityHeaders(res);
    res.statusCode = upstream.status;
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(Buffer.from(payload));
  } catch (error) {
    const status = Number(error?.status || 0);
    if (status === 413) return json(res, 413, { error: 'Payload too large' });
    console.error('API relay failed', error?.name || 'Error');
    return json(res, 502, { error: 'AI service is temporarily unavailable.' });
  }
}

function safeFilePath(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  const clean = normalize(decoded).replace(/^([/\\])+/, '');
  if (clean.startsWith('..')) return null;
  return join(DIST, clean);
}

function serveFile(res, filePath, method) {
  securityHeaders(res);
  const type = mime[extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.statusCode = 200;
  res.setHeader('Content-Type', type);
  if (filePath.includes(`${join('dist', 'assets')}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  else res.setHeader('Cache-Control', 'no-cache');
  if (method === 'HEAD') return res.end();
  createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  securityHeaders(res);
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed' });

  const candidate = safeFilePath(url.pathname === '/' ? '/index.html' : url.pathname);
  if (candidate && existsSync(candidate) && statSync(candidate).isFile()) return serveFile(res, candidate, req.method);

  const index = join(DIST, 'index.html');
  if (existsSync(index)) return serveFile(res, index, req.method);
  return json(res, 503, { error: 'Application build is unavailable' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ResolveRelay listening on ${PORT}`);
});
