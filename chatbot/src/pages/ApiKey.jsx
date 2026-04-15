import { useState, useEffect } from "react";
import { Copy, RefreshCw, Eye, EyeOff, ShieldCheck, AlertTriangle, Loader } from "lucide-react";
import { getApiKey, regenerateApiKey, getDashboardStats } from "../api/userService";

export default function ApiKey() {
  const [apiKey, setApiKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRegen, setShowRegen] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ── Load API key + usage stats on mount ──
  useEffect(() => {
    const load = async () => {
      try {
        const [keyRes, statsRes] = await Promise.all([
          getApiKey(),
          getDashboardStats(),
        ]);
        if (keyRes.success) setApiKey(keyRes.apiKey || "");
        if (statsRes.success) setStats(statsRes.stats);
      } catch (err) {
        setError("Failed to load API key. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const masked = apiKey
    ? apiKey.slice(0, 10) + "•".repeat(18) + apiKey.slice(-4)
    : "••••••••••••••••••••••••••••••••";

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setRegenLoading(true);
    setError("");
    try {
      const res = await regenerateApiKey();
      if (res.success) {
        setApiKey(res.apiKey);
        setShowRegen(false);
        setSuccessMsg("API key regenerated successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setError(res.message || "Failed to regenerate key.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setRegenLoading(false);
    }
  };

  const backendUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8001`;
  const snippet = `<script\n  src="${backendUrl}/digichat/widget.js"\n  data-api-key="${visible ? apiKey : masked}"\n></script>`;

  const Card = ({ children, className = "" }) => (
    <div className={`rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] shadow-sm dark:shadow-none transition-colors ${className}`}>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-slate-500 text-sm">Loading API key...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="transition-colors w-full max-w-6xl">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight"
          style={{ fontFamily: "'Syne',sans-serif" }}>API Key</h1>
        <p className="text-slate-500 text-sm mt-1">Authenticate your widget with your secret key.</p>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="mb-5 px-4 py-3 rounded-xl text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
          ✓ {successMsg}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Main Content (2 cols) ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* API Key card */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Your Secret API Key</div>
                <div className="text-xs text-slate-500 mt-1">
                  Keep this private never expose it in client-side code
                </div>
              </div>
              <span className="w-fit text-xs px-2.5 py-1 rounded-full font-medium
                               bg-emerald-100 text-emerald-700
                               dark:bg-emerald-500/15 dark:text-emerald-400">
                ● Active
              </span>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0a0a0f] overflow-hidden">
              <div className="flex-1 font-mono text-sm text-indigo-600 dark:text-indigo-300 tracking-wider break-all md:break-normal">
                {visible ? apiKey : masked}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setVisible(!visible)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                             text-slate-600 dark:text-slate-400
                             border border-slate-200 dark:border-white/5
                             bg-slate-100 hover:bg-slate-200
                             dark:bg-[#1e1e2e] dark:hover:bg-white/5">
                  {visible ? <EyeOff size={13} /> : <Eye size={13} />}
                  {visible ? "Hide" : "Reveal"}
                </button>
                <button onClick={() => copy(apiKey)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                  style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                  <Copy size={13} />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </Card>

          {/* Usage card — real data from getDashboardStats */}
          <Card>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Usage This Month</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: "Messages Used",
                  value: (stats?.messageCount ?? 0).toLocaleString(),
                  max: stats?.usageLimit ?? 100,
                  cur: stats?.messageCount ?? 0,
                },
                {
                  label: "Total Conversations",
                  value: (stats?.totalConversations ?? 0).toLocaleString(),
                  max: null,
                  cur: null,
                },
                {
                  label: "Active Today",
                  value: (stats?.activeToday ?? 0).toLocaleString(),
                  max: null,
                  cur: null,
                },
              ].map((u, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0a0a0f] transition-colors">
                  <div className="text-xs text-slate-500 mb-2">{u.label}</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">{u.value}</div>
                  <div className="text-xs text-slate-500">
                    {u.max ? `of ${u.max.toLocaleString()}` : "total"}
                  </div>
                  {u.max && (
                    <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-white/5">
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((u.cur / u.max) * 100, 100)}%`,
                          background: (u.cur / u.max) > 0.8
                            ? "linear-gradient(to right,#ef4444,#f87171)"
                            : "linear-gradient(to right,#4f46e5,#818cf8)"
                        }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Embed snippet */}
          <Card>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">How to Use</div>
            <div className="text-xs text-slate-500 mb-4">
              Paste before the closing <code className="text-sky-600 dark:text-sky-400 bg-slate-100 dark:bg-black/30 px-1.5 py-0.5 rounded">&lt;/body&gt;</code> tag.
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-white/5 font-mono text-xs text-sky-700 dark:text-sky-300 bg-slate-50 dark:bg-[#0a0a0f] transition-colors">
              <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 font-sans text-xs">widget-script.html</span>
                <button onClick={() => copy(snippet)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
                             text-slate-600 dark:text-slate-400
                             bg-slate-100 dark:bg-[#1e1e2e]
                             hover:bg-slate-200 dark:hover:bg-white/5">
                  <Copy size={11} /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="whitespace-pre">{snippet}</pre>
              </div>
            </div>
          </Card>

        </div>

        {/* ── Right: Sidebar ── */}
        <div className="flex flex-col gap-6">

          {/* Security tips */}
          <Card className="border-amber-200 dark:border-amber-500/15">
            <div className="flex gap-3">
              <ShieldCheck size={19} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">Security Tips</div>
                <ul className="text-xs text-slate-600 dark:text-slate-400 leading-6 list-disc pl-4">
                  <li>Never share your API key publicly</li>
                  <li>Never commit it to version control</li>
                  <li>Regenerate if you suspect compromise</li>
                  <li>Restrict usage to specific domains</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Danger zone */}
          <Card className="border-red-200 dark:border-red-500/15">
            <div className="text-sm font-semibold text-red-500 dark:text-red-400 mb-1">Danger Zone</div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Regenerating your key will immediately invalidate the current one. Your widget will stop working until you update the embed script.
            </p>

            {!showRegen ? (
              <button onClick={() => setShowRegen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                           text-red-600 dark:text-red-400
                           bg-red-50 dark:bg-red-500/10
                           hover:bg-red-100 dark:hover:bg-red-500/15
                           border border-red-200 dark:border-red-500/20">
                <RefreshCw size={14} /> Regenerate Key
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/15">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={15} className="text-red-500 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    This cannot be undone.
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleRegenerate} disabled={regenLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all
                               text-red-600 dark:text-red-400
                               bg-red-100 dark:bg-red-500/15
                               hover:bg-red-200 dark:hover:bg-red-500/25
                               disabled:opacity-60 disabled:cursor-not-allowed">
                    {regenLoading
                      ? <><Loader size={13} className="animate-spin" /> Regenerating...</>
                      : "Yes, regenerate"}
                  </button>
                  <button onClick={() => setShowRegen(false)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors
                               text-slate-600 dark:text-slate-400
                               border border-slate-200 dark:border-white/5
                               bg-slate-50 dark:bg-[#1e1e2e]
                               hover:bg-slate-100 dark:hover:bg-white/5">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}