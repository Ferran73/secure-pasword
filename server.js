const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { handlePasswordRequest } = require('./lib/password');

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sanitizePath(requestPath) {
  const normalized = path.normalize(requestPath);
  if (normalized === '/' || normalized === '\\') {
    return '/index.html';
  }
  return normalized;
}

function serveStaticFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
      }
      return;
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function requestListener(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname === '/api/password' && req.method === 'POST') {
    return handlePasswordRequest(req, res);
  }

  const sanitizedPath = sanitizePath(requestUrl.pathname);
  const filePath = path.join(publicDir, decodeURIComponent(sanitizedPath));

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      serveStaticFile(path.join(publicDir, 'index.html'), res);
      return;
    }

    if (stats.isDirectory()) {
      serveStaticFile(path.join(filePath, 'index.html'), res);
    } else {
      serveStaticFile(filePath, res);
    }
  });
}

if (require.main === module) {
  const server = http.createServer(requestListener);
  server.listen(PORT, () => {
    console.log(`Secure password generator server running on http://localhost:${PORT}`);
  });
}

module.exports = { requestListener };
