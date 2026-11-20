import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { mediaApi, approvedSubmission } from '../lib/media.mjs';

const [command = 'catalog', argument, path] = process.argv.slice(2);
const client = mediaApi({ apiKey: process.env.I2V_API_KEY, baseUrl: process.env.I2V_BASE_URL });
const show = (data) => console.log(JSON.stringify(data, null, 2));
const spec = argument === 'video'
  ? {
      model: 'seedance-2-mini',
      inputs: {
        prompt: 'Slow camera push towards the ceramic mug, soft studio light',
        ...(process.env.I2V_REFERENCE_IMAGE_URL && {
          referenceImageUrls: [process.env.I2V_REFERENCE_IMAGE_URL],
        }),
      },
    }
  : { model: 'gpt-image-2', inputs: { prompt: 'A ceramic mug on an oak table' } };

try {
  switch (command) {
    case 'catalog':
      show((await client.catalog()).data.map(({ id, name, mediaType }) => ({ id, name, mediaType })));
      break;
    case 'quote': {
      const quote = await client.quote(spec);
      show({ model: quote.model, maximum: quote.maximum, expectedRevision: quote.expectedRevision });
      break;
    }
    case 'submit': {
      if (!path) throw new Error('Provide a new receipt file path.');
      const quote = await client.quote(spec);
      const submission = approvedSubmission(spec, quote, process.env.I2V_MAX_COST_USD);
      const idempotencyKey = randomUUID();
      await writeFile(path, JSON.stringify({ submission, idempotencyKey }), { mode: 0o600, flag: 'wx' });
      const task = await client.submit(submission, idempotencyKey);
      show({ taskId: task.taskId });
      break;
    }
    case 'receipt':
    case 'replay': {
      const { idempotencyKey, submission } = JSON.parse(await readFile(argument, 'utf8'));
      const receipt = await client.receipt(idempotencyKey);
      if (command === 'replay' && receipt.status === 'retryable') {
        show({ taskId: (await client.submit(submission, idempotencyKey)).taskId });
      } else {
        show(receipt);
      }
      break;
    }
    case 'status':
      if (!argument) throw new Error('Pass the original task ID.');
      show(await client.task(argument));
      break;
    default:
      throw new Error('Commands: catalog, quote, submit, receipt, replay, status');
  }
} catch (error) {
  console.error(JSON.stringify({
    status: error.status, code: error.code, requestId: error.requestId,
    retryAfter: error.retryAfter, message: error.message,
  }));
  process.exitCode = 1;
}
