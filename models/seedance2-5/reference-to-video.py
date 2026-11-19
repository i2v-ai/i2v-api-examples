#!/usr/bin/env python3
# reference-to-video.py — Reference to video with Seedance 2.5 on the i2v API.
#
# Usage:
#   Put I2V_API_KEY in a .env file (repo root or this folder), or:
#   export I2V_API_KEY=your-api-key     # https://i2v.ai/me?section=api-keys
#   python3 reference-to-video.py
#
# No third-party dependencies. Python 3.8+.

import json
import os
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
# `referenceImageUrls` guides the clip without fixing a frame; up to the limit listed in the README.
INPUTS = {
    "prompt": "Use the reference images for the character and the setting, then animate a slow orbit around the subject in soft studio light.",
    "referenceImageUrls": [
        "https://i2v.ai/images/market/seedream-5-0.jpg",
        "https://i2v.ai/images/market/wan-3-0.jpg",
    ],
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


def api(method, path, body=None, idempotency_key=None):
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        f"{API_BASE}{path}", data=data, headers=HEADERS, method=method
    )
    if idempotency_key:
        request.add_header("Idempotency-Key", idempotency_key)
    try:
        with urllib.request.urlopen(request) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read().decode()
        sys.exit(f"HTTP {error.code} {path}: {detail}")


# 1. Submit the task. The same Idempotency-Key plus the same body replays one task.
task = api(
    "POST",
    "/jobs/createTask",
    {"model": MODEL, "inputs": INPUTS},
    idempotency_key=str(uuid.uuid4()),
)
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
    filename = f"reference-to-video-{index}{extension}" if len(output) > 1 else f"reference-to-video{extension}"
    request = urllib.request.Request(url, headers={"User-Agent": "i2v-api-examples/1.0"})
    with urllib.request.urlopen(request) as response:
        with open(filename, "wb") as handle:
            handle.write(response.read())
    print(f"Saved {filename}  {item.get('width')}x{item.get('height')}  {url}")
