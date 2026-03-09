import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import { Database, Globe, Trash2, RefreshCw, CheckCircle2, AlertCircle, Zap } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function TrainBot() {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user?.id) loadStatus();
  }, [user]);

  async function loadStatus() {
    try {
      const res = await fetch(`${API}/ingest/status/${user.id}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setStatus(data.data);
    } catch (e) {
      console.error("Failed to load status:", e);
    }
  }

  async function handleCrawl() {
    setError(""); setSuccess("");
    if (!url.trim()) { setError("Please enter your website URL."); return; }
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http")) cleanUrl = "https://" + cleanUrl;

    setCrawling(true);
    try {
      const res = await fetch(`${API}/ingest/crawl`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ userId: user.id, baseUrl: cleanUrl, maxPages: planMaxPages() }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`✅ Crawling started for ${cleanUrl}.`);
        setTimeout(() => pollStatus(), 5000);
      } else {
        setError(data.message || "Failed to start crawling.");
      }
    } catch (e) {
      setError("Connection error. Make sure FastAPI is running.");
    } finally { setCrawling(false); }
  }

  function pollStatus(attempts = 0) {
    if (attempts > 24) return;
    loadStatus();
    setTimeout(() => pollStatus(attempts + 1), 5000);
  }

  async function handleRefresh() {
    setError(""); setSuccess(""); setRefreshing(true);
    try {
      const res = await fetch(`${API}/ingest/refresh`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("🔄 Re-crawling started.");
        setTimeout(() => pollStatus(), 5000);
      }
    } catch (e) { setError("Connection error."); } finally { setRefreshing(false); }
  }

  async function handleDelete() {
    if (!window.confirm("Delete all indexed data?")) return;
    setError("");
    try {
      const res = await fetch(`${API}/ingest/delete`, {
        method: "DELETE",
        headers: authHeaders(),
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.success) { setStatus(null); setSuccess("🗑️ Knowledge base deleted."); }
    } catch (e) { setError("Failed to delete."); }
  }

  function planMaxPages() {
    const plan = user?.plan || "starter";
    return plan === "enterprise" ? 200 : plan === "pro" ? 50 : 15;
  }

  function timeAgo(isoString) {
    if (!isoString) return "Never";
    const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 84600) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  const hasData = status && status.total_chunks > 0;

  return (
    <div className="max-w-[800px] mx-auto pb-10 transition-colors duration-300">
      
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight" style={{ fontFamily: "'Syne',sans-serif" }}>
            Train Your Bot
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Build your AI's knowledge base by indexing your website content.
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="mb-5 p-4 rounded-xl text-sm flex items-center gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {success && (
        <div className="mb-5 p-4 rounded-xl text-sm flex items-center gap-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={18} /> {success}
        </div>
      )}

      {/* ── URL Input Card ── */}
      <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-white/5 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
            <Globe size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Website URL</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Current plan: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{user?.plan || "starter"}</span> (Max {planMaxPages()} pages)
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCrawl()}
            placeholder="https://yourstore.com"
            className="flex-1 px-4 py-3 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1e1e2e] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
          <button
            onClick={handleCrawl}
            disabled={crawling}
            className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            {crawling ? <RefreshCw className="animate-spin" size={16} /> : <Database size={16} />}
            {crawling ? "Processing..." : "Train Bot"}
          </button>
        </div>
      </div>

      {/* ── Knowledge Base Status ── */}
      {hasData ? (
        <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-white/5 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Knowledge Base Status</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Active & Trained</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={handleRefresh} disabled={refreshing} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1e1e2e] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
              </button>
              <button onClick={handleDelete} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-red-100 dark:border-red-500/20 bg-white dark:bg-red-500/5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Pages", value: status.total_pages, color: "text-indigo-600 dark:text-indigo-400" },
              { label: "Chunks", value: status.total_chunks, color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Updated", value: timeAgo(status.last_crawled), color: "text-amber-600 dark:text-amber-400" },
            ].map((s, i) => (
              <div key={i} className="bg-slate-50 dark:bg-[#0f0f13] p-4 rounded-xl text-center border border-slate-100 dark:border-white/5 transition-colors">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1 font-semibold">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-xl flex items-center gap-2 border border-indigo-100 dark:border-indigo-500/10">
            <Globe size={14} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <a href={status.base_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate hover:underline">
                {status.base_url}
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#16161e] border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-10 text-center mb-6">
          <div className="w-16 h-16 bg-slate-50 dark:bg-[#1e1e2e] rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-white/5">
              <Database className="text-slate-300 dark:text-slate-600" size={32} />
          </div>
          <h3 className="text-slate-900 dark:text-white font-bold text-lg">Bot Not Trained</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto mt-2">
            Index your store data to enable the AI features.
          </p>
        </div>
      )}

      {/* ── Feature Info Card ── */}
      <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-white/5 p-6 rounded-2xl shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20">
            <Zap size={80} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                <Zap size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Automatic Extraction</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {["Products & Pricing", "Return Policies", "Store FAQs", "Contact Details"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <CheckCircle2 size={16} className="text-indigo-500 dark:text-indigo-400" />
                    {item}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}