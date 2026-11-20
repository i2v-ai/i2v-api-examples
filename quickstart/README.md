# Quote and recover a media task

Use Node.js 22, Bash with curl, or Python 3.8+. Set `I2V_API_KEY` in your environment. The catalog command works without credentials.

```bash
node quickstart/media.mjs catalog
bash quickstart/quote.sh
node quickstart/media.mjs quote image
node quickstart/media.mjs quote video
```

The quote sends the model and its actual inputs. It creates no task and reserves no balance.

## Use a local reference image

Pass a PNG, JPEG, or WebP file you are allowed to upload. The command requests a signed ticket, uploads to storage, and confirms the asset with the REST API. It outputs the confirmed reference URL and asset ID.

```bash
node quickstart/media.mjs upload ./product.png
export I2V_REFERENCE_IMAGE_URL='PASTE_THE_CONFIRMED_URL'
node quickstart/media.mjs quote video
```

Use the same `I2V_REFERENCE_IMAGE_URL` for the quote and submission. If you already have a reference image on a publicly reachable URL, set it directly and proceed to the quote. See the [asset upload contract](https://i2v.ai/docs/media-workflow) for ticket expiry and verification errors.

## Submit and recover

To authorize a submission, replace the placeholder with your approved USD amount and use a new receipt path in a private directory. This example always obtains a fresh quote and checks it against that cap.

```bash
mkdir -p .receipts
chmod 700 .receipts
I2V_MAX_COST_USD=YOUR_APPROVED_USD_LIMIT node quickstart/media.mjs submit image .receipts/image.json
```

Pass `video` to submit the video example. Each logical job gets one operation key. This script saves the exact request before submitting and refuses to overwrite an existing receipt. Keep these local files out of Git and logs. If the response is lost, run:

```bash
node quickstart/media.mjs receipt .receipts/image.json
node quickstart/media.mjs status YOUR_TASK_ID
python3 quickstart/status.py YOUR_TASK_ID
```

Wait and check the same receipt when it is pending. Use `node quickstart/media.mjs replay .receipts/image.json` only to retry the same request when the API marks it retryable. When the task succeeds, read `output[].url`. Run the [Next.js starter](../starters/nextjs/) for an application with persistent job ownership and a signed webhook handler.
