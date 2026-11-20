import { mediaApi, usdUnits } from '../../../lib/media.mjs';
import { createApplication } from './application.mjs';
import { fixtureMediaApi } from './fixture.mjs';
import { openStore } from './store.mjs';

export function configure(environment = process.env) {
  const mode = environment.I2V_MODE ?? 'mock';
  if (!['mock', 'live'].includes(mode)) throw new Error('I2V_MODE must be mock or live.');
  const tenants = JSON.parse(environment.I2V_APP_TENANTS ?? '[]');
  if (!Array.isArray(tenants)) throw new Error('I2V_APP_TENANTS must be an array.');
  if (mode === 'mock' && tenants.length === 0) {
    tenants.push(
      { id: 'demo', token: 'local-demo-token', maxCostUsd: '0.50000000' },
      { id: 'other', token: 'local-other-token', maxCostUsd: '0.05000000' },
    );
  }
  if (tenants.length === 0) throw new Error('Configure I2V_APP_TENANTS.');
  const ids = new Set();
  const tokens = new Set();
  for (const tenant of tenants) {
    if (typeof tenant.id !== 'string' || !tenant.id || ids.has(tenant.id) ||
        typeof tenant.token !== 'string' || !tenant.token || tokens.has(tenant.token)) {
      throw new Error('Set unique tenant IDs and application tokens.');
    }
    ids.add(tenant.id);
    tokens.add(tenant.token);
    usdUnits(tenant.maxCostUsd);
    if (mode === 'live') {
      tenant.apiKey = environment[tenant.apiKeyEnv || 'I2V_API_KEY'];
      if (tenant.token.length < 24 || !tenant.apiKey) {
        throw new Error('Live tenants need a secret application token and server API key.');
      }
    }
  }

  const signingKeys = JSON.parse(environment.I2V_WEBHOOK_KEYS ?? '{}');
  if (!signingKeys || typeof signingKeys !== 'object' || Array.isArray(signingKeys)) throw new Error('Provide a webhook key map.');
  for (const secret of Object.values(signingKeys)) {
    if (typeof secret !== 'string' || !secret) throw new Error('Invalid webhook key map.');
  }
  const callbackUrl = environment.I2V_CALLBACK_URL;
  if (callbackUrl) {
    const url = new URL(callbackUrl);
    if (url.protocol !== 'https:' || url.username || url.password || !Object.keys(signingKeys).length) {
      throw new Error('Configure an HTTPS callback URL and signing keys together.');
    }
  }
  return createApplication({
    mode,
    tenants,
    signingKeys,
    callbackUrl,
    store: openStore(environment.I2V_SQLITE_PATH ?? '.data/jobs.sqlite'),
    getProvider: tenant => mode === 'mock' ? fixtureMediaApi() : mediaApi({ apiKey: tenant.apiKey }),
  });
}
