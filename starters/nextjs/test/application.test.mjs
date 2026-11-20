import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { mediaApi } from '../../../lib/media.mjs';
import { createApplication } from '../lib/application.mjs';
import { openStore } from '../lib/store.mjs';
import { fixtureMediaApi } from '../lib/fixture.mjs';

const base = 'http://127.0.0.1/api/';
const now = 1_763_520_000_000;
const key = 'isolated-webhook-fixture';
const tenants = [
  { id: 'alpha', token: 'alpha-token', maxCostUsd: '0.50000000' },
  { id: 'beta', token: 'beta-token', maxCostUsd: '0.05000000' },
];

function setup(t, overrides = {}, applicationTenants = tenants) {
  const store = openStore(':memory:');
  t.after(() => store.close());
  const fixture = fixtureMediaApi();
  return createApplication({
    store, mode: 'mock', tenants: applicationTenants, signingKeys: { active: key }, now: () => now,
    getProvider: () => ({ ...fixture, ...overrides }),
  });
}
function request(handle, path, body, { token = tenants[0].token, headers = {} } = {}) {
  return handle(new Request(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    ...(body !== undefined && { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    headers: { Authorization: `Bearer ${token}`, ...headers },
  }), path.split('?')[0]);
}
const spec = { model: 'gpt-image-2', prompt: 'Fixture image' };
const submission = operationId => ({ ...spec, operationId, maxCostUsd: '0.10000000', expectedRevision: 1 });

function signedCallback(handle, task, eventId, { invalid = false } = {}) {
  const raw = JSON.stringify({ eventId, event: 'task.completed', data: task });
  const timestamp = String(now / 1000);
  const signature = createHmac('sha256', key).update(timestamp + '.').update(raw).digest('hex');
  return request(handle, 'webhook', invalid ? raw + '\n' : raw, {
    headers: {
      'X-I2V-Signature': 'v1=' + signature, 'X-I2V-Event-ID': eventId,
      'X-I2V-Key-ID': 'active', 'X-I2V-Timestamp': timestamp,
    },
  });
}

test('the mock image and video fixtures are present in a clean checkout', async () => {
  const [image, video] = await Promise.all([
    readFile(new URL('../public/fixture/image.png', import.meta.url)),
    readFile(new URL('../public/fixture/video.mp4', import.meta.url)),
  ]);
  assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(video.toString('ascii', 4, 8), 'ftyp');
});

test('quote is read-only, and repeated submissions have one provider call', async t => {
  let count = 0;
  const fixture = fixtureMediaApi();
  const handle = setup(t, { async submit(...args) { count++; return fixture.submit(...args); } });
  const quote = await request(handle, 'quote', spec);
  assert.equal((await quote.json()).maximum.amount, '0.02000000');
  assert.equal(count, 0);
  const job = submission(randomUUID());
  const first = await (await request(handle, 'submit', job)).json();
  const replay = await (await request(handle, 'submit', job)).json();
  assert.equal(first.taskId, replay.taskId);
  assert.equal(count, 1);
  assert.equal((await request(handle, 'submit', { ...job, prompt: 'other input' })).status, 409);
  const status = await (await request(handle, 'task?operationId=' + job.operationId)).json();
  assert.equal(status.status, 'success');
  assert.equal(status.output[0].url, '/fixture/image.png');
});

test('tenant ownership and cap are independent', async t => {
  const handle = setup(t);
  const job = submission(randomUUID());
  assert.equal((await request(handle, 'submit', job, { token: '' })).status, 401);
  assert.equal((await request(handle, 'submit', job)).status, 200);
  assert.equal((await request(handle, 'task?operationId=' + job.operationId, undefined, { token: tenants[1].token })).status, 404);
  assert.equal((await request(handle, 'recover', { operationId: job.operationId }, { token: tenants[1].token })).status, 404);
  assert.equal((await request(handle, 'submit', job, { token: tenants[1].token })).status, 409);
  const second = await (await request(handle, 'submit', { ...job, maxCostUsd: '0.03000000' }, { token: tenants[1].token })).json();
  const first = await (await request(handle, 'task?operationId=' + job.operationId)).json();
  assert.notEqual(second.taskId, first.taskId);
});

test('unknown submission recovers the original provider operation', async t => {
  let original;
  const handle = setup(t, {
    async submit(_payload, providerKey) {
      original = providerKey;
      throw new DOMException('Fixture lost the acceptance response.', 'TimeoutError');
    },
    async receipt(providerKey) {
      assert.equal(original, providerKey);
      return { status: 'accepted', taskId: 'accepted-once' };
    },
  });
  const job = submission(randomUUID());
  const uncertain = await request(handle, 'submit', job);
  assert.equal(uncertain.status, 202);
  assert.equal((await uncertain.json()).recoveryRequired, true);
  assert.equal((await request(handle, 'submit', job)).status, 202);
  const recovered = await request(handle, 'recover', { operationId: job.operationId });
  assert.equal((await recovered.json()).taskId, 'accepted-once');
});

test('rate-limited submission retains Retry-After and can be replayed only with its original request', async t => {
  const calls = [];
  const provider = mediaApi({
    apiKey: 'isolated-fixture-key',
    async transport(url, init) {
      calls.push({ path: url.pathname, key: init.headers['Idempotency-Key'], body: init.body });
      if (calls.length === 1) {
        return Response.json({ error: { code: 'rate_limit' } }, { status: 429, headers: { 'Retry-After': '30' } });
      }
      if (url.pathname.endsWith('/submission')) {
        return Response.json({ error: { code: 'not_found' } }, { status: 404 });
      }
      return Response.json({ taskId: 'accepted-after-rate-limit' });
    },
  });
  const handle = setup(t, provider);
  const job = submission(randomUUID());
  const limited = await request(handle, 'submit', job);
  assert.equal(limited.status, 202);
  assert.equal(limited.headers.get('Retry-After'), '30');
  assert.equal((await limited.json()).recoveryRequired, true);
  assert.equal((await request(handle, 'submit', job)).status, 202);
  const recovery = await request(handle, 'recover', { operationId: job.operationId });
  assert.equal((await recovery.json()).receipt.status, 'not_found');
  assert.equal(calls.length, 2);
  const replay = await request(handle, 'replay', { operationId: job.operationId });
  assert.equal((await replay.json()).taskId, 'accepted-after-rate-limit');
  assert.equal(calls[1].key, calls[0].key);
  assert.equal(calls[2].key, calls[0].key);
  assert.deepEqual(calls[3], calls[0]);
});

test('pending receipt forwards its retry instruction and blocks replay', async t => {
  let submissions = 0;
  const provider = mediaApi({
    apiKey: 'isolated-fixture-key',
    async transport(url) {
      if (url.pathname.endsWith('/submission')) {
        return Response.json({ status: 'pending' }, { headers: { 'Retry-After': '5' } });
      }
      submissions++;
      return Response.json({ code: 'SUBMISSION_PENDING' }, { status: 409, headers: { 'Retry-After': '5' } });
    },
  });
  const handle = setup(t, provider);
  const job = submission(randomUUID());
  const initial = await request(handle, 'submit', job);
  assert.equal(initial.status, 202);
  assert.equal(initial.headers.get('Retry-After'), '5');
  const replay = await request(handle, 'replay', { operationId: job.operationId });
  assert.equal(replay.status, 202);
  assert.equal(replay.headers.get('Retry-After'), '5');
  assert.equal((await replay.json()).receipt.status, 'pending');
  assert.equal(submissions, 1);
});

test('missing budget and revoked application credentials prevent provider writes', async t => {
  let submissions = 0;
  const configuredTenants = [...tenants];
  const handle = setup(t, {
    async submit() { submissions++; return { taskId: 'tenant-owned-task' }; },
  }, configuredTenants);
  const job = submission(randomUUID());
  assert.equal((await request(handle, 'submit', { ...job, maxCostUsd: undefined })).status, 400);
  assert.equal(submissions, 0);
  assert.equal((await request(handle, 'submit', job)).status, 200);
  configuredTenants.shift();
  assert.equal((await request(handle, 'cancel', { operationId: job.operationId })).status, 401);
  assert.equal((await request(handle, 'submit', submission(randomUUID()))).status, 401);
  assert.equal(submissions, 1);
});

test('retryable receipt replays the exact stored payload and provider key', async t => {
  const calls = [];
  const handle = setup(t, {
    async submit(...args) {
      calls.push(args);
      if (calls.length === 1) throw new Error('Fixture network error.');
      return { taskId: 'retried-once' };
    },
    async receipt() { return { status: 'retryable' }; },
  });
  const job = submission(randomUUID());
  assert.equal((await request(handle, 'submit', job)).status, 202);
  const replay = await request(handle, 'replay', { operationId: job.operationId });
  assert.equal((await replay.json()).taskId, 'retried-once');
  assert.deepEqual(calls[0], calls[1]);
});

test('verify signed delivery, reject payload changes, and preserve a terminal state', async t => {
  const handle = setup(t);
  const operationId = randomUUID();
  const { taskId } = await (await request(handle, 'submit', submission(operationId))).json();
  const callback = (status, eventId, options) => signedCallback(handle, { taskId, status, output: null }, eventId, options);
  assert.equal((await callback('success', 'event-first', { invalid: true })).status, 401);
  assert.equal((await callback('success', 'event-first')).status, 200);
  assert.equal((await callback('success', 'event-first')).status, 200);
  assert.equal((await callback('fail', 'late-event')).status, 200);
  const status = await (await request(handle, 'task?operationId=' + operationId)).json();
  assert.equal(status.status, 'success');
});

test('retries a valid callback that arrives before the original task receipt is recovered', async t => {
  const taskId = 'accepted-before-response-was-lost';
  let submittedKey;
  let polls = 0;
  const handle = setup(t, {
    async submit(_body, providerKey) {
      submittedKey = providerKey;
      throw Object.assign(new Error('Response lost after acceptance'), { status: 503 });
    },
    async receipt(providerKey) {
      assert.equal(providerKey, submittedKey);
      return { status: 'accepted', taskId };
    },
    async task() {
      polls++;
      throw new Error('The signed callback should supply the terminal state.');
    },
  });
  const operationId = randomUUID();
  const accepted = await request(handle, 'submit', submission(operationId));
  assert.equal(accepted.status, 202);
  assert.equal((await accepted.json()).recoveryRequired, true);

  const complete = { taskId, status: 'success', output: [{ url: 'https://example.invalid/image.webp' }] };
  const callback = () => signedCallback(handle, complete, 'accepted-task-completed');
  assert.equal((await callback()).status, 409);
  const recovered = await request(handle, 'recover', { operationId });
  assert.equal(recovered.status, 200);
  assert.equal((await recovered.json()).taskId, taskId);
  assert.equal((await callback()).status, 200);
  assert.equal((await callback()).status, 200);

  const stored = await (await request(handle, 'task?operationId=' + operationId)).json();
  assert.deepEqual(stored.output, complete.output);
  assert.equal(stored.status, 'success');
  assert.equal(polls, 0);
});

test('queued cancellation records the cancelled phase for an owned task', async t => {
  const handle = setup(t);
  const operationId = randomUUID();
  await request(handle, 'submit', submission(operationId));
  const result = await request(handle, 'cancel', { operationId });
  assert.equal((await result.json()).phase, 'cancelled');
  const status = await (await request(handle, 'task?operationId=' + operationId)).json();
  assert.equal(status.lifecycle.phase, 'cancelled');
});
