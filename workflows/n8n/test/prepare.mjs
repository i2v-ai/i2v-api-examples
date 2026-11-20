import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const target = process.argv[2];
if (!target) throw new Error('Provide an empty fixture directory.');
const credential = { id: 'testS8nXqD90dkL2', name: 'Isolated fixture', type: 'httpHeaderAuth' };
writeFileSync(join(target, 'credentials.json'), JSON.stringify([
  { ...credential, data: { name: 'Authorization', value: 'Bearer local-n8n-test' } },
]));
for (const [file, variant] of [
  ['product-image', 'quote'],
  ['product-image', 'success'],
  ['reference-video', 'recover'],
  ['reference-video', 'fail'],
]) {
  const path = new URL('../' + file + '.json', import.meta.url);
  const workflow = JSON.parse(readFileSync(path, 'utf8'));
  workflow.id = 'fixture-' + variant;
  for (const node of workflow.nodes) {
    if (node.type === 'n8n-nodes-base.httpRequest') {
      node.parameters.url = node.parameters.url.replace('https://api.i2v.ai', 'http://i2v-api-fixture:8080');
      node.credentials = { httpHeaderAuth: { id: credential.id, name: credential.name } };
    }
    if (node.name === 'Request and approval' && variant !== 'quote') {
      node.parameters.jsCode = node.parameters.jsCode
        .replace('"approved": false', '"approved": true')
        .replace('"maxCostUsd": ""', '"maxCostUsd": "0.10000000"')
        .replace('"operationId": ""', '"operationId": "isolated-operation-' + variant + '"');
    }
  }
  writeFileSync(join(target, variant + '.json'), JSON.stringify(workflow));
}
