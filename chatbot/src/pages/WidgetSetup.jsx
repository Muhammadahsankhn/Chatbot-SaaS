import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, CheckCircle, ExternalLink, Sparkles, Layout, Globe, Search, Loader } from "lucide-react";
import { getApiKey } from "../api/userService";

const steps = ["Copy Script", "Add to Website", "Verify"];

const platforms = [
  { name: "WordPress",       desc: "Use 'Insert Headers and Footers' plugin" },
  { name: "Shopify",         desc: "Online Store → Themes → Edit Code → theme.liquid" },
  { name: "Webflow",         desc: "Project Settings → Custom Code → Footer Code" },
  { name: "Next.js / React", desc: "Add to _document.js or use Script component" },
  { name: "Plain HTML",      desc: "Paste before </body> in your HTML file" },
];

export default function WidgetSetup() {
  const navigate = useNavigate();

  const [step,         setStep]         = useState(0);
  const [apiKey,       setApiKey]        = useState("");
  const [loading,      setLoading]       = useState(true);
  const [copied,       setCopied]        = useState(false);
  const [url,          setUrl]           = useState("");
  const [verifying,    setVerifying]     = useState(false);
  const [verified,     setVerified]      = useState(false);
  const [verifyError,  setVerifyError]   = useState("");

  // ── Load real API key ──
  useEffect(() => {
    getApiKey()
      .then(res => { if (res.success) setApiKey(res.apiKey || ""); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const widgetSrc = `https://www.digicareproducts.com/digichat/widget.js`;
  const snippet   = `<script\n  src="${widgetSrc}"\n  data-api-key="${apiKey || "loading..."}"\n></script>`;

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Verify by fetching the URL and checking if widget script tag is present
  const handleVerify = async () => {
    if (!url) { setVerifyError("Please enter your website URL."); return; }

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http")) cleanUrl = "https://" + cleanUrl;

    setVerifying(true);
    setVerifyError("");

    try {
      // Use a CORS proxy or just ping the URL — we check if it's reachable
      // Since we can't actually scrape from browser, we do a lightweight check
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(cleanUrl)}`);
      const data = await res.json();

      if (data?.contents?.includes("widget.js") || data?.contents?.includes(apiKey)) {
        setVerified(true);
      } else {
        // Even if script isn't detected, allow manual confirmation
        setVerifyError("Widget script not detected automatically. If you've added it, click 'Mark as Verified' to continue.");
      }
    } catch (err) {
      setVerifyError("Could not reach that URL. If you've added the script, click 'Mark as Verified' to continue.");
    } finally {
      setVerifying(false);
    }
  };

  const Card = ({ children, className = "" }) => (
    <div className={`rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] shadow-sm dark:shadow-none transition-colors ${className}`}>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-slate-500 text-sm">Loading setup...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="transition-colors w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight"
          style={{ fontFamily: "'Syne',sans-serif" }}>Widget Setup</h1>
        <p className="text-slate-500 text-sm mt-1">Get your chatbot live on your website in minutes.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center shrink-0">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                ${i < step  ? "bg-emerald-500 border-emerald-500 text-white"
                : i === step ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15"
                             : "border-slate-200 dark:border-white/10 text-slate-400 bg-transparent"}`}>
                {i < step ? <CheckCircle size={15} /> : i + 1}
              </div>
              <span className={`text-sm whitespace-nowrap ${i === step ? "text-slate-900 dark:text-slate-200 font-semibold" : "text-slate-500"}`}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && <div className="w-8 sm:w-16 md:w-24 h-px bg-slate-200 dark:bg-white/5 mx-3" />}
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Left: Step content ── */}
        <div className="lg:col-span-2">

          {/* Step 0 — Copy Script */}
          {step === 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Layout size={18} className="text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Copy your embed script</h2>
              </div>

              {/* API key row */}
              <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0a0f] border border-slate-200 dark:border-white/5">
                <div>
                  <span className="text-xs text-slate-500">Your API Key: </span>
                  <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                    {apiKey ? apiKey.slice(0,12) + "••••••••" + apiKey.slice(-4) : "—"}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 font-medium">● Active</span>
              </div>

              {/* Snippet */}
              <div className="rounded-xl border border-slate-200 dark:border-white/5 font-mono text-xs text-sky-700 dark:text-sky-300 bg-slate-50 dark:bg-[#0a0a0f] mb-4">
                <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-white/5">
                  <span className="text-slate-500 font-sans text-xs">embed.html</span>
                  <button onClick={() => copy(snippet)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-white dark:bg-[#1e1e2e] border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400">
                    <Copy size={11} /> {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="p-4 overflow-x-auto">
                  <pre className="whitespace-pre">{snippet}</pre>
                </div>
              </div>

              <button onClick={() => setStep(1)}
                className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                I've copied it →
              </button>
            </Card>
          )}

          {/* Step 1 — Add to website */}
          {step === 1 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Globe size={18} className="text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Select your platform</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {platforms.map((p, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0f0f13] hover:border-indigo-400 dark:hover:border-indigo-500/30 transition-all">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">{p.name}</div>
                    <div className="text-[11px] text-slate-500 leading-relaxed mb-3">{p.desc}</div>
                    <a href="#" className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      View Guide <ExternalLink size={10} />
                    </a>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setStep(0)}
                  className="px-6 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#1e1e2e] transition-colors hover:bg-slate-200 dark:hover:bg-white/5">
                  ← Back
                </button>
                <button onClick={() => setStep(2)}
                  className="flex-1 px-8 py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                  I've added it to my site →
                </button>
              </div>
            </Card>
          )}

          {/* Step 2 — Verify */}
          {step === 2 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Search size={18} className="text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Verify Installation</h2>
              </div>

              {!verified ? (
                <>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Enter your website URL and we'll check if the widget script is installed correctly.
                  </p>
                  <input
                    type="url"
                    placeholder="https://yourwebsite.com"
                    value={url}
                    onChange={e => { setUrl(e.target.value); setVerifyError(""); }}
                    className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 mb-3 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                  />

                  {verifyError && (
                    <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/15 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                      {verifyError}
                      <button onClick={() => setVerified(true)}
                        className="block mt-2 font-semibold text-indigo-600 dark:text-indigo-400 underline">
                        Mark as Verified →
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => setStep(1)}
                      className="px-6 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#1e1e2e] hover:bg-slate-200 dark:hover:bg-white/5 transition-colors">
                      ← Back
                    </button>
                    <button onClick={handleVerify} disabled={verifying}
                      className="flex-1 flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-70"
                      style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                      {verifying
                        ? <><Loader size={14} className="animate-spin" /> Checking...</>
                        : "Check Installation"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm mb-1">
                    <CheckCircle size={16} /> Widget Verified Successfully!
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    Your chatbot is live on <span className="text-indigo-600 dark:text-indigo-400 font-medium">{url}</span>
                  </p>
                  <button onClick={() => navigate("/customization")}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white shadow-md"
                    style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                    Continue to Customization →
                  </button>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="flex flex-col gap-5">
          <Card className="border-indigo-100 dark:border-indigo-500/10">
            <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">Pro Tip</h3>
            <div className="flex gap-3">
              <Sparkles size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Add the script to your <strong className="text-slate-700 dark:text-slate-300">Global Footer</strong> or <strong className="text-slate-700 dark:text-slate-300">theme.liquid</strong> to make the chatbot available on every page automatically.
              </p>
            </div>
          </Card>

          {/* Live key reminder */}
          <Card>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-widest mb-3">Your Key</h3>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              The snippet above already contains your live API key. Do not share it publicly.
            </p>
            <button onClick={() => navigate("/api-key")}
              className="w-full py-2 rounded-lg border border-slate-200 dark:border-white/5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-slate-600 dark:text-slate-400">
              Manage API Key →
            </button>
          </Card>

          <Card>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-widest mb-3">Need Help?</h3>
            <p className="text-xs text-slate-500 mb-4">Our integration specialists can help you set up for free.</p>
            <button className="w-full py-2 rounded-lg border border-slate-200 dark:border-white/5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-slate-600 dark:text-slate-400">
              Contact Support
            </button>
          </Card>
        </div>

      </div>
    </div>
  );
}