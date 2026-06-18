import { useState, useCallback, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";

const P = {
  bg:"#0f1117", surface:"#181c27", card:"#1e2336", border:"#2a3050",
  accent:"#4f8ef7", green:"#34d399", red:"#f87171", amber:"#fbbf24",
  purple:"#a78bfa", cyan:"#38bdf8", muted:"#6b7a99", text:"#e2e8f0", dim:"#94a3b8",
};
const COLORS = ["#4f8ef7","#34d399","#fbbf24","#f87171","#a78bfa","#fb923c","#38bdf8","#f472b6","#4ade80","#e879f9","#facc15","#60a5fa"];
const fmt = (n) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2}).format(Math.abs(n));
const fmtShort = (n) => { const a=Math.abs(n); return a>=1000?`$${(a/1000).toFixed(1)}k`:`$${a.toFixed(0)}`; };

// ── Static fallback / category config (never changes) ──────────────────────
const categoryMeta = {
  "Shopping & Gear":  { fixed:false, icon:"🛍️" }, "Transfers":        { fixed:true,  icon:"💸" },
  "Taxes & Fees":     { fixed:true,  icon:"🏛️" }, "Utilities":        { fixed:true,  icon:"⚡" },
  "Dining Out":       { fixed:false, icon:"🍽️" }, "Groceries":        { fixed:false, icon:"🛒" },
  "Home Maint.":      { fixed:false, icon:"🏡" }, "Vehicle":          { fixed:false, icon:"🚗" },
  "Healthcare":       { fixed:true,  icon:"🏥" }, "Health & Fitness": { fixed:false, icon:"💪" },
  "Entertainment":    { fixed:false, icon:"🎬" }, "Other":            { fixed:false, icon:"📦" },
};

// Era Context category → our category names
const CAT_MAP = {
  "shopping":"Shopping & Gear","clothing":"Shopping & Gear","electronics":"Shopping & Gear","gear":"Shopping & Gear",
  "transfer":"Transfers","transfers":"Transfers","savings transfer":"Transfers","investment":"Transfers",
  "taxes":"Taxes & Fees","fees":"Taxes & Fees","insurance":"Taxes & Fees","tax":"Taxes & Fees",
  "utilities":"Utilities","phone":"Utilities","electric":"Utilities","internet":"Utilities","water":"Utilities",
  "dining":"Dining Out","restaurants":"Dining Out","food & drink":"Dining Out","fast food":"Dining Out","coffee":"Dining Out",
  "groceries":"Groceries","supermarkets":"Groceries",
  "home":"Home Maint.","home improvement":"Home Maint.","lawn":"Home Maint.","home services":"Home Maint.",
  "auto":"Vehicle","gas":"Vehicle","parking":"Vehicle","tolls":"Vehicle","vehicle":"Vehicle",
  "health":"Healthcare","medical":"Healthcare","pharmacy":"Healthcare","doctor":"Healthcare",
  "gym":"Health & Fitness","fitness":"Health & Fitness","sports":"Health & Fitness",
  "entertainment":"Entertainment","streaming":"Entertainment","movies":"Entertainment","music":"Entertainment",
};

function mapCategory(cat) {
  if (!cat) return "Other";
  const lower = cat.toLowerCase();
  for (const [k,v] of Object.entries(CAT_MAP)) {
    if (lower.includes(k)) return v;
  }
  return "Other";
}

const STATIC_FALLBACK = {
  accountBalance: { current:5372.93, available:4818.42 },
  accountName: "Everyday Checking ···6467",
  institution: "Wells Fargo",
  categoryData: [
    { name:"Shopping & Gear", value:1364.08 }, { name:"Transfers", value:1351.80 },
    { name:"Taxes & Fees", value:583.74 },     { name:"Utilities", value:501.35 },
    { name:"Dining Out", value:475.56 },        { name:"Groceries", value:443.32 },
    { name:"Home Maint.", value:440.79 },       { name:"Vehicle", value:328.75 },
    { name:"Healthcare", value:195.00 },        { name:"Health & Fitness", value:179.00 },
    { name:"Entertainment", value:113.15 },     { name:"Other", value:407.85 },
  ],
  recentTransactions: [
    { date:"Jun 15", merchant:"A Cut Above Lawn", amount:-418.82, category:"Home Maint." },
    { date:"Jun 15", merchant:"AT&T", amount:-225.25, category:"Utilities" },
    { date:"Jun 15", merchant:"E-ZPass", amount:-105.00, category:"Vehicle" },
    { date:"Jun 15", merchant:"Sunoco", amount:-42.95, category:"Vehicle" },
    { date:"Jun 15", merchant:"Anthropic", amount:-10.07, category:"Shopping & Gear" },
    { date:"Jun 12", merchant:"FI Tracking", amount:-136.74, category:"Shopping & Gear" },
    { date:"Jun 11", merchant:"Ally Bank Transfer", amount:-650.00, category:"Transfers" },
    { date:"Jun 11", merchant:"Amazon", amount:-129.26, category:"Shopping & Gear" },
    { date:"Jun 9",  merchant:"USAA Insurance", amount:-495.27, category:"Taxes & Fees" },
  ],
  txByCategory: {
    "Shopping & Gear":[{date:"Jun 15",merchant:"Anthropic",amount:-10.07,note:"Claude subscription"},{date:"Jun 12",merchant:"FI Tracking",amount:-136.74,note:"Recurring – review?"},{date:"Jun 11",merchant:"Amazon",amount:-129.26,note:"Marketplace"},{date:"Jun 9",merchant:"Kendra Scott Design",amount:-61.01,note:"Retail"}],
    "Transfers":[{date:"Jun 11",merchant:"Ally Bank",amount:-650.00,note:"Savings"},{date:"Jun 12",merchant:"Fidelity",amount:-25.00,note:"Investment"}],
    "Taxes & Fees":[{date:"Jun 9",merchant:"USAA P&C Insurance",amount:-495.27,note:"Auto-pay"}],
    "Utilities":[{date:"Jun 15",merchant:"AT&T",amount:-225.25,note:"Phone"},{date:"Jun 9",merchant:"Dominion Energy",amount:-186.11,note:"Electric"}],
    "Dining Out":[{date:"Jun 15",merchant:"LifeCafe",amount:-12.09,note:"Gym café"},{date:"Jun 12",merchant:"Chicken Salad Chick",amount:-20.68,note:"Lunch"},{date:"Jun 11",merchant:"Simply Social",amount:-20.45,note:"Café"}],
    "Groceries":[{date:"Jun 15",merchant:"Groceries",amount:-443.32,note:""}],
    "Home Maint.":[{date:"Jun 15",merchant:"A Cut Above Lawn",amount:-418.82,note:"Lawn service"}],
    "Vehicle":[{date:"Jun 15",merchant:"E-ZPass",amount:-105.00,note:"Toll"},{date:"Jun 15",merchant:"Sunoco",amount:-42.95,note:"Gas"}],
    "Healthcare":[{date:"Jun 15",merchant:"Healthcare",amount:-195.00,note:""}],
    "Health & Fitness":[{date:"Jun 15",merchant:"Health & Fitness",amount:-179.00,note:""}],
    "Entertainment":[{date:"Jun 15",merchant:"Entertainment",amount:-113.15,note:""}],
    "Other":[{date:"Jun 15",merchant:"Other",amount:-407.85,note:""}],
  },
  last7Days: [
    { date:"Jun 9", out:557.28, in:0 }, { date:"Jun 10", out:28.77, in:0 },
    { date:"Jun 11", out:822.39, in:0 }, { date:"Jun 12", out:183.49, in:0 },
    { date:"Jun 13", out:0, in:0 }, { date:"Jun 14", out:0, in:0 },
    { date:"Jun 15", out:817.18, in:2668.38 },
  ],
  subscriptions: [
    { name:"Netflix", amount:25.99, frequency:"Quarterly", nextDue:"~Aug 26", status:"active" },
    { name:"Anthropic (Claude)", amount:10.07, frequency:"Monthly", nextDue:"~Jul 12", status:"active" },
    { name:"FI Tracking", amount:136.74, frequency:"Monthly", nextDue:"~Jul 11", status:"review" },
  ],
  upcomingPayments: [
    { name:"Netflix", amount:25.99, due:"~Aug 26", type:"subscription" },
    { name:"Anthropic (Claude)", amount:10.07, due:"~Jul 12", type:"subscription" },
    { name:"FI Tracking", amount:136.74, due:"~Jul 11", type:"recurring" },
    { name:"AT&T", amount:225.25, due:"~Jul 15", type:"bill" },
    { name:"Dominion Energy", amount:186.11, due:"~Jul 9", type:"bill" },
  ],
  incomeSources: [
    { name:"Mark — MITRE Payroll", frequency:"Monthly", amount:2724.20, lastDate:"Jun 5" },
    { name:"Julie — TMA Payroll", frequency:"Bi-weekly", amount:2668.38, lastDate:"Jun 15" },
  ],
  monthlyTrend: [
    { month:"Apr", total:5820.40, "Shopping & Gear":980, Transfers:1100, "Taxes & Fees":583.74, Utilities:489, "Dining Out":612, Groceries:510, "Home Maint.":220, Vehicle:295, Healthcare:195, "Health & Fitness":179, Entertainment:145, Other:312 },
    { month:"May", total:6140.22, "Shopping & Gear":1102.5, Transfers:1240, "Taxes & Fees":583.74, Utilities:498.2, "Dining Out":538.4, Groceries:467, "Home Maint.":390, Vehicle:310, Healthcare:195, "Health & Fitness":179, Entertainment:124, Other:512.38 },
    { month:"Jun", total:6384.39, "Shopping & Gear":1364.08, Transfers:1351.8, "Taxes & Fees":583.74, Utilities:501.35, "Dining Out":475.56, Groceries:443.32, "Home Maint.":440.79, Vehicle:328.75, Healthcare:195, "Health & Fitness":179, Entertainment:113.15, Other:407.85 },
  ],
};

