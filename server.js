const express = require("express");
const cors    = require("cors");
const fetch   = (...args) => import("node-fetch").then(m => m.default(...args));

const app = express();
app.use(express.json());

app.use(cors({
  origin: [
    "https://claude.ai",
    /\.claude\.ai$/,
    "http://localhost:3000",
    "http://localhost:5173",
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

const ERA_API_KEY  = process.env.ERA_API_KEY;
const ERA_BASE_URL = process.env.ERA_BASE_URL || "https://context.era.app";
const PORT         = process.env.PORT || 3001;

if (!ERA_API_KEY) {
  console.error("ERA_API_KEY environment variable is not set.");
  process.exit(1);
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Parse SSE stream into array of JSON messages ───────────────────────────
function parseSseMessages(text) {
  const messages = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const data = line.replace(/^data:\s*/, "").trim();
    if (!data || data === "[DONE]") continue;
    try { messages.push(JSON.parse(data)); } catch { /* skip */ }
  }
  return messages;
}

// ── Post a single MCP message, return full response text ──────────────────
async function mcpPost(body, sessionId) {
  const headers = {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${ERA_API_KEY}`,
    "Accept":        "application/json, text/event-stream",
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;

  const res = await fetch(`${ERA_BASE_URL}/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Era API ${res.status}: ${text.slice(0, 300)}`);
  }

  return { res, text: await res.text() };
}

// ── Initialize MCP session, return sessionId ───────────────────────────────
async function initSession() {
  const { res, text } = await mcpPost({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "era-financial-proxy", version: "1.0.0" },
    },
  });

  // Session ID comes back in a response header
  const sessionId = res.headers.get("mcp-session-id");

  // Also send initialized notification
  if (sessionId) {
    await mcpPost(
      { jsonrpc: "2.0", method: "notifications/initialized" },
      sessionId
    );
  }

  return sessionId;
}

// ── Call a tool within an existing session ────────────────────────────────
async function callTool(toolName, params, sessionId) {
  const { text } = await mcpPost({
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: { name: toolName, arguments: params },
  }, sessionId);

  // Parse SSE or plain JSON
  let messages;
  try {
    const json = JSON.parse(text);
    messages = [json];
  } catch {
    messages = parseSseMessages(text);
  }

  // Find the result message
  for (const msg of messages.reverse()) {
    if (msg?.result !== undefined) return msg.result;
    if (msg?.error)  throw new Error(msg.error.message || JSON.stringify(msg.error));
  }
  throw new Error("No result found in MCP response");
}

// ── Parse tool result content into plain JS value ────────────────────────
function parseResult(result) {
  if (!result) return null;
  const content = result.content ?? result;
  if (Array.isArray(content)) {
    const block = content.find(b => b.type === "text");
    if (block?.text) {
      try { return JSON.parse(block.text); } catch { return block.text; }
    }
  }
  return content;
}

// ── GET /api/financial-data ───────────────────────────────────────────────
app.get("/api/financial-data", async (_req, res) => {
  try {
    const today      = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const todayStr   = today.toISOString().split("T")[0];

    // Each parallel call gets its own session (sessions are cheap)
    const [accountsR, transactionsR, recurringR] = await Promise.allSettled([
      initSession().then(sid => callTool("accounts__list_financial_accounts", {}, sid)),
      initSession().then(sid => callTool("transactions__list_transactions", { from_date: monthStart, to_date: todayStr, page_size: 200 }, sid)),
      initSession().then(sid => callTool("transactions__list_recurring_charges", {}, sid)),
    ]);

    res.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      accounts:     accountsR.status     === "fulfilled" ? parseResult(accountsR.value)     : null,
      transactions: transactionsR.status === "fulfilled" ? parseResult(transactionsR.value) : null,
      recurring:    recurringR.status    === "fulfilled" ? parseResult(recurringR.value)    : null,
      errors: {
        accounts:     accountsR.status     === "rejected" ? accountsR.reason?.message     : null,
        transactions: transactionsR.status === "rejected" ? transactionsR.reason?.message : null,
        recurring:    recurringR.status    === "rejected" ? recurringR.reason?.message    : null,
      },
    });
  } catch (err) {
    console.error("financial-data error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/accounts", async (_req, res) => {
  try {
    const sid    = await initSession();
    const result = await callTool("accounts__list_financial_accounts", {}, sid);
    res.json({ ok: true, fetchedAt: new Date().toISOString(), data: parseResult(result) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/transactions", async (req, res) => {
  try {
    const today     = new Date();
    const from_date = req.query.from || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const to_date   = req.query.to   || today.toISOString().split("T")[0];
    const sid    = await initSession();
    const result = await callTool("transactions__list_transactions", { from_date, to_date, page_size: 200 }, sid);
    res.json({ ok: true, fetchedAt: new Date().toISOString(), data: parseResult(result) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Era proxy running on port ${PORT}`);
  console.log(`ERA_BASE_URL = ${ERA_BASE_URL}`);
  console.log(`ERA_API_KEY  = ${ERA_API_KEY.slice(0,8)}...`);
});
