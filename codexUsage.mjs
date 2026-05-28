import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const STATE_DIR = ".agent-state";
const OUT_FILE = path.join(STATE_DIR, "codex-network-sniff.json");
const SESSION_FILE = path.join(STATE_DIR, "chatgpt-storage-state.json");

const TARGET_URL = "https://chatgpt.com/codex/settings/usage";

class CustomLogging {
  constructor(title) {
    this.title = { body: title || "---" };
  }

  log(body = "") {
    console.log(`[${this.title.body}] ${body}`);
  }

  warn(body = "") {
    console.warn(`[${this.title.body}] WARN: ${body}`);
  }

  error(body = "") {
    console.error(`[${this.title.body}] ERROR: ${body}`);
  }
}

const log = new CustomLogging("Codex Usage Sniffer");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function looksRelevant(url) {
  const lower = url.toLowerCase();

  return (
    lower.includes("codex") ||
    lower.includes("usage") ||
    lower.includes("limit") ||
    lower.includes("quota") ||
    lower.includes("billing") ||
    lower.includes("credit") ||
    lower.includes("analytics")
  );
}

function findUsageishData(value, trail = []) {
  const hits = [];

  if (!value || typeof value !== "object") return hits;

  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      hits.push(...findUsageishData(item, [...trail, String(i)]));
    });
    return hits;
  }

  const keys = Object.keys(value);
  const joined = keys.join(" ").toLowerCase();

  const interesting =
    joined.includes("usage") ||
    joined.includes("limit") ||
    joined.includes("quota") ||
    joined.includes("remaining") ||
    joined.includes("reset") ||
    joined.includes("credit") ||
    joined.includes("window") ||
    joined.includes("percent");

  if (interesting) {
    hits.push({
      path: trail.join(".") || "$",
      keys,
      value,
    });
  }

  for (const [k, v] of Object.entries(value)) {
    if (v && typeof v === "object") {
      hits.push(...findUsageishData(v, [...trail, k]));
    }
  }

  return hits;
}

async function main() {
  await ensureDir(STATE_DIR);

  const hasSession = await fs
    .access(SESSION_FILE)
    .then(() => true)
    .catch(() => false);

  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext(
    hasSession
      ? {
          storageState: SESSION_FILE,
        }
      : {}
  );

  const page = await context.newPage();

  const captured = [];

  page.on("response", async (response) => {
    const url = response.url();
    const req = response.request();

    if (!looksRelevant(url)) return;

    const contentType = response.headers()["content-type"] || "";

    if (!contentType.includes("json")) {
      captured.push({
        url,
        method: req.method(),
        status: response.status(),
        contentType,
        note: "Relevant URL but not JSON.",
      });
      return;
    }

    try {
      const json = await response.json();
      const hits = findUsageishData(json);

      captured.push({
        url,
        method: req.method(),
        status: response.status(),
        contentType,
        hits,
        json,
      });

      log.log(`Captured JSON: ${url}`);
      if (hits.length) {
        log.log(`  usage-ish hits: ${hits.length}`);
      }
    } catch (err) {
      captured.push({
        url,
        method: req.method(),
        status: response.status(),
        contentType,
        error: err.message,
      });
    }
  });

  log.log(`Opening ${TARGET_URL}`);
  await page.goto(TARGET_URL, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  log.warn("If you are not logged in, log in manually in the opened browser.");
  log.warn("After the usage page loads, wait a few seconds. Script will capture requests.");

  await page.waitForTimeout(20_000);

  await context.storageState({ path: SESSION_FILE });

  await fs.writeFile(OUT_FILE, JSON.stringify(captured, null, 2), "utf8");

  log.log(`Saved session: ${SESSION_FILE}`);
  log.log(`Saved capture: ${OUT_FILE}`);

  await browser.close();
}

main().catch((err) => {
  log.error(err.stack || err.message);
  process.exit(1);
});