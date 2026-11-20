export function mediaApi({ baseUrl = 'https://api.i2v.ai', apiKey, transport = fetch } = {}) {
  const origin = new URL(baseUrl);
  if (origin.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(origin.hostname)) {
    throw new TypeError('Use an HTTPS API origin or a local fixture.');
  }

  const request = async (path, { payload, idempotencyKey, publicRoute = false, includeRetryAfter = false } = {}) => {
    if (!publicRoute && !apiKey) throw new Error('Set a server-side i2v.ai API key.');
    const headers = { Accept: 'application/json' };
    if (!publicRoute) headers.Authorization = `Bearer ${apiKey}`;
    if (payload !== undefined) headers['Content-Type'] = 'application/json';
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    const response = await transport(new URL(path, origin), {
      method: payload === undefined ? 'GET' : 'POST',
      headers,
      body: payload,
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
    });
    const data = await response.json().catch(() => null);
    const requestId = response.headers.get('X-Request-ID');
    const retryAfter = response.headers.get('Retry-After');
    if (!response.ok) {
      const error = new Error(`i2v.ai returned HTTP ${response.status}`);
      error.status = response.status;
      error.code = data?.error?.code ?? data?.code;
      error.requestId = requestId;
      error.retryAfter = retryAfter;
      throw error;
    }
    if (data === null) throw new Error('i2v.ai returned an invalid JSON response.');
    return includeRetryAfter && retryAfter ? { ...data, retryAfter } : data;
  };

  return {
    catalog: () => request('/api/v1/generation-models', { publicRoute: true }),
    async uploadAsset(file, fileName) {
      if (!file.size || !file.type) throw new TypeError('Choose a nonempty file with a Content-Type.');
      const ticket = await request('/api/v1/assets', {
        payload: JSON.stringify({ fileName, contentType: file.type, fileSize: file.size }),
      });
      const completePath = '/api/v1/assets/' + encodeURIComponent(ticket.assetId) + '/complete';
      if (!ticket.assetId || ticket.method !== 'PUT' || ticket.contentType !== file.type ||
          ticket.completeUrl !== completePath) {
        throw new Error('The API returned an invalid upload ticket.');
      }

      const target = new URL(ticket.uploadUrl);
      const loopback = ['127.0.0.1', 'localhost'];
      const local = target.protocol === 'http:' && loopback.includes(origin.hostname) &&
        loopback.includes(target.hostname);
      if (target.username || target.password || (target.protocol !== 'https:' && !local)) {
        throw new Error('The API returned an invalid storage target.');
      }
      const upload = await transport(target, {
        method: 'PUT',
        headers: { 'Content-Type': ticket.contentType },
        body: file,
        redirect: 'error',
        signal: AbortSignal.timeout(60_000),
      });
      if (!upload.ok) {
        const error = new Error(`Asset storage returned HTTP ${upload.status}`);
        error.status = upload.status;
        error.code = 'asset_upload_failed';
        throw error;
      }
      const asset = await request(completePath, { payload: '{}' });
      if (asset.status !== 'ready' || asset.id !== ticket.assetId ||
          asset.bytes !== file.size || !asset.url) {
        throw new Error('The API did not confirm the expected asset.');
      }
      return asset;
    },
    quote: (spec) => request('/api/v1/jobs/quote', { payload: JSON.stringify(spec) }),
    submit: (payload, idempotencyKey) =>
      request('/api/v1/jobs/createTask', { payload, idempotencyKey }),
    receipt: (idempotencyKey) => request('/api/v1/jobs/submission', { idempotencyKey, includeRetryAfter: true }),
    task: (taskId) => request('/api/v1/jobs/recordInfo?' + new URLSearchParams({ taskId })),
    cancel: (taskId) =>
      request('/api/v1/jobs/cancel', { payload: JSON.stringify({ taskId }) }),
  };
}

export function usdUnits(amount) {
  if (typeof amount !== 'string' || !/^(0|[1-9][0-9]{0,9})(\.[0-9]{1,8})?$/.test(amount)) {
    throw new TypeError('Use a USD decimal string with at most eight decimal places.');
  }
  const [whole, fraction = ''] = amount.split('.');
  return BigInt(whole) * 100_000_000n + BigInt(fraction.padEnd(8, '0'));
}

export function approvedSubmission(spec, quote, cap) {
  if (!Number.isSafeInteger(quote.expectedRevision) || quote.expectedRevision < 0) {
    throw new Error('The quote did not include a valid revision.');
  }
  if (usdUnits(quote.maximum.amount) > usdUnits(cap)) {
    const error = new Error('The current quote exceeds the approved budget.');
    error.status = 409;
    error.code = 'budget_exceeded';
    throw error;
  }
  return JSON.stringify({ ...spec, maxCostUsd: cap, expectedRevision: quote.expectedRevision });
}
