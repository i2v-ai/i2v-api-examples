import { createHmac, timingSafeEqual } from 'node:crypto';

export function readWebhook(raw, headers, signingKeys, now = Date.now()) {
  const timestamp = headers.get('x-i2v-timestamp');
  const keyId = headers.get('x-i2v-key-id');
  const signature = headers.get('x-i2v-signature');
  const eventId = headers.get('x-i2v-event-id');
  if (!timestamp || !/^[0-9]{1,13}$/.test(timestamp) ||
      Math.abs(Math.floor(now / 1000) - Number(timestamp)) > 300 ||
      !signature || !/^v1=[a-f0-9]{64}$/.test(signature) ||
      !eventId || !keyId || !Object.hasOwn(signingKeys, keyId)) return null;
  const expected = createHmac('sha256', signingKeys[keyId])
    .update(timestamp + '.').update(raw).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature.slice(3), 'hex'))) return null;
  try {
    const event = JSON.parse(raw.toString('utf8'));
    if (event.eventId !== eventId || event.event !== 'task.completed' ||
        typeof event.data?.taskId !== 'string' ||
        !['success', 'fail'].includes(event.data.status)) return null;
    return event;
  } catch {
    return null;
  }
}
