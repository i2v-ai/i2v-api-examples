# Automate an image or video workflow

Import an [n8n template](./n8n/) for product images or reference videos, or use the HTTP steps below in Make and Zapier. Start with the account check and quote. Both leave your balance unchanged.

## Configure a connection

**Make.** In **HTTP → Make a request** (version 4), choose **API key**. Create a keychain with the value `Bearer YOUR_I2V_API_KEY`, placement **In the header**, and the name `Authorization`. Restrict the keychain to the service origin `https://api.i2v.ai`, then reuse it for each API module. Enable **Parse response**. For POST requests, choose **application/JSON** and use a **Data structure** for mapped fields such as prompts. [Make HTTP modules](https://apps.make.com/http) · [Make API key authentication](https://apps.make.com/api-key-authentication-type)

**Zapier.** Choose **API by Zapier → API Request**. Create a **Static Headers (API key)** connection with `Authorization: Bearer YOUR_I2V_API_KEY` and domain filter `api.i2v.ai`. Use `https://api.i2v.ai/api/v1/account` as the test URL. This action is available on paid plans. For POST requests, pass valid JSON and JSON-encode dynamic text before inserting it in a raw body. **Test step** sends a real request, so test the account or quote action first. [Zapier API connections](https://help.zapier.com/hc/en-us/articles/44391660158733) · [Zapier API Request action](https://help.zapier.com/hc/en-us/articles/44391650357005)

## Quote first

1. Send `GET https://api.i2v.ai/api/v1/account` using the connection. HTTP 200 with `balance.currency` set to `USD` confirms the key works.
2. Send `POST https://api.i2v.ai/api/v1/jobs/quote` with the JSON below. The response contains `maximum.amount` as a decimal string, `maximum.currency`, and `expectedRevision`. End the first test run here.

```json
{
  "model": "gpt-image-2",
  "inputs": {
    "prompt": "A ceramic mug on an oak table in soft daylight"
  }
}
```

For a video, choose the model and inputs from the [model examples](../models/), then quote those exact inputs. Use the [asset upload guide](https://i2v.ai/docs/media-workflow) if your reference starts as a local file.

## Submit after approval

1. Require approval of a USD ceiling for the exact request, or use an existing per-task cap that covers it. Submit only when `maximum.currency` is `USD` and the quote fits the cap. Compare USD values as decimals.
2. Save a private record with one stable operation ID, the model and inputs, the approved ceiling, and the quoted revision before sending the request. On repeated triggers, look up this record by the original operation ID. Keep the API key in the platform connection.
3. Send `POST https://api.i2v.ai/api/v1/jobs/createTask` with `Idempotency-Key` set to the saved operation ID. Send the quote body with two additional fields at the top level. Set `maxCostUsd` to the approved decimal string, and map `expectedRevision` directly from the quote as a JSON number. Store the returned `taskId` on the existing record.
4. If the API definitively rejects the budget or revision, ask for approval of a fresh quote before submitting a new logical operation. If the outcome is unknown, recover the original submission first.

## Recover a submission or check a task

If the submit step times out or returns a temporary gateway error, use a separate recovery run. Send `GET https://api.i2v.ai/api/v1/jobs/submission` with the same connection and `Idempotency-Key` header. In Make, set **Return error if HTTP request fails** to **No** for status-based branches. In Zapier, a failed HTTP action can stop its Zap. Use a separate run or error handler that reads the saved operation record. [Make HTTP error handling](https://apps.make.com/http#advanced-settings) · [Zapier HTTP troubleshooting](https://help.zapier.com/hc/en-us/articles/44391666408077)

| Response | Next step |
| --- | --- |
| Receipt `accepted` | Save its `taskId` and start task lookup. |
| Receipt `pending` | Wait for `Retry-After` and read the same receipt. |
| Receipt `retryable` | Wait for `Retry-After`, then replay the saved body with the same connection and key. |
| Receipt HTTP 404 | Confirm the connection and key match the original submit. Any replay of that operation uses the saved body and original key. |
| Receipt `rejected` | Review the rejection and stop. A corrected request needs a fresh approval and operation ID. |
| HTTP 429 | Wait for `Retry-After` before repeating the read or replaying a submit. Keep the saved operation ID. |

For task lookup, use a scheduled scenario or a separate Zap. Send `GET https://api.i2v.ai/api/v1/jobs/recordInfo` with the saved `taskId` as a query parameter. Stop when `status` is `success` or `fail`. On success use `output[].url`. If your polling window expires, retain the task ID for the next run. When you need long-term access, copy results to storage you control. For callbacks, follow the [signed webhook guide](https://i2v.ai/docs/webhooks) and verify the raw body on your backend before forwarding the event.
