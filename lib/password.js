const crypto = require('crypto');

function pickRandomChar(pool) {
  if (!pool || pool.length === 0) {
    throw new Error('Character pool must contain at least one character.');
  }
  const index = crypto.randomInt(0, pool.length);
  return pool[index];
}

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

  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('').slice(0, length);
}

function buildOptions(payload) {
  const length = Math.min(Math.max(parseInt(payload.length, 10) || 0, 4), 128);

  if (Number.isNaN(length) || length <= 0) {
    throw new Error('Password length must be a positive number.');
  }

  return {
    length,
    includeLowercase: Boolean(payload.includeLowercase),
    includeUppercase: Boolean(payload.includeUppercase),
    includeNumbers: Boolean(payload.includeNumbers),
    includeSymbols: Boolean(payload.includeSymbols),
    excludeSimilar: Boolean(payload.excludeSimilar)
  };
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
      const options = buildOptions(payload);
      const password = generatePassword(options);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ password }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message || 'Unable to generate password' }));
    }
  });
}

module.exports = {
  generatePassword,
  handlePasswordRequest
};
