import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login, register } from "../api/authService";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../context/ThemeContext";

export default function Login() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { handleLogin } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [focused, setFocused] = useState(null);
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const err = params.get("error");
    if (err) {
      if (err === "not_registered") setError("User is not registered yet. Please register first.");
      else if (err === "sync_error") setError("Sync error occurred.");
      else setError(err);
      
      // Remove error from URL without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.search]);

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setMouthOpen(true);
    setTimeout(() => setMouthOpen(false), 600);
  };

  const handleGoogleLogin = () => {
    // Force the correct domain as fallback
    const backendUrl = import.meta.env.VITE_API_URL || "https://digichat.digixworkspace.com";
    const intent = isRegister ? "register" : "login";
    window.location.href = `${backendUrl}/users/auth/google?intent=${intent}`;
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
          height: 100vh;
          width: 100%;
          background: ${isDark ? "#080810" : "#f8fafc"};
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
          position: fixed;
          top: 0; left: 0;
        }

        /* ── Left panel ── */
        .login-left {
          width: 50%;
          height: 100%;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-right: 1px solid ${isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.05)"};
          background: ${isDark 
            ? "linear-gradient(135deg, #0d0d1a 0%, #0f0b1e 50%, #0a0f1e 100%)" 
            : "linear-gradient(135deg, #f0f4ff 0%, #ffffff 50%, #f0f4ff 100%)"};
        }

        .robot-wrap { max-width: 100%; overflow: visible; }

        /* ── Right panel ── */
        .login-right {
          width: 50%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem 3rem;
          background: ${isDark ? "#0c0c14" : "#ffffff"};
          overflow-y: auto;
          overflow-x: hidden;
          position: relative;
          /* Hide scrollbar visually */
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .login-right::-webkit-scrollbar { display: none; }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .login-left { width: 45%; }
          .login-right { width: 55%; padding: 1.5rem 2rem; }
        }
        @media (max-width: 900px) {
          .login-root { flex-direction: column; }
          .login-left { display: none; }
          .login-right { width: 100%; height: 100%; padding: 1.5rem 1.5rem; align-items: flex-start; padding-top: 2rem; }
        }
        @media (max-width: 480px) {
          .login-right { padding: 1.25rem 1rem; }
          .form-card { max-width: 100% !important; }
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
        .grid-bg      { background-image:linear-gradient(${isDark ? "rgba(99,102,241,0.07)" : "rgba(99,102,241,0.12)"} 1px,transparent 1px),linear-gradient(90deg,${isDark ? "rgba(99,102,241,0.07)" : "rgba(99,102,241,0.12)"} 1px,transparent 1px); background-size:40px 40px; animation:gridScroll 8s linear infinite; }
        .robot-shadow { animation: shadowPulse 4s ease-in-out infinite; }
        .particle     { animation: particleUp 3s ease-in-out infinite; }
        .status-dot   { animation: statusPulse 2s ease-in-out infinite; }

        /* ── Form styles ── */
        input::placeholder { color: ${isDark ? "#64748b" : "#94a3b8"}; }
        input:focus        { outline: none; }
        .submit-btn:hover  { transform: translateY(-1px); box-shadow: 0 12px 30px rgba(79,70,229,0.4); }
        .google-btn:hover  { background: ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.02)"} !important; border-color: ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"} !important; }
        .tab-btn           { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>

      {/* ── LEFT: Robot Panel ── */}
      <div className="login-left">
        <div className="grid-bg" style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, transparent 20%, ${isDark ? "#0d0d1a" : "#ffffff"} 85%)` }} />

        {particles.map((p, i) => (
          <div key={i} className="particle" style={{ position: "absolute", left: p.left, top: p.top, width: p.size, height: p.size, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#818cf8)", boxShadow: "0 0 10px rgba(99,102,241,0.5)", animationDelay: p.delay, animationDuration: p.dur }} />
        ))}

        {/* Robot */}
        <div className="robot-wrap robot-float" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 10, filter: "drop-shadow(0 30px 60px rgba(99,102,241,0.4))" }}>

          {/* Antenna */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 4 }}>
            <div style={{ width: 2, height: 32, borderRadius: 4, background: "linear-gradient(to top,#4f46e5,#818cf8)" }} />
            <div className="antenna-ball" style={{ width: 16, height: 16, borderRadius: "50%", marginTop: -2, background: "#818cf8", boxShadow: "0 0 15px rgba(129,140,248,0.9)" }} />
          </div>

          {/* Head */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 20, width: 144, height: 124, background: "linear-gradient(160deg,#1e1b2e,#16132a)", border: "2px solid rgba(99,102,241,0.35)", boxShadow: "0 0 40px rgba(99,102,241,0.25), inset 0 1px 1px rgba(255,255,255,0.1)" }}>
            <div style={{ position: "absolute", width: 14, height: 36, left: -14, top: "50%", transform: "translateY(-50%)", borderRadius: "6px 0 0 6px", background: "linear-gradient(to right,#1e1b2e,#2d2a4a)", border: "2px solid rgba(99,102,241,0.25)", borderRight: "none" }} />
            <div style={{ position: "absolute", width: 14, height: 36, right: -14, top: "50%", transform: "translateY(-50%)", borderRadius: "0 6px 6px 0", background: "linear-gradient(to left,#1e1b2e,#2d2a4a)", border: "2px solid rgba(99,102,241,0.25)", borderLeft: "none" }} />
            
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, width: 112, height: 84, background: "rgba(0,0,0,0.6)", border: "2px solid rgba(99,102,241,0.25)", boxShadow: "inset 0 0 25px rgba(99,102,241,0.2)" }}>
              <div style={{ display: "flex", gap: 24 }}>
                {[0, 1].map(i => (
                  <div key={i} style={{ position: "relative", width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0818", border: "2px solid rgba(99,102,241,0.5)", boxShadow: "0 0 15px rgba(99,102,241,0.5), inset 0 0 10px rgba(99,102,241,0.3)" }}>
                    <div style={{ position: "absolute", inset: 2, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 75%)" }} />
                    <div style={{ position: "absolute", width: 14, height: blinking ? 3 : 14, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #a5b4fc, #4f46e5)", boxShadow: "0 0 10px rgba(129,140,248,1)", transform: `translate(${eyePos.x}px, ${eyePos.y}px)`, transition: "height 0.08s ease" }} />
                  </div>
                ))}
              </div>
              <div style={{ width: 44, height: mouthOpen ? 18 : 6, borderRadius: mouthOpen ? "0 0 14px 14px" : "4px", background: "#0a0818", border: "1.5px solid rgba(99,102,241,0.4)", borderTop: mouthOpen ? "none" : "1.5px solid rgba(99,102,241,0.4)", transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)", overflow: "hidden" }}>
                {mouthOpen && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 2, paddingTop: 3 }}>
                    {[...Array(4)].map((_, i) => <div key={i} style={{ width: 7, height: 10, background: "#f1f5f9", borderRadius: "1px" }} />)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Neck */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, marginTop: -2, width: 40 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ width: 40, height: 10, borderRadius: 3, background: "linear-gradient(to right, #1a1830, #252244, #1a1830)", border: "1px solid rgba(99,102,241,0.2)" }} />
            ))}
          </div>

          {/* Body */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 124, height: 106, background: "linear-gradient(160deg,#1e1b2e,#16132a)", borderRadius: "20px 20px 24px 24px", border: "2px solid rgba(99,102,241,0.3)", boxShadow: "0 0 30px rgba(99,102,241,0.2), inset 0 1px 1px rgba(255,255,255,0.08)" }}>
            <div style={{ position: "absolute", left: -12, top: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {["#f472b6", "#34d399", "#fbbf24"].map((c, i) => (
                <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1830", border: "1.5px solid rgba(255,255,255,0.15)", boxShadow: `0 0 8px ${c}44` }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
                </div>
              ))}
            </div>
            
            <div style={{ borderRadius: 16, padding: 12, width: 80, height: 64, background: "#0a0818", border: "2px solid rgba(99,102,241,0.3)", boxShadow: "inset 0 0 15px rgba(99,102,241,0.25)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["chest-line", "chest-line-2", "chest-line-3"].map((cls, i) => (
                  <div key={i} className={cls} style={{ height: 5, borderRadius: 5, background: "linear-gradient(to right, #6366f1, #818cf8)", boxShadow: "0 0 8px rgba(99,102,241,0.7)" }} />
                ))}
              </div>
            </div>

            {[{ cls: "arm-l", pos: { left: -38, top: 10 } }, { cls: "arm-r", pos: { right: -38, top: 10 } }].map(({ cls, pos }) => (
              <div key={cls} className={cls} style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", ...pos }}>
                <div style={{ width: 16, height: 32, borderRadius: 6, background: "linear-gradient(to bottom, #1e1b2e, #252244)", border: "2px solid rgba(99,102,241,0.25)" }} />
                <div style={{ width: 18, height: 18, borderRadius: "50%", marginTop: -4, background: "linear-gradient(135deg, #2d2a4a, #1a1830)", border: "2px solid rgba(99,102,241,0.3)" }} />
                <div style={{ width: 14, height: 22, borderRadius: 6, marginTop: -4, background: "linear-gradient(to bottom, #252244, #1e1b2e)", border: "2px solid rgba(99,102,241,0.25)" }} />
                <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
                  {[...Array(3)].map((_, i) => <div key={i} style={{ width: 4, height: 10, borderRadius: 2, background: "#252244", border: "1px solid rgba(99,102,241,0.25)" }} />)}
                </div>
              </div>
            ))}
          </div>

          {/* Legs */}
          <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
            {["leg-l", "leg-r"].map((cls, i) => (
              <div key={i} className={cls} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 28, height: 34, borderRadius: 8, background: "linear-gradient(to bottom, #1e1b2e, #252244)", border: "2px solid rgba(99,102,241,0.25)" }} />
                <div style={{ width: 30, height: 16, borderRadius: "50%", marginTop: -5, background: "linear-gradient(135deg, #2d2a4a, #1a1830)", border: "2.5px solid rgba(99,102,241,0.3)" }} />
                <div style={{ width: 24, height: 30, borderRadius: 8, marginTop: -5, background: "linear-gradient(to bottom, #252244, #1e1b2e)", border: "2px solid rgba(99,102,241,0.25)" }} />
                <div style={{ width: 36, height: 12, borderRadius: "0 0 8px 8px", marginTop: -2, background: "linear-gradient(to right, #1e1b2e, #252244, #1e1b2e)", border: "2px solid rgba(99,102,241,0.25)" }} />
              </div>
            ))}
          </div>
        </div>

        <div className="robot-shadow" style={{ width: 140, height: 20, borderRadius: "50%", marginTop: 16, zIndex: 10, background: "rgba(99,102,241,0.25)", filter: "blur(15px)" }} />
        
        <div className="font-dm" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 32, zIndex: 10, color: isDark ? "rgba(165,180,252,0.8)" : "#4f46e5", fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(79,70,229,0.05)", padding: "6px 16px", borderRadius: "20px", border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(79,70,229,0.1)"}` }}>
          <div className="status-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px rgba(16,185,129,0.6)" }} />
          System Active
        </div>
        
        <div className="login-brand-bottom font-syne" style={{ position: "absolute", bottom: 40, fontSize: 28, fontWeight: 800, color: isDark ? "rgba(255,255,255,0.05)" : "rgba(79,70,229,0.08)", letterSpacing: "-0.03em", zIndex: 10 }}>DIGI CHAT</div>
      </div>

      {/* ── RIGHT: Form Panel ── */}
      <div className="login-right">
        <div className="form-card" style={{ width: "100%", maxWidth: 400, zIndex: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div className="font-syne" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #4f46e5, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(79,70,229,0.3)" }}>
                <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>D</span>
              </div>
              <span style={{ fontSize: 20, fontWeight: 800, color: isDark ? "#fff" : "#1e1b4b", letterSpacing: "-0.02em" }}>Digi Chat</span>
            </div>
            <ThemeToggle />
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", borderRadius: 12, padding: 4, marginBottom: 20, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
            {["Sign In", "Register"].map((label, i) => (
              <button key={i} onClick={() => { setIsRegister(i === 1); setError(""); }}
                className="tab-btn font-dm"
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                  background: (i === 0 && !isRegister) || (i === 1 && isRegister) ? (isDark ? "rgba(99,102,241,0.25)" : "#fff") : "transparent",
                  color: (i === 0 && !isRegister) || (i === 1 && isRegister) ? (isDark ? "#c7d2fe" : "#4f46e5") : (isDark ? "#64748b" : "#94a3b8"),
                  boxShadow: (i === 0 && !isRegister) || (i === 1 && isRegister) ? (isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.05)") : "none",
                }}>
                {label}
              </button>
            ))}
          </div>

          <h2 className="font-syne" style={{ fontSize: 24, fontWeight: 800, color: isDark ? "#fff" : "#1e1b4b", marginBottom: 4, letterSpacing: "-0.02em" }}>
            {isRegister ? "Start building today" : "Welcome back"}
          </h2>
          <p className="font-dm" style={{ fontSize: 13, color: isDark ? "#94a3b8" : "#64748b", marginBottom: 18, lineHeight: 1.5 }}>
            {isRegister ? "Join 10,000+ businesses using Digi Chat." : "Sign in to access your AI dashboard."}
          </p>

          {error && (
            <div className="font-dm" style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, fontSize: 13, color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {isRegister && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label className="font-dm" style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#64748b", marginLeft: 2 }}>Full Name</label>
                <input name="name" value={form.name} onChange={handle}
                  onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
                  placeholder="John Doe" className="font-dm"
                  style={{ borderRadius: 10, padding: "11px 14px", fontSize: 14, color: isDark ? "#fff" : "#1e1b4b", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: focused === "name" ? "2px solid #6366f1" : `2px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, boxShadow: focused === "name" ? "0 0 0 3px rgba(99,102,241,0.12)" : "none", transition: "all 0.2s", width: "100%" }} />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label className="font-dm" style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#64748b", marginLeft: 2 }}>Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handle}
                onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
                placeholder="you@company.com" className="font-dm"
                style={{ borderRadius: 10, padding: "11px 14px", fontSize: 14, color: isDark ? "#fff" : "#1e1b4b", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: focused === "email" ? "2px solid #6366f1" : `2px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, boxShadow: focused === "email" ? "0 0 0 3px rgba(99,102,241,0.12)" : "none", transition: "all 0.2s", width: "100%" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="font-dm" style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#64748b" }}>Password</label>
                {!isRegister && <span className="font-dm" style={{ fontSize: 12, color: "#6366f1", cursor: "pointer", fontWeight: 600 }}>Forgot?</span>}
              </div>
              <input name="password" type="password" value={form.password} onChange={handle}
                onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                placeholder="••••••••" className="font-dm"
                style={{ borderRadius: 10, padding: "11px 14px", fontSize: 14, color: isDark ? "#fff" : "#1e1b4b", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: focused === "password" ? "2px solid #6366f1" : `2px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, boxShadow: focused === "password" ? "0 0 0 3px rgba(99,102,241,0.12)" : "none", transition: "all 0.2s", width: "100%" }} />
            </div>

            <button type="submit" disabled={loading}
              className="submit-btn font-dm"
              style={{ marginTop: 4, borderRadius: 10, padding: "12px 0", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", cursor: loading ? "not-allowed" : "pointer", background: "linear-gradient(135deg,#4f46e5,#6366f1,#818cf8)", boxShadow: "0 6px 20px rgba(79,70,229,0.35)", opacity: loading ? 0.8 : 1, transition: "all 0.3s", width: "100%" }}>
              {loading ? "Processing..." : isRegister ? "Create Free Account" : "Sign In to Dashboard"}
              {!loading && <span style={{ fontSize: 16 }}>→</span>}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", margin: "16px 0" }}>
            <div style={{ flex: 1, height: 1, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />
            <span className="font-dm" style={{ margin: "0 12px", fontSize: 12, color: isDark ? "#64748b" : "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>or</span>
            <div style={{ flex: 1, height: 1, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />
          </div>

          {/* Google button */}
          <button onClick={handleGoogleLogin}
            className="google-btn font-dm"
            style={{ width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, color: isDark ? "#cbd5e1" : "#1e1b4b", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", border: `2px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, background: "transparent", transition: "all 0.2s" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <p className="font-dm" style={{ textAlign: "center", color: isDark ? "#64748b" : "#94a3b8", fontSize: 13, marginTop: 14 }}>
            {isRegister ? "Already part of the community? " : "New to Digi Chat? "}
            <span style={{ color: "#6366f1", fontWeight: 700, cursor: "pointer", textDecoration: "none" }} onClick={() => { setIsRegister(!isRegister); setError(""); }}>
              {isRegister ? "Sign In" : "Create Account"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}