// ── PROXY URL — paste your deployed Railway/Render URL here ───────────────
// Example: "https://era-financial-proxy.up.railway.app"
// Leave as empty string to run in static/fallback mode.
const PROXY_URL = "";

// ── Live data hook — calls your deployed proxy ────────────────────────────
function useLiveData() {
  const [data, setData] = useState(STATIC_FALLBACK);
  const [status, setStatus] = useState(PROXY_URL ? "idle" : "unconfigured");
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetch_live = useCallback(async () => {
    if (!PROXY_URL) {
      setStatus("unconfigured");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`${PROXY_URL}/api/financial-data`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Proxy ${res.status}: ${text.slice(0, 120)}`);
      }

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Proxy returned ok:false");

      // Normalise the proxy response shape into what buildLiveData expects
      const parsed = {
        accounts:     normaliseAccounts(json.accounts),
        transactions: normaliseTransactions(json.transactions),
        recurring:    normaliseRecurring(json.recurring),
      };

      const liveData = buildLiveData(parsed);
      setData(liveData);
      setLastRefreshed(new Date());
      setStatus("success");
    } catch (e) {
      console.error("Live data fetch failed:", e.message);
      setError(e.message);
      setStatus("error");
    }
  }, []);

  // Auto-fetch on mount when proxy is configured
  useEffect(() => { if (PROXY_URL) fetch_live(); }, []);

  return { data, status, error, refresh: fetch_live, lastRefreshed };
}

// ── Normalise Era Context raw shapes into flat arrays ─────────────────────
function normaliseAccounts(raw) {
  if (!raw) return [];
  // Era returns { accounts: [...], total_count, ... }
  const list = raw.accounts ?? raw;
  if (!Array.isArray(list)) return [];
  return list.map(a => ({
    name:        a.name        ?? "Account",
    institution: a.institution ?? "",
    type:        (a.type       ?? "checking").toLowerCase(),
    current:     a.balance?.current   ?? a.current   ?? 0,
    available:   a.balance?.available ?? a.available ?? a.balance?.current ?? 0,
  }));
}

function normaliseTransactions(raw) {
  if (!raw) return [];
  // Era returns { transactions: [...], ... } or an array directly
  const list = raw.transactions ?? raw;
  if (!Array.isArray(list)) return [];
  return list.map(t => ({
    date:     t.date          ?? t.transacted_at ?? "",
    merchant: t.description   ?? t.merchant_name ?? t.merchant ?? "Unknown",
    amount:   typeof t.amount === "number" ? t.amount : -(t.amount ?? 0),
    category: t.category_name ?? t.category      ?? "",
  }));
}

function normaliseRecurring(raw) {
  if (!raw) return [];
  const list = raw.recurring_charges ?? raw.charges ?? raw;
  if (!Array.isArray(list)) return [];
  return list.map(r => ({
    name:      r.description ?? r.merchant_name ?? r.name ?? "Unknown",
    amount:    Math.abs(r.amount ?? r.average_amount ?? 0),
    frequency: r.cadence     ?? r.frequency     ?? "Monthly",
    status:    "active",
  }));
}

// ── Transform raw API response into dashboard shape ────────────────────────
function buildLiveData(parsed) {
  const { accounts = [], transactions = [], recurring = [] } = parsed;

  // Primary checking account
  const checking = accounts.find(a => a.type === "checking" || a.type === "Checking") || accounts[0] || {};
  const accountBalance = { current: checking.current || 0, available: checking.available || checking.current || 0 };
  const accountName = checking.name || "Checking Account";
  const institution = checking.institution || "Bank";

  // Split transactions
  const expenses = transactions.filter(t => t.amount < 0);
  const income   = transactions.filter(t => t.amount > 0);

  // Group expenses by our category names
  const catTotals = {};
  const catTxMap = {};
  for (const tx of expenses) {
    const cat = mapCategory(tx.category);
    catTotals[cat] = (catTotals[cat] || 0) + Math.abs(tx.amount);
    if (!catTxMap[cat]) catTxMap[cat] = [];
    catTxMap[cat].push({
      date: formatDate(tx.date),
      merchant: tx.merchant || "Unknown",
      amount: tx.amount,
      note: tx.category || "",
    });
  }

  // Ensure all categories exist
  const allCats = Object.keys(categoryMeta);
  const categoryData = allCats.map(name => ({ name, value: catTotals[name] || 0 }))
    .filter(c => c.value > 0)
    .sort((a,b) => b.value - a.value);

  // If we got nothing, fall back
  if (categoryData.length === 0) return STATIC_FALLBACK;

  // Recent transactions (last 10 expenses, most recent first)
  const recentTransactions = expenses
    .sort((a,b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)
    .map(tx => ({
      date: formatDate(tx.date),
      merchant: tx.merchant || "Unknown",
      amount: tx.amount,
      category: mapCategory(tx.category),
    }));

  // Last 7 days cash flow
  const today = new Date();
  const last7Days = Array.from({length:7}, (_,i) => {
    const d = new Date(today - (6-i)*24*60*60*1000);
    const label = d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
    const dateStr = d.toISOString().split("T")[0];
    const dayTxs = transactions.filter(t => t.date && t.date.startsWith(dateStr));
    return {
      date: label,
      out: dayTxs.filter(t=>t.amount<0).reduce((s,t)=>s+Math.abs(t.amount),0),
      in:  dayTxs.filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0),
    };
  });

  // Income sources — detect from positive transactions
  const incomeTxs = income.slice(0,5).map(t => ({
    name: t.merchant || "Income",
    frequency: "Detected",
    amount: t.amount,
    lastDate: formatDate(t.date),
  }));
  const incomeSources = incomeTxs.length > 0 ? incomeTxs : STATIC_FALLBACK.incomeSources;

  // Subscriptions from recurring charges
  const subscriptions = recurring.length > 0
    ? recurring.map(r => ({
        name: r.name || "Unknown",
        amount: Math.abs(r.amount || 0),
        frequency: r.frequency || "Monthly",
        nextDue: "~Next month",
        status: Math.abs(r.amount || 0) > 100 ? "review" : "active",
      }))
    : STATIC_FALLBACK.subscriptions;

  // Upcoming payments from recurring
  const upcomingPayments = subscriptions.map(s => ({
    name: s.name,
    amount: s.amount,
    due: s.nextDue,
    type: s.amount > 50 ? "bill" : "subscription",
  }));

  // Monthly trend: use current month as Jun, keep Apr/May from fallback
  const currentMonthEntry = { month: today.toLocaleDateString("en-US",{month:"short"}), total: categoryData.reduce((s,c)=>s+c.value,0) };
  for (const c of categoryData) currentMonthEntry[c.name] = c.value;
  const monthlyTrend = [STATIC_FALLBACK.monthlyTrend[0], STATIC_FALLBACK.monthlyTrend[1], currentMonthEntry];

  return {
    accountBalance, accountName, institution,
    categoryData,
    recentTransactions,
    txByCategory: { ...STATIC_FALLBACK.txByCategory, ...catTxMap },
    last7Days,
    incomeSources,
    subscriptions,
    upcomingPayments,
    monthlyTrend,
  };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
  } catch { return dateStr; }
}

// savingsTips is always computed dynamically from live data
function buildSavingsTips(categoryData, subscriptions) {
  const tips = [];
  const dining = categoryData.find(c=>c.name==="Dining Out");
  const shopping = categoryData.find(c=>c.name==="Shopping & Gear");
  const home = categoryData.find(c=>c.name==="Home Maint.");
  const utilities = categoryData.find(c=>c.name==="Utilities");
  const transfers = categoryData.find(c=>c.name==="Transfers");
  const bigSubs = subscriptions.filter(s=>s.amount>50&&s.status==="review");

  if (bigSubs.length) tips.push({ icon:"🔍", title:`${bigSubs[0].name} — ${fmt(bigSubs[0].amount)}/mo`, tip:"Large recurring charge — verify it's still providing value.", saving:`Up to ${fmt(bigSubs[0].amount*12)}/yr`, severity:"high" });
  if (dining && dining.value > 300) tips.push({ icon:"🍽️", title:`Dining Out — ${fmt(dining.value)} this month`, tip:"Cooking 2 extra meals/week at home could cut this by 30–40%.", saving:`~${fmt(dining.value*0.35*12)}/yr`, severity:"medium" });
  if (home && home.value > 300) tips.push({ icon:"🌿", title:`Home Maintenance — ${fmt(home.value)}`, tip:"Consider getting 2–3 quotes on recurring services.", saving:"Varies", severity:"medium" });
  if (utilities && utilities.value > 200) tips.push({ icon:"📡", title:`Utilities — ${fmt(utilities.value)}/mo`, tip:"Check if a lower-tier plan or competitor could reduce this.", saving:`~${fmt(utilities.value*0.2*12)}/yr`, severity:"medium" });
  if (transfers && transfers.value > 0) tips.push({ icon:"💰", title:`Saving ${fmt(transfers.value)}/mo`, tip:"You're already moving money to savings and investments — keep building.", saving:"Already saving!", severity:"positive" });
  if (tips.length === 0) tips.push({ icon:"✅", title:"Looking good!", tip:"No major spending anomalies detected this month.", saving:"—", severity:"positive" });
  return tips;
}

// ── Shared tooltip ──────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:8,padding:"10px 14px"}}>
      <div style={{color:P.dim,fontSize:12,marginBottom:4}}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{color:p.color||P.text,fontSize:13}}>{p.name}: {fmtShort(p.value)}</div>)}
    </div>
  );
};

const PieTip = ({ active, payload, categoryData }) => {
  if (!active || !payload?.length) return null;
  const total = (categoryData||[]).reduce((s,d) => s+d.value, 0);
  return (
    <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:8,padding:"10px 14px"}}>
      <div style={{color:P.text,fontSize:13,fontWeight:600}}>{payload[0].name}</div>
      <div style={{color:payload[0].payload.fill,fontSize:13}}>{fmt(payload[0].value)} ({total>0?((payload[0].value/total)*100).toFixed(1):0}%)</div>
      <div style={{color:P.muted,fontSize:11,marginTop:2}}>Click to drill down</div>
    </div>
  );
};

// ── Category Drawer ─────────────────────────────────────────────────────────
function CategoryDrawer({ category, color, onClose, txByCategory }) {
  const txs = (txByCategory||{})[category] || [];
  const total = txs.reduce((s,t) => s+Math.abs(t.amount), 0);
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(2px)"}} onClick={onClose}>
      <div style={{background:P.surface,borderRadius:"16px 16px 0 0",border:`1px solid ${P.border}`,width:"100%",maxWidth:860,maxHeight:"70vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"18px 24px 14px",borderBottom:`1px solid ${P.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:12,height:12,borderRadius:"50%",background:color}}/>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:P.text}}>{category}</div>
              <div style={{fontSize:12,color:P.muted}}>{txs.length} transactions</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:P.muted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Total</div>
              <div style={{fontSize:18,fontWeight:700,color}}>{fmt(total)}</div>
            </div>
            <button onClick={onClose} style={{background:P.card,border:`1px solid ${P.border}`,color:P.muted,borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16}}>✕</button>
          </div>
        </div>
        <div style={{overflowY:"auto",padding:"8px 24px 24px",flex:1}}>
          {txs.length===0&&<div style={{padding:"24px 0",textAlign:"center",color:P.muted,fontSize:13}}>No detailed transactions available</div>}
          {txs.map((tx,i) => {
            const isEst = tx.note?.startsWith("Est.");
            return (
              <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:i<txs.length-1?`1px solid ${P.border}`:"none",opacity:isEst?0.5:1}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:9,background:`${color}18`,border:`1px solid ${color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color,fontWeight:700}}>{(tx.merchant||"?")[0]}</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:500,color:P.text}}>{tx.merchant}</div>
                    <div style={{fontSize:11,color:P.muted}}>{tx.date}{tx.note?` · ${tx.note}`:""}</div>
                  </div>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:isEst?P.muted:P.red}}>{isEst?"~":""}{fmt(tx.amount)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{maxWidth:960,margin:"0 auto",padding:"24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        {[...Array(4)].map((_,i)=>(
          <div key={i} style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{width:80,height:10,borderRadius:4,background:P.border,marginBottom:10}}/>
            <div style={{width:100,height:20,borderRadius:4,background:P.border,marginBottom:6}}/>
            <div style={{width:60,height:10,borderRadius:4,background:P.surface}}/>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
        {[...Array(2)].map((_,i)=>(
          <div key={i} style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:20,height:200}}/>
        ))}
      </div>
      <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:20,height:300}}/>
      <style>{`@keyframes shimmer{0%{opacity:0.6}50%{opacity:1}100%{opacity:0.6}}`}</style>
    </div>
  );
}

// ── 1. Trends Tab ───────────────────────────────────────────────────────────
function TrendsTab({ monthlyTrend, categoryData }) {
  const [view, setView] = useState("total");
  const [selectedCats, setSelectedCats] = useState(["Dining Out","Shopping & Gear","Utilities","Transfers"]);
  const catNames = categoryData.map(c => c.name);
  const apr=monthlyTrend[0]||{}, may=monthlyTrend[1]||{}, jun=monthlyTrend[2]||{};
  const biggestRise = catNames.length?catNames.reduce((b,c) => ((jun[c]||0)-(may[c]||0)) > ((jun[b]||0)-(may[b]||0)) ? c : b, catNames[0]):"—";
  const biggestDrop = catNames.length?catNames.reduce((b,c) => ((jun[c]||0)-(may[c]||0)) < ((jun[b]||0)-(may[b]||0)) ? c : b, catNames[0]):"—";
  const toggleCat = n => setSelectedCats(p => p.includes(n) ? p.filter(x=>x!==n) : [...p,n]);

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:24}}>
        {[
          { label:"Apr → now change", value:fmt((jun.total||0)-(apr.total||0)), color:(jun.total||0)>(apr.total||0)?P.red:P.green, sub:((jun.total||0)>(apr.total||0)?"▲":"▼")+" vs April" },
          { label:"Biggest rise (vs last mo)", value:biggestRise, color:P.red, sub:"+"+fmt(((jun[biggestRise]||0)-(may[biggestRise]||0))) },
          { label:"Biggest drop (vs last mo)", value:biggestDrop, color:P.green, sub:fmt(((jun[biggestDrop]||0)-(may[biggestDrop]||0))) },
        ].map(k => (
          <div key={k.label} style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"16px 20px"}}>
            <div style={{fontSize:11,color:P.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>{k.label}</div>
            <div style={{fontSize:15,fontWeight:700,color:k.color,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{k.value}</div>
            <div style={{fontSize:12,color:P.muted,marginTop:2}}>{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {[["total","Total spending"],["categories","By category"]].map(([v,l]) => (
          <button key={v} onClick={()=>setView(v)} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${view===v?P.accent:P.border}`,background:view===v?`${P.accent}20`:"transparent",color:view===v?P.accent:P.muted,fontSize:13,fontWeight:600,cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      {view==="total" && (
        <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"20px 16px 8px",marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:600,color:P.dim,marginBottom:4,paddingLeft:8}}>Total monthly spending</div>
          <div style={{fontSize:11,color:P.muted,paddingLeft:8,marginBottom:16}}>Current month is live from your account</div>
          <ResponsiveContainer width="100%" height={200}><BarChart data={monthlyTrend}><CartesianGrid vertical={false} stroke={P.border}/><XAxis dataKey="month" tick={{fill:P.muted,fontSize:12}} axisLine={false} tickLine={false}/><YAxis tick={{fill:P.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmtShort}/><Tooltip content={<ChartTip/>}/><Bar dataKey="total" name="Total" fill={P.accent} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
          <div style={{margin:"16px 8px 8px",borderTop:`1px solid ${P.border}`,paddingTop:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:0}}>
              {["Category","Apr","May","Current"].map(h=><div key={h} style={{fontSize:11,color:P.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",padding:"4px 8px"}}>{h}</div>)}
              {catNames.map((c,i) => {
                const aV=apr[c]||0, mV=may[c]||0, jV=jun[c]||0, d=jV-mV;
                return [
                  <div key={`${i}n`} style={{fontSize:12,color:P.text,padding:"6px 8px",borderTop:`1px solid ${P.border}`}}>{categoryMeta[c]?.icon} {c}</div>,
                  <div key={`${i}a`} style={{fontSize:12,color:P.dim,padding:"6px 8px",borderTop:`1px solid ${P.border}`}}>{fmt(aV)}</div>,
                  <div key={`${i}m`} style={{fontSize:12,color:P.dim,padding:"6px 8px",borderTop:`1px solid ${P.border}`}}>{fmt(mV)}</div>,
                  <div key={`${i}j`} style={{fontSize:12,padding:"6px 8px",borderTop:`1px solid ${P.border}`,color:d>10?P.red:d<-10?P.green:P.text,fontWeight:Math.abs(d)>50?600:400}}>{fmt(jV)} {Math.abs(d)>5&&<span style={{fontSize:10}}>{d>0?"▲":"▼"}{fmt(d)}</span>}</div>,
                ];
              })}
            </div>
          </div>
        </div>
      )}
      {view==="categories" && (
        <div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
            {catNames.map((c,i) => (
              <button key={c} onClick={()=>toggleCat(c)} style={{padding:"4px 10px",borderRadius:20,border:`1px solid ${selectedCats.includes(c)?COLORS[i%COLORS.length]:P.border}`,background:selectedCats.includes(c)?`${COLORS[i%COLORS.length]}20`:"transparent",color:selectedCats.includes(c)?COLORS[i%COLORS.length]:P.muted,fontSize:11,cursor:"pointer",fontWeight:selectedCats.includes(c)?600:400}}>
                {categoryMeta[c]?.icon} {c}
              </button>
            ))}
          </div>
          <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"20px 16px 8px"}}>
            <ResponsiveContainer width="100%" height={260}><LineChart data={monthlyTrend}><CartesianGrid vertical={false} stroke={P.border}/><XAxis dataKey="month" tick={{fill:P.muted,fontSize:12}} axisLine={false} tickLine={false}/><YAxis tick={{fill:P.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmtShort}/><Tooltip content={<ChartTip/>}/>{catNames.filter(c=>selectedCats.includes(c)).map(c=><Line key={c} type="monotone" dataKey={c} stroke={COLORS[catNames.indexOf(c)%COLORS.length]} strokeWidth={2} dot={{r:4}} activeDot={{r:6}}/>)}</LineChart></ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 2. Budget Tracker ───────────────────────────────────────────────────────
function BudgetTrackerTab({ savedBudget, categoryData }) {
  const daysElapsed=new Date().getDate(), daysTotal=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
  const pace=daysTotal/daysElapsed;
  const budgetActuals = categoryData.reduce((acc,c)=>{acc[c.name]=c.value*(daysElapsed/daysTotal);return acc;},{});

  if (!savedBudget) return (
    <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"48px 24px",textAlign:"center"}}>
      <div style={{fontSize:36,marginBottom:12}}>📋</div>
      <div style={{fontSize:15,fontWeight:600,color:P.text,marginBottom:8}}>No budget set yet</div>
      <div style={{fontSize:13,color:P.muted}}>Generate a budget in the Budget tab, then save it to start tracking here.</div>
    </div>
  );
  const totalBudget=savedBudget.totalBudget;
  const totalActual=Object.values(budgetActuals).reduce((s,v)=>s+v,0);
  const totalPace=totalActual*pace;
  const overallPct=Math.min((totalActual/totalBudget)*100,100);
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:24}}>
        {[
          { label:"Monthly budget", value:fmt(totalBudget), color:P.accent, sub:"Target" },
          { label:"Spent so far (est.)", value:fmt(totalActual), color:P.amber, sub:`Day ${daysElapsed} of ${daysTotal}` },
          { label:"Projected total", value:fmt(totalPace), color:totalPace>totalBudget?P.red:P.green, sub:totalPace>totalBudget?"⚠ Over budget":"✓ On track" },
        ].map(k => (
          <div key={k.label} style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"16px 20px"}}>
            <div style={{fontSize:11,color:P.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>{k.label}</div>
            <div style={{fontSize:20,fontWeight:700,color:k.color}}>{k.value}</div>
            <div style={{fontSize:12,color:k.sub.startsWith("⚠")?P.red:k.sub.startsWith("✓")?P.green:P.muted,marginTop:2}}>{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"16px 20px",marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:600,color:P.text}}>Overall budget used</span>
          <span style={{fontSize:13,fontWeight:700,color:overallPct>80?P.red:P.green}}>{overallPct.toFixed(0)}%</span>
        </div>
        <div style={{background:P.border,borderRadius:8,height:10,overflow:"hidden",position:"relative"}}>
          <div style={{width:`${overallPct}%`,height:"100%",background:overallPct>80?P.red:overallPct>60?P.amber:P.green,borderRadius:8}}/>
          <div style={{position:"absolute",top:0,left:`${Math.min((daysElapsed/daysTotal)*100,100)}%`,width:2,height:"100%",background:"rgba(255,255,255,0.4)"}}/>
        </div>
        <div style={{fontSize:11,color:P.muted,marginTop:6}}>White line = current day in month ({Math.round((daysElapsed/daysTotal)*100)}% through)</div>
      </div>
      <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,overflow:"hidden"}}>
        <div style={{padding:"12px 20px",borderBottom:`1px solid ${P.border}`,display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 60px",gap:8}}>
          {["Category","Budget","Est. Spent","Projected",""].map(h=><div key={h} style={{fontSize:11,color:P.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em"}}>{h}</div>)}
        </div>
        {savedBudget.categories.map((cat,i) => {
          const actual=budgetActuals[cat.name]||0, projected=actual*pace;
          const pct=Math.min((actual/cat.budget)*100,100), projPct=(projected/cat.budget)*100;
          const color=COLORS[categoryData.findIndex(d=>d.name===cat.name)%COLORS.length]||P.accent;
          const status=projPct>100?"over":projPct>85?"risk":"ok";
          const meta=categoryMeta[cat.name]||{};
          return (
            <div key={i} style={{padding:"12px 20px",borderBottom:i<savedBudget.categories.length-1?`1px solid ${P.border}`:"none",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 60px",gap:8,alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:500,color:P.text,marginBottom:4}}>{meta.icon} {cat.name}</div>
                <div style={{background:P.border,borderRadius:4,height:4,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:status==="over"?P.red:status==="risk"?P.amber:color,borderRadius:4}}/></div>
              </div>
              <div style={{fontSize:13,color:P.dim}}>{fmt(cat.budget)}</div>
              <div style={{fontSize:13,color:P.amber,fontWeight:500}}>{fmt(actual)}</div>
              <div style={{fontSize:13,color:projPct>100?P.red:projPct>85?P.amber:P.green,fontWeight:500}}>{fmt(projected)}</div>
              <div style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:6,textAlign:"center",background:status==="over"?`${P.red}20`:status==="risk"?`${P.amber}20`:`${P.green}20`,color:status==="over"?P.red:status==="risk"?P.amber:P.green}}>{status==="over"?"OVER":status==="risk"?"RISK":"OK"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 3. Net Worth ────────────────────────────────────────────────────────────
function NetWorthTab({ accountBalance, institution, accountName }) {
  const initAccounts = [
    { id:1, name:accountName||"Wells Fargo Checking", type:"checking", balance:accountBalance?.current||0, linked:true },
    { id:2, name:"Ally Savings", type:"savings", balance:8240.00, linked:false },
    { id:3, name:"Fidelity 401k", type:"retirement", balance:142600.00, linked:false },
    { id:4, name:"Morgan Stanley", type:"investment", balance:0, linked:false },
    { id:5, name:"Home (Herndon VA)", type:"asset", balance:620000.00, linked:false },
    { id:6, name:"Mortgage", type:"liability", balance:-387500.00, linked:false },
    { id:7, name:"Vehicle Loan", type:"liability", balance:-14200.00, linked:false },
  ];
  const [accounts, setAccounts] = useState(initAccounts);
  const [editing, setEditing] = useState(null);
  const [addMode, setAddMode] = useState(false);
  const [newAcct, setNewAcct] = useState({name:"",type:"savings",balance:""});

  // Sync linked account when live data updates
  useEffect(() => {
    if (accountBalance?.current) {
      setAccounts(prev => prev.map(a => a.linked ? {...a, balance: accountBalance.current} : a));
    }
  }, [accountBalance?.current]);

  const assets = accounts.filter(a=>a.balance>=0);
  const liabs  = accounts.filter(a=>a.balance<0);
  const totalAssets = assets.reduce((s,a)=>s+a.balance,0);
  const totalLiabs  = Math.abs(liabs.reduce((s,a)=>s+a.balance,0));
  const netWorth = totalAssets-totalLiabs;
  const typeIcon  = {checking:"🏦",savings:"💰",retirement:"📈",investment:"📊",asset:"🏠",liability:"💳"};
  const typeLabel = {checking:"Checking",savings:"Savings",retirement:"Retirement",investment:"Investment",asset:"Asset",liability:"Liability"};
  const update = (id,val) => { const n=parseFloat(val); if(!isNaN(n)){setAccounts(p=>p.map(a=>a.id===id?{...a,balance:n}:a));setEditing(null);} };
  const addAccount = () => {
    const bal=parseFloat(newAcct.balance);
    if(!newAcct.name||isNaN(bal)) return;
    setAccounts(p=>[...p,{id:Date.now(),name:newAcct.name,type:newAcct.type,balance:newAcct.type==="liability"?-Math.abs(bal):bal,linked:false}]);
    setNewAcct({name:"",type:"savings",balance:""}); setAddMode(false);
  };
  const Section = ({title,items,isLiab}) => (
    <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"20px",marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:600,color:P.dim,marginBottom:16}}>{title}</div>
      {items.map(a => (
        <div key={a.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${P.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>{typeIcon[a.type]||"💼"}</span>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13,fontWeight:500,color:P.text}}>{a.name}</span>
                {a.linked&&<span style={{fontSize:9,background:`${P.green}20`,color:P.green,border:`1px solid ${P.green}40`,borderRadius:4,padding:"1px 5px",fontWeight:600}}>LIVE</span>}
              </div>
              <div style={{fontSize:11,color:P.muted}}>{typeLabel[a.type]||a.type}{a.linked?" · Synced":" · Manual"}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {editing===a.id ? (
              <input autoFocus type="number" defaultValue={Math.abs(a.balance)}
                onBlur={e=>update(a.id, isLiab?-Math.abs(parseFloat(e.target.value)):parseFloat(e.target.value))}
                onKeyDown={e=>e.key==="Enter"&&update(a.id, isLiab?-Math.abs(parseFloat(e.target.value)):parseFloat(e.target.value))}
                style={{width:120,background:P.surface,border:`1px solid ${P.accent}`,borderRadius:6,padding:"4px 8px",color:P.text,fontSize:13,textAlign:"right",outline:"none"}}/>
            ) : (
              <>
                <span style={{fontSize:14,fontWeight:600,color:isLiab?P.red:P.green,cursor:a.linked?"default":"pointer"}} onClick={()=>!a.linked&&setEditing(a.id)}>
                  {isLiab?"-":""}{fmt(Math.abs(a.balance))}
                </span>
                {!a.linked && <button onClick={()=>setAccounts(p=>p.filter(x=>x.id!==a.id))} style={{background:"none",border:"none",color:P.muted,cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <div>
      <div style={{background:`linear-gradient(135deg,${P.card} 0%,#1a2040 100%)`,border:`1px solid ${P.accent}30`,borderRadius:12,padding:"28px",marginBottom:24,textAlign:"center"}}>
        <div style={{fontSize:12,color:P.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Estimated Net Worth</div>
        <div style={{fontSize:40,fontWeight:800,letterSpacing:"-0.03em",color:netWorth>=0?P.green:P.red}}>{fmt(netWorth)}</div>
        <div style={{display:"flex",justifyContent:"center",gap:32,marginTop:16}}>
          <div><div style={{fontSize:11,color:P.muted,marginBottom:2}}>Total Assets</div><div style={{fontSize:18,fontWeight:700,color:P.green}}>{fmt(totalAssets)}</div></div>
          <div style={{width:1,background:P.border}}/>
          <div><div style={{fontSize:11,color:P.muted,marginBottom:2}}>Total Liabilities</div><div style={{fontSize:18,fontWeight:700,color:P.red}}>{fmt(totalLiabs)}</div></div>
        </div>
      </div>
      <Section title="Assets" items={assets} isLiab={false}/>
      <Section title="Liabilities" items={liabs} isLiab={true}/>
      {!addMode ? (
        <button onClick={()=>setAddMode(true)} style={{width:"100%",padding:"12px",borderRadius:8,border:`1px dashed ${P.border}`,background:"transparent",color:P.muted,fontSize:13,cursor:"pointer"}}>+ Add account or asset</button>
      ) : (
        <div style={{background:P.card,border:`1px solid ${P.accent}40`,borderRadius:12,padding:"20px"}}>
          <div style={{fontSize:13,fontWeight:600,color:P.text,marginBottom:16}}>Add account</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <input placeholder="Name" value={newAcct.name} onChange={e=>setNewAcct(p=>({...p,name:e.target.value}))} style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:8,padding:"10px 12px",color:P.text,fontSize:13,outline:"none"}}/>
            <select value={newAcct.type} onChange={e=>setNewAcct(p=>({...p,type:e.target.value}))} style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:8,padding:"10px 12px",color:P.text,fontSize:13,outline:"none"}}>
              {Object.entries(typeLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <input type="number" placeholder="Balance" value={newAcct.balance} onChange={e=>setNewAcct(p=>({...p,balance:e.target.value}))} style={{width:"100%",boxSizing:"border-box",background:P.surface,border:`1px solid ${P.border}`,borderRadius:8,padding:"10px 12px",color:P.text,fontSize:13,outline:"none",marginBottom:12}}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={addAccount} style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:P.accent,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Add</button>
            <button onClick={()=>setAddMode(false)} style={{padding:"10px 20px",borderRadius:8,border:`1px solid ${P.border}`,background:"transparent",color:P.muted,fontSize:13,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{fontSize:11,color:P.muted,marginTop:10,textAlign:"center"}}>Linked account updates on refresh · Click manual balances to edit</div>
    </div>
  );
}

// ── 4. Income Tab ───────────────────────────────────────────────────────────
function IncomeTab({ incomeSources, categoryData }) {
  const totalMonthly = incomeSources.reduce((s,src)=>s+(src.frequency==="Bi-weekly"?src.amount*26/12:src.amount),0);
  const monthlySpend = categoryData.reduce((s,d)=>s+d.value,0);
  const surplus = totalMonthly-monthlySpend;
  const savingsRate = totalMonthly>0?(surplus/totalMonthly*100):0;
  const transfersTotal = categoryData.find(d=>d.name==="Transfers")?.value||0;
  const incomeHistory = [
    {month:"Apr",total:8060.96},{month:"May",total:8060.96},{month:"Current",total:totalMonthly},
  ];
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:24}}>
        {[
          {label:"Monthly household income",value:fmt(totalMonthly),color:P.green,sub:"Combined"},
          {label:"Annual projected",value:fmtShort(totalMonthly*12),color:P.cyan,sub:"Both salaries"},
          {label:"Monthly surplus",value:fmt(surplus),color:surplus>=0?P.green:P.red,sub:`${savingsRate.toFixed(1)}% savings rate`},
        ].map(k=>(
          <div key={k.label} style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"16px 20px"}}>
            <div style={{fontSize:11,color:P.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>{k.label}</div>
            <div style={{fontSize:20,fontWeight:700,color:k.color}}>{k.value}</div>
            <div style={{fontSize:12,color:P.muted,marginTop:2}}>{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"20px",marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:600,color:P.dim,marginBottom:16}}>Income sources</div>
        {incomeSources.map((src,i)=>{
          const mEq=src.frequency==="Bi-weekly"?src.amount*26/12:src.frequency==="Detected"?src.amount:src.amount;
          const pct=totalMonthly>0?((mEq/totalMonthly)*100).toFixed(0):0;
          return (
            <div key={i} style={{padding:"14px 0",borderBottom:i<incomeSources.length-1?`1px solid ${P.border}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:P.text}}>{src.name}</div>
                  <div style={{fontSize:12,color:P.muted,marginTop:2}}>{src.frequency} · Last: {src.lastDate} · {pct}% of income</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:15,fontWeight:700,color:P.green}}>{fmt(src.amount)}</div>
                  <div style={{fontSize:11,color:P.muted}}>per occurrence</div>
                </div>
              </div>
              <div style={{background:P.border,borderRadius:4,height:4,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:i===0?P.accent:P.green,borderRadius:4}}/></div>
            </div>
          );
        })}
      </div>
      <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"20px 16px 8px",marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:600,color:P.dim,marginBottom:4,paddingLeft:8}}>Monthly income trend</div>
        <ResponsiveContainer width="100%" height={180}><BarChart data={incomeHistory}><CartesianGrid vertical={false} stroke={P.border}/><XAxis dataKey="month" tick={{fill:P.muted,fontSize:12}} axisLine={false} tickLine={false}/><YAxis tick={{fill:P.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmtShort}/><Tooltip content={<ChartTip/>}/><Bar dataKey="total" name="Income" fill={P.green} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
      </div>
      <div style={{background:P.card,border:`1px solid ${P.border}`,borderLeft:`3px solid ${surplus>=0?P.green:P.red}`,borderRadius:12,padding:"18px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,color:P.text}}>Income vs spending</div>
          <div style={{fontSize:13,fontWeight:700,color:surplus>=0?P.green:P.red}}>{savingsRate.toFixed(1)}% surplus</div>
        </div>
        {[
          {label:"Monthly income",value:totalMonthly,color:P.green,w:100},
          {label:"Monthly spending",value:monthlySpend,color:P.amber,w:totalMonthly>0?(monthlySpend/totalMonthly)*100:0},
          {label:"Dedicated to savings",value:transfersTotal,color:P.cyan,w:totalMonthly>0?(transfersTotal/totalMonthly)*100:0},
        ].map(r=>(
          <div key={r.label} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:P.muted}}>{r.label}</span><span style={{fontSize:12,fontWeight:600,color:r.color}}>{fmt(r.value)}</span></div>
            <div style={{background:P.border,borderRadius:4,height:6,overflow:"hidden"}}><div style={{width:`${Math.min(r.w,100)}%`,height:"100%",background:r.color,borderRadius:4}}/></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Alerts ──────────────────────────────────────────────────────────────────
function AlertsBadge({ count }) {
  if (!count) return null;
  return <span style={{background:P.red,color:"#fff",fontSize:10,fontWeight:700,borderRadius:10,padding:"1px 5px",marginLeft:4}}>{count}</span>;
}

function AlertsPanel({ alerts, caps, onUpdateCap, categoryData }) {
  const [editingCat, setEditingCat] = useState(null);
  const [capInput, setCapInput] = useState("");
  const budgetActuals = categoryData.reduce((acc,c)=>{
    const d=new Date().getDate(), total=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
    acc[c.name]=c.value*(d/total); return acc;
  },{});
  return (
    <div>
      {alerts.length>0 && (
        <div style={{marginBottom:20}}>
          {alerts.map((a,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:`${a.severity==="over"?P.red:P.amber}15`,border:`1px solid ${a.severity==="over"?P.red:P.amber}40`,borderRadius:10,marginBottom:8}}>
              <span style={{fontSize:18}}>{a.severity==="over"?"🚨":"⚠️"}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:P.text}}>{a.category} {a.severity==="over"?"exceeded":"approaching"} limit</div>
                <div style={{fontSize:11,color:P.muted}}>{fmt(a.spent)} spent of {fmt(a.cap)} cap ({a.pct.toFixed(0)}%)</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"20px"}}>
        <div style={{fontSize:13,fontWeight:600,color:P.dim,marginBottom:4}}>Spending caps</div>
        <div style={{fontSize:12,color:P.muted,marginBottom:16}}>Set a soft limit on any category. You'll see alerts when you approach or exceed it.</div>
        {categoryData.map((cat,i)=>{
          const cap=caps[cat.name], spent=budgetActuals[cat.name]||0, pct=cap?(spent/cap)*100:0;
          const status=cap?(pct>=100?"over":pct>=80?"warn":"ok"):null;
          return (
            <div key={i} style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr auto",gap:10,alignItems:"center",padding:"8px 0",borderBottom:i<categoryData.length-1?`1px solid ${P.border}`:"none"}}>
              <span style={{fontSize:16}}>{categoryMeta[cat.name]?.icon||"📁"}</span>
              <div style={{fontSize:13,color:P.text}}>{cat.name}</div>
              {editingCat===cat.name ? (
                <div style={{display:"flex",gap:6}}>
                  <input autoFocus type="number" value={capInput} onChange={e=>setCapInput(e.target.value)} placeholder="Cap $"
                    style={{flex:1,background:P.surface,border:`1px solid ${P.accent}`,borderRadius:6,padding:"4px 8px",color:P.text,fontSize:12,outline:"none"}}/>
                  <button onClick={()=>{onUpdateCap(cat.name,parseFloat(capInput)||null);setEditingCat(null);}} style={{padding:"4px 10px",borderRadius:6,border:"none",background:P.accent,color:"#fff",fontSize:11,cursor:"pointer"}}>✓</button>
                  <button onClick={()=>setEditingCat(null)} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${P.border}`,background:"transparent",color:P.muted,fontSize:11,cursor:"pointer"}}>✗</button>
                </div>
              ) : (
                <div style={{fontSize:12,color:cap?(status==="over"?P.red:status==="warn"?P.amber:P.green):P.muted}}>
                  {cap?`${fmt(spent)} / ${fmt(cap)} (${pct.toFixed(0)}%)`:"No cap"}
                </div>
              )}
              <button onClick={()=>{setEditingCat(cat.name);setCapInput(cap||"");}} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${P.border}`,background:"transparent",color:P.muted,fontSize:11,cursor:"pointer"}}>{cap?"Edit":"Set cap"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Budget Generator ────────────────────────────────────────────────────────
function BudgetTab({ onSaveBudget, categoryData }) {
  const monthTotal=categoryData.reduce((s,d)=>s+d.value,0);
  const [direction,setDirection]=useState("decrease");
  const [amount,setAmount]=useState("");
  const [mode,setMode]=useState("dollar");
  const [loading,setLoading]=useState(false);
  const [budget,setBudget]=useState(null);
  const [editedBudget,setEditedBudget]=useState(null);
  const [error,setError]=useState(null);
  const [userEdited,setUserEdited]=useState({});
  const [saved,setSaved]=useState(false);
  const activeBudget=editedBudget||budget;
  const targetDelta=(()=>{ const n=parseFloat(amount); if(isNaN(n)||n<=0)return null; return mode==="percent"?(monthTotal*n)/100:n; })();
  const targetTotal=targetDelta?(direction==="decrease"?Math.max(0,monthTotal-targetDelta):monthTotal+targetDelta):null;

  const generate=useCallback(async()=>{
    if(!targetTotal)return;
    setLoading(true);setError(null);setBudget(null);setEditedBudget(null);setUserEdited({});setSaved(false);
    const prompt=`You are a personal finance advisor. A user wants to ${direction} monthly spending by ${mode==="percent"?`${amount}%`:`$${amount}`}.\n\nCurrent spending:\n${categoryData.map(c=>`- ${c.name}: $${c.value.toFixed(2)}${categoryMeta[c.name]?.fixed?" [FIXED]":""}`).join("\n")}\n\nCurrent total: $${monthTotal.toFixed(2)}\nTarget: $${targetTotal.toFixed(2)}\n\n[FIXED] categories stay within 2%. Cuts go to discretionary first. Every category > 0. Sum must equal $${targetTotal.toFixed(2)}.\n\nRespond ONLY with JSON (no markdown):\n{"totalBudget":number,"categories":[{"name":"exact name","budget":number,"change":number,"tip":"max 12 words"}],"summary":"2-3 sentences","savingsHighlight":"biggest change"}`;
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,messages:[{role:"user",content:prompt}]})});
      const data=await res.json();
      const raw=data.content?.find(b=>b.type==="text")?.text||"";
      setBudget(JSON.parse(raw.replace(/```json|```/g,"").trim()));
    } catch(e){setError("Couldn't generate budget. Please try again.");}
    finally{setLoading(false);}
  },[targetTotal,direction,amount,mode,monthTotal,categoryData]);

  const handleLineEdit=(name,val)=>{
    if(!activeBudget)return;
    const num=parseFloat(val);if(isNaN(num))return;
    const updated={...activeBudget,categories:activeBudget.categories.map(c=>c.name===name?{...c,budget:num,change:num-(categoryData.find(d=>d.name===name)?.value||0)}:c)};
    updated.totalBudget=updated.categories.reduce((s,c)=>s+c.budget,0);
    setEditedBudget(updated);setUserEdited(p=>({...p,[name]:true}));
  };
  const cc=(ch)=>ch<-5?P.green:ch>5?P.red:P.muted;

  return (
    <div>
      <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"24px",marginBottom:24}}>
        <div style={{fontSize:14,fontWeight:700,color:P.text,marginBottom:4}}>Build next month's budget</div>
        <div style={{fontSize:12,color:P.muted,marginBottom:20}}>Current spend: <span style={{color:P.amber,fontWeight:600}}>{fmt(monthTotal)}</span> — set your goal and Claude will generate a breakdown.</div>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {["decrease","increase"].map(d=>(
            <button key={d} onClick={()=>setDirection(d)} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${direction===d?(d==="decrease"?P.green:P.red):P.border}`,background:direction===d?(d==="decrease"?`${P.green}18`:`${P.red}18`):"transparent",color:direction===d?(d==="decrease"?P.green:P.red):P.muted,cursor:"pointer",fontWeight:600,fontSize:13}}>
              {d==="decrease"?"↓ Spend less":"↑ Spend more"}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          <div style={{flex:1,position:"relative"}}>
            <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:P.muted,fontSize:14,pointerEvents:"none"}}>{mode==="dollar"?"$":"%"}</span>
            <input type="number" min="0" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={mode==="dollar"?"e.g. 300":"e.g. 15"}
              style={{width:"100%",boxSizing:"border-box",background:P.surface,border:`1px solid ${P.border}`,borderRadius:8,padding:"10px 12px 10px 28px",color:P.text,fontSize:14,outline:"none"}}/>
          </div>
          <div style={{display:"flex",background:P.surface,border:`1px solid ${P.border}`,borderRadius:8,overflow:"hidden"}}>
            {["dollar","percent"].map(m=><button key={m} onClick={()=>setMode(m)} style={{padding:"0 16px",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:mode===m?P.accent:"transparent",color:mode===m?"#fff":P.muted}}>{m==="dollar"?"$":"%"}</button>)}
          </div>
        </div>
        {targetTotal!==null&&(
          <div style={{background:P.surface,borderRadius:8,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,color:P.muted}}>Target</span>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:12,color:P.muted,textDecoration:"line-through"}}>{fmt(monthTotal)}</span>
              <span style={{fontSize:16,fontWeight:700,color:direction==="decrease"?P.green:P.red}}>{fmt(targetTotal)}</span>
              <span style={{fontSize:12,color:direction==="decrease"?P.green:P.red}}>{direction==="decrease"?"▼":"▲"} {fmt(targetDelta)}</span>
            </div>
          </div>
        )}
        <button onClick={generate} disabled={!targetTotal||loading} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:targetTotal&&!loading?P.accent:P.border,color:targetTotal&&!loading?"#fff":P.muted,fontSize:14,fontWeight:700,cursor:targetTotal&&!loading?"pointer":"not-allowed"}}>
          {loading?"Generating…":"✨ Generate budget"}
        </button>
        {error&&<div style={{marginTop:10,fontSize:12,color:P.red}}>{error}</div>}
      </div>
      {activeBudget&&!loading&&(
        <div>
          <div style={{background:P.card,border:`1px solid ${P.accent}30`,borderLeft:`3px solid ${P.accent}`,borderRadius:12,padding:"18px 20px",marginBottom:20}}>
            <div style={{fontSize:12,color:P.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Strategy</div>
            <div style={{fontSize:13,color:P.text,lineHeight:1.6,marginBottom:8}}>{activeBudget.summary}</div>
            <div style={{fontSize:12,color:P.amber}}>💡 {activeBudget.savingsHighlight}</div>
          </div>
          <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"16px 20px",marginBottom:20,display:"flex",justifyContent:"space-around"}}>
            {[{label:"Current",value:monthTotal,color:P.amber},{label:"Budget",value:activeBudget.totalBudget,color:direction==="decrease"?P.green:P.red},{label:"Difference",value:Math.abs(activeBudget.totalBudget-monthTotal),color:activeBudget.totalBudget<monthTotal?P.green:P.red,prefix:activeBudget.totalBudget<monthTotal?"▼ ":"▲ "}].map(s=>(
              <div key={s.label} style={{textAlign:"center"}}>
                <div style={{fontSize:11,color:P.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>{s.label}</div>
                <div style={{fontSize:18,fontWeight:700,color:s.color}}>{s.prefix||""}{fmt(s.value)}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:P.muted,marginBottom:10}}>✏️ Click any budget amount to adjust manually</div>
          <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,overflow:"hidden"}}>
            {activeBudget.categories.map((cat,i)=>{
              const meta=categoryMeta[cat.name]||{};
              const color=COLORS[categoryData.findIndex(d=>d.name===cat.name)%COLORS.length]||P.accent;
              const pct=((cat.budget/activeBudget.totalBudget)*100).toFixed(0);
              const isEd=userEdited[cat.name];
              return (
                <div key={i} style={{display:"grid",gridTemplateColumns:"32px 1fr auto auto",gap:12,alignItems:"center",padding:"14px 20px",borderBottom:i<activeBudget.categories.length-1?`1px solid ${P.border}`:"none",background:isEd?`${P.accent}08`:"transparent"}}>
                  <div style={{fontSize:18,textAlign:"center"}}>{meta.icon||"📁"}</div>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <span style={{fontSize:13,fontWeight:600,color:P.text}}>{cat.name}</span>
                      {meta.fixed&&<span style={{fontSize:9,color:P.muted,border:`1px solid ${P.border}`,borderRadius:3,padding:"1px 4px"}}>FIXED</span>}
                      {isEd&&<span style={{fontSize:9,color:P.accent,border:`1px solid ${P.accent}50`,borderRadius:3,padding:"1px 4px"}}>EDITED</span>}
                    </div>
                    <div style={{background:P.border,borderRadius:3,height:3,marginBottom:4,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:3}}/></div>
                    <div style={{fontSize:11,color:P.muted}}>{cat.tip}</div>
                  </div>
                  <div style={{textAlign:"right",minWidth:52}}>
                    <div style={{fontSize:11,fontWeight:600,color:cc(cat.change)}}>{cat.change>0?"+":""}{fmt(cat.change)}</div>
                    <div style={{fontSize:10,color:P.muted}}>vs now</div>
                  </div>
                  <div style={{minWidth:88}}>
                    <div style={{position:"relative"}}>
                      <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:P.muted,fontSize:12,pointerEvents:"none"}}>$</span>
                      <input type="number" min="0" step="1" value={cat.budget.toFixed(0)} onChange={e=>handleLineEdit(cat.name,e.target.value)}
                        style={{width:"100%",boxSizing:"border-box",background:P.surface,border:`1px solid ${isEd?P.accent:P.border}`,borderRadius:6,padding:"6px 6px 6px 20px",color:P.text,fontSize:13,fontWeight:600,outline:"none"}}/>
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{display:"grid",gridTemplateColumns:"32px 1fr auto auto",gap:12,alignItems:"center",padding:"14px 20px",background:P.surface,borderTop:`2px solid ${P.border}`}}>
              <div/><div style={{fontSize:13,fontWeight:700,color:P.text}}>Total Budget</div>
              <div style={{textAlign:"right",minWidth:52}}><div style={{fontSize:12,fontWeight:600,color:activeBudget.totalBudget<monthTotal?P.green:P.red}}>{activeBudget.totalBudget<monthTotal?"▼":"▲"} {fmt(Math.abs(activeBudget.totalBudget-monthTotal))}</div></div>
              <div style={{minWidth:88,textAlign:"right"}}><span style={{fontSize:15,fontWeight:700,color:P.text}}>{fmt(activeBudget.totalBudget)}</span></div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <button onClick={()=>{onSaveBudget(activeBudget);setSaved(true);}} style={{flex:1,padding:"12px",borderRadius:8,border:"none",background:saved?P.green:P.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
              {saved?"✓ Budget saved to tracker":"💾 Save & track this budget"}
            </button>
            <button onClick={generate} style={{padding:"12px 16px",borderRadius:8,border:`1px solid ${P.border}`,background:"transparent",color:P.muted,fontSize:13,cursor:"pointer"}}>↺</button>
          </div>
          {saved&&<div style={{fontSize:12,color:P.green,textAlign:"center",marginTop:8}}>Saved! Check Budget Tracker to follow your progress.</div>}
        </div>
      )}
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────
export default function FinancialDashboard() {
  const { data, status, error, refresh, lastRefreshed } = useLiveData();
  const {
    accountBalance, accountName, institution,
    categoryData, recentTransactions, txByCategory,
    last7Days, incomeSources, subscriptions,
    upcomingPayments, monthlyTrend,
  } = data;

  const savingsTips = buildSavingsTips(categoryData, subscriptions);

  const [activeTab,setActiveTab]=useState("overview");
  const [selectedCategory,setSelectedCategory]=useState(null);
  const [savedBudget,setSavedBudget]=useState(null);
  const [caps,setCaps]=useState({"Dining Out":350,"Shopping & Gear":800});

  const monthTotal=categoryData.reduce((s,d)=>s+d.value,0);
  const totalMonthlyIncome=incomeSources.reduce((s,src)=>s+(src.frequency==="Bi-weekly"?src.amount*26/12:src.amount),0);
  const savingsRate=totalMonthlyIncome>0?((totalMonthlyIncome-monthTotal)/totalMonthlyIncome*100):0;
  const transfersTotal=categoryData.find(d=>d.name==="Transfers")?.value||0;
  const dedicatedRate=totalMonthlyIncome>0?(transfersTotal/totalMonthlyIncome*100):0;

  const alerts=categoryData.flatMap(cat=>{
    const cap=caps[cat.name]; if(!cap)return [];
    const d=new Date().getDate(), total=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
    const spent=cat.value*(d/total), pct=(spent/cap)*100;
    return pct>=80?[{category:cat.name,cap,spent,pct,severity:pct>=100?"over":"warn"}]:[];
  });

  const updateCap=(name,val)=>setCaps(p=>val?{...p,[name]:val}:Object.fromEntries(Object.entries(p).filter(([k])=>k!==name)));
  const selectedColor=selectedCategory?COLORS[categoryData.findIndex(c=>c.name===selectedCategory)%COLORS.length]:null;

  const lastRefreshedLabel=(()=>{
    if(!lastRefreshed) return "Loading…";
    const diff=Math.floor((Date.now()-lastRefreshed)/1000);
    if(diff<60) return "Just now";
    if(diff<3600) return `${Math.floor(diff/60)}m ago`;
    return lastRefreshed.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  })();

  const tabs=[
    {id:"overview",label:"Overview"},
    {id:"trends",label:"Trends"},
    {id:"spending",label:"Spending"},
    {id:"income",label:"Income"},
    {id:"net-worth",label:"Net Worth"},
    {id:"tracker",label:"Budget Tracker"},
    {id:"budget",label:"Budget"},
    {id:"alerts",label:"Alerts",badge:alerts.length},
    {id:"subscriptions",label:"Subscriptions"},
    {id:"save-money",label:"Save Money"},
  ];

  return (
    <div style={{background:P.bg,minHeight:"100vh",color:P.text,fontFamily:"'Inter',system-ui,sans-serif",paddingBottom:40}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {selectedCategory&&<CategoryDrawer category={selectedCategory} color={selectedColor} onClose={()=>setSelectedCategory(null)} txByCategory={txByCategory}/>}

      {/* Header */}
      <div style={{background:P.surface,borderBottom:`1px solid ${P.border}`,padding:"20px 24px 0"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                <div style={{fontSize:11,color:P.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>{institution} · {accountName}</div>
                {status==="success"&&<span style={{fontSize:9,background:`${P.green}20`,color:P.green,border:`1px solid ${P.green}40`,borderRadius:4,padding:"1px 5px",fontWeight:600}}>LIVE</span>}
                {status==="error"&&<span style={{fontSize:9,background:`${P.amber}20`,color:P.amber,border:`1px solid ${P.amber}40`,borderRadius:4,padding:"1px 5px",fontWeight:600}}>CACHED</span>}
                {status==="unconfigured"&&<span style={{fontSize:9,background:`${P.muted}20`,color:P.muted,border:`1px solid ${P.muted}40`,borderRadius:4,padding:"1px 5px",fontWeight:600}}>STATIC</span>}
              </div>
              <div style={{fontSize:30,fontWeight:700,letterSpacing:"-0.02em",color:P.text}}>{fmt(accountBalance.current)}</div>
              <div style={{fontSize:13,color:P.muted,marginTop:2}}>Available: <span style={{color:P.green}}>{fmt(accountBalance.available)}</span></div>
            </div>
            <div style={{display:"flex",gap:20,alignItems:"flex-start"}}>
              {[
                {label:"Monthly spend",value:fmt(monthTotal),color:P.amber},
                {label:"Savings rate",value:`${savingsRate.toFixed(1)}%`,color:P.green},
                {label:"To savings",value:`${dedicatedRate.toFixed(1)}%`,color:P.cyan},
              ].map(k=>(
                <div key={k.label} style={{textAlign:"center"}}>
                  <div style={{fontSize:10,color:P.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>{k.label}</div>
                  <div style={{fontSize:17,fontWeight:700,color:k.color}}>{k.value}</div>
                </div>
              ))}
              {/* Refresh button */}
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <button onClick={refresh} disabled={status==="loading"} title="Refresh financial data"
                  style={{width:38,height:38,borderRadius:10,border:`1px solid ${status==="loading"?P.accent:P.border}`,background:status==="loading"?`${P.accent}18`:P.card,color:status==="loading"?P.accent:P.muted,cursor:status==="loading"?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,transition:"all 0.2s"}}>
                  <span style={{display:"inline-block",animation:status==="loading"?"spin 0.9s linear infinite":"none"}}>⟳</span>
                </button>
                <div style={{fontSize:9,color:P.muted,textAlign:"center"}}>{status==="loading"?"Syncing…":lastRefreshedLabel}</div>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
            {tabs.map(t=>(
              <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{background:activeTab===t.id?P.accent:"transparent",color:activeTab===t.id?"#fff":P.muted,border:"none",borderRadius:"6px 6px 0 0",padding:"8px 12px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",transition:"all 0.15s"}}>
                {t.label}{t.badge?<AlertsBadge count={t.badge}/>:null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading overlay on initial load */}
      {status==="loading"&&!lastRefreshed&&(
        <div>
          <div style={{maxWidth:960,margin:"24px auto 0",padding:"0 24px"}}>
            <div style={{background:P.card,border:`1px solid ${P.accent}30`,borderRadius:12,padding:"20px 24px",marginBottom:20,display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontSize:24,display:"inline-block",animation:"spin 0.9s linear infinite"}}>⟳</span>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:P.text,marginBottom:2}}>Fetching live data…</div>
                <div style={{fontSize:12,color:P.muted}}>Connecting to {institution||"your bank"} via Era Context</div>
              </div>
            </div>
          </div>
          <LoadingSkeleton/>
        </div>
      )}

      {/* Unconfigured banner */}
      {status==="unconfigured"&&(
        <div style={{maxWidth:960,margin:"16px auto 0",padding:"0 24px"}}>
          <div style={{background:`${P.accent}12`,border:`1px solid ${P.accent}40`,borderRadius:10,padding:"14px 18px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>🔌</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:P.accent,marginBottom:2}}>Proxy not configured — showing static data</div>
              <div style={{fontSize:12,color:P.dim}}>Deploy the proxy server and set <code style={{background:P.card,padding:"1px 5px",borderRadius:3,fontSize:11}}>PROXY_URL</code> in the dashboard to enable live refresh. See README.md for setup steps.</div>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {status==="error"&&(
        <div style={{maxWidth:960,margin:"16px auto 0",padding:"0 24px"}}>
          <div style={{background:`${P.amber}15`,border:`1px solid ${P.amber}40`,borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>⚠️</span>
            <div style={{flex:1}}>
              <span style={{fontSize:13,fontWeight:600,color:P.amber}}>Could not fetch live data</span>
              <span style={{fontSize:13,color:P.dim}}> — showing last known data. {error}</span>
            </div>
            <button onClick={refresh} style={{padding:"4px 12px",borderRadius:6,border:`1px solid ${P.amber}40`,background:"transparent",color:P.amber,fontSize:12,cursor:"pointer"}}>Retry</button>
          </div>
        </div>
      )}

      {/* Content */}
      {(status!=="loading"||lastRefreshed)&&(
      <div style={{maxWidth:960,margin:"0 auto",padding:"24px 24px 0"}}>

        {activeTab==="overview"&&(
          <div>
            {alerts.length>0&&(
              <div style={{background:`${P.amber}15`,border:`1px solid ${P.amber}40`,borderRadius:10,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>⚠️</span>
                <div style={{flex:1}}><span style={{fontSize:13,fontWeight:600,color:P.amber}}>{alerts.length} spending alert{alerts.length>1?"s":""}</span><span style={{fontSize:13,color:P.dim}}> — {alerts.map(a=>a.category).join(", ")} near or over cap</span></div>
                <button onClick={()=>setActiveTab("alerts")} style={{padding:"4px 12px",borderRadius:6,border:`1px solid ${P.amber}40`,background:"transparent",color:P.amber,fontSize:12,cursor:"pointer"}}>View →</button>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
              {[
                {label:"Spent last 7 days",value:fmt(last7Days.reduce((s,d)=>s+d.out,0)),color:P.red,sub:"Rolling 7 days"},
                {label:"Income last 7 days",value:fmt(last7Days.reduce((s,d)=>s+d.in,0)),color:P.green,sub:"Detected income"},
                {label:"Savings rate",value:`${savingsRate.toFixed(1)}%`,color:P.green,sub:"Income surplus"},
                {label:"Dedicated savings",value:`${dedicatedRate.toFixed(1)}%`,color:P.cyan,sub:fmt(transfersTotal)+" transferred"},
              ].map(k=>(
                <div key={k.label} style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"14px 16px"}}>
                  <div style={{fontSize:10,color:P.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>{k.label}</div>
                  <div style={{fontSize:18,fontWeight:700,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:11,color:P.muted,marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
              <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"20px 16px 8px"}}>
                <div style={{fontSize:13,fontWeight:600,color:P.dim,marginBottom:16,paddingLeft:8}}>Daily cash flow — last 7 days</div>
                <ResponsiveContainer width="100%" height={160}><BarChart data={last7Days} barGap={4}><CartesianGrid vertical={false} stroke={P.border}/><XAxis dataKey="date" tick={{fill:P.muted,fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:P.muted,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fmtShort}/><Tooltip content={<ChartTip/>}/><Bar dataKey="out" name="Outflow" fill={P.red} radius={[4,4,0,0]}/><Bar dataKey="in" name="Inflow" fill={P.green} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
              </div>
              <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"20px 16px 8px"}}>
                <div style={{fontSize:13,fontWeight:600,color:P.dim,marginBottom:4,paddingLeft:8}}>3-month trend</div>
                <div style={{fontSize:11,color:P.muted,paddingLeft:8,marginBottom:12}}>Current month is live data</div>
                <ResponsiveContainer width="100%" height={160}><BarChart data={monthlyTrend}><CartesianGrid vertical={false} stroke={P.border}/><XAxis dataKey="month" tick={{fill:P.muted,fontSize:12}} axisLine={false} tickLine={false}/><YAxis tick={{fill:P.muted,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fmtShort}/><Tooltip content={<ChartTip/>}/><Bar dataKey="total" name="Total" fill={P.accent} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
              </div>
            </div>
            <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"20px"}}>
              <div style={{fontSize:13,fontWeight:600,color:P.dim,marginBottom:16}}>Recent transactions</div>
              {recentTransactions.map((tx,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:i<recentTransactions.length-1?`1px solid ${P.border}`:"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{fontSize:11,color:P.muted,minWidth:44}}>{tx.date}</div>
                    <div><div style={{fontSize:13,fontWeight:500,color:P.text}}>{tx.merchant}</div><div style={{fontSize:11,color:P.muted}}>{tx.category}</div></div>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:tx.amount<0?P.red:P.green}}>{tx.amount<0?"-":"+"}{fmt(tx.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab==="trends"&&<TrendsTab monthlyTrend={monthlyTrend} categoryData={categoryData}/>}

        {activeTab==="spending"&&(
          <div>
            <div style={{fontSize:12,color:P.muted,marginBottom:16,display:"flex",alignItems:"center",gap:6}}><span>👆</span> Click any category to see transactions</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
              <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"20px 16px"}}>
                <div style={{fontSize:13,fontWeight:600,color:P.dim,marginBottom:8}}>Spending by category</div>
                <div style={{fontSize:11,color:P.muted,marginBottom:12}}>Total: {fmt(monthTotal)}</div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={2} onClick={d=>setSelectedCategory(d.name)} style={{cursor:"pointer"}}>
                      {categoryData.map((entry,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} opacity={selectedCategory&&selectedCategory!==entry.name?0.3:1} stroke={selectedCategory===entry.name?"#fff":"none"} strokeWidth={selectedCategory===entry.name?2:0}/>)}
                    </Pie>
                    <Tooltip content={<PieTip categoryData={categoryData}/>}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"20px",overflowY:"auto",maxHeight:340}}>
                <div style={{fontSize:13,fontWeight:600,color:P.dim,marginBottom:16}}>Breakdown</div>
                {categoryData.map((cat,i)=>{
                  const pct=((cat.value/monthTotal)*100).toFixed(0), isSel=selectedCategory===cat.name;
                  return (
                    <div key={i} onClick={()=>setSelectedCategory(cat.name)} style={{marginBottom:8,cursor:"pointer",borderRadius:6,padding:"4px 6px",margin:"0 -6px 8px",background:isSel?`${COLORS[i%COLORS.length]}15`:"transparent",border:isSel?`1px solid ${COLORS[i%COLORS.length]}40`:"1px solid transparent"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:COLORS[i%COLORS.length],flexShrink:0}}/><span style={{fontSize:12,color:isSel?P.text:P.dim,fontWeight:isSel?600:400}}>{cat.name}</span></div>
                        <span style={{fontSize:12,fontWeight:600,color:isSel?COLORS[i%COLORS.length]:P.text}}>{fmt(cat.value)}</span>
                      </div>
                      <div style={{background:P.border,borderRadius:4,height:4,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:COLORS[i%COLORS.length],borderRadius:4,opacity:isSel?1:0.7}}/></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab==="income"&&<IncomeTab incomeSources={incomeSources} categoryData={categoryData}/>}
        {activeTab==="net-worth"&&<NetWorthTab accountBalance={accountBalance} institution={institution} accountName={accountName}/>}
        {activeTab==="tracker"&&<BudgetTrackerTab savedBudget={savedBudget} categoryData={categoryData}/>}
        {activeTab==="budget"&&<BudgetTab onSaveBudget={b=>{setSavedBudget(b);}} categoryData={categoryData}/>}
        {activeTab==="alerts"&&<AlertsPanel alerts={alerts} caps={caps} onUpdateCap={updateCap} categoryData={categoryData}/>}

        {activeTab==="subscriptions"&&(
          <div>
            <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"20px",marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:600,color:P.dim,marginBottom:4}}>Active subscriptions</div>
              <div style={{fontSize:12,color:P.muted,marginBottom:20}}>Detected from transaction history</div>
              {subscriptions.map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0",borderBottom:i<subscriptions.length-1?`1px solid ${P.border}`:"none"}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,fontWeight:600,color:P.text}}>{s.name}</span>{s.status==="review"&&<span style={{fontSize:10,background:"#fbbf2420",color:P.amber,border:`1px solid ${P.amber}40`,borderRadius:4,padding:"1px 6px",fontWeight:600}}>REVIEW</span>}</div>
                    <div style={{fontSize:12,color:P.muted,marginTop:2}}>{s.frequency} · Next: {s.nextDue}</div>
                  </div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:15,fontWeight:700,color:s.status==="review"?P.amber:P.text}}>{fmt(s.amount)}</div><div style={{fontSize:11,color:P.muted}}>per occurrence</div></div>
                </div>
              ))}
            </div>
            <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:12,padding:"20px"}}>
              <div style={{fontSize:13,fontWeight:600,color:P.dim,marginBottom:4}}>Upcoming payments</div>
              <div style={{fontSize:12,color:P.muted,marginBottom:20}}>Estimated from billing patterns</div>
              {upcomingPayments.map((p,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 0",borderBottom:i<upcomingPayments.length-1?`1px solid ${P.border}`:"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:8,height:8,borderRadius:"50%",background:p.type==="bill"?P.accent:p.type==="subscription"?P.green:P.amber,flexShrink:0}}/><div><div style={{fontSize:13,fontWeight:500,color:P.text}}>{p.name}</div><div style={{fontSize:11,color:P.muted,textTransform:"capitalize"}}>{p.type} · Due {p.due}</div></div></div>
                  <div style={{fontSize:14,fontWeight:600,color:P.red}}>–{fmt(p.amount)}</div>
                </div>
              ))}
              <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${P.border}`,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:13,fontWeight:600,color:P.dim}}>Estimated total</span>
                <span style={{fontSize:15,fontWeight:700,color:P.red}}>{fmt(upcomingPayments.reduce((s,p)=>s+p.amount,0))}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab==="save-money"&&(
          <div>
            <div style={{fontSize:13,color:P.muted,marginBottom:20}}>Personalized opportunities based on your live spending data.</div>
            {savingsTips.map((tip,i)=>{
              const bc=tip.severity==="high"?P.red:tip.severity==="positive"?P.green:P.amber;
              return (
                <div key={i} style={{background:P.card,border:`1px solid ${P.border}`,borderLeft:`3px solid ${bc}`,borderRadius:12,padding:"18px 20px",marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{fontSize:18}}>{tip.icon}</span><span style={{fontSize:14,fontWeight:700,color:P.text}}>{tip.title}</span></div>
                      <div style={{fontSize:13,color:P.dim,lineHeight:1.5}}>{tip.tip}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:10,color:P.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>Potential saving</div>
                      <div style={{fontSize:13,fontWeight:700,color:bc}}>{tip.saving}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
      )}
    </div>
  );
}
