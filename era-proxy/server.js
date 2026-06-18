import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ── CORS: allow requests from claude.ai artifacts ──────────────────────────
app.use(cors({
  origin: [
    "https://claude.ai",
    "https://artifacts.claude.ai",
    /\.claude\.ai$/,
    // also allow local dev
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
  console.error("❌  ERA_API_KEY environment variable is not set.");
  process.exit(1);
}

// ── Health check ───────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Helper: call an Era Context MCP tool ──────────────────────────────────
async function callEraTool(toolName, params = {}) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: { name: toolName, arguments: params },
  });

  const res = await fetch(`${ERA_BASE_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${ERA_API_KEY}`,
      "Accept":        "application/json, text/event-stream",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Era API ${res.status}: ${text.slice(0, 200)}`);
  }

  // Era returns either plain JSON or SSE (text/event-stream)
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    const text = await res.text();
    // Extract the last data: line that contains JSON
    const lines = text.split("\n").filter(l => l.startsWith("data:"));
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const payload = JSON.parse(lines[i].replace(/^data:\s*/, ""));
        if (payload.result) return payload.result;
      } catch { /* keep looking */ }
    }
    throw new Error("No parseable result in SSE stream");
  }

  const json = await res.json();
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  return json.result;
}

// ── Parse Era tool result content into plain object ───────────────────────
function parseToolResult(result) {
  if (!result) return null;
  // result.content is usually [{ type: "text", text: "..." }]
  const content = result.content ?? result;
  if (Array.isArray(content)) {
    const textBlock = content.find(b => b.type === "text");
    if (textBlock?.text) {
      try { return JSON.parse(textBlock.text); } catch { return textBlock.text; }
    }
  }
  return content;
}

// ── GET /api/financial-data — fetch everything the dashboard needs ─────────
app.get("/api/financial-data", async (_req, res) => {
  try {
    const today     = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString().split("T")[0];
    const todayStr  = today.toISOString().split("T")[0];

    // Fire all three calls in parallel
    const [accountsRaw, transactionsRaw, recurringRaw] = await Promise.allSettled([
      callEraTool("accounts__list_financial_accounts"),
      callEraTool("transactions__list_transactions", {
        from_date: monthStart,
        to_date:   todayStr,
        page_size: 200,
      }),
      callEraTool("transactions__list_recurring_charges"),
    ]);

    const accounts    = accountsRaw.status    === "fulfilled" ? parseToolResult(accountsRaw.value)    : null;
    const transactions = transactionsRaw.status === "fulfilled" ? parseToolResult(transactionsRaw.value) : null;
    const recurring   = recurringRaw.status   === "fulfilled" ? parseToolResult(recurringRaw.value)   : null;

    res.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      accounts,
      transactions,
      recurring,
      errors: {
        accounts:     accountsRaw.status    === "rejected" ? accountsRaw.reason?.message    : null,
        transactions: transactionsRaw.status === "rejected" ? transactionsRaw.reason?.message : null,
        recurring:    recurringRaw.status   === "rejected" ? recurringRaw.reason?.message   : null,
      },
    });
  } catch (err) {
    console.error("financial-data error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/accounts — balances only (fast) ──────────────────────────────
app.get("/api/accounts", async (_req, res) => {
  try {
    const result = await callEraTool("accounts__list_financial_accounts");
    res.json({ ok: true, fetchedAt: new Date().toISOString(), data: parseToolResult(result) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/transactions — current month ─────────────────────────────────
app.get("/api/transactions", async (req, res) => {
  try {
    const today      = new Date();
    const from_date  = req.query.from || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const to_date    = req.query.to   || today.toISOString().split("T")[0];
    const result = await callEraTool("transactions__list_transactions", {
      from_date, to_date, page_size: 200,
    });
    res.json({ ok: true, fetchedAt: new Date().toISOString(), data: parseToolResult(result) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅  Era proxy running on port ${PORT}`);
  console.log(`   ERA_BASE_URL = ${ERA_BASE_URL}`);
  console.log(`   ERA_API_KEY  = ${ERA_API_KEY.slice(0,8)}…`);
});
