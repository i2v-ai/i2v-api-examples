# Next.js media API starter

Run the application from a clone of the examples repository with Node.js 22.13 or newer.

```bash
cd starters/nextjs
npm ci
npm test
npm run dev
```

Open `http://127.0.0.1:3000`. Enter the fixture application token `local-demo-token`, get a quote, set a USD ceiling, submit, and check the original operation ID. The default **mock** mode uses local media files, stores job state in SQLite, and makes no i2v.ai calls. The second fixture token is `local-other-token`; it has a separate 5-cent per-task cap.

## Running with an i2v.ai account

Set the following values on the Next.js server. Keep application tokens, i2v.ai keys, and webhook secrets in your secret store.

- `I2V_MODE=live` and `I2V_API_KEY` for the account that pays for tasks.
- `I2V_APP_TENANTS` as a JSON array of objects with `id`, `token`, and `maxCostUsd`. Use a unique random application token of at least 24 characters for each tenant. Optionally set `apiKeyEnv` to the environment variable holding that tenant's API key. This cap is per task.
- `I2V_SQLITE_PATH` on private, persistent storage. This SQLite example is designed for a single deployment with a shared local disk. Port the same ownership and transaction constraints to your application database before using multiple hosts. Apply rate limits and your own account authentication before serving untrusted users.
- To receive callbacks, create a signing key in the i2v.ai console. Set `I2V_CALLBACK_URL` to your public HTTPS `/api/webhook` route and `I2V_WEBHOOK_KEYS` to a JSON map of key IDs to secrets. Keep the earlier key available while its callbacks can still arrive. You can also query tasks without a public callback URL.

Every operation is persisted with the original submission and key before the first API call. To continue an interrupted submission, use **Recover submission** with the original application operation ID. When the receipt is retryable, the replay button sends the stored request and key. Use **Check status** to poll the original task. Valid, fresh callbacks are matched to recorded task IDs, deduplicated, and applied transactionally. Polling and callbacks preserve terminal state.

The server stores output references. Before delivery to customers who need long-term access, copy verified outputs to storage owned by your application under your tenant's retention policy. Use a protected SQLite file and backups because the job snapshot can contain customer content and signed reference URLs. See the [media workflow](https://i2v.ai/docs/media-workflow) and [callback documentation](https://i2v.ai/docs/webhooks).
