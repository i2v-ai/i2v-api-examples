<p align="center">
  <a href="https://i2v.ai">
    <img src="https://i2v.ai/brand/folded-rabbit-light.png" alt="i2v.ai" width="96">
  </a>
</p>

<h1 align="center">i2v API Examples</h1>

<p align="center">
  Runnable examples for every image and video model on the i2v API.<br>
  One folder per model · one script per use case · Python, TypeScript and curl.
</p>

<p align="center">
  <a href="https://i2v.ai/docs/models"><img alt="Model catalog" src="https://img.shields.io/badge/catalog-i2v.ai%2Fdocs%2Fmodels-6366f1?style=flat-square"></a>
  <a href="https://i2v.ai/docs/api"><img alt="API reference" src="https://img.shields.io/badge/API-reference-0ea5e9?style=flat-square"></a>
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-22c55e?style=flat-square"></a>
</p>

<br>

## Quick start

The account and generation examples target OpenAPI 2.2.0. Check the [API contract](https://api.i2v.ai/openapi.json) before using the quote and recovery endpoints. The catalog can be read independently.

Use any shell with Node.js 22, or choose the Bash and Python examples.

```bash
git clone https://github.com/i2v-ai/i2v-api-examples.git
cd i2v-api-examples
node quickstart/media.mjs catalog
# Set I2V_API_KEY in your environment before using a quote or account operation.
node quickstart/media.mjs quote image
node quickstart/media.mjs quote video
```

Model-specific examples in `models/` quote the selected inputs and stop by default. They submit only when you set both `I2V_MAX_COST_USD` and `I2V_RECEIPT_PATH`. Set a reviewed USD decimal amount and a new receipt file in a private folder. Bash scripts require curl and jq. Use the receipt to recover the same operation after a timeout.

- [cURL, Node.js, and Python quickstart](./quickstart) covers quote, submit, and recovery.
- [Next.js starter](./starters/nextjs) demonstrates job ownership, persistence, and signed webhooks.
- [Workflow guides](./workflows) cover Make and Zapier HTTP integration and include importable n8n templates.

## Models

<table>
  <thead>
    <tr>
      <th align="left">Model</th>
      <th align="left">Type</th>
      <th align="left">Examples</th>
      <th align="left">Provider</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="./models/midjourney"><b>Midjourney</b></a></td>
      <td>Image</td>
      <td>
        <a href="./models/midjourney/text-to-image.py"><code>text-to-image</code></a>
      </td>
      <td>Midjourney</td>
    </tr>
    <tr>
      <td><a href="./models/gemini-3-pro"><b>Nano Banana Pro</b></a></td>
      <td>Image</td>
      <td>
        <a href="./models/gemini-3-pro/text-to-image.py"><code>text-to-image</code></a> ·
        <a href="./models/gemini-3-pro/image-to-image.py"><code>image-to-image</code></a>
      </td>
      <td>Google</td>
    </tr>
    <tr>
      <td><a href="./models/gemini-2.5-flash"><b>Nano Banana Flash</b></a></td>
      <td>Image</td>
      <td>
        <a href="./models/gemini-2.5-flash/text-to-image.py"><code>text-to-image</code></a> ·
        <a href="./models/gemini-2.5-flash/image-to-image.py"><code>image-to-image</code></a>
      </td>
      <td>Google</td>
    </tr>
    <tr>
      <td><a href="./models/nanobanana-2"><b>Nano Banana 2</b></a></td>
      <td>Image</td>
      <td>
        <a href="./models/nanobanana-2/text-to-image.py"><code>text-to-image</code></a> ·
        <a href="./models/nanobanana-2/image-to-image.py"><code>image-to-image</code></a>
      </td>
      <td>Google</td>
    </tr>
    <tr>
      <td><a href="./models/nano-banana-2-lite"><b>Nano Banana 2 Lite</b></a></td>
      <td>Image</td>
      <td>
        <a href="./models/nano-banana-2-lite/text-to-image.py"><code>text-to-image</code></a> ·
        <a href="./models/nano-banana-2-lite/image-to-image.py"><code>image-to-image</code></a>
      </td>
      <td>Google</td>
    </tr>
    <tr>
      <td><a href="./models/seedream-5.0"><b>Seedream 5.0</b></a></td>
      <td>Image</td>
      <td>
        <a href="./models/seedream-5.0/text-to-image.py"><code>text-to-image</code></a> ·
        <a href="./models/seedream-5.0/image-to-image.py"><code>image-to-image</code></a>
      </td>
      <td>ByteDance</td>
    </tr>
    <tr>
      <td><a href="./models/seedream-5.0-pro"><b>Seedream 5.0 Pro</b></a></td>
      <td>Image</td>
      <td>
        <a href="./models/seedream-5.0-pro/text-to-image.py"><code>text-to-image</code></a> ·
        <a href="./models/seedream-5.0-pro/image-to-image.py"><code>image-to-image</code></a>
      </td>
      <td>ByteDance</td>
    </tr>
    <tr>
      <td><a href="./models/seedream-5.0-flash"><b>Seedream 5.0 Flash</b></a></td>
      <td>Image</td>
      <td>
        <a href="./models/seedream-5.0-flash/text-to-image.py"><code>text-to-image</code></a> ·
        <a href="./models/seedream-5.0-flash/image-to-image.py"><code>image-to-image</code></a>
      </td>
      <td>ByteDance</td>
    </tr>
    <tr>
      <td><a href="./models/grok-imagine"><b>Grok Imagine</b></a></td>
      <td>Image</td>
      <td>
        <a href="./models/grok-imagine/text-to-image.py"><code>text-to-image</code></a> ·
        <a href="./models/grok-imagine/image-to-image.py"><code>image-to-image</code></a>
      </td>
      <td>xAI</td>
    </tr>
    <tr>
      <td><a href="./models/gpt-image-2.5"><b>GPT Image 2.5</b></a></td>
      <td>Image</td>
      <td>
        <a href="./models/gpt-image-2.5/text-to-image.py"><code>text-to-image</code></a> ·
        <a href="./models/gpt-image-2.5/image-to-image.py"><code>image-to-image</code></a>
      </td>
      <td>[OI]</td>
    </tr>
    <tr>
      <td><a href="./models/gpt-image-2.6"><b>GPT Image 2.6</b></a></td>
      <td>Image</td>
      <td>
        <a href="./models/gpt-image-2.6/text-to-image.py"><code>text-to-image</code></a> ·
        <a href="./models/gpt-image-2.6/image-to-image.py"><code>image-to-image</code></a>
      </td>
      <td>[OI]</td>
    </tr>
    <tr>
      <td><a href="./models/gpt-image-2"><b>GPT Image 2</b></a></td>
      <td>Image</td>
      <td>
        <a href="./models/gpt-image-2/text-to-image.py"><code>text-to-image</code></a> ·
        <a href="./models/gpt-image-2/image-to-image.py"><code>image-to-image</code></a>
      </td>
      <td>[OI]</td>
    </tr>
    <tr>
      <td><a href="./models/minimax-h3"><b>MiniMax H3</b></a></td>
      <td>Video</td>
      <td>
        <a href="./models/minimax-h3/text-to-video.py"><code>text-to-video</code></a> ·
        <a href="./models/minimax-h3/image-to-video.py"><code>image-to-video</code></a> ·
        <a href="./models/minimax-h3/first-last-frame-to-video.py"><code>first-last-frame-to-video</code></a> ·
        <a href="./models/minimax-h3/reference-to-video.py"><code>reference-to-video</code></a> ·
        <a href="./models/minimax-h3/omni-reference-to-video.py"><code>omni-reference-to-video</code></a>
      </td>
      <td>MiniMax</td>
    </tr>
    <tr>
      <td><a href="./models/gemini-omni-1.2-flash"><b>Gemini Omni 1.2 Flash</b></a></td>
      <td>Video</td>
      <td>
        <a href="./models/gemini-omni-1.2-flash/text-to-video.py"><code>text-to-video</code></a> ·
        <a href="./models/gemini-omni-1.2-flash/reference-to-video.py"><code>reference-to-video</code></a>
      </td>
      <td>Google</td>
    </tr>
    <tr>
      <td><a href="./models/google-veo3.1"><b>Google Veo 3.1</b></a></td>
      <td>Video</td>
      <td>
        <a href="./models/google-veo3.1/text-to-video.py"><code>text-to-video</code></a>
      </td>
      <td>Google</td>
    </tr>
    <tr>
      <td><a href="./models/google-veo3.1-pro"><b>Google Veo 3.1 Pro</b></a></td>
      <td>Video</td>
      <td>
        <a href="./models/google-veo3.1-pro/text-to-video.py"><code>text-to-video</code></a>
      </td>
      <td>Google</td>
    </tr>
    <tr>
      <td><a href="./models/seedance-2-0"><b>Seedance 2.0</b></a></td>
      <td>Video</td>
      <td>
        <a href="./models/seedance-2-0/text-to-video.py"><code>text-to-video</code></a> ·
        <a href="./models/seedance-2-0/image-to-video.py"><code>image-to-video</code></a> ·
        <a href="./models/seedance-2-0/first-last-frame-to-video.py"><code>first-last-frame-to-video</code></a> ·
        <a href="./models/seedance-2-0/reference-to-video.py"><code>reference-to-video</code></a> ·
        <a href="./models/seedance-2-0/omni-reference-to-video.py"><code>omni-reference-to-video</code></a> ·
        <a href="./models/seedance-2-0/video-to-video.py"><code>video-to-video</code></a>
      </td>
      <td>ByteDance</td>
    </tr>
    <tr>
      <td><a href="./models/seedance-2-0-fast"><b>Seedance 2.0 Fast</b></a></td>
      <td>Video</td>
      <td>
        <a href="./models/seedance-2-0-fast/text-to-video.py"><code>text-to-video</code></a> ·
        <a href="./models/seedance-2-0-fast/image-to-video.py"><code>image-to-video</code></a> ·
        <a href="./models/seedance-2-0-fast/first-last-frame-to-video.py"><code>first-last-frame-to-video</code></a> ·
        <a href="./models/seedance-2-0-fast/reference-to-video.py"><code>reference-to-video</code></a> ·
        <a href="./models/seedance-2-0-fast/omni-reference-to-video.py"><code>omni-reference-to-video</code></a> ·
        <a href="./models/seedance-2-0-fast/video-to-video.py"><code>video-to-video</code></a>
      </td>
      <td>ByteDance</td>
    </tr>
    <tr>
      <td><a href="./models/seedance-2-mini"><b>Seedance 2.0 Mini</b></a></td>
      <td>Video</td>
      <td>
        <a href="./models/seedance-2-mini/text-to-video.py"><code>text-to-video</code></a> ·
        <a href="./models/seedance-2-mini/image-to-video.py"><code>image-to-video</code></a> ·
        <a href="./models/seedance-2-mini/first-last-frame-to-video.py"><code>first-last-frame-to-video</code></a> ·
        <a href="./models/seedance-2-mini/reference-to-video.py"><code>reference-to-video</code></a> ·
        <a href="./models/seedance-2-mini/omni-reference-to-video.py"><code>omni-reference-to-video</code></a>
      </td>
      <td>ByteDance</td>
    </tr>
    <tr>
      <td><a href="./models/seedance2-5"><b>Seedance 2.5</b></a></td>
      <td>Video</td>
      <td>
        <a href="./models/seedance2-5/text-to-video.py"><code>text-to-video</code></a> ·
        <a href="./models/seedance2-5/image-to-video.py"><code>image-to-video</code></a> ·
        <a href="./models/seedance2-5/first-last-frame-to-video.py"><code>first-last-frame-to-video</code></a> ·
        <a href="./models/seedance2-5/reference-to-video.py"><code>reference-to-video</code></a> ·
        <a href="./models/seedance2-5/omni-reference-to-video.py"><code>omni-reference-to-video</code></a> ·
        <a href="./models/seedance2-5/video-to-video.py"><code>video-to-video</code></a>
      </td>
      <td>ByteDance</td>
    </tr>
    <tr>
      <td><a href="./models/seedance-2-5-flash"><b>Seedance 2.5 Flash</b></a></td>
      <td>Video</td>
      <td>
        <a href="./models/seedance-2-5-flash/text-to-video.py"><code>text-to-video</code></a> ·
        <a href="./models/seedance-2-5-flash/image-to-video.py"><code>image-to-video</code></a> ·
        <a href="./models/seedance-2-5-flash/first-last-frame-to-video.py"><code>first-last-frame-to-video</code></a> ·
        <a href="./models/seedance-2-5-flash/reference-to-video.py"><code>reference-to-video</code></a> ·
        <a href="./models/seedance-2-5-flash/omni-reference-to-video.py"><code>omni-reference-to-video</code></a>
      </td>
      <td>ByteDance</td>
    </tr>
    <tr>
      <td><a href="./models/official-kling-v3-0"><b>Kling v3.0</b></a></td>
      <td>Video</td>
      <td>
        <a href="./models/official-kling-v3-0/text-to-video.py"><code>text-to-video</code></a> ·
        <a href="./models/official-kling-v3-0/image-to-video.py"><code>image-to-video</code></a>
      </td>
      <td>Kling AI</td>
    </tr>
    <tr>
      <td><a href="./models/official-kling-v3-0-pro"><b>Kling v3.0 Pro</b></a></td>
      <td>Video</td>
      <td>
        <a href="./models/official-kling-v3-0-pro/text-to-video.py"><code>text-to-video</code></a> ·
        <a href="./models/official-kling-v3-0-pro/image-to-video.py"><code>image-to-video</code></a>
      </td>
      <td>Kling AI</td>
    </tr>
    <tr>
      <td><a href="./models/official-kling-v3-turbo"><b>Kling v3 Turbo</b></a></td>
      <td>Video</td>
      <td>
        <a href="./models/official-kling-v3-turbo/text-to-video.py"><code>text-to-video</code></a> ·
        <a href="./models/official-kling-v3-turbo/image-to-video.py"><code>image-to-video</code></a>
      </td>
      <td>Kling AI</td>
    </tr>
    <tr>
      <td><a href="./models/official-kling-v3-omni"><b>Kling 3.0 Omni</b></a></td>
      <td>Video</td>
      <td>
        <a href="./models/official-kling-v3-omni/text-to-video.py"><code>text-to-video</code></a> ·
        <a href="./models/official-kling-v3-omni/image-to-video.py"><code>image-to-video</code></a> ·
        <a href="./models/official-kling-v3-omni/first-last-frame-to-video.py"><code>first-last-frame-to-video</code></a> ·
        <a href="./models/official-kling-v3-omni/reference-to-video.py"><code>reference-to-video</code></a> ·
        <a href="./models/official-kling-v3-omni/omni-reference-to-video.py"><code>omni-reference-to-video</code></a> ·
        <a href="./models/official-kling-v3-omni/video-to-video.py"><code>video-to-video</code></a>
      </td>
      <td>Kling AI</td>
    </tr>
    <tr>
      <td><a href="./models/official-kling-v3-motion-control"><b>Kling 3.0 Motion Control</b></a></td>
      <td>Video</td>
      <td>
        <a href="./models/official-kling-v3-motion-control/motion-control.py"><code>motion-control</code></a>
      </td>
      <td>Kling AI</td>
    </tr>
    <tr>
      <td><a href="./models/wan-3-0"><b>Wan 3.0</b></a></td>
      <td>Video</td>
      <td>
        <a href="./models/wan-3-0/text-to-video.py"><code>text-to-video</code></a> ·
        <a href="./models/wan-3-0/image-to-video.py"><code>image-to-video</code></a> ·
        <a href="./models/wan-3-0/first-last-frame-to-video.py"><code>first-last-frame-to-video</code></a> ·
        <a href="./models/wan-3-0/reference-to-video.py"><code>reference-to-video</code></a> ·
        <a href="./models/wan-3-0/omni-reference-to-video.py"><code>omni-reference-to-video</code></a> ·
        <a href="./models/wan-3-0/video-to-video.py"><code>video-to-video</code></a>
      </td>
      <td>Alibaba</td>
    </tr>
    <tr>
      <td><a href="./models/wan-3-0-pro"><b>Wan 3.0 Prime</b></a></td>
      <td>Video</td>
      <td>
        <a href="./models/wan-3-0-pro/text-to-video.py"><code>text-to-video</code></a> ·
        <a href="./models/wan-3-0-pro/image-to-video.py"><code>image-to-video</code></a> ·
        <a href="./models/wan-3-0-pro/first-last-frame-to-video.py"><code>first-last-frame-to-video</code></a> ·
        <a href="./models/wan-3-0-pro/reference-to-video.py"><code>reference-to-video</code></a> ·
        <a href="./models/wan-3-0-pro/omni-reference-to-video.py"><code>omni-reference-to-video</code></a> ·
        <a href="./models/wan-3-0-pro/video-to-video.py"><code>video-to-video</code></a>
      </td>
      <td>Alibaba</td>
    </tr>
  </tbody>
</table>

Every example links to its Python script; the `.ts` and `.sh` versions sit next to it in the same folder. Browse the full catalog, per-model parameters and current USD prices at **[i2v.ai/docs/models](https://i2v.ai/docs/models)**.

<br>

## How the API works

All image and video models share two endpoints. Send `Authorization: Bearer $I2V_API_KEY` on every request.

The API origin is `https://api.i2v.ai` and task endpoints live under `/api/v1`. Set `I2V_BASE_URL` only if you are pointing at another environment.

### 1. Submit a task

`POST https://api.i2v.ai/api/v1/jobs/createTask`

```bash
curl -X POST https://api.i2v.ai/api/v1/jobs/createTask \
  -H "Authorization: Bearer $I2V_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "model": "gpt-image-2",
    "inputs": { "prompt": "a red bicycle on a cobblestone street" }
  }'
```

Response `200 OK` — returned immediately. The quote is reserved at this point.

```json
{
  "taskId": "YOUR_TASK_ID"
}
```

`inputs` is model-specific; each model folder documents its fields. Two optional top-level fields are available on every model:

- `maxCostUsd` — a USD ceiling such as `"0.50000000"`. A quote above it returns HTTP `409` before generation.
- `callBackUrl` — receive a signed webhook instead of polling.

`Idempotency-Key` is optional but recommended. Reusing the same key with the same body replays the existing task; the same key with a different body is rejected with HTTP `409`. Without a key, never retry a submission whose response you did not receive — you cannot tell whether it created a task.

### 2. Poll for the result

`GET https://api.i2v.ai/api/v1/jobs/recordInfo?taskId=…`

```bash
curl "https://api.i2v.ai/api/v1/jobs/recordInfo?taskId=YOUR_TASK_ID" \
  -H "Authorization: Bearer $I2V_API_KEY"
```

Repeat every few seconds while `status` is `waiting` or `generating`. Stop on `success` or `fail`.

```json
{
  "taskId": "YOUR_TASK_ID",
  "model": "gpt-image-2",
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
| `waiting` | Accepted and queued; not sent upstream yet |
| `generating` | Upstream call in flight |
| `success` | Done — read `output[].url` |
| `fail` | Failed — `error.code` and `error.message` explain why; the reservation is released |

| Field | Type | Description |
|:--|:--|:--|
| `taskId` | `string` | The id you submitted. |
| `model` | `string` | The public model id you sent. |
| `status` | `string` | `waiting` · `generating` · `success` · `fail`. |
| `billing` | `object \| null` | USD billing: `currency`, `status` (`reserved` · `captured` · `released`), `charged.amount` as an eight-decimal string, plus funding detail. |
| `output` | `object[] \| null` | `null` until `success`. Each item has `url`, and `width` / `height` when the backend reports them. |
| `error` | `object \| null` | `null` unless `fail`; then `{ code, message }`. |
| `createTime` | `number` | Unix ms when the task was accepted. |
| `completeTime` | `number \| null` | Unix ms when it reached `success` / `fail`. |

Video models return the same shape; `output[].url` points at an `.mp4`.

### 3. Webhook instead of polling (optional)

Add a top-level `callBackUrl` to `createTask` and the API `POST`s when the task reaches `success` or `fail`. The body carries the same task fields `recordInfo` returns, plus an event envelope:

```json
{
  "eventId": "evt_YOUR_TASK_ID_completion",
  "event": "task.completed",
  "code": 200,
  "message": "success",
  "data": {
    "taskId": "YOUR_TASK_ID",
    "model": "gpt-image-2",
    "status": "success",
    "billing": { "currency": "USD", "status": "captured", "charged": { "currency": "USD", "amount": "0.07200000" } },
    "output": [{ "url": "https://file.example.com/generated/YOUR_TASK_ID/display.png" }],
    "error": null,
    "createTime": 1763520000000,
    "completeTime": 1763520060000
  }
}
```

Delivery is signed. Compute a hexadecimal HMAC-SHA256 over `X-I2V-Timestamp + "." + rawBody` with the signing secret from [developer settings](https://i2v.ai/settings/developer) and compare it to `X-I2V-Signature`. `X-I2V-Event-ID` is stable for deduplication. Destinations must be public HTTPS on port 443; private addresses and redirects are rejected. Return any `2xx` — callbacks get up to eight delivery attempts, but keep `recordInfo` as the source of truth. Full reference: [i2v.ai/docs/webhooks](https://i2v.ai/docs/webhooks).

### Reference media

Models that take reference images, video or audio accept **publicly reachable URLs**: your CDN, object storage, or any public site the generation backend can fetch. Localhost, private networks and URLs that need a login do not work.

The REST API has no upload endpoint, so host the file yourself and pass its URL in `imageUrls`, `urls`, `referenceImageUrls`, `referenceVideoUrls`, `referenceAudioUrls` or `videoUrl`. The examples in this repo use assets served from `https://i2v.ai`, so they run as-is — replace them with your own URLs for real work.

Two input shapes are easy to confuse:

- `urls` is the keyframe field. One entry is the first frame, two entries are the first and last frame.
- `referenceImageUrls` guides the clip without pinning a frame. Sending `imageUrls` on a video model without `mode: "keyframe"` is treated as reference images, not as a first frame.

### Errors and rate limits

Failures return an HTTP error status with a string `code` and a `message`:

| HTTP | Code | Retry? |
|:--|:--|:--|
| `400` | `invalid_params` | No — fix the request against the model's inputs |
| `401` | `unauthorized` | No — check or replace the API key |
| `402` | `insufficient_balance` | No — check the account balance |
| `403` | `access_denied` | No — check access and model entitlements |
| `404` | `not_found` | No — check the task id and ownership |
| `409` | `conflict` | No — idempotency payload mismatch or `maxCostUsd` below the quote |
| `429` | `rate_limit` / `concurrency_limit` | Yes — wait for `Retry-After` |
| `500` | `internal_error` | Yes — with the same idempotency key |
| `503` | `service_unavailable` | Yes — after backoff |

Every account gets 100 requests per minute and 10 concurrent tasks by default; polling counts toward the request limit. Start at 2–5 seconds between polls, back off to at most 30–60 seconds, and keep a client-side deadline. See [errors and retries](https://i2v.ai/docs/errors) and [rate limits](https://i2v.ai/docs/rate-limits).

Read the current balance with `GET https://api.i2v.ai/api/v1/account`; list published models with `GET https://api.i2v.ai/api/v1/generation-models`.

<br>

## Repository layout

```
models/
└── <model-id>/
    ├── README.md          model summary, request & response shape, limits
    ├── <use-case>.py      Python 3.8+ · standard library only
    ├── <use-case>.ts      Node.js 18+ · native fetch · no dependencies
    └── <use-case>.sh      curl only · no jq
```

Use-case names are shared across models so you always know what to look for: `text-to-image`, `image-to-image`, `text-to-video`, `image-to-video`, `first-last-frame-to-video`, `reference-to-video`, `omni-reference-to-video`, `video-to-video`, `motion-control`.

Folder names are the public model ids you send in `model`. A model only ships the use cases it supports.

<br>

## Links

| | |
|---|---|
| Docs | <https://i2v.ai/docs> |
| API reference | <https://i2v.ai/docs/api> |
| Model catalog & prices | <https://i2v.ai/docs/models> |
| API keys | <https://i2v.ai/me?section=api-keys> |
| Webhook signing | <https://i2v.ai/settings/developer> |
| Studio | <https://i2v.ai/app/generate> |
| Status | <https://i2v.ai/status> |

<br>

## Contributing

Found a broken example or want a use case covered? [Open an issue](https://github.com/i2v-ai/i2v-api-examples/issues). Scripts are maintained by the i2v team and kept in sync with the live API.

## License

[MIT](./LICENSE)
