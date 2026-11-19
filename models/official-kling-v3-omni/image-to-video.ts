// image-to-video.ts — Image to video with Kling 3.0 Omni on the i2v API.
//
// Usage:
//   Put I2V_API_KEY in a .env file (repo root or this folder), or:
//   export I2V_API_KEY=your-api-key     # https://i2v.ai/me?section=api-keys
//   npx tsx image-to-video.ts            # or: node --experimental-strip-types image-to-video.ts (Node.js 22.6+)
//
// No third-party dependencies. Node.js 18+.

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function loadDotenv() {
  let folder = dirname(fileURLToPath(import.meta.url));
  while (true) {
    const path = join(folder, ".env");
    if (existsSync(path)) {
      for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith("#") || !line.includes("=")) continue;
        const eq = line.indexOf("=");
        const key = line.slice(0, eq).trim();
        const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
        if (key && process.env[key] === undefined) process.env[key] = value;
      }
      return;
    }
    const parent = dirname(folder);
    if (parent === folder) return;
    folder = parent;
  }
}

loadDotenv();

const MODEL = "official-kling-v3-omni";
// `urls` holds keyframes: one URL is the first frame, two are the first and last frame.
const INPUTS = {
  "prompt": "The camera slowly pushes in as the scene comes to life, natural motion, soft daylight.",
  "urls": [
    "https://i2v.ai/images/market/seedream-5-0.jpg"
  ],
  "duration": 5,
  "resolution": "720p"
};

// ---- you normally don't need to edit below this line ----

const API_BASE = (process.env.I2V_BASE_URL || "https://api.i2v.ai").replace(/\/$/, "");
const API_URL = API_BASE.endsWith("/api/v1") ? API_BASE : `${API_BASE}/api/v1`;
const API_KEY = process.env.I2V_API_KEY;
if (!API_KEY) {
  console.error("Set I2V_API_KEY first: export I2V_API_KEY=your-api-key");
  process.exit(1);
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 30 * 60 * 1000;

type Billing = {
  currency: string;
  status: string;
  charged: { currency: string; amount: string } | null;
} | null;

type RecordInfo = {
  taskId: string;
  model: string;
  status: "waiting" | "generating" | "success" | "fail";
  billing: Billing;
  output: { url: string; width: number | null; height: number | null }[] | null;
  error: { code: string; message: string } | null;
  createTime: number;
  completeTime: number | null;
};

async function api<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    "User-Agent": "i2v-api-examples/1.0",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  // 1. Submit the task. The same Idempotency-Key plus the same body replays one task.
  const { taskId } = await api<{ taskId: string }>(
    "POST",
    "/jobs/createTask",
    { model: MODEL, inputs: INPUTS },
    randomUUID(),
  );
  console.log(`Task created: ${taskId}`);

  // 2. Poll until it reaches a terminal state (success | fail)
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let info: RecordInfo;
  while (true) {
    info = await api<RecordInfo>(
      "GET",
      `/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    );
    if (info.status === "success") break;
    if (info.status === "fail") throw new Error(`Task failed: ${JSON.stringify(info.error)}`);
    if (Date.now() > deadline) throw new Error(`Timed out while ${info.status}. Task id: ${taskId}`);
    console.log(`Status: ${info.status} — waiting...`);
    await sleep(POLL_INTERVAL_MS);
  }

  // 3. Download the result
  console.log(
    `Done. Billing: ${info.billing?.status ?? "unknown"} ${info.billing?.charged?.amount ?? "-"} ${info.billing?.currency ?? "USD"}`,
  );
  const items = info.output ?? [];
  for (const [index, item] of items.entries()) {
    const extension = new URL(item.url).pathname.match(/\.[a-z0-9]+$/i)?.[0] ?? ".mp4";
    const filename = items.length > 1 ? `image-to-video-${index}${extension}` : `image-to-video${extension}`;
    const res = await fetch(item.url);
    if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${item.url}`);
    await writeFile(filename, Buffer.from(await res.arrayBuffer()));
    console.log(`Saved ${filename}  ${item.width}x${item.height}  ${item.url}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
