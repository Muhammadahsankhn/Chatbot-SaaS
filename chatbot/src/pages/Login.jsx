import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../api/authService";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { handleLogin } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [focused, setFocused] = useState(null);
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setMouthOpen(true);
    setTimeout(() => setMouthOpen(false), 600);
  };

  const handleGoogleLogin = () => {
    const backendUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;
    window.location.href = `${backendUrl}/users/auth/google`;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) { setError("Please fill in all fields."); return; }
    if (isRegister && !form.name) { setError("Please enter your full name."); return; }

    setLoading(true);
    try {
      if (isRegister) {
        const regData = await register(form.name, form.email, form.password);
        if (!regData.success) { setError(regData.message || "Registration failed."); return; }
      }
      const loginData = await login(form.email, form.password);
      if (loginData.success) {
        handleLogin(loginData.user);
        navigate("/dashboard");
      } else {
        setError(loginData.message || "Login failed.");
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const blink = () => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 150);
      setTimeout(blink, 2000 + Math.random() * 3000);
    };
    const t = setTimeout(blink, 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const move = (e) => {
      const cx = window.innerWidth * 0.25;
      const cy = window.innerHeight * 0.45;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const max = 6;
      setEyePos({
        x: (dx / dist) * Math.min(dist * 0.04, max),
        y: (dy / dist) * Math.min(dist * 0.04, max),
      });
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  const particles = [
    { left: "15%", top: "12%", size: 6, delay: "0s", dur: "3s" },
    { left: "78%", top: "8%", size: 4, delay: "0.4s", dur: "4s" },
    { left: "88%", top: "55%", size: 3, delay: "0.8s", dur: "3.5s" },
    { left: "22%", top: "72%", size: 5, delay: "1.2s", dur: "5s" },
    { left: "60%", top: "85%", size: 4, delay: "0.6s", dur: "4s" },
    { left: "45%", top: "18%", size: 3, delay: "1.5s", dur: "3s" },
    { left: "10%", top: "45%", size: 6, delay: "0.2s", dur: "4.5s" },
    { left: "92%", top: "30%", size: 3, delay: "1s", dur: "3.5s" },
  ];

  return (
    <div className="login-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        .font-syne { font-family: 'Syne', sans-serif; }
        .font-dm   { font-family: 'DM Sans', sans-serif; }

        /* ── Layout ── */
        .login-root {
          display: flex;
          min-height: 100vh;
          background: #080810;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── Left panel ── */
        .login-left {
          width: 50%;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-right: 1px solid rgba(99,102,241,0.1);
          background: linear-gradient(135deg,#0d0d1a 0%,#0f0b1e 50%,#0a0f1e 100%);
        }

        /* ── Right panel ── */
        .login-right {
          width: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 4rem;
          background: #0c0c14;
          overflow-y: auto;
        }

        /* ── Tablet: stack robot above form ── */
         @media (max-width: 900px) {
  .login-root  { flex-direction: column; }
  .login-left  { display: none; }
  .login-right { width: 100%; padding: 2rem 2rem 3rem; }
}

        /* ── Mobile ── */
       @media (max-width: 480px) {
  .login-right { padding: 1.5rem 1.25rem 2.5rem; }
  .form-card   { max-width: 100% !important; }
}

        /* ── Robot animations ── */
        @keyframes robotFloat   { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-20px)} }
        @keyframes antennaPulse { 0%,100%{box-shadow:0 0 0 0 rgba(129,140,248,0.8),0 0 12px rgba(129,140,248,0.5);background:#818cf8} 50%{box-shadow:0 0 0 8px rgba(129,140,248,0),0 0 20px rgba(129,140,248,0.8);background:#a5b4fc} }
        @keyframes armSwingL    { 0%,100%{transform:rotate(-12deg)} 50%{transform:rotate(12deg)}  }
        @keyframes armSwingR    { 0%,100%{transform:rotate(12deg)}  50%{transform:rotate(-12deg)} }
        @keyframes legBobL      { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-5px)} }
        @keyframes legBobR      { 0%,100%{transform:translateY(-5px)} 50%{transform:translateY(0)} }
        @keyframes scanLine     { 0%{opacity:0.5;width:90%} 50%{opacity:1;width:55%} 100%{opacity:0.5;width:75%} }
        @keyframes shadowPulse  { 0%,100%{transform:scaleX(1);opacity:0.3}   50%{transform:scaleX(0.8);opacity:0.12} }
        @keyframes particleUp   { 0%,100%{transform:translateY(0) scale(1);opacity:0.4} 50%{transform:translateY(-22px) scale(1.3);opacity:0.85} }
        @keyframes gridScroll   { 0%{background-position:0 0} 100%{background-position:40px 40px} }
        @keyframes statusPulse  { 0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,0.7)} 50%{box-shadow:0 0 0 6px rgba(52,211,153,0)} }

        .robot-float  { animation: robotFloat 4s ease-in-out infinite; }
        .arm-l        { animation: armSwingL 3s ease-in-out infinite; transform-origin: top center; }
        .arm-r        { animation: armSwingR 3s ease-in-out infinite 0.5s; transform-origin: top center; }
        .leg-l        { animation: legBobL 2s ease-in-out infinite; }
        .leg-r        { animation: legBobR 2s ease-in-out infinite 0.5s; }
        .antenna-ball { animation: antennaPulse 1.5s ease-in-out infinite; }
        .chest-line   { animation: scanLine 1.5s ease-in-out infinite; }
        .chest-line-2 { animation: scanLine 1.5s ease-in-out infinite 0.3s; }
        .chest-line-3 { animation: scanLine 1.5s ease-in-out infinite 0.6s; }
        .grid-bg      { background-image:linear-gradient(rgba(99,102,241,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.07) 1px,transparent 1px); background-size:40px 40px; animation:gridScroll 8s linear infinite; }
        .robot-shadow { animation: shadowPulse 4s ease-in-out infinite; }
        .particle     { animation: particleUp 3s ease-in-out infinite; }
        .status-dot   { animation: statusPulse 2s ease-in-out infinite; }

        /* ── Form styles ── */
        input::placeholder { color: #6b7280; }
        input:focus        { outline: none; }
        .submit-btn:hover  { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(99,102,241,0.45); }
        .google-btn:hover  { background: rgba(255,255,255,0.07) !important; border-color: rgba(255,255,255,0.15) !important; }
        .tab-btn           { transition: all 0.2s; }
      `}</style>

      {/* ── LEFT: Robot Panel ── */}
      <div className="login-left">
        <div className="grid-bg" style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, transparent 25%, #0d0d1a 75%)" }} />

        {particles.map((p, i) => (
          <div key={i} className="particle" style={{ position: "absolute", left: p.left, top: p.top, width: p.size, height: p.size, borderRadius: "50%", background: "linear-gradient(135deg,#818cf8,#a5b4fc)", boxShadow: "0 0 6px rgba(129,140,248,0.7)", animationDelay: p.delay, animationDuration: p.dur }} />
        ))}

        {/* Robot */}
        <div className="robot-wrap robot-float" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 10, filter: "drop-shadow(0 24px 48px rgba(99,102,241,0.35))" }}>

          {/* Antenna */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 4 }}>
            <div style={{ width: 2, height: 28, borderRadius: 4, background: "linear-gradient(to top,#4f46e5,#818cf8)" }} />
            <div className="antenna-ball" style={{ width: 14, height: 14, borderRadius: "50%", marginTop: -2, background: "#818cf8", boxShadow: "0 0 12px rgba(129,140,248,0.8)" }} />
          </div>

          {/* Head */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16, width: 140, height: 118, background: "linear-gradient(160deg,#1e1b2e,#16132a)", border: "2px solid rgba(99,102,241,0.3)", boxShadow: "0 0 30px rgba(99,102,241,0.2),inset 0 1px 0 rgba(255,255,255,0.08)" }}>
            <div style={{ position: "absolute", width: 13, height: 32, left: -13, top: "50%", transform: "translateY(-50%)", borderRadius: 4, background: "linear-gradient(to right,#1e1b2e,#2d2a4a)", border: "1.5px solid rgba(99,102,241,0.2)" }} />
            <div style={{ position: "absolute", width: 13, height: 32, right: -13, top: "50%", transform: "translateY(-50%)", borderRadius: 4, background: "linear-gradient(to right,#2d2a4a,#1e1b2e)", border: "1.5px solid rgba(99,102,241,0.2)" }} />
            {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, left: 8 }, { bottom: 8, right: 8 }].map((pos, i) => (
              <div key={i} style={{ position: "absolute", width: 6, height: 6, borderRadius: "50%", background: "#2d2a4a", border: "1px solid rgba(99,102,241,0.2)", ...pos }} />
            ))}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, width: 108, height: 78, background: "rgba(0,0,0,0.5)", border: "1.5px solid rgba(99,102,241,0.2)", boxShadow: "inset 0 0 20px rgba(99,102,241,0.15)" }}>
              <div style={{ display: "flex", gap: 20 }}>
                {[0, 1].map(i => (
                  <div key={i} style={{ position: "relative", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0818", border: "2px solid rgba(99,102,241,0.4)", boxShadow: "0 0 10px rgba(99,102,241,0.4),inset 0 0 8px rgba(99,102,241,0.2)" }}>
                    <div style={{ position: "absolute", inset: 2, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.3) 0%,transparent 70%)" }} />
                    <div style={{ position: "absolute", width: 13, height: blinking ? 2 : 13, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%,#a5b4fc,#4f46e5)", boxShadow: "0 0 8px rgba(129,140,248,0.9)", transform: `translate(${eyePos.x}px,${eyePos.y}px)`, transition: "height 0.05s" }} />
                  </div>
                ))}
              </div>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(129,140,248,0.5)", boxShadow: "0 0 4px rgba(129,140,248,0.5)" }} />
              <div style={{ width: 40, overflow: "hidden", background: "#0a0818", border: "1.5px solid rgba(99,102,241,0.3)", borderTop: "none", height: mouthOpen ? 18 : 8, borderRadius: mouthOpen ? "0 0 12px 12px" : "0 0 8px 8px", transition: "all 0.15s" }}>
                {mouthOpen && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 2, paddingTop: 2 }}>
                    {[...Array(4)].map((_, i) => <div key={i} style={{ width: 6, height: 8, background: "#f1f5f9", borderRadius: "0 0 2px 2px" }} />)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Neck */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: -2, width: 36 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ width: 36, height: 8, borderRadius: 2, background: "linear-gradient(to right,#1a1830,#252244,#1a1830)", border: "1px solid rgba(99,102,241,0.15)" }} />
            ))}
          </div>

          {/* Body */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 120, height: 100, background: "linear-gradient(160deg,#1e1b2e,#16132a)", borderRadius: "16px 16px 20px 20px", border: "2px solid rgba(99,102,241,0.25)", boxShadow: "0 0 20px rgba(99,102,241,0.15),inset 0 1px 0 rgba(255,255,255,0.05)" }}>
            <div style={{ position: "absolute", left: -10, top: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {["#f472b6", "#34d399"].map((c, i) => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1830", border: "1.5px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: c, opacity: 0.85 }} />
                </div>
              ))}
            </div>
            <div style={{ position: "absolute", right: -10, top: 12, width: 12, height: 12, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1830", border: "1.5px solid rgba(255,255,255,0.1)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24", opacity: 0.85 }} />
            </div>
            <div style={{ borderRadius: 12, padding: 10, overflow: "hidden", width: 76, height: 60, background: "#0a0818", border: "1.5px solid rgba(99,102,241,0.25)", boxShadow: "inset 0 0 12px rgba(99,102,241,0.15)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["chest-line", "chest-line-2", "chest-line-3"].map((cls, i) => (
                  <div key={i} className={cls} style={{ height: 4, borderRadius: 4, background: "linear-gradient(to right,#6366f1,#818cf8)", boxShadow: "0 0 6px rgba(99,102,241,0.6)" }} />
                ))}
              </div>
            </div>
            {[{ cls: "arm-l", pos: { left: -52, top: 8 } }, { cls: "arm-r", pos: { right: -52, top: 8 } }].map(({ cls, pos }) => (
              <div key={cls} className={cls} style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", ...pos }}>
                <div style={{ width: 18, height: 34, borderRadius: 6, background: "linear-gradient(to bottom,#1e1b2e,#252244)", border: "1.5px solid rgba(99,102,241,0.2)" }} />
                <div style={{ width: 20, height: 20, borderRadius: "50%", marginTop: -4, background: "linear-gradient(135deg,#2d2a4a,#1a1830)", border: "2px solid rgba(99,102,241,0.25)" }} />
                <div style={{ width: 16, height: 26, borderRadius: 6, marginTop: -4, background: "linear-gradient(to bottom,#252244,#1e1b2e)", border: "1.5px solid rgba(99,102,241,0.2)" }} />
                <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
                  {[...Array(3)].map((_, i) => <div key={i} style={{ width: 5, height: 13, borderRadius: 2, background: "#252244", border: "1px solid rgba(99,102,241,0.2)" }} />)}
                </div>
              </div>
            ))}
          </div>

          {/* Legs */}
          <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
            {["leg-l", "leg-r"].map((cls, i) => (
              <div key={i} className={cls} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 24, height: 30, borderRadius: 6, background: "linear-gradient(to bottom,#1e1b2e,#252244)", border: "1.5px solid rgba(99,102,241,0.2)" }} />
                <div style={{ width: 26, height: 15, borderRadius: "50%", marginTop: -4, background: "linear-gradient(135deg,#2d2a4a,#1a1830)", border: "2px solid rgba(99,102,241,0.25)" }} />
                <div style={{ width: 20, height: 26, borderRadius: 6, marginTop: -4, background: "linear-gradient(to bottom,#252244,#1e1b2e)", border: "1.5px solid rgba(99,102,241,0.2)" }} />
                <div style={{ width: 32, height: 11, borderRadius: "0 0 6px 6px", marginTop: -2, background: "linear-gradient(to right,#1e1b2e,#252244,#1e1b2e)", border: "1.5px solid rgba(99,102,241,0.2)" }} />
              </div>
            ))}
          </div>
        </div>

        <div className="robot-shadow" style={{ width: 120, height: 18, borderRadius: "50%", marginTop: 12, zIndex: 10, background: "rgba(99,102,241,0.2)", filter: "blur(12px)" }} />
        <div className="font-dm" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24, zIndex: 10, color: "rgba(129,140,248,0.7)", fontSize: 12, fontWeight: 500, letterSpacing: "0.08em" }}>
          <div className="status-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px rgba(52,211,153,0.8)" }} />
          AI Assistant Online
        </div>
        <div className="login-brand-bottom font-syne" style={{ position: "absolute", bottom: 32, fontSize: 24, fontWeight: 700, color: "rgba(129,140,248,0.4)", letterSpacing: "-0.02em", zIndex: 10 }}>Digi Chat</div>
      </div>

      {/* ── RIGHT: Form Panel ── */}
      <div className="login-right">
        <div className="form-card" style={{ width: "100%", maxWidth: 360 }}>
          <div className="font-syne" style={{ fontSize: 20, fontWeight: 800, color: "#818cf8", marginBottom: 32, letterSpacing: "-0.02em" }}>Digi Chat</div>

          {/* Tab switcher */}
          <div style={{ display: "flex", borderRadius: 12, padding: 4, marginBottom: 28, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {["Sign In", "Register"].map((label, i) => (
              <button key={i} onClick={() => { setIsRegister(i === 1); setError(""); }}
                className="tab-btn font-dm"
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer",
                  background: (i === 0 && !isRegister) || (i === 1 && isRegister) ? "rgba(99,102,241,0.2)" : "transparent",
                  color: (i === 0 && !isRegister) || (i === 1 && isRegister) ? "#a5b4fc" : "#64748b",
                  boxShadow: (i === 0 && !isRegister) || (i === 1 && isRegister) ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
                }}>
                {label}
              </button>
            ))}
          </div>

          <h2 className="font-syne" style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 6, letterSpacing: "-0.02em" }}>
            {isRegister ? "Create account" : "Welcome back"}
          </h2>
          <p className="font-dm" style={{ fontSize: 14, color: "#94a3b8", marginBottom: 28, lineHeight: 1.6 }}>
            {isRegister ? "Deploy your chatbot in minutes." : "Sign in to manage your chatbots."}
          </p>

          {error && (
            <div className="font-dm" style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, fontSize: 14, color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {isRegister && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="font-dm" style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8", letterSpacing: "0.04em" }}>Full Name</label>
                <input name="name" value={form.name} onChange={handle}
                  onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
                  placeholder="John Doe"
                  className="font-dm"
                  style={{ borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff", background: "rgba(255,255,255,0.04)", border: focused === "name" ? "1.5px solid rgba(99,102,241,0.6)" : "1.5px solid rgba(255,255,255,0.08)", boxShadow: focused === "name" ? "0 0 0 3px rgba(99,102,241,0.1)" : "none", transition: "all 0.2s", width: "100%" }} />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="font-dm" style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8", letterSpacing: "0.04em" }}>Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handle}
                onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
                placeholder="you@company.com"
                className="font-dm"
                style={{ borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff", background: "rgba(255,255,255,0.04)", border: focused === "email" ? "1.5px solid rgba(99,102,241,0.6)" : "1.5px solid rgba(255,255,255,0.08)", boxShadow: focused === "email" ? "0 0 0 3px rgba(99,102,241,0.1)" : "none", transition: "all 0.2s", width: "100%" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="font-dm" style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8", letterSpacing: "0.04em" }}>Password</label>
                {!isRegister && <span className="font-dm" style={{ fontSize: 12, color: "#818cf8", cursor: "pointer", fontWeight: 500 }}>Forgot?</span>}
              </div>
              <input name="password" type="password" value={form.password} onChange={handle}
                onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                placeholder="••••••••"
                className="font-dm"
                style={{ borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff", background: "rgba(255,255,255,0.04)", border: focused === "password" ? "1.5px solid rgba(99,102,241,0.6)" : "1.5px solid rgba(255,255,255,0.08)", boxShadow: focused === "password" ? "0 0 0 3px rgba(99,102,241,0.1)" : "none", transition: "all 0.2s", width: "100%" }} />
            </div>

            <button type="submit" disabled={loading}
              className="submit-btn font-dm"
              style={{ marginTop: 4, borderRadius: 12, padding: "14px 0", color: "#fff", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", cursor: loading ? "not-allowed" : "pointer", background: "linear-gradient(135deg,#4f46e5,#6366f1,#818cf8)", boxShadow: "0 4px 20px rgba(99,102,241,0.35)", opacity: loading ? 0.7 : 1, transition: "all 0.2s", width: "100%" }}>
              {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
              {!loading && <span style={{ fontSize: 16 }}>→</span>}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
            <span className="font-dm" style={{ margin: "0 12px", fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          </div>

          {/* Google button */}
          <button onClick={handleGoogleLogin}
            className="google-btn font-dm"
            style={{ width: "100%", padding: "12px 0", borderRadius: 12, fontSize: 14, fontWeight: 500, color: "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", border: "1.5px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", transition: "all 0.2s" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <p className="font-dm" style={{ textAlign: "center", color: "#94a3b8", fontSize: 14, marginTop: 24 }}>
            {isRegister ? "Already have an account? " : "Don't have an account? "}
            <span style={{ color: "#818cf8", fontWeight: 600, cursor: "pointer" }} onClick={() => { setIsRegister(!isRegister); setError(""); }}>
              {isRegister ? "Sign In" : "Register free"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}