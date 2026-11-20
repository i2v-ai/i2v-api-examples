import { configure } from '../../../lib/runtime.mjs';

export const runtime = 'nodejs';
let handle;

async function route(request, context) {
  handle ??= configure();
  const { path } = await context.params;
  return handle(request, path.join('/'));
}

export { route as GET, route as POST };
