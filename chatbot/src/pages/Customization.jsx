import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, Palette, User, Upload, Loader, Image as ImageIcon, X } from "lucide-react";
import { getWidgetConfig, saveWidgetConfig } from "../api/userService";

const colors = ["#6366f1","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4","#8b5cf6","#f97316"];

const DEFAULT_CFG = {
  botName:        "Support Bot",
  welcomeMessage: "Hi there! 👋 How can I help?",
  color:          "#6366f1",
  position:       "bottom-right",
  theme:          "dark",
  placeholder:    "Type your message...",
  logoUrl:        "",
};

export default function Customization() {
  const [cfg,         setCfg]         = useState(DEFAULT_CFG);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const fileRef = useRef();

  // ── Load config from backend ──
  useEffect(() => {
    getWidgetConfig()
      .then(res => {
        // Backend returns { success, widgetConfig } (not res.config)
        const cfg = res.widgetConfig || res.config;
        if (res.success && cfg && Object.keys(cfg).length > 0) {
          setCfg(prev => ({ ...prev, ...cfg }));
          if (cfg.logoUrl) setLogoPreview(cfg.logoUrl);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }));

  // ── Logo upload → convert to base64 and store ──
  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { setError("Logo must be under 500KB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setLogoPreview(dataUrl);
      set("logoUrl", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview("");
    set("logoUrl", "");
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Save to backend ──
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await saveWidgetConfig(cfg);
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.message || "Failed to save.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setCfg(DEFAULT_CFG);
    setLogoPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const Card = ({ children, title, icon: Icon }) => (
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

  const previewBg   = cfg.theme === "dark" ? "#1e1e2e" : "#fff";
  const previewText = cfg.theme === "dark" ? "#e2e8f0" : "#1e293b";
  const previewMsg  = cfg.theme === "dark" ? "#0f0f13" : "#f1f5f9";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-slate-500 text-sm">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto transition-colors">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight"
          style={{ fontFamily: "'Syne',sans-serif" }}>Customization</h1>
        <p className="text-slate-500 text-sm mt-1">Personalize your chatbot's look and feel.</p>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left: Controls ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Identity */}
          <Card title="Identity" icon={User}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Bot Name</label>
                <input
                  className="px-4 py-2.5 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  value={cfg.botName} onChange={e => set("botName", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Input Placeholder</label>
                <input
                  className="px-4 py-2.5 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  value={cfg.placeholder} onChange={e => set("placeholder", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Welcome Message</label>
                <textarea rows={2}
                  className="px-4 py-2.5 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all resize-none"
                  value={cfg.welcomeMessage} onChange={e => set("welcomeMessage", e.target.value)} />
              </div>
            </div>
          </Card>

          {/* Logo Upload */}
          <Card title="Bot Logo" icon={ImageIcon}>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Upload a custom logo for your chatbot header. Recommended: square image, PNG or JPG, under 500KB.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Preview */}
              <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-white/[0.02] shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="Bot logo" className="w-full h-full object-cover" />
                  : <span className="text-2xl">🤖</span>
                }
              </div>

              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleLogo}
                  className="hidden"
                  id="logo-upload"
                />
                <label htmlFor="logo-upload"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all
                             text-slate-700 dark:text-slate-300
                             border border-slate-200 dark:border-white/10
                             bg-slate-50 dark:bg-white/[0.04]
                             hover:bg-slate-100 dark:hover:bg-white/[0.07]">
                  <Upload size={14} />
                  {logoPreview ? "Change Logo" : "Upload Logo"}
                </label>
                {logoPreview && (
                  <button onClick={removeLogo}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors
                               text-red-500 dark:text-red-400
                               bg-red-50 dark:bg-red-500/10
                               hover:bg-red-100 dark:hover:bg-red-500/15">
                    <X size={12} /> Remove Logo
                  </button>
                )}
              </div>

              {logoPreview && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  ✓ Logo uploaded
                </div>
              )}
            </div>
          </Card>

          {/* Appearance */}
          <Card title="Appearance" icon={Palette}>
            <div className="flex flex-col gap-6">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-3">Primary Color</label>
                <div className="flex gap-3 flex-wrap items-center">
                  {colors.map(c => (
                    <button key={c} onClick={() => set("color", c)}
                      className="w-8 h-8 rounded-full transition-transform hover:scale-110 active:scale-90 shrink-0"
                      style={{ background: c, outline: cfg.color === c ? `2.5px solid ${c}` : "none", outlineOffset: 3 }} />
                  ))}
                  <div className="relative w-8 h-8 shrink-0">
                    <input type="color" value={cfg.color} onChange={e => set("color", e.target.value)}
                      className="absolute inset-0 w-full h-full rounded-full cursor-pointer opacity-0" />
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center text-slate-400 text-xs pointer-events-none"
                      style={{ background: cfg.color !== colors[0] && !colors.includes(cfg.color) ? cfg.color : "transparent" }}>
                      {colors.includes(cfg.color) ? "+" : ""}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-3">Theme</label>
                  <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                    {["dark", "light"].map(t => (
                      <button key={t} onClick={() => set("theme", t)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                          cfg.theme === t
                            ? "bg-white dark:bg-[#1e1e2e] text-indigo-600 dark:text-white shadow-sm"
                            : "text-slate-500"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-3">Position</label>
                  <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                    {["bottom-right", "bottom-left"].map(p => (
                      <button key={p} onClick={() => set("position", p)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                          cfg.position === p
                            ? "bg-white dark:bg-[#1e1e2e] text-indigo-600 dark:text-white shadow-sm"
                            : "text-slate-500"}`}>
                        {p.split("-")[1]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Save / Reset */}
          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
              {saving
                ? <><Loader size={14} className="animate-spin" /> Saving...</>
                : saved
                  ? "✓ Saved!"
                  : "Save Changes"}
            </button>
            <button onClick={reset}
              className="px-8 py-3 rounded-xl text-sm font-medium transition-colors text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
              Reset
            </button>
          </div>
        </div>

        {/* ── Right: Live Preview ── */}
        <div className="lg:sticky lg:top-8 order-first lg:order-last">
          <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-3">Live Preview</div>

          <div className="rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-[#0a0a0f] transition-all aspect-[4/5] lg:aspect-auto lg:min-h-[500px]">
            <div className="absolute top-6 left-0 right-0 text-center text-[10px] text-slate-400 uppercase tracking-[0.2em] pointer-events-none">
              Widget Preview
            </div>

            {/* Widget mockup */}
            <div className="w-full max-w-[280px] rounded-2xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-4" style={{ background: cfg.color }}>
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
                  {logoPreview
                    ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                    : <span className="text-xl">🤖</span>
                  }
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{cfg.botName}</div>
                  <div className="text-[10px] text-white/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="p-4 flex flex-col gap-3" style={{ background: previewBg }}>
                <div className="rounded-2xl rounded-tl-none px-3 py-2.5 text-xs leading-relaxed max-w-[85%]"
                  style={{ background: previewMsg, color: previewText }}>
                  {cfg.welcomeMessage}
                </div>
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-none px-3 py-2.5 text-xs text-white max-w-[85%]"
                    style={{ background: cfg.color }}>
                    How do I change my theme?
                  </div>
                </div>

                {/* Input */}
                <div className="flex gap-2 mt-2 pt-3 border-t"
                  style={{ borderColor: cfg.theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                  <div className="flex-1 h-9 rounded-xl px-3 flex items-center text-[11px]"
                    style={{ background: previewMsg, color: "#64748b", border: `1px solid ${cfg.theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}` }}>
                    {cfg.placeholder}
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                    style={{ background: cfg.color }}>
                    <Send size={14} color="#fff" />
                  </div>
                </div>
              </div>
            </div>

            {/* FAB button */}
            <div className={`absolute bottom-6 ${cfg.position === "bottom-right" ? "right-6" : "left-6"} w-12 h-12 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all cursor-pointer`}
              style={{ background: cfg.color }}>
              <MessageSquare size={22} color="#fff" />
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center mt-3">Changes appear instantly in preview. Click Save to apply.</p>
        </div>

      </div>
    </div>
  );
}