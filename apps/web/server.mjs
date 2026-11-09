import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = 4173;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function isWithinRoot(filePath) {
  const pathFromRoot = relative(root, filePath);

  return (
    pathFromRoot === '' ||
    (
      !pathFromRoot.startsWith('..' + sep) &&
      pathFromRoot !== '..' &&
      !isAbsolute(pathFromRoot)
    )
  );
}

function isFrontendRoute(pathname) {
  const routes = [
    '/',
    '/dashboard',
    '/live',
    '/fixtures',
    '/competitions',
    '/teams',
    '/players',
    '/analytics',
    '/news',
    '/favorites',
    '/notifications',
    '/settings',
  ];

  if (routes.includes(pathname)) {
    return true;
  }

  return /^\/matches\/[^/]+$/.test(pathname);
}

function send(res, statusCode, message) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });

  res.end(message);
}

createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method not allowed');
    return;
  }

  let pathname;

  try {
    pathname = decodeURIComponent(
      new URL(req.url, 'http://localhost').pathname
    );
  } catch {
    send(res, 400, 'Invalid URL');
    return;
  }

  if (
    pathname.includes('\0') ||
    pathname.includes('\\') ||
    pathname.split('/').includes('..')
  ) {
    send(res, 400, 'Invalid path');
    return;
  }

  const previewRoute =
    pathname === '/preview' ||
    pathname === '/preview/' ||
    pathname.startsWith('/preview/');

  const routeRequest = isFrontendRoute(pathname);

  const requestedPath = previewRoute
    ? 'preview.html'
    : routeRequest
      ? 'index.html'
      : pathname.replace(/^\/+/, '');

  const filePath = resolve(root, requestedPath);

  if (!isWithinRoot(filePath)) {
    send(res, 403, 'Forbidden');
    return;
  }

  const extension = extname(filePath).toLowerCase();

  if (!mimeTypes[extension]) {
    send(res, 404, 'Not found');
    return;
  }

  try {
    const fileInfo = await stat(filePath);

    if (!fileInfo.isFile()) {
      send(res, 404, 'Not found');
      return;
    }

    const contents = await readFile(filePath);

    res.writeHead(200, {
      'Content-Type': mimeTypes[extension],
      'Content-Length': contents.length,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    res.end(contents);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      send(res, 404, 'Not found');
      return;
    }

    console.error('Frontend server error:', error);
    send(res, 500, 'Internal server error');
  }
}).listen(port, () => {
  console.log(`SPORTPULSE frontend: http://localhost:${port}`);
});