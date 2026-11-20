"""Read the status of an existing task using Python's standard library."""

import json
import os
import sys
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 quickstart/status.py TASK_ID")
    base = os.environ.get("I2V_BASE_URL", "https://api.i2v.ai").rstrip("/")
    query = urlencode({"taskId": sys.argv[1]})
    request = Request(
        base + "/api/v1/jobs/recordInfo?" + query,
        headers={"Authorization": "Bearer " + os.environ["I2V_API_KEY"]},
    )
    try:
        with build_opener(NoRedirect()).open(request, timeout=20) as response:
            print(json.dumps(json.load(response), indent=2))
    except HTTPError as error:
        raise SystemExit(
            f"i2v.ai returned HTTP {error.code}. Request ID: {error.headers.get('X-Request-ID')}"
        ) from None


if __name__ == "__main__":
    main()
