# Contributing

Use Node.js 22 for the REST quickstart and at least 22.13 for the Next.js starter. Model-specific examples also run using Python 3.8+ or Bash with curl and jq. Use English commit messages, synthetic media, and fixture credentials in tests.

Run the relevant checks from the repository root.

```bash
node --test quickstart/media.test.mjs models/quote-examples.test.mjs
npm --prefix starters/nextjs test
```

The model example check runs every Bash, Python, and TypeScript snippet against a local quote fixture. It checks that variants send the same model and inputs and stop after one quote with no approved budget. Run it whenever you add or change a model example.

For starter UI changes, run `npm --prefix starters/nextjs ci` and `npm --prefix starters/nextjs run build`. Follow the [starter instructions](./starters/nextjs) to exercise the mock application locally.

Keep live generation opt-in and carry the same inputs and idempotency key through recovery. Use a private file for request snapshots. Keep API keys, signing secrets, customer inputs, and signed media URLs out of code, fixtures, and logs.

Include a minimal, redacted reproducer in a [bug report](https://github.com/i2v-ai/i2v-api-examples/issues/new/choose). Share questions, requests for examples, and completed integrations in [Discussions](https://github.com/i2v-ai/i2v-api-examples/discussions). Follow the [security policy](./SECURITY.md) for private reports.
