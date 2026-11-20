#!/usr/bin/env python3
# video-to-video.py — Video to video with Seedance 2.5 on the i2v API.
#
# Usage:
#   Put I2V_API_KEY in a .env file (repo root or this folder), or:
#   export I2V_API_KEY=your-api-key     # https://i2v.ai/me?section=api-keys
#   python3 video-to-video.py
#
# No third-party dependencies. Python 3.8+.

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid


def load_dotenv():
    folder = os.path.dirname(os.path.abspath(__file__))
    while True:
        path = os.path.join(folder, ".env")
        if os.path.isfile(path):
            with open(path, encoding="utf-8-sig") as handle:
                for raw in handle:
                    line = raw.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, _, value = line.partition("=")
                    key, value = key.strip(), value.strip().strip("'").strip('"')
                    if key and key not in os.environ:
                        os.environ[key] = value
            return
        parent = os.path.dirname(folder)
        if parent == folder:
            return
        folder = parent


load_dotenv()

MODEL = "seedance2-5"
# `videoUrl` is the source clip; it must be publicly reachable and 2 to 15 seconds for Seedance.
INPUTS = {
    "prompt": "Keep the source clip's framing and timing, then restyle it as a warm 16mm film look with fine grain.",
    "videoUrl": "https://i2v.ai/videos/model-pages/veo-3-1/single-shot.mp4",
    "duration": 5,
    "resolution": "720p",
}

# ---- you normally don't need to edit below this line ----

API_BASE = (os.environ.get("I2V_BASE_URL") or "https://api.i2v.ai").rstrip("/")
if not API_BASE.endswith("/api/v1"):
    API_BASE += "/api/v1"

API_KEY = os.environ.get("I2V_API_KEY")
if not API_KEY:
    sys.exit("Set I2V_API_KEY first: export I2V_API_KEY=your-api-key")

POLL_INTERVAL_SECONDS = 3
POLL_TIMEOUT_SECONDS = 30 * 60

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "User-Agent": "i2v-api-examples/1.0",
}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def api(method, path, body=None, idempotency_key=None):
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        f"{API_BASE}{path}", data=data, headers=HEADERS, method=method
    )
    if idempotency_key:
        request.add_header("Idempotency-Key", idempotency_key)
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=20) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        sys.exit(f"HTTP {error.code}. Request ID: {error.headers.get('X-Request-ID')}")


spec = {"model": MODEL, "inputs": INPUTS}
quote = api("POST", "/jobs/quote", spec)
print(f"Maximum reservation: {quote['maximum']['amount']} USD")
cap = os.environ.get("I2V_MAX_COST_USD")
if not cap:
    sys.exit(0)
if not re.fullmatch(r"(0|[1-9][0-9]*)(\.[0-9]{1,8})?", cap):
    sys.exit("Set I2V_MAX_COST_USD to the decimal amount you approve.")
revision = quote.get("expectedRevision")
if type(revision) is not int or revision < 0:
    sys.exit("The quote is missing a valid model revision.")
receipt_path = os.environ.get("I2V_RECEIPT_PATH")
if not receipt_path:
    sys.exit("Set I2V_RECEIPT_PATH to a new file in a private directory.")
idempotency_key = os.environ.get("I2V_IDEMPOTENCY_KEY") or str(uuid.uuid4())
payload = {**spec, "maxCostUsd": cap, "expectedRevision": revision}
with os.fdopen(os.open(receipt_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600), "w") as receipt:
    json.dump({"submission": json.dumps(payload), "idempotencyKey": idempotency_key}, receipt)
task = api("POST", "/jobs/createTask", payload, idempotency_key=idempotency_key)
task_id = task["taskId"]
print(f"Task created: {task_id}")

# 2. Poll until it reaches a terminal state (success | fail)
deadline = time.time() + POLL_TIMEOUT_SECONDS
while True:
    info = api("GET", f"/jobs/recordInfo?taskId={urllib.parse.quote(task_id)}")
    status = info.get("status")
    if status == "success":
        break
    if status == "fail":
        sys.exit(f"Task failed: {json.dumps(info.get('error'))}")
    if time.time() > deadline:
        sys.exit(f"Timed out while {status}. Task id: {task_id}")
    print(f"Status: {status} — waiting...")
    time.sleep(POLL_INTERVAL_SECONDS)

# 3. Download the result
billing = info.get("billing") or {}
charged = (billing.get("charged") or {}).get("amount")
print(f"Done. Billing: {billing.get('status')} {charged} {billing.get('currency')}")
output = info.get("output") or []
for index, item in enumerate(output):
    url = item["url"]
    extension = os.path.splitext(url.split("?")[0])[1] or ".mp4"
    filename = f"video-to-video-{index}{extension}" if len(output) > 1 else f"video-to-video{extension}"
    request = urllib.request.Request(url, headers={"User-Agent": "i2v-api-examples/1.0"})
    with urllib.request.urlopen(request) as response:
        with open(filename, "wb") as handle:
            handle.write(response.read())
    print(f"Saved {filename}  {item.get('width')}x{item.get('height')}")
