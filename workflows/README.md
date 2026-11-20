# Automate an image or video workflow

Use a secret backed credential to send `Authorization: Bearer YOUR_I2V_API_KEY` to `https://api.i2v.ai`. Start with `POST /api/v1/jobs/quote` using the actual model and inputs. Ask the operator to approve a USD ceiling, or use a previously approved per-task cap.

Persist a stable operation ID. Submit `POST /api/v1/jobs/createTask` with the unchanged model and inputs, `maxCostUsd` as a decimal string, and the quoted `expectedRevision`. Send that operation ID as `Idempotency-Key`. Keep the accepted task ID and poll `GET /api/v1/jobs/recordInfo` with it. If the submit response is lost, read `GET /api/v1/jobs/submission` with the original key.

- **n8n:** [Import the product-image or reference-video template](./n8n/).
- **Make:** Configure HTTP Make a request modules for quote, submit, and task lookup. Place the approval filter between quote and submit. Store the operation ID and task ID in a data store or your application. Use a scheduled follow-up scenario for longer video tasks.
- **Zapier:** Use a server action or webhook requests for quote and submit. Save the stable operation ID in your application. For asynchronous delivery, use a separate polling or callback flow so the initial action can return the accepted task ID promptly.

Use the [signed callback guide](https://i2v.ai/docs/webhooks) when sending completion notifications to a backend. Store generated results in your own destination when the application needs long-term access.
