import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, CheckCircle, ExternalLink, Sparkles, Layout, Globe, Search } from "lucide-react";

const steps = ["Copy Script", "Add to Website", "Verify"];

export default function WidgetSetup() {
  const [step, setStep] = useState(0);
  const [verified, setVerified] = useState(false);
  const [url, setUrl] = useState("");
  const navigate = useNavigate();
  
  const apiKey = "cb_live_sk_4f8a2d91e3c7b05f6a2d91e3c7b05f6a";
  const snippet = `<script\n  src="https://chatbase.io/widget.js"\n  data-api-key="${apiKey}"\n></script>`;

  const Card = ({ children, className = "" }) => (
    <div className={`rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] shadow-sm dark:shadow-none transition-colors ${className}`}>
      {children}
    </div>
  );

  const platforms = [
    { name: "WordPress", desc: "Use 'Insert Headers and Footers' plugin" },
    { name: "Shopify", desc: "Online Store → Themes → Edit Code → theme.liquid" },
    { name: "Webflow", desc: "Project Settings → Custom Code → Footer Code" },
    { name: "Next.js / React", desc: "Add to _document.js or use Script component" },
    { name: "Plain HTML", desc: "Paste before </body> in your HTML file" },
  ];

  return (
    <div className="transition-colors w-full max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight" style={{ fontFamily: "'Syne',sans-serif" }}>Widget Setup</h1>
        <p className="text-slate-500 text-sm mt-1">Get your chatbot live on your website in minutes.</p>
      </div>

      {/* STEPPER: Expanded width and responsive layout */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center shrink-0">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all 
                ${i < step ? "bg-emerald-500 border-emerald-500 text-white" 
                  : i === step ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15" 
                  : "border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-600 bg-transparent"}`}>
                {i < step ? <CheckCircle size={15} /> : i + 1}
              </div>
              <span className={`text-sm whitespace-nowrap ${i === step ? "text-slate-900 dark:text-slate-200 font-semibold" : "text-slate-500"}`}>{s}</span>
            </div>
            {i < steps.length - 1 && <div className="w-8 sm:w-16 md:w-24 h-px bg-slate-200 dark:bg-white/5 mx-3" />}
          </div>
        ))}
      </div>

      {/* MAIN CONTENT GRID: This fills the horizontal space */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: The Step Card (Takes 2/3 of desktop width) */}
        <div className="lg:col-span-2">
          {step === 0 && (
            <Card className="animate-in fade-in duration-500">
              <div className="flex items-center gap-2 mb-4">
                <Layout size={18} className="text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Copy your embed script</h2>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-white/5 font-mono text-xs text-sky-700 dark:text-sky-300 bg-slate-50 dark:bg-[#0a0a0f] mb-4">
                <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-white/5">
                  <span className="text-slate-500 font-sans">embed.html</span>
                  <button onClick={() => navigator.clipboard.writeText(snippet)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-[#1e1e2e] border border-slate-200 dark:border-white/5 hover:bg-slate-50 transition-colors">
                    <Copy size={11}/> Copy
                  </button>
                </div>
                <div className="p-4 overflow-x-auto">
                  <pre className="whitespace-pre">{snippet}</pre>
                </div>
              </div>
              <button onClick={() => setStep(1)} className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-semibold text-white transition-transform hover:scale-[1.02]" style={{ background:"linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                I've copied it →
              </button>
            </Card>
          )}

          {step === 1 && (
            <Card className="animate-in fade-in duration-500">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={18} className="text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Select your platform</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {platforms.map((p, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0f0f13] hover:border-indigo-400 dark:hover:border-indigo-500/30 transition-all group">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">{p.name}</div>
                    <div className="text-[11px] text-slate-500 leading-relaxed mb-3">{p.desc}</div>
                    <a href="#" className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">View Guide <ExternalLink size={10}/></a>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setStep(0)} className="px-6 py-3 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 dark:bg-[#1e1e2e] dark:text-slate-400">← Back</button>
                <button onClick={() => setStep(2)} className="flex-1 px-8 py-3 rounded-xl text-sm font-semibold text-white shadow-lg" style={{ background:"linear-gradient(135deg,#4f46e5,#6366f1)" }}>I've added it to my site →</button>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card className="animate-in fade-in duration-500">
              <div className="flex items-center gap-2 mb-4">
                <Search size={18} className="text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Verify Installation</h2>
              </div>
              <input type="url" placeholder="https://example.com" value={url} onChange={e => setUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 mb-5 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
              
              {!verified ? (
                <button onClick={() => setVerified(true)} className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-semibold text-white" style={{ background:"linear-gradient(135deg,#4f46e5,#6366f1)" }}>Check Installation</button>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 mb-5">
                   <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                     <CheckCircle size={16} /> Verified Successfully!
                   </div>
                   <button onClick={() => navigate("/customization")} className="mt-4 w-full py-3 rounded-xl text-sm font-bold text-white shadow-md" style={{ background:"linear-gradient(135deg,#4f46e5,#6366f1)" }}>Continue to Customization</button>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: Sidebar info (Fills the remaining horizontal space) */}
        <div className="flex flex-col gap-5">
          <Card className="border-indigo-100 dark:border-indigo-500/10">
            <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">Pro Tip</h3>
            <div className="flex gap-3">
              <Sparkles size={18} className="text-amber-500 shrink-0" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Add the script to your <strong>Global Footer</strong> or <strong>theme.liquid</strong> to make the chatbot available on every page automatically.
              </p>
            </div>
          </Card>

          <Card>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-widest mb-3">Need Help?</h3>
            <p className="text-xs text-slate-500 mb-4">Our integration specialists can help you set up for free.</p>
            <button className="w-full py-2 rounded-lg border border-slate-200 dark:border-white/5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">Contact Support</button>
          </Card>
        </div>

      </div>
    </div>
  );
}