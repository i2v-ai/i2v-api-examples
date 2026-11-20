import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const entry = fileURLToPath(new URL('media.mjs', import.meta.url));
const image = fileURLToPath(new URL('../starters/nextjs/public/fixture/image.png', import.meta.url));

async function listen(t, handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

const json = (response, status, body) => response.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

test('quickstart uploads to signed storage, confirms on the API, and quotes the same reference', async (t) => {
  const bytes = await readFile(image);
  const assetId = randomUUID();
  const assetUrl = 'https://media.example.test/references/uploaded.png';
  const apiCalls = [];
  const storageCalls = [];
  let corruptTicket = false;
  const storage = await listen(t, async (request, response) => {
    storageCalls.push({
      method: request.method, path: request.url, type: request.headers['content-type'],
      auth: request.headers.authorization, body: await readBody(request),
    });
    response.writeHead(200).end();
  });
  const completeUrl = `/api/v1/assets/${assetId}/complete`;
  const api = await listen(t, async (request, response) => {
    const payload = JSON.parse(await readBody(request));
    apiCalls.push({ method: request.method, path: request.url, auth: request.headers.authorization, payload });
    if (request.url === '/api/v1/assets') {
      return json(response, 201, {
        assetId, method: 'PUT', contentType: 'image/png',
        uploadUrl: `${storage}/signed?ticket=test`,
        completeUrl: corruptTicket ? `${storage}/unexpected` : completeUrl,
      });
    }
    if (request.url === completeUrl) {
      return json(response, 200, { id: assetId, url: assetUrl, status: 'ready', bytes: bytes.length });
    }
    if (request.url === '/api/v1/jobs/quote') {
      return json(response, 200, {
        model: 'seedance-2-mini', maximum: { currency: 'USD', amount: '0.15000000' }, expectedRevision: 1,
      });
    }
    return json(response, 404, { error: 'Unexpected endpoint' });
  });
  const env = { ...process.env, I2V_BASE_URL: api, I2V_API_KEY: 'fixture-key' };
  const upload = await execute(process.execPath, [entry, 'upload', image], { env });
  const verified = JSON.parse(upload.stdout);
  assert.deepEqual(verified, { assetId, url: assetUrl });
  assert.deepEqual(storageCalls, [{
    method: 'PUT', path: '/signed?ticket=test', type: 'image/png', auth: undefined, body: bytes,
  }]);
  assert.deepEqual(apiCalls.slice(0, 2), [
    { method: 'POST', path: '/api/v1/assets', auth: 'Bearer fixture-key', payload: { fileName: 'image.png', contentType: 'image/png', fileSize: bytes.length } },
    { method: 'POST', path: completeUrl, auth: 'Bearer fixture-key', payload: {} },
  ]);

  const quote = await execute(process.execPath, [entry, 'quote', 'video'], {
    env: { ...env, I2V_REFERENCE_IMAGE_URL: verified.url },
  });
  assert.equal(JSON.parse(quote.stdout).maximum.amount, '0.15000000');
  assert.deepEqual(apiCalls[2].payload.inputs.referenceImageUrls, [assetUrl]);

  corruptTicket = true;
  await assert.rejects(execute(process.execPath, [entry, 'upload', image], { env }), /invalid upload ticket/);
  assert.equal(storageCalls.length, 1);
  assert.deepEqual(apiCalls.map(call => call.path), [
    '/api/v1/assets', completeUrl, '/api/v1/jobs/quote', '/api/v1/assets',
  ]);
});
