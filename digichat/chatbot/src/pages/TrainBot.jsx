import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Globe, FileText, PenLine, Database, RefreshCw, Trash2,
  CheckCircle2, AlertCircle, ChevronRight, Upload, X,
  Plus, Minus, Clock, Brain, Zap
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8001";

function authHeaders(json = true) {
  const token = localStorage.getItem("cb_token") || localStorage.getItem("token");
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const TABS = [
  { id: "url", Icon: Globe, label: "Website URL", sub: "Auto-scan your website" },
  { id: "manual", Icon: PenLine, label: "Manual Form", sub: "Type your business info" },
  { id: "file", Icon: FileText, label: "Upload File", sub: "CSV, Excel, PDF, Word" },
];

const defaultForm = {
  businessName: "", businessType: "", description: "",
  products: [{ name: "", price: "", available: "true" }],
  services: [""],
  returnPolicy: "", deliveryInfo: "", workingHours: "",
  phone: "", whatsapp: "", email: "", address: "", extraInfo: "",
};

export default function TrainBot() {
  const { user } = useAuth();
  const [tab, setTab] = useState("url");
  const [status, setStatus] = useState(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // url tab
  const [url, setUrl] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [urlProgress, setUrlProgress] = useState(null); // { status, pages_done, total, url }

  // manual tab
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  // file tab
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => { if (user?.id) loadStatus(); }, [user]);

  async function loadStatus() {
    try {
      const r = await fetch(`${API}/ingest/status/${user.id}`, { headers: authHeaders() });
      const d = await r.json();
      if (d.success) setStatus(d.data);
    } catch { }
  }

  function pollStatus(n = 0) {
    if (n > 30) return;
    loadStatus();
    setTimeout(() => pollStatus(n + 1), 5000);
  }

  function notify(msg, isErr = false) {
    if (isErr) { setErr(msg); setOk(""); }
    else { setOk(msg); setErr(""); }
  }

  // ── URL train via Jina.ai ──
  async function handleCrawl() {
    if (!url.trim()) return notify("Please enter your website URL.", true);
    let u = url.trim();
    if (!u.startsWith("http")) u = "https://" + u;
    setCrawling(true);
    setUrlProgress({ status: "running", pages_done: 0, total: 0, url: u });
    try {
      const r = await fetch(`${API}/ingest/url`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ userId: user.id, url: u, maxPages: maxPages() }),
      });
      const d = await r.json();
      if (d.success) {
        notify(`⚡ Fetching content from ${u}. Bot will be ready in 1–2 minutes.`);
        pollProgress();
      } else {
        notify(d.message || "Failed to start training.", true);
        setUrlProgress(null);
      }
    } catch { notify("Connection error.", true); setUrlProgress(null); }
    finally { setCrawling(false); }
  }

  function pollProgress(n = 0) {
    if (n > 60) { loadStatus(); return; }  // give up after 5 min
    setTimeout(async () => {
      try {
        const r = await fetch(`${API}/ingest/url-progress/${user.id}`, { headers: authHeaders() });
        const d = await r.json();
        if (d.success) {
          const p = d.progress;
          setUrlProgress(p);
          if (p.status === "done") {
            notify("✅ Bot trained successfully! Your knowledge base is ready.");
            loadStatus();
            setTimeout(() => setUrlProgress(null), 3000);
            return;
          } else if (p.status === "failed") {
            notify("❌ Training failed. Try uploading a file instead.", true);
            setUrlProgress(null);
            return;
          }
        }
      } catch { }
      pollProgress(n + 1);
    }, 5000);
  }

  async function handleDelete() {
    if (!window.confirm("Delete all indexed data? Bot will stop answering from your content.")) return;
    try {
      const r = await fetch(`${API}/ingest/delete`, {
        method: "DELETE", headers: authHeaders(),
        body: JSON.stringify({ userId: user.id }),
      });
      const d = await r.json();
      if (d.success) { setStatus(null); notify("🗑️ Knowledge base deleted."); }
    } catch { notify("Failed to delete.", true); }
  }

  // ── Manual form ──
  async function handleManualSave() {
    if (!form.businessName.trim()) return notify("Please enter your business name.", true);
    if (!form.description.trim()) return notify("Please describe your business.", true);
    setSaving(true);
    try {
      const text = buildText(form);
      const r = await fetch(`${API}/ingest/manual`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ userId: user.id, text, source: "manual_form" }),
      });
      const d = await r.json();
      d.success ? (notify("✅ Saved! Bot is now trained on your info."), setTimeout(loadStatus, 2000))
        : notify(d.message || "Failed to save.", true);
    } catch { notify("Connection error.", true); }
    finally { setSaving(false); }
  }

  function buildText(f) {
    const L = [];
    if (f.businessName) L.push(`Business Name: ${f.businessName}`);
    if (f.businessType) L.push(`Business Type: ${f.businessType}`);
    if (f.description) L.push(`About: ${f.description}`);
    const prods = f.products.filter(p => p.name);
    if (prods.length) {
      L.push("\nProducts:");
      prods.forEach(p => {
        let s = `- ${p.name}`;
        if (p.price) s += ` (${p.price})`;
        if (p.available === "false") s += " [Out of Stock]";
        L.push(s);
      });
    }
    const svcs = f.services.filter(s => s.trim());
    if (svcs.length) { L.push("\nServices:"); svcs.forEach(s => L.push(`- ${s}`)); }
    if (f.returnPolicy) L.push(`\nReturn Policy: ${f.returnPolicy}`);
    if (f.deliveryInfo) L.push(`Delivery: ${f.deliveryInfo}`);
    if (f.workingHours) L.push(`Working Hours: ${f.workingHours}`);
    L.push("\nContact:");
    if (f.phone) L.push(`Phone: ${f.phone}`);
    if (f.whatsapp) L.push(`WhatsApp: ${f.whatsapp}`);
    if (f.email) L.push(`Email: ${f.email}`);
    if (f.address) L.push(`Address: ${f.address}`);
    if (f.extraInfo) L.push(`\nExtra Info: ${f.extraInfo}`);
    return L.join("\n");
  }

  const addProd = () => setForm(f => ({ ...f, products: [...f.products, { name: "", price: "", available: "true" }] }));
  const delProd = i => setForm(f => ({ ...f, products: f.products.filter((_, j) => j !== i) }));
  const setProd = (i, k, v) => setForm(f => { const p = [...f.products]; p[i] = { ...p[i], [k]: v }; return { ...f, products: p }; });
  const addSvc = () => setForm(f => ({ ...f, services: [...f.services, ""] }));
  const delSvc = i => setForm(f => ({ ...f, services: f.services.filter((_, j) => j !== i) }));
  const setSvc = (i, v) => setForm(f => { const s = [...f.services]; s[i] = v; return { ...f, services: s }; });

  // ── File upload ──
  async function handleUpload() {
    if (!file) return notify("Please select a file.", true);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("userId", user.id);
      const token = localStorage.getItem("cb_token") || localStorage.getItem("token");
      const r = await fetch(`${API}/ingest/upload`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
      });
      const d = await r.json();
      if (d.success) {
        notify(`✅ "${file.name}" uploaded! Bot trained successfully.`);
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        setTimeout(loadStatus, 2000);
      } else notify(d.message || "Upload failed.", true);
    } catch { notify("Upload failed.", true); }
    finally { setUploading(false); }
  }

  function maxPages() {
    return user?.plan === "enterprise" ? 200 : user?.plan === "pro" ? 50 : 15;
  }

  function timeAgo(iso) {
    if (!iso) return "Never";
    const d = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (d < 60) return "Just now";
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  }

  function fileEmoji(name = "") {
    const e = name.split(".").pop().toLowerCase();
    return e === "pdf" ? "📕" : e === "csv" ? "📊" : ["xlsx", "xls"].includes(e) ? "📗" : ["doc", "docx"].includes(e) ? "📘" : "📄";
  }

  const hasData = status?.total_chunks > 0;
  const IN = "w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1e1e2e] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600";
  const LB = "block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5";

  return (
    <div className="max-w-[860px] mx-auto pb-12 transition-colors">

      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
          <Brain size={20} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight" style={{ fontFamily: "'Syne',sans-serif" }}>
            Train Your Bot
          </h1>
          <p className="text-slate-500 text-sm">Choose how to teach your bot about your business.</p>
        </div>
      </div>

      {/* Alerts */}
      {err && (
        <div className="mb-5 flex items-center gap-3 p-4 rounded-xl text-sm bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">
          <AlertCircle size={17} className="shrink-0" /> <span className="flex-1">{err}</span>
          <button onClick={() => setErr("")}><X size={14} /></button>
        </div>
      )}
      {ok && (
        <div className="mb-5 flex items-center gap-3 p-4 rounded-xl text-sm bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={17} className="shrink-0" /> <span className="flex-1">{ok}</span>
          <button onClick={() => setOk("")}><X size={14} /></button>
        </div>
      )}

      {/* ── Tab selector ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`p-4 rounded-2xl border text-left transition-all ${tab === t.id
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm"
                : "border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] hover:border-indigo-300 dark:hover:border-indigo-500/30"
              }`}>
            <t.Icon size={17} className={tab === t.id ? "text-indigo-600 dark:text-indigo-400 mb-2" : "text-slate-400 mb-2"} />
            <div className={`text-sm font-bold ${tab === t.id ? "text-indigo-700 dark:text-indigo-300" : "text-slate-800 dark:text-slate-200"}`}>
              {t.label}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{t.sub}</div>
          </button>
        ))}
      </div>

      {/* ══════════ TAB: URL ══════════ */}
      {tab === "url" && (
        <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-white/5 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={16} className="text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Train from Website URL</h2>
          </div>
          <p className="text-xs text-slate-500 mb-5">
            Paste your website URL — we fetch every page via <span className="font-bold text-indigo-600 dark:text-indigo-400">Jina.ai Reader</span> (no scraping, no IP blocks).
            Plan: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{user?.plan || "starter"}</span> — up to {maxPages()} pages.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCrawl()}
              placeholder="https://yourwebsite.com" className={IN + " flex-1"}
              disabled={crawling} />
            <button onClick={handleCrawl} disabled={crawling}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
              {crawling ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
              {crawling ? "Starting..." : "Train Bot"}
            </button>
          </div>

          {/* Live progress bar */}
          {urlProgress && urlProgress.status === "running" && (
            <div className="mb-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
                <span className="flex items-center gap-2">
                  <RefreshCw size={12} className="animate-spin" />
                  Fetching pages via Jina.ai...
                </span>
                <span>{urlProgress.pages_done} / {urlProgress.total || "?"} pages</span>
              </div>
              <div className="h-1.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                  style={{ width: urlProgress.total > 0 ? `${Math.round((urlProgress.pages_done / urlProgress.total) * 100)}%` : "15%" }}
                />
              </div>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-2">
                ⏱ This takes 1–2 minutes. You can leave this page — training continues in the background.
              </p>
            </div>
          )}

          {/* Compatibility badges */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Works with all website types</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "WordPress", emoji: "🟢" },
                { label: "React / Next.js", emoji: "🟢" },
                { label: "Shopify / Wix", emoji: "🟢" },
                { label: "Custom / MERN", emoji: "🟢" },
              ].map(p => (
                <div key={p.label} className="px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-xs font-medium text-emerald-700 dark:text-emerald-400 text-center flex items-center justify-center gap-1.5">
                  <span>{p.emoji}</span> {p.label}
                </div>
              ))}
            </div>
            <div className="mt-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400">
              🔒 Pages behind login or checkout are skipped (they require authentication).
            </div>
          </div>
        </div>
      )}

      {/* ══════════ TAB: MANUAL FORM ══════════ */}
      {tab === "manual" && (
        <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-white/5 rounded-2xl p-6 mb-6 shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PenLine size={16} className="text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Business Information</h2>
            </div>
            <p className="text-xs text-slate-500">Fill in your business details below. No technical knowledge needed!</p>
          </div>

          {/* Basic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LB}>Business Name <span className="text-red-400">*</span></label>
              <input value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                placeholder="Ahmed Electronics" className={IN} />
            </div>
            <div>
              <label className={LB}>Business Type</label>
              <input value={form.businessType} onChange={e => setForm(f => ({ ...f, businessType: e.target.value }))}
                placeholder="Online Store, Restaurant, Agency..." className={IN} />
            </div>
          </div>

          <div>
            <label className={LB}>What does your business do? <span className="text-red-400">*</span></label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="We sell phones, laptops and accessories. We also offer repair services with 6 months warranty..."
              rows={3} className={IN + " resize-none"} />
          </div>

          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={LB + " mb-0"}>Products (with prices)</label>
              <button onClick={addProd} className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                <Plus size={12} /> Add Product
              </button>
            </div>
            <div className="space-y-2">
              {form.products.map((p, i) => (
                <div key={i} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                  <input value={p.name} onChange={e => setProd(i, "name", e.target.value)}
                    placeholder="Product name e.g. iPhone 15 128GB" className={IN + " flex-[2] min-w-0"} />
                  <input value={p.price} onChange={e => setProd(i, "price", e.target.value)}
                    placeholder="Price e.g. PKR 289,000" className={IN + " flex-1 min-w-0"} />
                  <select value={p.available} onChange={e => setProd(i, "available", e.target.value)}
                    className={IN + " w-auto"}>
                    <option value="true">In Stock</option>
                    <option value="false">Out of Stock</option>
                  </select>
                  {form.products.length > 1 && (
                    <button onClick={() => delProd(i)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0">
                      <Minus size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={LB + " mb-0"}>Services</label>
              <button onClick={addSvc} className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                <Plus size={12} /> Add Service
              </button>
            </div>
            <div className="space-y-2">
              {form.services.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input value={s} onChange={e => setSvc(i, e.target.value)}
                    placeholder="e.g. Free delivery on orders above PKR 5,000" className={IN + " flex-1"} />
                  {form.services.length > 1 && (
                    <button onClick={() => delSvc(i)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <Minus size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Policy + Delivery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LB}>Return / Refund Policy</label>
              <textarea value={form.returnPolicy} onChange={e => setForm(f => ({ ...f, returnPolicy: e.target.value }))}
                placeholder="e.g. 7 days easy return. Original packaging required. Refund processed in 3 days."
                rows={3} className={IN + " resize-none"} />
            </div>
            <div>
              <label className={LB}>Delivery Information</label>
              <textarea value={form.deliveryInfo} onChange={e => setForm(f => ({ ...f, deliveryInfo: e.target.value }))}
                placeholder="e.g. Nationwide delivery 2-3 days. Cash on delivery available. Free shipping above PKR 5,000."
                rows={3} className={IN + " resize-none"} />
            </div>
          </div>

          {/* Contact */}
          <div>
            <label className={LB}>Contact Information</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="📞 Phone: 0300-1234567" className={IN} />
              <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="💬 WhatsApp: 0300-1234567" className={IN} />
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="✉️ Email: info@store.com" className={IN} />
              <input value={form.workingHours} onChange={e => setForm(f => ({ ...f, workingHours: e.target.value }))} placeholder="🕐 Hours: Mon-Sat 10am-8pm" className={IN} />
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="📍 Address: Shop 5, Main Market, Karachi" className={IN + " sm:col-span-2"} />
            </div>
          </div>

          {/* Extra */}
          <div>
            <label className={LB}>Anything else? (FAQs, offers, policies...)</label>
            <textarea value={form.extraInfo} onChange={e => setForm(f => ({ ...f, extraInfo: e.target.value }))}
              placeholder="e.g. Student discount 10%. EMI available on orders above PKR 20,000. Bulk order pricing available on request..."
              rows={3} className={IN + " resize-none"} />
          </div>

          <button onClick={handleManualSave} disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] transition-all shadow-lg shadow-indigo-500/20"
            style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Brain size={14} />}
            {saving ? "Saving..." : "Save & Train Bot"}
          </button>
        </div>
      )}

      {/* ══════════ TAB: FILE UPLOAD ══════════ */}
      {tab === "file" && (
        <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-white/5 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Upload a File</h2>
          </div>
          <p className="text-xs text-slate-500 mb-5">
            Upload any document with your business info — product list, price sheet, FAQ doc, brochure. We'll extract everything automatically.
          </p>

          {/* Drop zone */}
          <label className={`flex flex-col items-center justify-center w-full h-44 rounded-2xl border-2 border-dashed cursor-pointer transition-all mb-5 ${file ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"
              : "border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-[#1e1e2e] hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5"
            }`}>
            <input ref={fileRef} type="file" accept=".csv,.pdf,.txt,.xlsx,.xls,.doc,.docx,.json"
              onChange={e => setFile(e.target.files[0])} className="hidden" />
            {file ? (
              <div className="text-center px-4">
                <div className="text-3xl mb-2">{fileEmoji(file.name)}</div>
                <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{file.name}</p>
                <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                <button onClick={e => { e.preventDefault(); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="mt-2 text-xs text-red-500 hover:underline flex items-center gap-1 mx-auto">
                  <X size={11} /> Remove
                </button>
              </div>
            ) : (
              <div className="text-center px-6">
                <Upload size={28} className="text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Drop file here or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">CSV, Excel, PDF, Word, TXT — max 10MB</p>
              </div>
            )}
          </label>

          {/* Format cards */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
            {[
              { ext: "CSV", emoji: "📊", tip: "Product lists" },
              { ext: "XLSX", emoji: "📗", tip: "Excel sheets" },
              { ext: "PDF", emoji: "📕", tip: "Brochures" },
              { ext: "DOCX", emoji: "📘", tip: "Word docs" },
              { ext: "TXT", emoji: "📄", tip: "Plain text" },
            ].map(f => (
              <div key={f.ext} className="p-3 rounded-xl bg-slate-50 dark:bg-[#1e1e2e] border border-slate-100 dark:border-white/5 text-center">
                <div className="text-xl mb-1">{f.emoji}</div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{f.ext}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{f.tip}</div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-5">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">💡 Tips for best results</p>
            {[
              "CSV/Excel: Use column headers like Name, Price, Description, Category",
              "PDF/Word: Make sure the text is selectable (not a scanned image)",
              "Include prices, return policy, working hours and contact info",
              "More detail = better bot answers",
            ].map((t, i) => (
              <p key={i} className="text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-1.5 mt-1">
                <ChevronRight size={11} className="shrink-0 mt-0.5" /> {t}
              </p>
            ))}
          </div>

          <button onClick={handleUpload} disabled={uploading || !file}
            className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] transition-all shadow-lg shadow-indigo-500/20"
            style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
            {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? "Processing..." : "Upload & Train Bot"}
          </button>
        </div>
      )}

      {/* ══════════ KNOWLEDGE BASE STATUS ══════════ */}
      {hasData ? (
        <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Knowledge Base</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Active & Trained</p>
              </div>
            </div>
            <div className="flex gap-2">
              {status.base_url && (
                <button onClick={handleRefresh} disabled={refreshing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1e1e2e] text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all">
                  <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Re-crawl
                </button>
              )}
              <button onClick={handleDelete}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-red-100 dark:border-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                <Trash2 size={12} /> Delete All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Pages", val: status.total_pages, c: "text-indigo-600 dark:text-indigo-400" },
              { label: "Chunks", val: status.total_chunks, c: "text-emerald-600 dark:text-emerald-400" },
              { label: "Updated", val: timeAgo(status.last_crawled), c: "text-amber-600 dark:text-amber-400" },
            ].map((s, i) => (
              <div key={i} className="bg-slate-50 dark:bg-[#0f0f13] p-4 rounded-xl text-center border border-slate-100 dark:border-white/5">
                <div className={`text-xl font-bold ${s.c}`}>{s.val}</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-semibold">{s.label}</div>
              </div>
            ))}
          </div>

          {status.base_url && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10">
              <Globe size={13} className="text-indigo-500 shrink-0" />
              <a href={status.base_url} target="_blank" rel="noreferrer"
                className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline truncate">
                {status.base_url}
              </a>
              <span className="ml-auto text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                <Clock size={10} /> Auto-refresh 24h
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#16161e] border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-[#1e1e2e] rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-white/5">
            <Database className="text-slate-300 dark:text-slate-600" size={28} />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">Bot Not Trained Yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
            Use one of the options above to train your bot with your business data.
          </p>
        </div>
      )}
    </div>
  );
}