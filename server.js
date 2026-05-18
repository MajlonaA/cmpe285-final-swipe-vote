const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DATA_DIR = path.join(ROOT_DIR, "data");
const ITEMS_FILE = path.join(DATA_DIR, "items.json");
const VOTES_FILE = path.join(DATA_DIR, "votes.json");
const API_ALIAS_PATHS = new Set(["/items", "/results", "/analytics", "/my-votes", "/vote"]);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

let writeQueue = Promise.resolve();

async function ensureDataFiles() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsp.access(ITEMS_FILE);
  } catch {
    throw new Error("Missing data/items.json. Run `npm run seed` before starting the server.");
  }

  try {
    await fsp.access(VOTES_FILE);
  } catch {
    await writeJsonAtomic(VOTES_FILE, { votes: [] });
  }
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (fallback !== undefined && error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fsp.rename(tempPath, filePath);
}

function enqueueWrite(task) {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => {});
  return run;
}

async function loadItems() {
  return readJson(ITEMS_FILE, []);
}

async function loadVotes() {
  const store = await loadVoteStore();
  return store.votes;
}

async function loadVoteStore() {
  const payload = await readJson(VOTES_FILE, { votes: [] });
  const votes = Array.isArray(payload.votes) ? payload.votes : [];
  return {
    votes,
    analytics: backfillAnalytics(normalizeAnalytics(payload.analytics), votes)
  };
}

function normalizeAnalytics(value) {
  return {
    totalSwipes: Number.isInteger(value?.totalSwipes) && value.totalSwipes >= 0 ? value.totalSwipes : 0,
    totalDecisionMs:
      Number.isFinite(Number(value?.totalDecisionMs)) && Number(value.totalDecisionMs) >= 0
        ? Math.round(Number(value.totalDecisionMs))
        : 0,
    decisionCount:
      Number.isInteger(value?.decisionCount) && value.decisionCount >= 0 ? value.decisionCount : 0,
    sessionIds: Array.isArray(value?.sessionIds)
      ? [...new Set(value.sessionIds.filter(isValidSessionId))]
      : []
  };
}

function backfillAnalytics(analytics, votes) {
  const decisionTimes = votes
    .map((vote) => Number(vote.decisionMs))
    .filter((value) => Number.isFinite(value) && value >= 0);

  analytics.totalSwipes = Math.max(analytics.totalSwipes, votes.length);
  if (analytics.decisionCount < decisionTimes.length) {
    analytics.totalDecisionMs = Math.max(
      analytics.totalDecisionMs,
      decisionTimes.reduce((sum, value) => sum + value, 0)
    );
    analytics.decisionCount = decisionTimes.length;
  }
  analytics.sessionIds = [
    ...new Set([
      ...analytics.sessionIds,
      ...votes.map((vote) => vote.sessionId).filter(isValidSessionId)
    ])
  ];
  return analytics;
}

function jsonResponse(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

function textResponse(res, statusCode, message) {
  res.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8" });
  res.end(message);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Request body must be valid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function isValidSessionId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,80}$/.test(value);
}

function summarizeResults(items, votes) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item.id, { yes: 0, no: 0 });
  }

  for (const vote of votes) {
    const count = counts.get(vote.itemId);
    if (!count) {
      continue;
    }
    if (vote.choice === "yes") {
      count.yes += 1;
    }
    if (vote.choice === "no") {
      count.no += 1;
    }
  }

  return items.map((item) => {
    const count = counts.get(item.id) || { yes: 0, no: 0 };
    const total = count.yes + count.no;
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      image: item.image,
      imageCredit: item.imageCredit,
      imageSource: item.imageSource,
      yes: count.yes,
      no: count.no,
      total,
      yesRate: total === 0 ? 0 : Math.round((count.yes / total) * 100)
    };
  });
}

function summarizeAnalytics(votes, analytics) {
  const sessionIds = new Set(analytics.sessionIds);
  for (const vote of votes) {
    if (isValidSessionId(vote.sessionId)) {
      sessionIds.add(vote.sessionId);
    }
  }

  const derivedDecisionTimes = votes
    .map((vote) => Number(vote.decisionMs))
    .filter((value) => Number.isFinite(value) && value >= 0);
  const totalDecisionMs =
    analytics.decisionCount > 0
      ? analytics.totalDecisionMs
      : derivedDecisionTimes.reduce((sum, value) => sum + value, 0);
  const decisionCount = analytics.decisionCount > 0 ? analytics.decisionCount : derivedDecisionTimes.length;

  return {
    totalSwipes: Math.max(analytics.totalSwipes, votes.length),
    sessions: sessionIds.size,
    averageDecisionMs: decisionCount === 0 ? 0 : Math.round(totalDecisionMs / decisionCount)
  };
}

