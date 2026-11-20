const http = require('node:http');

const accepted = new Map();
http.createServer(async (req, res) => {
  const reply = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (req.headers.authorization !== 'Bearer local-n8n-test') return reply(401, { error: 'fixture unauthorized' });
  const path = new URL(req.url, 'http://fixture').pathname;
  const key = req.headers['idempotency-key'];
  if (path === '/api/v1/jobs/recordInfo') {
    const taskId = new URL(req.url, 'http://fixture').searchParams.get('taskId');
    return reply(200, { taskId, status: 'success', output: [{ url: 'https://fixture.example/output' }] });
  }
  if (path === '/api/v1/jobs/submission') {
    const taskId = accepted.get(key);
    return taskId ? reply(200, { status: 'accepted', taskId }) : reply(404, { error: 'not accepted' });
  }
  let raw = '';
  for await (const data of req) raw += data;
  const body = raw ? JSON.parse(raw) : {};
  if (path === '/api/v1/jobs/quote') {
    if (!body.model || !body.inputs?.prompt) return reply(400, { error: 'missing model or inputs' });
    return reply(200, { model: body.model, maximum: { currency: 'USD', amount: '0.02000000' }, expectedRevision: 7 });
  }
  if (path === '/api/v1/jobs/createTask') {
    if (!key || body.maxCostUsd !== '0.10000000' || body.expectedRevision !== 7 || !body.inputs?.prompt) {
      return reply(400, { error: 'fixture submission mismatch' });
    }
    const taskId = 'task-' + key;
    accepted.set(key, taskId);
    return key.endsWith('recover') ? reply(503, { error: 'fixture lost response' }) : reply(200, { taskId });
  }
  return reply(404, { error: 'unknown fixture path' });
}).listen(8080);
