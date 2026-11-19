<h1 align="center">Grok Imagine</h1>

<p align="center">
  Grok Imagine on the i2v API. Photorealistic text-to-image, plus a single-reference edit mode,<br>
  with no resolution field to tune.
</p>

<p align="center">
  <img alt="Model id" src="https://img.shields.io/badge/model-grok--imagine-6366f1?style=flat-square">
  <img alt="Type" src="https://img.shields.io/badge/type-image-0ea5e9?style=flat-square">
  <img alt="Provider" src="https://img.shields.io/badge/provider-xAI-22c55e?style=flat-square">
  <a href="https://i2v.ai/models/grok-imagine"><img alt="Model page" src="https://img.shields.io/badge/i2v.ai-model%20page-111827?style=flat-square"></a>
</p>

> Try it in the [studio](https://i2v.ai/app/generate) · Full reference at [i2v.ai/docs/models/grok-imagine](https://i2v.ai/docs/models/grok-imagine) · Get an [API key](https://i2v.ai/me?section=api-keys)

<br>

## Run an example

```bash
# Put I2V_API_KEY in ../../.env, or:
export I2V_API_KEY=your-api-key   # https://i2v.ai/me?section=api-keys

python3 text-to-image.py               # Python 3.8+, stdlib only
npx tsx text-to-image.ts               # Node.js 18+, no dependencies
bash text-to-image.sh                  # curl only
```

Each script submits a task, polls until it finishes, and saves the image next to the script. Edit the `INPUTS` block at the top to change the prompt or options.

<table>
  <thead>
    <tr>
      <th align="left">Example</th>
      <th align="left">What it does</th>
      <th align="left">Python</th>
      <th align="left">TypeScript</th>
      <th align="left">curl</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>Text to image</b></td>
      <td>Generate an image from a prompt</td>
      <td><a href="./text-to-image.py"><code>.py</code></a></td>
      <td><a href="./text-to-image.ts"><code>.ts</code></a></td>
      <td><a href="./text-to-image.sh"><code>.sh</code></a></td>
    </tr>
    <tr>
      <td><b>Image to image</b></td>
      <td>Restyle a reference image through imageUrls</td>
      <td><a href="./image-to-image.py"><code>.py</code></a></td>
      <td><a href="./image-to-image.ts"><code>.ts</code></a></td>
      <td><a href="./image-to-image.sh"><code>.sh</code></a></td>
    </tr>
  </tbody>
</table>

<br>

## Request

`POST https://api.i2v.ai/api/v1/jobs/createTask`

```json
{
  "model": "grok-imagine",
  "inputs": {
    "prompt": "A street food stall in the rain at night, neon reflections on wet asphalt, candid documentary look.",
    "aspectRatio": "1:1"
  }
}
```

Response `200 OK` — the task is queued and the amount is reserved. Keep `taskId`; it is the only handle you need.

```json
{
  "taskId": "YOUR_TASK_ID"
}
```

Send an `Idempotency-Key` header for a submission you may retry: the same key with the same body replays the existing task, while the same key with a different body is rejected.

<details>
<summary>Error responses</summary>

| HTTP | Body | When |
|:--|:--|:--|
| `400` | `{ "code": "invalid_params", "message": "…" }` | A field is missing or unsupported for this model. |
| `401` | `{ "code": "unauthorized", "message": "…" }` | Missing, wrong or revoked API key. |
| `402` | `{ "code": "insufficient_balance", "message": "…", "required": {…}, "available": {…} }` | The account balance cannot cover the quote. |
| `409` | `{ "code": "conflict", "message": "…" }` | Idempotency payload mismatch, or `maxCostUsd` below the quote. |
| `429` | `{ "code": "rate_limit" | "concurrency_limit", "message": "…" }` | Per-minute or concurrent-task limit reached; honour `Retry-After`. |

</details>

| Field | Type | Default | Description |
|:--|:--|:--|:--|
| `model` | `string` | **required** | Must be `"grok-imagine"`. |
| `inputs.prompt` | `string` | **required** | What to generate, or how to edit the reference. Up to 5,000 characters. |
| `inputs.imageUrls` | `string[]` | – | Up to 1 publicly reachable reference image URLs. Omit for text-to-image. |
| `inputs.aspectRatio` | `string` | `1:1` | `1:1` · `2:3` · `3:2` · `16:9` · `9:16` |
| `maxCostUsd` | `string` | – | Optional USD ceiling such as `"0.50000000"`; a higher quote returns HTTP `409` before generation. |
| `callBackUrl` | `string` | – | Optional webhook. Requires a signing secret in [developer settings](https://i2v.ai/settings/developer). |

**Modes:** text-to-image · image-to-image

<br>

## Result

`GET https://api.i2v.ai/api/v1/jobs/recordInfo?taskId=YOUR_TASK_ID`

Poll every few seconds until `status` is `success` or `fail`. An image task usually finishes inside a minute.

```json
{
  "taskId": "YOUR_TASK_ID",
  "model": "grok-imagine",
  "status": "success",
  "billing": {
    "currency": "USD",
    "status": "captured",
    "charged": { "currency": "USD", "amount": "0.07200000" }
  },
  "output": [
    {
      "url": "https://file.example.com/generated/YOUR_TASK_ID/display.png",
      "width": 1024,
      "height": 1024
    }
  ],
  "error": null,
  "createTime": 1763520000000,
  "completeTime": 1763520060000
}
```

| `status` | Meaning |
|:--|:--|
| `waiting` | Accepted and queued; not sent upstream yet. |
| `generating` | Upstream call in flight. |
| `success` | Finished — read `output[].url`. |
| `fail` | Terminal failure — read `error.code` and `error.message`; the reservation is released. |

| Field | Type | Description |
|:--|:--|:--|
| `output[].url` | `string` | Download URL of the generated file. |
| `output[].width` | `integer \| null` | Pixel width when the backend reports it. |
| `output[].height` | `integer \| null` | Pixel height when the backend reports it. |
| `billing.status` | `string` | `reserved` while running, then `captured` or `released`. |
| `billing.charged.amount` | `string` | USD amount actually charged, with eight decimals. |
| `error.code` | `string \| null` | `generation_failed`, `no_provider`, `provider_out_of_credits` or `content_policy` when `status` is `fail`. |

<br>

## Limits and notes

- **Aspect ratio:** 1:1, 2:3, 3:2, 16:9, 9:16
- Exactly one reference image in edit mode; extra entries are discarded.
- In image-to-image the output follows the reference, so `aspectRatio` is ignored.


Reference media must be publicly reachable URLs — your CDN, object storage or a public site. The REST API does not accept file uploads, so host the file first and pass its URL.

<br>

## Pricing

Billing is in USD. The exact quote is reserved when the task is created and reported in `billing`; a failed task releases the reservation. Current per-image prices: [i2v.ai/models/grok-imagine](https://i2v.ai/models/grok-imagine).

<br>

<p align="center">
  <a href="../../README.md">← All models</a> &nbsp;·&nbsp;
  <a href="https://i2v.ai/models/grok-imagine">Model page</a> &nbsp;·&nbsp;
  <a href="https://i2v.ai/docs/models/grok-imagine">API reference</a>
</p>
