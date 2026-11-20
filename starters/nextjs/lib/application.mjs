import { createHash, timingSafeEqual } from 'node:crypto';
import { usdUnits } from '../../../lib/media.mjs';
import { readWebhook } from './webhook.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const tokenMatches = (actual, expected) => timingSafeEqual(Buffer.from(digest(actual)), Buffer.from(digest(expected)));
const isOperation = (value) => typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
const supportedModels = new Set(['gpt-image-2', 'seedance-2-mini']);
const response = (body, status = 200, retryAfter) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store', ...(retryAfter && { 'Retry-After': retryAfter }) },
});
const failure = (message, status, code) => Object.assign(new Error(message), { status, code });

function readSpec(body) {
  if (!supportedModels.has(body?.model) || typeof body.prompt !== 'string' ||
      !body.prompt.trim() || body.prompt.length > 2000) {
    throw failure('Choose a supported model and enter a prompt of up to 2,000 characters.', 400);
  }
  const inputs = { prompt: body.prompt };
  if (body.referenceImageUrl) {
    let url;
    try { url = new URL(body.referenceImageUrl); }
    catch { throw failure('Provide a valid HTTPS reference image URL.', 400); }
    if (url.protocol !== 'https:' || url.username || url.password || body.model !== 'seedance-2-mini') {
      throw failure('Use an HTTPS reference image URL with the video model.', 400);
    }
    inputs.referenceImageUrls = [url.href];
  }
  return { model: body.model, inputs };
}

export function createApplication({ store, mode, tenants, getProvider, callbackUrl, signingKeys, now }) {
  const authorize = (request) => {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) throw failure('An application access token is required.', 401);
    const tenant = tenants.find(({ token }) => tokenMatches(auth.slice(7), token));
    if (!tenant) throw failure('The application access token is invalid.', 401);
    return tenant;
  };
  const readJob = (tenant, operation) => {
    if (!isOperation(operation)) throw failure('Provide a valid operation UUID.', 400);
    const job = store.owned(tenant.id, operation.toLowerCase());
    if (!job) throw failure('This operation was not found.', 404);
    return job;
  };
  const route = async (request, path) => {
    if (request.method === 'POST' && path === 'webhook') {
      const reader = request.body?.getReader();
      const chunks = [];
      let size = 0;
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 262_144) {
            await reader.cancel();
            return response({ error: 'Callback body is too large.' }, 413);
          }
          chunks.push(value);
        }
      }
      const raw = Buffer.concat(chunks, size);
      const event = readWebhook(raw, request.headers, signingKeys, now?.());
      if (!event) return response({ error: 'Invalid callback signature or payload.' }, 401);
      return store.delivery(event.eventId, event.data)
        ? response({ received: true })
        : response({ error: 'Unknown provider task. Retry delivery.' }, 409);
    }

    const tenant = authorize(request);
    const provider = getProvider(tenant);
    if (request.method === 'POST' && ['quote', 'submit'].includes(path)) {
      const body = await request.json().catch(() => null);
      const spec = readSpec(body);
      if (path === 'quote') return response({ ...await provider.quote(spec), mode });
      if (!isOperation(body.operationId) || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) {
        throw failure('Submit the original operation UUID and the quoted revision.', 400);
      }
      if (usdUnits(body.maxCostUsd) > usdUnits(tenant.maxCostUsd)) {
        throw failure('The approved amount is above this tenant’s per-task limit.', 409, 'tenant_task_limit');
      }
      const operationId = body.operationId.toLowerCase();
      const payload = JSON.stringify({
        ...spec, maxCostUsd: body.maxCostUsd, expectedRevision: body.expectedRevision,
        ...(callbackUrl && { callBackUrl: callbackUrl }),
      });
      const providerKey = digest(JSON.stringify([tenant.id, operationId]));
      const credential = digest(tenant.apiKey ?? 'fixture');
      const { created, job } = store.add(tenant.id, operationId, providerKey, credential, payload);
      if (job.payload !== payload || job.credential !== credential) {
        throw failure('The operation already has a different request or credential.', 409, 'operation_conflict');
      }
      if (job.task_id) return response({ operationId, taskId: job.task_id, mode });
      if (!created) return response({ operationId, recoveryRequired: true, mode }, 202);
      try {
        const accepted = await provider.submit(payload, providerKey);
        store.attach(tenant.id, operationId, accepted.taskId);
        return response({ operationId, taskId: accepted.taskId, mode });
      } catch (error) {
        // Keep the persisted request after every uncertain result. Recovery is explicit.
        if (!error.status || error.status >= 500) {
          return response({ operationId, recoveryRequired: true, mode }, 202, error.retryAfter);
        }
        throw error;
      }
    }

    if (request.method === 'GET' && path === 'task') {
      const job = readJob(tenant, new URL(request.url).searchParams.get('operationId'));
      if (job.result) return response({ operationId: job.operation, ...JSON.parse(job.result), mode });
      if (!job.task_id) return response({ operationId: job.operation, recoveryRequired: true, mode }, 202);
      if (job.credential !== digest(tenant.apiKey ?? 'fixture')) {
        throw failure('Restore the original operation credential to query this task.', 409);
      }
      const data = await provider.task(job.task_id);
      if (data.taskId !== job.task_id) throw new Error('The provider returned a different task ID.');
      if (['success', 'fail'].includes(data.status)) store.result(data);
      const current = store.owned(tenant.id, job.operation);
      return response({ operationId: job.operation, ...(current.result ? JSON.parse(current.result) : data), mode });
    }

    if (request.method === 'POST' && ['recover', 'replay', 'cancel'].includes(path)) {
      const body = await request.json().catch(() => null);
      const job = readJob(tenant, body?.operationId);
      if (job.credential !== digest(tenant.apiKey ?? 'fixture')) {
        throw failure('Restore the original operation credential to continue.', 409);
      }
      if (path === 'cancel') {
        if (!job.task_id) throw failure('Recover the task ID before requesting cancellation.', 409);
        const result = await provider.cancel(job.task_id);
        store.result({ taskId: job.task_id, status: 'fail', lifecycle: { phase: result.phase }, output: null });
        return response({ ...result, mode });
      }
      if (job.task_id) return response({ operationId: job.operation, taskId: job.task_id, mode });
      const receipt = await provider.receipt(job.provider_key);
      if (receipt.status === 'accepted') {
        store.attach(tenant.id, job.operation, receipt.taskId);
        return response({ operationId: job.operation, taskId: receipt.taskId, mode });
      }
      if (path === 'replay' && receipt.status === 'retryable') {
        const accepted = await provider.submit(job.payload, job.provider_key);
        store.attach(tenant.id, job.operation, accepted.taskId);
        return response({ operationId: job.operation, taskId: accepted.taskId, mode });
      }
      return response({ operationId: job.operation, receipt, mode }, 202);
    }

    return response({ error: 'Route not found.' }, 404);
  };
  return async (request, path) => {
    try {
      return await route(request, path);
    } catch (error) {
      const httpStatus = error.status ?? (error instanceof TypeError ? 400 : 500);
      return response({
        error: httpStatus < 500 ? error.message : 'The request could not be completed.',
        code: error.code, requestId: error.requestId,
      }, httpStatus, error.retryAfter);
    }
  };
}
