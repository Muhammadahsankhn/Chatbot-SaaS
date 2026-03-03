import { useState } from "react";
import { Send, MessageSquare, Palette, Layout as LayoutIcon, User } from "lucide-react";

const colors = ["#6366f1","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4","#8b5cf6","#f97316"];

export default function Customization() {
  const [cfg, setCfg] = useState({ botName:"Support Bot", welcomeMessage:"Hi there! 👋 How can I help?", color:"#6366f1", position:"bottom-right", theme:"dark", placeholder:"Type your message..." });
  const [saved, setSaved] = useState(false);
  
  const set = (k,v) => setCfg(c => ({...c,[k]:v}));
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const Card = ({children, title, icon: Icon}) => (
    <div className="rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] shadow-sm transition-colors">
      {title && (
        <div className="flex items-center gap-2 mb-5">
          {Icon && <Icon size={16} className="text-indigo-500" />}
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</div>
        </div>
      )}
      {children}
    </div>
  );

  const previewBg = cfg.theme === "dark" ? "#1e1e2e" : "#fff";
  const previewText = cfg.theme === "dark" ? "#e2e8f0" : "#1e293b";
  const previewMsgBg = cfg.theme === "dark" ? "#0f0f13" : "#f1f5f9";

  return (
    <div className="w-full max-w-6xl mx-auto transition-colors">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight" style={{ fontFamily: "'Syne',sans-serif" }}>Customization</h1>
        <p className="text-slate-500 text-sm mt-1">Personalize your chatbot's look and feel.</p>
      </div>

      {/* Main Grid: 1 col on mobile, 3 cols on desktop (2 for settings, 1 for preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Controls (Spans 2 columns) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card title="Identity" icon={User}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Bot Name</label>
                <input className="px-4 py-2.5 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  value={cfg.botName} onChange={e => set("botName", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Input Placeholder</label>
                <input className="px-4 py-2.5 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  value={cfg.placeholder} onChange={e => set("placeholder", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Welcome Message</label>
                <textarea rows={2} className="px-4 py-2.5 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all resize-none"
                  value={cfg.welcomeMessage} onChange={e => set("welcomeMessage", e.target.value)} />
              </div>
            </div>
          </Card>

          <Card title="Appearance" icon={Palette}>
            <div className="flex flex-col gap-6">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-3">Primary Color</label>
                <div className="flex gap-3 flex-wrap">
                  {colors.map(c => (
                    <button key={c} onClick={() => set("color",c)}
                      className="w-8 h-8 rounded-full transition-transform hover:scale-110 active:scale-90"
                      style={{ background:c, outline: cfg.color === c ? `2px solid ${c}` : "none", outlineOffset: 3 }} />
                  ))}
                  <input type="color" value={cfg.color} onChange={e => set("color",e.target.value)} className="w-8 h-8 rounded-full cursor-pointer border-none bg-transparent overflow-hidden" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-3">Theme</label>
                  <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                    {["dark","light"].map(t => (
                      <button key={t} onClick={() => set("theme",t)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${cfg.theme === t ? "bg-white dark:bg-[#1e1e2e] text-indigo-600 dark:text-white shadow-sm" : "text-slate-500"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-3">Position</label>
                  <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                    {["bottom-right","bottom-left"].map(p => (
                      <button key={p} onClick={() => set("position",p)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${cfg.position === p ? "bg-white dark:bg-[#1e1e2e] text-indigo-600 dark:text-white shadow-sm" : "text-slate-500"}`}>
                        {p.split('-')[1]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <button onClick={save} className="flex-1 sm:flex-none px-8 py-3 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
              style={{ background:"linear-gradient(135deg,#4f46e5,#6366f1)" }}>
              {saved ? "✓ Settings Saved" : "Save Changes"}
            </button>
            <button className="px-8 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">Reset</button>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Preview */}
        <div className="lg:sticky lg:top-8 order-first lg:order-last">
          <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-3">Live Preview</div>
          
          <div className="rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-[#0a0a0f] transition-all aspect-[4/5] lg:aspect-auto lg:min-h-[500px]">
            <div className="absolute top-6 left-0 right-0 text-center text-[10px] text-slate-400 uppercase tracking-[0.2em] pointer-events-none">Website Preview Area</div>

            {/* Floating Widget Mockup */}
            <div className="w-full max-w-[280px] rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
              {/* Widget Header */}
              <div className="flex items-center gap-3 px-4 py-4 transition-colors" style={{ background: cfg.color }}>
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xl">🤖</div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{cfg.botName}</div>
                  <div className="text-[10px] text-white/80 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online</div>
                </div>
              </div>

              {/* Widget Messages */}
              <div className="p-4 flex flex-col gap-3" style={{ background: previewBg }}>
                <div className="rounded-2xl rounded-tl-none px-3 py-2.5 text-xs leading-relaxed max-w-[85%]" style={{ background: previewMsgBg, color: previewText }}>{cfg.welcomeMessage}</div>
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-none px-3 py-2.5 text-xs text-white max-w-[85%]" style={{ background: cfg.color }}>How do I change my theme?</div>
                </div>
                
                {/* Widget Input */}
                <div className="flex gap-2 mt-2 pt-3 border-t border-slate-200/10">
                  <div className="flex-1 h-9 rounded-xl px-3 flex items-center text-[11px]" style={{ background: previewMsgBg, color:"#64748b", border:`1px solid ${cfg.theme==="dark"?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.08)"}` }}>{cfg.placeholder}</div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md" style={{ background: cfg.color }}>
                    <Send size={14} color="#fff" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom FAB */}
            <div className={`absolute bottom-6 ${cfg.position === "bottom-right" ? "right-6" : "left-6"} w-12 h-12 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all cursor-pointer`} style={{ background: cfg.color }}>
              <MessageSquare size={22} color="#fff" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}