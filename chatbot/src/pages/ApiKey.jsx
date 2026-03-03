import { useState } from "react";
import { Copy, RefreshCw, Eye, EyeOff, ShieldCheck, AlertTriangle } from "lucide-react";

export default function ApiKey() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRegen, setShowRegen] = useState(false);
  const apiKey = "cb_live_sk_4f8a2d91e3c7b05f6a2d91e3c7b05f6a";
  const masked = apiKey.slice(0, 10) + "•".repeat(22) + apiKey.slice(-4);

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const Card = ({ children, className = "" }) => (
    <div className={`rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] shadow-sm dark:shadow-none transition-colors ${className}`}>
      {children}
    </div>
  );

  const snippet = `<script\n  src="https://chatbase.io/widget.js"\n  data-api-key="${visible ? apiKey : masked}"\n></script>`;

  return (
    // Step 1: Max width increased to 6xl to fill the screen
    <div className="transition-colors w-full max-w-6xl">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight" style={{ fontFamily: "'Syne',sans-serif" }}>API Key</h1>
        <p className="text-slate-500 text-sm mt-1">Authenticate your widget with your secret key.</p>
      </div>

      {/* Step 2: Grid system - 1 col on mobile, 3 cols on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Section: Main Functionality (Spans 2 columns) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Key Card */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Your Secret API Key</div>
                <div className="text-xs text-slate-500 mt-1">Created Jan 15, 2025 · Last used 2 min ago</div>
              </div>
              <span className="w-fit text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 font-medium">● Active</span>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0a0a0f] overflow-hidden">
              <div className="flex-1 font-mono text-sm text-indigo-600 dark:text-indigo-300 tracking-wider break-all md:break-normal">
                {visible ? apiKey : masked}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setVisible(!visible)} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1e1e2e] dark:hover:bg-white/5">
                  {visible ? <EyeOff size={13} /> : <Eye size={13} />} {visible ? "Hide" : "Reveal"}
                </button>
                <button onClick={() => copy(apiKey)} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                  <Copy size={13} />{copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </Card>

          {/* Usage Card */}
          <Card>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Usage This Month</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "API Calls", value: "12,480", max: 50000, cur: 12480 },
                { label: "Messages Sent", value: "8,340", max: 20000, cur: 8340 },
                { label: "Active Sessions", value: "24", max: null },
              ].map((u, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0a0a0f]">
                  <div className="text-xs text-slate-500 mb-2">{u.label}</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">{u.value}</div>
                  <div className="text-xs text-slate-500">of {u.max ? u.max.toLocaleString() : "∞"}</div>
                  {u.max && (
                    <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-white/5">
                      <div className="h-full rounded-full" style={{ width: `${(u.cur / u.max) * 100}%`, background: "linear-gradient(to right,#4f46e5,#818cf8)" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Snippet Card */}
          <Card>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">How to Use</div>
            <div className="text-xs text-slate-500 mb-4">Paste before the closing <code>&lt;/body&gt;</code> tag.</div>
            <div className="rounded-xl border border-slate-200 dark:border-white/5 font-mono text-xs text-sky-700 dark:text-sky-300 bg-slate-50 dark:bg-[#0a0a0f]">
              <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 font-sans">widget-script.html</span>
                <button onClick={() => copy(snippet)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#1e1e2e]">
                  <Copy size={11} /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="whitespace-pre">{snippet}</pre>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Section: Sidebar info (1 column) */}
        <div className="flex flex-col gap-6">
          <Card className="border-amber-200 dark:border-amber-500/15 h-fit">
            <div className="flex gap-3">
              <ShieldCheck size={19} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">Security Tips</div>
                <ul className="text-xs text-slate-600 dark:text-slate-400 leading-6 list-disc pl-4">
                  <li>Never share your API key publicly</li>
                  <li>Regenerate if you suspect compromise</li>
                  <li>Restrict key usage to specific domains</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="border-red-200 dark:border-red-500/15 h-fit">
            <div className="text-sm font-semibold text-red-500 dark:text-red-400 mb-1">Danger Zone</div>
            <p className="text-xs text-slate-500 mb-4">Regenerating your key will immediately invalidate the current one.</p>
            <button onClick={() => setShowRegen(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 transition-all">
              <RefreshCw size={14} /> Regenerate Key
            </button>
          </Card>
        </div>

      </div>
    </div>
  );
}