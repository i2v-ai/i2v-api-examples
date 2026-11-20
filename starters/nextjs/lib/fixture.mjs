import { approvedSubmission } from '../../../lib/media.mjs';

export function fixtureMediaApi() {
  const quote = (spec) => ({
    model: spec.model,
    maximum: { currency: 'USD', amount: spec.model === 'seedance-2-mini' ? '0.15000000' : '0.02000000' },
    expectedRevision: 1,
  });
  const taskIdFor = (key, spec) => `demo-${spec.model === 'seedance-2-mini' ? 'video' : 'image'}-${key}`;
  return {
    async quote(spec) { return quote(spec); },
    async submit(payload, key) {
      const spec = JSON.parse(payload);
      approvedSubmission(spec, quote(spec), spec.maxCostUsd);
      return { taskId: taskIdFor(key, spec) };
    },
    async receipt() {
      throw Object.assign(new Error('Fixture receipt is missing.'), { status: 404, code: 'not_found' });
    },
    async task(taskId) {
      return {
        taskId, status: 'success', lifecycle: { phase: 'succeeded', pollAfterSeconds: null },
        output: [{ url: taskId.startsWith('demo-video-') ? '/fixture/video.mp4' : '/fixture/image.png' }],
      };
    },
    async cancel(taskId) { return { taskId, phase: 'cancelled' }; },
  };
}
