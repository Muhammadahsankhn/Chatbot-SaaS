import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Copy, CheckCircle, Sparkles, Layout, Globe, Search,
  Loader, X, ChevronRight, BookOpen, Code2
} from "lucide-react";
import { getApiKey } from "../api/userService";

const steps = ["Copy Script", "Add to Website", "Verify"];

const platforms = [
  {
    id: "wordpress",
    name: "WordPress",
    emoji: "🟦",
    color: { bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-200 dark:border-blue-500/20", text: "text-blue-700 dark:text-blue-300", num: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300" },
    desc: "Install plugin → paste in footer",
    steps: [
      { title: "Go to WordPress Admin", detail: "Login to your WordPress dashboard at yoursite.com/wp-admin" },
      { title: "Install 'Insert Headers and Footers' plugin", detail: "Go to Plugins → Add New → search 'Insert Headers and Footers' by WPCode → Install & Activate" },
      { title: "Open the plugin settings", detail: "Go to Settings → Insert Headers and Footers in your left sidebar" },
      { title: "Paste your script in the footer section", detail: "Find the 'Scripts in Footer' box and paste your embed script there" },
      { title: "Save and you're done!", detail: "Click Save. Visit your website — the chat widget will now appear on every page!" },
    ],
    tip: "This works on any WordPress theme without touching any code files.",
  },
  {
    id: "shopify",
    name: "Shopify",
    emoji: "🟩",
    color: { bg: "bg-green-50 dark:bg-green-500/10", border: "border-green-200 dark:border-green-500/20", text: "text-green-700 dark:text-green-300", num: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300" },
    desc: "Themes → Edit Code → theme.liquid",
    steps: [
      { title: "Go to your Shopify Admin", detail: "Visit yourstore.myshopify.com/admin and login" },
      { title: "Open Online Store → Themes", detail: "Click 'Online Store' in the left sidebar, then 'Themes'" },
      { title: "Click Actions → Edit Code", detail: "Find your active theme, click the '...' or 'Actions' button, then 'Edit Code'" },
      { title: "Open theme.liquid", detail: "In the left panel under 'Layout', click on theme.liquid to open the file" },
      { title: "Paste before </body>", detail: "Scroll to the very bottom of the file. Find </body> and paste your script just above it" },
      { title: "Save the file", detail: "Click Save in the top right. Widget now appears on all pages of your store!" },
    ],
    tip: "Adding to theme.liquid makes the widget appear on every single page of your Shopify store automatically.",
  },
  {
    id: "webflow",
    name: "Webflow",
    emoji: "🟣",
    color: { bg: "bg-purple-50 dark:bg-purple-500/10", border: "border-purple-200 dark:border-purple-500/20", text: "text-purple-700 dark:text-purple-300", num: "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300" },
    desc: "Project Settings → Custom Code → Footer",
    steps: [
      { title: "Open your Webflow project", detail: "Go to webflow.com and open your project in the Designer" },
      { title: "Open Project Settings", detail: "Click the gear icon ⚙️ in the top left navigation bar" },
      { title: "Go to Custom Code tab", detail: "Click on the 'Custom Code' tab in the settings panel" },
      { title: "Find 'Footer Code' section", detail: "Scroll down to find the 'Footer Code' input box (labeled 'Before </body> tag')" },
      { title: "Paste your script and save", detail: "Paste the embed script in the Footer Code box, then click Save Changes" },
      { title: "Publish your site", detail: "Click Publish in the top right. The widget will be live on your published site!" },
    ],
    tip: "You must Publish your site after saving the code for changes to appear on your live website.",
  },
  {
    id: "nextjs",
    name: "Next.js / React",
    emoji: "⚫",
    color: { bg: "bg-slate-50 dark:bg-slate-500/10", border: "border-slate-200 dark:border-slate-500/20", text: "text-slate-700 dark:text-slate-300", num: "bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300" },
    desc: "_document.js or Script component",
    isCode: true,
    steps: [
      { title: "Open your project in a code editor", detail: "Open VS Code or your preferred editor and navigate to your project folder" },
      { title: "For Next.js — open pages/_document.js", detail: "If the file doesn't exist, create it. This file controls the HTML shell of all pages" },
      { title: "Add Script component", detail: "Import Script from 'next/script' and add it inside your component body" },
      { title: "Use this code:", detail: null, code: `import Script from 'next/script'\n\nexport default function Document() {\n  return (\n    <Html>\n      <Head />\n      <body>\n        <Main />\n        <NextScript />\n        <Script\n          src="YOUR_WIDGET_SRC"\n          data-api-key="YOUR_API_KEY"\n          strategy="afterInteractive"\n        />\n      </body>\n    </Html>\n  )\n}` },
      { title: "For plain React — use public/index.html", detail: "Open public/index.html and paste the script tag just before the closing </body> tag" },
    ],
    tip: "Use strategy='afterInteractive' in Next.js so the widget loads after the page is interactive.",
  },
  {
    id: "html",
    name: "Plain HTML",
    emoji: "🟠",
    color: { bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-500/20", text: "text-orange-700 dark:text-orange-300", num: "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300" },
    desc: "Paste before </body> in your HTML file",
    steps: [
      { title: "Open your HTML file", detail: "Open your .html file in any text editor (Notepad, VS Code, Sublime Text, etc.)" },
      { title: "Find the </body> closing tag", detail: "Press Ctrl+F (Cmd+F on Mac) and search for </body>" },
      { title: "Paste your script just before </body>", detail: "Place your cursor just before </body> and paste the embed script" },
      { title: "Save and upload", detail: "Save the file (Ctrl+S) and upload it to your web server via FTP or your hosting panel" },
      { title: "Done!", detail: "Open your website in a browser — the chat widget will appear in the corner!" },
    ],
    tip: "If you have multiple HTML pages, add the script to each page you want the widget to appear on.",
  },
  {
    id: "wix",
    name: "Wix",
    emoji: "🔵",
    color: { bg: "bg-cyan-50 dark:bg-cyan-500/10", border: "border-cyan-200 dark:border-cyan-500/20", text: "text-cyan-700 dark:text-cyan-300", num: "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300" },
    desc: "Settings → Custom Code → Add Code",
    steps: [
      { title: "Go to your Wix dashboard", detail: "Login at manage.wix.com and select your site" },
      { title: "Open Settings", detail: "Click 'Settings' in the left sidebar of your dashboard" },
      { title: "Click 'Custom Code'", detail: "Scroll down in Settings to find 'Custom Code' under the Advanced section" },
      { title: "Add new code", detail: "Click '+ Add Custom Code' button in the top right" },
      { title: "Paste and configure", detail: "Paste your script, set 'Place Code in' to 'Body - end', and set 'Add Code to' to 'All Pages'" },
      { title: "Apply and publish", detail: "Click Apply, then publish your site. Widget appears on all pages!" },
    ],
    tip: "Make sure to select 'All Pages' so the widget shows up across your entire Wix website.",
  },
];

export default function WidgetSetup() {
  const navigate = useNavigate();
  const [step, setStep]       = useState(0);
  const [apiKey, setApiKey]   = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);
  const [url, setUrl]         = useState("");
  const [verifying, setVerifying]   = useState(false);
  const [verified, setVerified]     = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [openGuide, setOpenGuide]   = useState(null); // platform id

  useEffect(() => {
    getApiKey()
      .then(res => { if (res.success) setApiKey(res.apiKey || ""); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const backendUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;
  const widgetSrc  = `${backendUrl}/widget.js`;
  const snippet    = `<script\n  src="${widgetSrc}"\n  data-api-key="${apiKey || "YOUR_API_KEY"}"\n></script>`;

  const copy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    if (!url) { setVerifyError("Please enter your website URL."); return; }
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http")) cleanUrl = "https://" + cleanUrl;
    setVerifying(true); setVerifyError("");
    try {
      const res  = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(cleanUrl)}`);
      const data = await res.json();
      if (data?.contents?.includes("widget.js") || data?.contents?.includes(apiKey)) {
        setVerified(true);
      } else {
        setVerifyError("Widget not detected automatically. If you've added it, click 'Mark as Verified' to continue.");
      }
    } catch {
      setVerifyError("Could not reach that URL. If you've added the script, click 'Mark as Verified'.");
    } finally { setVerifying(false); }
  };

  const activePlatform = platforms.find(p => p.id === openGuide);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto transition-colors">

      {/* ══════════ GUIDE MODAL ══════════ */}
      {activePlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#16161e] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-white/10 shadow-2xl">

            {/* Modal header */}
            <div className={`flex items-center justify-between p-5 border-b ${activePlatform.color.border} ${activePlatform.color.bg} rounded-t-2xl`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{activePlatform.emoji}</span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">{activePlatform.name}</h2>
                  <p className="text-xs text-slate-500">{activePlatform.desc}</p>
                </div>
              </div>
              <button onClick={() => setOpenGuide(null)} className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-6">

              {/* Steps */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Step-by-step guide</h3>
                <div className="space-y-4">
                  {activePlatform.steps.map((s, i) => (
                    <div key={i} className="flex gap-4">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${activePlatform.color.num}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.title}</p>
                        {s.detail && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.detail}</p>}
                        {s.code && (
                          <pre className="mt-2 p-3 rounded-xl bg-slate-900 text-green-400 text-xs overflow-x-auto font-mono leading-relaxed">
                            {s.code}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tip */}
              <div className="flex gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <Sparkles size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>Tip:</strong> {activePlatform.tip}
                </p>
              </div>

              {/* Embed snippet */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Your embed code</h3>
                  <button onClick={copy} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${copied ? "border-emerald-300 text-emerald-600 bg-emerald-50" : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"}`}>
                    {copied ? <CheckCircle size={12} /> : <Copy size={12} />} {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-slate-900 text-sky-400 text-xs font-mono overflow-x-auto whitespace-pre">
                  {snippet}
                </pre>
              </div>

              <button
                onClick={() => { setOpenGuide(null); setStep(2); }}
                className="w-full py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                I've added it — Verify Installation →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ PAGE HEADER ══════════ */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight" style={{ fontFamily: "'Syne',sans-serif" }}>
          Widget Setup
        </h1>
        <p className="text-slate-500 text-sm mt-1">Get your chatbot live on your website in minutes.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center shrink-0">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                ${i < step ? "bg-emerald-500 border-emerald-500 text-white"
                  : i === step ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15"
                  : "border-slate-200 dark:border-white/10 text-slate-400"}`}>
                {i < step ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span className={`text-sm whitespace-nowrap ${i === step ? "text-slate-900 dark:text-slate-200 font-semibold" : "text-slate-500"}`}>{s}</span>
            </div>
            {i < steps.length - 1 && <div className="w-8 sm:w-20 h-px bg-slate-200 dark:bg-white/5 mx-3" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">

          {/* ── STEP 0: Copy Script ── */}
          {step === 0 && (
            <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Layout size={17} className="text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Copy your embed script</h2>
              </div>
              <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0a0f] border border-slate-200 dark:border-white/5">
                <div>
                  <span className="text-xs text-slate-500">API Key: </span>
                  <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                    {apiKey ? apiKey.slice(0, 12) + "••••" + apiKey.slice(-4) : "—"}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold">● Active</span>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0a0a0f] mb-5 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-white/5">
                  <span className="text-xs text-slate-400 font-mono">embed.html</span>
                  <button onClick={copy} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${copied ? "border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" : "border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 bg-white dark:bg-[#1e1e2e] hover:bg-slate-50"}`}>
                    {copied ? <CheckCircle size={11} /> : <Copy size={11} />} {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-sky-600 dark:text-sky-400 overflow-x-auto whitespace-pre">{snippet}</pre>
              </div>
              <button onClick={() => setStep(1)} className="px-8 py-3 rounded-xl text-sm font-semibold text-white hover:scale-[1.02] transition-transform"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                I've copied it →
              </button>
            </div>
          )}

          {/* ── STEP 1: Platform guides ── */}
          {step === 1 && (
            <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Globe size={17} className="text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Choose your platform</h2>
              </div>
              <p className="text-xs text-slate-500 mb-5">Click <strong>View Guide</strong> for step-by-step instructions for your platform.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {platforms.map(p => (
                  <div key={p.id} className={`p-4 rounded-xl border ${p.color.border} ${p.color.bg} transition-all hover:shadow-sm`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{p.emoji}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{p.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">{p.desc}</p>
                    <button onClick={() => setOpenGuide(p.id)}
                      className={`flex items-center gap-1 text-[11px] font-bold ${p.color.text} hover:underline`}>
                      <BookOpen size={11} /> View Guide <ChevronRight size={11} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setStep(0)} className="px-6 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#1e1e2e] hover:bg-slate-200 transition-colors">
                  ← Back
                </button>
                <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                  I've added it — Verify →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Verify ── */}
          {step === 2 && (
            <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Search size={17} className="text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Verify Installation</h2>
              </div>
              {!verified ? (
                <>
                  <p className="text-xs text-slate-500 mb-4">Enter your website URL and we'll check if the script is installed correctly.</p>
                  <input type="url" placeholder="https://yourwebsite.com" value={url}
                    onChange={e => { setUrl(e.target.value); setVerifyError(""); }}
                    className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 mb-3 focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                  {verifyError && (
                    <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/15 text-xs text-amber-700 dark:text-amber-400">
                      {verifyError}
                      <button onClick={() => setVerified(true)} className="block mt-2 font-bold text-indigo-600 dark:text-indigo-400 underline">
                        Mark as Verified →
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#1e1e2e] hover:bg-slate-200 transition-colors">
                      ← Back
                    </button>
                    <button onClick={handleVerify} disabled={verifying}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-70"
                      style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                      {verifying ? <><Loader size={14} className="animate-spin" /> Checking...</> : "Check Installation"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20">
                  <div className="flex items-center gap-2 font-semibold text-sm text-emerald-700 dark:text-emerald-400 mb-2">
                    <CheckCircle size={16} /> Widget Verified Successfully!
                  </div>
                  <p className="text-xs text-slate-500 mb-4">Your chatbot is live on <span className="text-indigo-600 dark:text-indigo-400 font-medium">{url}</span></p>
                  <button onClick={() => navigate("/train-bot")} className="w-full py-3 rounded-xl text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                    Now Train Your Bot →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-[#16161e] border border-indigo-100 dark:border-indigo-500/10 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">Pro Tip</h3>
            <div className="flex gap-2">
              <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Add the script to your <strong className="text-slate-700 dark:text-slate-300">Global Footer</strong> or <strong className="text-slate-700 dark:text-slate-300">theme.liquid</strong> to make the chatbot available on every page automatically.
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-widest mb-2">Your Key</h3>
            <p className="text-xs text-slate-500 mb-3">The snippet already contains your live API key. Keep it private.</p>
            <button onClick={() => navigate("/api-key")} className="w-full py-2 rounded-lg border border-slate-200 dark:border-white/5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 transition-colors">
              Manage API Key →
            </button>
          </div>
          <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-widest mb-2">Need Help?</h3>
            <p className="text-xs text-slate-500 mb-3">Our team can help you set up for free.</p>
            <button className="w-full py-2 rounded-lg border border-slate-200 dark:border-white/5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 transition-colors">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}