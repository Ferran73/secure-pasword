const { handlePasswordRequest } = require('../lib/password');

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  handlePasswordRequest(req, res);
};
