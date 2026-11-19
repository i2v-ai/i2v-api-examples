<h1 align="center">Google Veo 3.1 Pro</h1>

<p align="center">
  Google Veo 3.1 Pro on the i2v API. The quality tier of Veo 3.1: text-to-video with native audio,<br>
  8 seconds, 16:9 or 9:16 at up to 4K.
</p>

<p align="center">
  <img alt="Model id" src="https://img.shields.io/badge/model-google--veo3.1--pro-6366f1?style=flat-square">
  <img alt="Type" src="https://img.shields.io/badge/type-video-0ea5e9?style=flat-square">
  <img alt="Provider" src="https://img.shields.io/badge/provider-Google-22c55e?style=flat-square">
  <a href="https://i2v.ai/models/google-veo3-1-pro"><img alt="Model page" src="https://img.shields.io/badge/i2v.ai-model%20page-111827?style=flat-square"></a>
</p>

> Try it in the [studio](https://i2v.ai/app/generate) · Full reference at [i2v.ai/docs/models/google-veo3-1-pro](https://i2v.ai/docs/models/google-veo3-1-pro) · Get an [API key](https://i2v.ai/me?section=api-keys)

<br>

## Run an example

```bash
# Put I2V_API_KEY in ../../.env, or:
export I2V_API_KEY=your-api-key   # https://i2v.ai/me?section=api-keys

python3 text-to-video.py               # Python 3.8+, stdlib only
npx tsx text-to-video.ts               # Node.js 18+, no dependencies
bash text-to-video.sh                  # curl only
```

Each script submits a task, polls until it finishes, and saves the clip next to the script. Edit the `INPUTS` block at the top to change the prompt or options.

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
      <td><b>Text to video</b></td>
      <td>Generate a clip from a prompt</td>
      <td><a href="./text-to-video.py"><code>.py</code></a></td>
      <td><a href="./text-to-video.ts"><code>.ts</code></a></td>
      <td><a href="./text-to-video.sh"><code>.sh</code></a></td>
    </tr>
  </tbody>
</table>

<br>

## Request

`POST https://api.i2v.ai/api/v1/jobs/createTask`

```json
{
  "model": "google-veo3.1-pro",
  "inputs": {
    "prompt": "A whale breaching in a calm sea at dawn, wide shot, mist in the air, cinematic.",
    "duration": 8,
    "resolution": "720p",
    "aspectRatio": "16:9",
    "generateAudio": true
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
| `model` | `string` | **required** | Must be `"google-veo3.1-pro"`. |
| `inputs.prompt` | `string` | **required** | The shot description. |
| `inputs.duration` | `number` | `8` | 8 seconds. |
| `inputs.resolution` | `string` | `720p` | `720p` · `1080p` · `4k` |
| `inputs.aspectRatio` | `string` | `16:9` | `16:9` · `9:16` |
| `inputs.generateAudio` | `boolean` | `true` | Generate a soundtrack with the clip. |
| `maxCostUsd` | `string` | – | Optional USD ceiling such as `"0.50000000"`; a higher quote returns HTTP `409` before generation. |
| `callBackUrl` | `string` | – | Optional webhook. Requires a signing secret in [developer settings](https://i2v.ai/settings/developer). |

**Modes:** Text

<br>

## Result

`GET https://api.i2v.ai/api/v1/jobs/recordInfo?taskId=YOUR_TASK_ID`

Poll every few seconds until `status` is `success` or `fail`. A video task usually takes one to five minutes.

```json
{
  "taskId": "YOUR_TASK_ID",
  "model": "google-veo3.1-pro",
  "status": "success",
  "billing": {
    "currency": "USD",
    "status": "captured",
    "charged": { "currency": "USD", "amount": "0.07200000" }
  },
  "output": [
    {
      "url": "https://file.example.com/generated/YOUR_TASK_ID/display.mp4",
      "width": 1280,
      "height": 720
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

- **Duration:** 8 seconds · **Resolution:** 720p, 1080p, 4k · **Aspect ratio:** 16:9, 9:16


No reference media to prepare: send `model` and `inputs.prompt` only.

<br>

## Pricing

Billing is in USD. The exact quote is reserved when the task is created and reported in `billing`; a failed task releases the reservation. Current per-second prices: [i2v.ai/models/google-veo3-1-pro](https://i2v.ai/models/google-veo3-1-pro).

<br>

<p align="center">
  <a href="../../README.md">← All models</a> &nbsp;·&nbsp;
  <a href="https://i2v.ai/models/google-veo3-1-pro">Model page</a> &nbsp;·&nbsp;
  <a href="https://i2v.ai/docs/models/google-veo3-1-pro">API reference</a>
</p>
