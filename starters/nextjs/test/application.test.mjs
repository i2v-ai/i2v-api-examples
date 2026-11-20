import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { test } from 'node:test';
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

function setup(t, overrides = {}) {
  const store = openStore(':memory:');
  t.after(() => store.close());
  const fixture = fixtureMediaApi();
  return createApplication({
    store, mode: 'mock', tenants, signingKeys: { active: key }, now: () => now,
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
      throw new Error('Fixture lost the acceptance response.');
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
  function callback(status, eventId, { invalid = false } = {}) {
    const raw = JSON.stringify({ eventId, event: 'task.completed', data: { taskId, status, output: null } });
    const timestamp = String(now / 1000);
    const signature = createHmac('sha256', key).update(timestamp + '.').update(raw).digest('hex');
    return request(handle, 'webhook', invalid ? raw + '\n' : raw, {
      headers: {
        'X-I2V-Signature': 'v1=' + signature, 'X-I2V-Event-ID': eventId,
        'X-I2V-Key-ID': 'active', 'X-I2V-Timestamp': timestamp,
      },
    });
  }
  assert.equal((await callback('success', 'event-first', { invalid: true })).status, 401);
  assert.equal((await callback('success', 'event-first')).status, 200);
  assert.equal((await callback('success', 'event-first')).status, 200);
  assert.equal((await callback('fail', 'late-event')).status, 200);
  const status = await (await request(handle, 'task?operationId=' + operationId)).json();
  assert.equal(status.status, 'success');
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
