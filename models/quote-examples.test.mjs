import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const models = fileURLToPath(new URL('./', import.meta.url));
const run = promisify(execFile);
const languages = new Map([
  ['sh', ['bash']],
  ['py', ['python3']],
  ['ts', [process.execPath, '--experimental-strip-types']],
]);
const apiKey = 'fixture-model-quote-key';
const amount = '0.12345678';

test('model examples quote the same inputs in Bash, Python, and TypeScript', { timeout: 120_000 }, async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), 'i2v-model-examples-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  await writeFile(join(workspace, '.env'), '');

  const scenarios = [];
  const entries = await readdir(models, { withFileTypes: true });
  for (const entry of entries.filter((entry) => entry.isDirectory())) {
    const model = entry.name;
    const source = join(models, model);
    const target = join(workspace, model);
    await mkdir(target);
    const scripts = new Map();
    for (const filename of await readdir(source)) {
      const match = /^(.+)\.(sh|py|ts)$/.exec(filename);
      if (!match) continue;
      const [, mode, language] = match;
      const group = scripts.get(mode) ?? new Map();
      scripts.set(mode, group);
      const destination = join(target, filename);
      await copyFile(join(source, filename), destination);
      group.set(language, destination);
    }
    assert(scripts.size > 0, `${model} has no example scripts`);
    for (const [mode, variants] of scripts) {
      assert.equal(variants.size, languages.size, `${model}/${mode} must have all three languages`);
      scenarios.push({ model, mode, variants });
    }
  }
  assert(scenarios.length > 0);

  const requests = new Map();
  const unexpected = [];
  const server = createServer(async (request, response) => {
    const route = /^\/(\d+-\w+)\/api\/v1\/jobs\/quote$/.exec(request.url);
    if (request.method !== 'POST' || !route || request.headers.authorization !== `Bearer ${apiKey}`) {
      unexpected.push([request.method, request.url]);
      response.writeHead(400).end();
      return;
    }
    try {
      const body = [];
      for await (const chunk of request) body.push(chunk);
      const spec = JSON.parse(Buffer.concat(body).toString('utf8'));
      const [, id] = route;
      const received = requests.get(id) ?? [];
      received.push(spec);
      requests.set(id, received);
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        model: spec.model,
        maximum: { currency: 'USD', amount },
        expectedRevision: 7,
      }));
    } catch {
      response.writeHead(400).end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;

  async function checkScenario({ model, mode, variants }, index) {
    const specs = await Promise.all([...languages].map(async ([language, [program, ...args]]) => {
      const id = `${index}-${language}`;
      const script = variants.get(language);
      const { stdout } = await run(program, [...args, script], {
        cwd: join(workspace, model),
        env: {
          PATH: process.env.PATH,
          I2V_API_KEY: apiKey,
          I2V_BASE_URL: `${origin}/${id}`,
        },
        timeout: 20_000,
      });
      assert(stdout.trim().endsWith(`Maximum reservation: ${amount} USD`), `${model}/${mode}.${language}`);
      const received = requests.get(id);
      assert.equal(received?.length, 1, `${model}/${mode}.${language} must quote once`);
      return received[0];
    }));
    const [spec] = specs;
    assert.equal(spec.model, model, `${model}/${mode} quotes the wrong model`);
    assert(
      typeof spec.inputs?.prompt === 'string' && spec.inputs.prompt.trim(),
      `${model}/${mode} is missing a prompt`
    );
    for (const variant of specs) assert.deepEqual(variant, spec, `${model}/${mode} differs across languages`);
  }

  const batchSize = 3;
  for (let i = 0; i < scenarios.length; i += batchSize) {
    await Promise.all(scenarios.slice(i, i + batchSize).map((scenario, index) => checkScenario(scenario, i + index)));
  }
  assert.equal(requests.size, scenarios.length * languages.size);
  assert.deepEqual(unexpected, []);
});
