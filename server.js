const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const API_PATH = '/api/password';
const publicDir = path.join(__dirname, 'public');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Vary': 'Origin'
};

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function generatePassword(options) {
  const {
    length = 16,
    includeLowercase = true,
    includeUppercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeSimilar = false
  } = options || {};

  const pools = [];
  const requiredChars = [];

  if (includeLowercase) {
    const lowercase = excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    pools.push(lowercase);
    requiredChars.push(pickRandomChar(lowercase));
  }

  if (includeUppercase) {
    const uppercase = excludeSimilar ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    pools.push(uppercase);
    requiredChars.push(pickRandomChar(uppercase));
  }

  if (includeNumbers) {
    const numbers = excludeSimilar ? '23456789' : '0123456789';
    pools.push(numbers);
    requiredChars.push(pickRandomChar(numbers));
  }

  if (includeSymbols) {
    const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?/';
    pools.push(symbols);
    requiredChars.push(pickRandomChar(symbols));
  }

  if (!pools.length) {
    throw new Error('At least one character set must be selected.');
  }

  const allowedChars = pools.join('');
  const passwordChars = [...requiredChars];

  while (passwordChars.length < length) {
    passwordChars.push(pickRandomChar(allowedChars));
  }

  // Shuffle the characters using Fisher-Yates
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('').slice(0, length);
}

function pickRandomChar(pool) {
  if (!pool || pool.length === 0) {
    throw new Error('Character pool must contain at least one character.');
  }
  const index = secureRandomInt(pool.length);
  return pool[index];
}

function secureRandomInt(maxExclusive) {
  if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
    throw new Error('Maximum value must be a positive number.');
  }

  if (typeof crypto.randomInt === 'function') {
    return crypto.randomInt(0, maxExclusive);
  }

  const maxUint = 0xffffffff;
  const limit = Math.floor((maxUint + 1) / maxExclusive) * maxExclusive;

  while (true) {
    const randomNumber = crypto.randomBytes(4).readUInt32BE(0);
    if (randomNumber < limit) {
      return randomNumber % maxExclusive;
    }
  }
}

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

function handlePasswordRequest(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 1e6) {
      req.socket.destroy();
    }
  });

  req.on('end', () => {
    try {
      const payload = body ? JSON.parse(body) : {};
      const length = Math.min(Math.max(parseInt(payload.length, 10) || 0, 4), 128);
      const options = {
        length,
        includeLowercase: Boolean(payload.includeLowercase),
        includeUppercase: Boolean(payload.includeUppercase),
        includeNumbers: Boolean(payload.includeNumbers),
        includeSymbols: Boolean(payload.includeSymbols),
        excludeSimilar: Boolean(payload.excludeSimilar)
      };

      if (Number.isNaN(length) || length <= 0) {
        throw new Error('Password length must be a positive number.');
      }

      const password = generatePassword(options);

      res.writeHead(200, {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8'
      });
      res.end(JSON.stringify({ password }));
    } catch (err) {
      res.writeHead(400, {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8'
      });
      res.end(JSON.stringify({ error: err.message || 'Unable to generate password' }));
    }
  });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname === API_PATH) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        ...corsHeaders,
        'Content-Length': '0'
      });
      res.end();
      return;
    }

    if (req.method === 'POST') {
      return handlePasswordRequest(req, res);
    }

    res.writeHead(405, {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify({ error: 'Method not allowed.' }));
    return;
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
});

server.listen(PORT, () => {
  console.log(`Secure password generator server running on http://localhost:${PORT}`);
});