function apiPath(pathname) {
  return pathname.startsWith("/api/") ? pathname.slice(4) : pathname;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderItemSvg(item) {
  const safeName = escapeXml(item.name);
  const safeCategory = escapeXml(item.category);
  const accent = /^#[0-9a-fA-F]{6}$/.test(item.accent) ? item.accent : "#0f766e";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 560" role="img" aria-labelledby="title desc">
  <title id="title">${safeName}</title>
  <desc id="desc">Generated cat profile card visual for ${safeCategory}</desc>
  <rect width="720" height="560" fill="#f8fafc"/>
  <rect x="34" y="34" width="652" height="492" rx="28" fill="${accent}"/>
  <circle cx="130" cy="126" r="66" fill="#fef3c7" opacity="0.9"/>
  <circle cx="604" cy="114" r="78" fill="#dbeafe" opacity="0.48"/>
  <circle cx="600" cy="428" r="104" fill="#fce7f3" opacity="0.35"/>
  <path d="M76 396 C190 326 284 442 382 374 S556 310 656 374 L656 526 L76 526 Z" fill="#ffffff" opacity="0.2"/>
  <path d="M226 206 L278 96 L326 210 Z" fill="#fff7ed"/>
  <path d="M394 210 L448 96 L500 206 Z" fill="#fff7ed"/>
  <path d="M244 198 L282 124 L316 204 Z" fill="#fecaca" opacity="0.72"/>
  <path d="M406 204 L446 124 L486 198 Z" fill="#fecaca" opacity="0.72"/>
  <ellipse cx="362" cy="272" rx="150" ry="126" fill="#fff7ed"/>
  <ellipse cx="312" cy="266" rx="18" ry="24" fill="#111827"/>
  <ellipse cx="414" cy="266" rx="18" ry="24" fill="#111827"/>
  <circle cx="319" cy="258" r="6" fill="#ffffff"/>
  <circle cx="421" cy="258" r="6" fill="#ffffff"/>
  <path d="M346 304 Q362 318 378 304" stroke="#111827" stroke-width="8" stroke-linecap="round" fill="none"/>
  <path d="M362 292 L346 288 Q362 276 378 288 Z" fill="#e11d48"/>
  <path d="M270 304 H196 M274 326 H202 M450 304 H524 M446 326 H518" stroke="#111827" stroke-width="7" stroke-linecap="round"/>
  <path d="M282 364 Q362 408 442 364" stroke="#ffffff" stroke-width="18" stroke-linecap="round" opacity="0.7" fill="none"/>
  <rect x="154" y="406" width="412" height="72" rx="18" fill="#ffffff" opacity="0.94"/>
  <text x="360" y="452" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#111827">${safeName}</text>
  <text x="360" y="506" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${safeCategory}</text>
</svg>`;
}

async function handleApi(req, res, url) {
  const pathname = apiPath(url.pathname);

  if (req.method === "GET" && pathname === "/items") {
    const items = await loadItems();
    jsonResponse(res, 200, { items });
    return;
  }

  if (req.method === "GET" && pathname === "/results") {
    const [items, store] = await Promise.all([loadItems(), loadVoteStore()]);
    jsonResponse(res, 200, {
      results: summarizeResults(items, store.votes),
      analytics: summarizeAnalytics(store.votes, store.analytics)
    });
    return;
  }

  if (req.method === "GET" && pathname === "/analytics") {
    const store = await loadVoteStore();
    jsonResponse(res, 200, { analytics: summarizeAnalytics(store.votes, store.analytics) });
    return;
  }

  if (req.method === "GET" && pathname === "/my-votes") {
    const sessionId = url.searchParams.get("sessionId");
    if (!isValidSessionId(sessionId)) {
      jsonResponse(res, 400, { error: "A valid sessionId is required." });
      return;
    }

    const votes = await loadVotes();
    const myVotes = votes
      .filter((vote) => vote.sessionId === sessionId)
      .map((vote) => ({
        itemId: vote.itemId,
        choice: vote.choice,
        updatedAt: vote.updatedAt
      }));
    jsonResponse(res, 200, { votes: myVotes });
    return;
  }

  if (req.method === "POST" && pathname === "/vote") {
    const body = await parseBody(req);
    const itemId = typeof body.itemId === "string" ? body.itemId : "";
    const choice = body.choice === "yes" || body.choice === "no" ? body.choice : "";
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const decisionMs = Number.isFinite(Number(body.decisionMs))
      ? Math.max(0, Math.min(600000, Math.round(Number(body.decisionMs))))
      : null;

    if (!isValidSessionId(sessionId) || !itemId || !choice) {
      jsonResponse(res, 400, { error: "sessionId, itemId, and yes/no choice are required." });
      return;
    }

    const items = await loadItems();
    if (!items.some((item) => item.id === itemId)) {
      jsonResponse(res, 404, { error: "Unknown itemId." });
      return;
    }

    const updatedVote = await enqueueWrite(async () => {
      const store = await loadVoteStore();
      const votes = store.votes;
      const analytics = store.analytics;
      const now = new Date().toISOString();
      const index = votes.findIndex((vote) => vote.sessionId === sessionId && vote.itemId === itemId);
      if (index >= 0) {
        votes[index] = {
          ...votes[index],
          choice,
          decisionMs,
          updatedAt: now
        };
      } else {
        votes.push({
          sessionId,
          itemId,
          choice,
          decisionMs,
          createdAt: now,
          updatedAt: now
        });
      }

      analytics.totalSwipes += 1;
      analytics.sessionIds = [...new Set([...analytics.sessionIds, sessionId])];
      if (decisionMs !== null) {
        analytics.totalDecisionMs += decisionMs;
        analytics.decisionCount += 1;
      }

      await writeJsonAtomic(VOTES_FILE, { votes, analytics });
      return votes.find((vote) => vote.sessionId === sessionId && vote.itemId === itemId);
    });

    jsonResponse(res, 200, { vote: updatedVote });
    return;
  }

  if (req.method === "DELETE" && pathname === "/vote") {
    const body = await parseBody(req);
    const itemId = typeof body.itemId === "string" ? body.itemId : "";
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

    if (!isValidSessionId(sessionId) || !itemId) {
      jsonResponse(res, 400, { error: "sessionId and itemId are required." });
      return;
    }

    const removed = await enqueueWrite(async () => {
      const store = await loadVoteStore();
      const votes = store.votes;
      const nextVotes = votes.filter((vote) => !(vote.sessionId === sessionId && vote.itemId === itemId));
      await writeJsonAtomic(VOTES_FILE, { votes: nextVotes, analytics: store.analytics });
      return votes.length !== nextVotes.length;
    });

    jsonResponse(res, 200, { removed });
    return;
  }

  jsonResponse(res, 404, { error: "API route not found." });
}

async function handleImage(req, res, url) {
  const id = path.basename(url.pathname, ".svg");
  const items = await loadItems();
  const item = items.find((entry) => entry.id === id);
  if (!item) {
    textResponse(res, 404, "Image not found");
    return;
  }

  res.writeHead(200, {
    "content-type": "image/svg+xml; charset=utf-8",
    "cache-control": "public, max-age=3600"
  });
  res.end(renderItemSvg(item));
}

async function serveStatic(req, res, url) {
  const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    textResponse(res, 403, "Forbidden");
    return;
  }

  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) {
      textResponse(res, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME_TYPES[ext] || "application/octet-stream",
      "cache-control": ext === ".html" ? "no-store" : "public, max-age=600"
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    if (error.code === "ENOENT") {
      textResponse(res, 404, "Not found");
      return;
    }
    throw error;
  }
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  try {
    if (url.pathname.startsWith("/api/") || API_ALIAS_PATHS.has(url.pathname)) {
      await handleApi(req, res, url);
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/images/") && url.pathname.endsWith(".svg")) {
      await handleImage(req, res, url);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      textResponse(res, 405, "Method not allowed");
      return;
    }

    await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    jsonResponse(res, 500, { error: "Internal server error" });
  }
}

ensureDataFiles()
  .then(() => {
    http.createServer(route).listen(PORT, HOST, () => {
      console.log(`Swipe Vote app running at http://${HOST}:${PORT}`);
    });
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
