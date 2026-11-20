#!/usr/bin/env bash
set -euo pipefail
base="${I2V_BASE_URL:-https://api.i2v.ai}"
key="${I2V_API_KEY:?Set an i2v.ai API key in the environment}"
payload='{"model":"gpt-image-2","inputs":{"prompt":"A ceramic mug on an oak table"}}'
curl --fail-with-body --max-time 20 "$base/api/v1/jobs/quote" \
  -H "Authorization: Bearer $key" \
  -H 'Content-Type: application/json' \
  --data "$payload"
