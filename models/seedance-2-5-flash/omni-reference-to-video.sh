#!/usr/bin/env bash
# omni-reference-to-video.sh — Multimodal reference with Seedance 2.5 Flash on the i2v API.
#
# Usage:
#   Put I2V_API_KEY in a .env file (repo root or this folder), or:
#   export I2V_API_KEY=your-api-key     # https://i2v.ai/me?section=api-keys
#   bash omni-reference-to-video.sh
#
# Requires only curl. No jq needed.
set -euo pipefail

# Load .env from this script's directory or any parent. Does not override existing vars.
_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
while true; do
  if [[ -f "$_dir/.env" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      line="${line%$'\r'}"
      [[ -z "$line" || "$line" == \#* || "$line" != *=* ]] && continue
      key="${line%%=*}"
      value="${line#*=}"
      key="${key#"${key%%[![:space:]]*}"}"; key="${key%"${key##*[![:space:]]}"}"
      value="${value#"${value%%[![:space:]]*}"}"; value="${value%"${value##*[![:space:]]}"}"
      value="${value#\"}"; value="${value%\"}"
      value="${value#\'}"; value="${value%\'}"
      if [[ -n "$key" && -z "${!key:-}" ]]; then
        export "$key=$value"
      fi
    done < "$_dir/.env"
    break
  fi
  _parent="$(dirname "$_dir")"
  [[ "$_parent" == "$_dir" ]] && break
  _dir="$_parent"
done
unset _dir

MODEL="seedance-2-5-flash"
read -r -d '' INPUTS <<'JSON' || true
{
  "prompt": "Follow the reference video's camera move, keep the subject from the reference image, and match the pacing to the reference clip.",
  "referenceImageUrls": [
    "https://i2v.ai/images/market/seedream-5-0.jpg"
  ],
  "referenceVideoUrls": [
    "https://i2v.ai/videos/model-pages/veo-3-1/single-shot.mp4"
  ],
  "duration": 5,
  "resolution": "720p"
}
JSON

# ---- you normally don't need to edit below this line ----

API_BASE="${I2V_BASE_URL:-https://api.i2v.ai}"
API_BASE="${API_BASE%/}"
[[ "$API_BASE" == */api/v1 ]] || API_BASE="$API_BASE/api/v1"

: "${I2V_API_KEY:?Set I2V_API_KEY first: export I2V_API_KEY=your-api-key}"
AUTH=(-H "Authorization: Bearer $I2V_API_KEY")
IDEMPOTENCY_KEY="${I2V_IDEMPOTENCY_KEY:-$(uuidgen 2>/dev/null || echo "i2v-$(date +%s)-$RANDOM")}"

# 1. Submit the task
RESPONSE=$(curl -sS -X POST "$API_BASE/jobs/createTask" \
  "${AUTH[@]}" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{\"model\":\"$MODEL\",\"inputs\":$INPUTS}")
TASK_ID=$(printf '%s' "$RESPONSE" | grep -o '"taskId":"[^"]*"' | cut -d'"' -f4 || true)
if [[ -z "$TASK_ID" ]]; then
  echo "createTask failed: $RESPONSE" >&2
  exit 1
fi
echo "Task created: $TASK_ID"

# 2. Poll until it reaches a terminal state (success | fail)
DEADLINE=$(( $(date +%s) + 1800 ))
while true; do
  RESULT=$(curl -sS "$API_BASE/jobs/recordInfo?taskId=$TASK_ID" "${AUTH[@]}")
  STATUS=$(printf '%s' "$RESULT" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  case "$STATUS" in
    success) break ;;
    fail) echo "Task failed: $RESULT" >&2; exit 1 ;;
  esac
  if [[ $(date +%s) -gt $DEADLINE ]]; then
    echo "Timed out while ${STATUS:-unknown}. Task id: $TASK_ID" >&2
    exit 1
  fi
  echo "Status: ${STATUS:-unknown} — waiting..."
  sleep 3
done

# 3. Download the result
BILLING=$(printf '%s' "$RESULT" | sed 's/.*"billing"://')
BILLING_STATUS=$(printf '%s' "$BILLING" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
AMOUNT=$(printf '%s' "$BILLING" | grep -o '"amount":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Done. Billing: ${BILLING_STATUS:-unknown} ${AMOUNT:--} USD"
URL=$(printf '%s' "$RESULT" | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
EXT="${URL##*.}"; EXT="${EXT%%\?*}"
OUT="omni-reference-to-video.${EXT:-mp4}"
curl -sS -o "$OUT" "$URL"
echo "Saved $OUT  $URL"
