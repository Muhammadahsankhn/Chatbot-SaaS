import { useEffect, useState } from "react";

export default function Preloader({ onComplete }) {
  const [phase,    setPhase]    = useState("enter");
  const [progress, setProgress] = useState(0);
  const [done,     setDone]     = useState(false);
  const [dots,     setDots]     = useState("");

  useEffect(() => {
    let prog = 0;
    const progInterval = setInterval(() => {
      prog += Math.random() * 10 + 2;
      if (prog >= 100) { prog = 100; clearInterval(progInterval); }
      setProgress(Math.min(prog, 100));
    }, 130);

    const dotInterval = setInterval(() => {
      setDots(d => d.length >= 3 ? "" : d + ".");
    }, 400);

    const t1 = setTimeout(() => setPhase("pulse"), 500);
    const t2 = setTimeout(() => setPhase("exit"),  2500);
    const t3 = setTimeout(() => {
      setDone(true);
      if (onComplete) onComplete();
    }, 3100);

    return () => {
      clearInterval(progInterval);
      clearInterval(dotInterval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  if (done) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .dcpl-root {
          position: fixed; inset: 0; z-index: 99999;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          background: #0f0f13;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .dcpl-root.exit { opacity: 0; transform: scale(1.03); pointer-events: none; }

        .dcpl-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .dcpl-orb { position: absolute; border-radius: 50%; filter: blur(100px); pointer-events: none; }
        .dcpl-orb-1 {
          width: 520px; height: 520px;
          background: radial-gradient(circle, rgba(99,102,241,0.14), transparent 70%);
          top: -180px; left: -180px;
          animation: dcpl-orb 8s ease-in-out infinite alternate;
        }
        .dcpl-orb-2 {
          width: 380px; height: 380px;
          background: radial-gradient(circle, rgba(129,140,248,0.09), transparent 70%);
          bottom: -100px; right: -80px;
          animation: dcpl-orb 10s ease-in-out infinite alternate-reverse;
        }
        @keyframes dcpl-orb {
          0%   { transform: translate(0,0) scale(1); }
          100% { transform: translate(40px,30px) scale(1.12); }
        }

        .dcpl-scanline {
          position: absolute; inset: 0; pointer-events: none;
          background: repeating-linear-gradient(
            to bottom, transparent, transparent 3px,
            rgba(99,102,241,0.012) 3px, rgba(99,102,241,0.012) 4px
          );
        }

        .dcpl-card {
          position: relative; display: flex; flex-direction: column;
          align-items: center; gap: 28px;
          animation: dcpl-in 0.7s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes dcpl-in {
          from { opacity: 0; transform: translateY(28px) scale(0.93); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .dcpl-icon-wrap {
          position: relative; width: 100px; height: 100px;
          display: flex; align-items: center; justify-content: center;
        }
        .dcpl-ring {
          position: absolute; inset: -16px; border-radius: 50%;
          border: 1.5px solid transparent;
          border-top-color: #6366f1; border-right-color: rgba(99,102,241,0.15);
          animation: dcpl-spin 1.6s linear infinite;
        }
        .dcpl-ring-2 {
          inset: -8px; border: 1px solid rgba(99,102,241,0.12);
          border-bottom-color: #818cf8;
          animation: dcpl-spin 2.6s linear infinite reverse;
        }
        @keyframes dcpl-spin { to { transform: rotate(360deg); } }

        .dcpl-particle { position: absolute; border-radius: 50%; background: #6366f1; animation: dcpl-pfloat 3s ease-in-out infinite; }
        .dcpl-particle:nth-child(1){width:4px;height:4px;top:-24px;left:6px;opacity:.55;animation-delay:0s}
        .dcpl-particle:nth-child(2){width:3px;height:3px;top:-14px;right:2px;opacity:.35;animation-delay:.5s}
        .dcpl-particle:nth-child(3){width:5px;height:5px;bottom:-20px;left:16px;opacity:.45;animation-delay:1s}
        .dcpl-particle:nth-child(4){width:2px;height:2px;bottom:-8px;right:12px;opacity:.65;animation-delay:.3s}
        .dcpl-particle:nth-child(5){width:3px;height:3px;top:42%;left:-22px;opacity:.45;animation-delay:.8s}
        .dcpl-particle:nth-child(6){width:4px;height:4px;top:28%;right:-20px;opacity:.35;animation-delay:1.4s}
        @keyframes dcpl-pfloat {
          0%,100%{ transform:translateY(0) scale(1); opacity:inherit; }
          50%    { transform:translateY(-10px) scale(.65); opacity:.1; }
        }

        .dcpl-icon-box {
          width: 100px; height: 100px; border-radius: 26px;
          background: linear-gradient(145deg, #1e1e2e 0%, #16161e 100%);
          border: 1px solid rgba(99,102,241,0.18);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 1px rgba(99,102,241,0.06), 0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .dcpl-icon-box.pulse { animation: dcpl-boxpulse 2s ease-in-out infinite; }
        @keyframes dcpl-boxpulse {
          0%,100%{box-shadow:0 0 0 1px rgba(99,102,241,.06),0 12px 40px rgba(0,0,0,.55),0 0 0 rgba(99,102,241,0)}
          50%    {box-shadow:0 0 0 1px rgba(99,102,241,.22),0 12px 40px rgba(0,0,0,.55),0 0 32px rgba(99,102,241,.2)}
        }

        .dcpl-brand { text-align: center; animation: dcpl-fadeup 0.8s 0.2s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes dcpl-fadeup {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .dcpl-name {
          font-family: 'Syne', sans-serif;
          font-size: 40px; font-weight: 800; letter-spacing: -1.5px; line-height: 1;
          background: linear-gradient(135deg, #ffffff 0%, #c7d2fe 45%, #818cf8 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .dcpl-sub {
          font-size: 10px; font-weight: 400; letter-spacing: 4.5px;
          text-transform: uppercase; color: rgba(99,102,241,0.4); margin-top: 9px;
        }
        .dcpl-status {
          font-size: 12px; color: rgba(148,163,184,0.45);
          margin-top: 8px; min-height: 18px; letter-spacing: 0.2px;
        }

        .dcpl-prog-wrap {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; width: 260px;
          animation: dcpl-fadeup 0.8s 0.4s cubic-bezier(0.16,1,0.3,1) both;
        }
        .dcpl-track {
          width: 100%; height: 3px; background: rgba(99,102,241,0.08);
          border-radius: 999px; overflow: hidden; position: relative;
        }
        .dcpl-track::after {
          content:''; position:absolute; inset:0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          animation: dcpl-shimmer 2s linear infinite;
        }
        @keyframes dcpl-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        .dcpl-fill {
          height:100%; border-radius:999px;
          background: linear-gradient(90deg, #4338ca, #6366f1, #a5b4fc);
          box-shadow: 0 0 12px rgba(99,102,241,0.55);
          transition: width 0.15s ease;
        }
        .dcpl-prog-row { width:100%; display:flex; justify-content:space-between; align-items:center; }
        .dcpl-prog-label { font-size:10px; font-weight:500; letter-spacing:2.5px; text-transform:uppercase; color:rgba(99,102,241,0.3); }
        .dcpl-prog-pct   { font-size:11px; font-weight:700; letter-spacing:1px; color:rgba(129,140,248,0.6); font-variant-numeric:tabular-nums; }
      `}</style>

      <div className={`dcpl-root ${phase === "exit" ? "exit" : ""}`}>
        <div className="dcpl-grid" />
        <div className="dcpl-orb dcpl-orb-1" />
        <div className="dcpl-orb dcpl-orb-2" />
        <div className="dcpl-scanline" />

        <div className="dcpl-card">

          <div className="dcpl-icon-wrap">
            <div className="dcpl-ring" />
            <div className="dcpl-ring dcpl-ring-2" />
            {[...Array(6)].map((_,i) => <div key={i} className="dcpl-particle" />)}

            <div className={`dcpl-icon-box ${phase === "pulse" ? "pulse" : ""}`}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="dcpl-g" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%"   stopColor="#a5b4fc"/>
                    <stop offset="100%" stopColor="#4f46e5"/>
                  </linearGradient>
                </defs>
                <rect x="3" y="6" width="18" height="13" rx="3" fill="url(#dcpl-g)"/>
                <circle cx="9"  cy="12" r="1.5" fill="white" opacity="0.95"/>
                <circle cx="15" cy="12" r="1.5" fill="white" opacity="0.95"/>
                <circle cx="9.5"  cy="11.4" r="0.45" fill="white"/>
                <circle cx="15.5" cy="11.4" r="0.45" fill="white"/>
                <rect x="8.5" y="15" width="7" height="1.5" rx="0.75" fill="white" opacity="0.45"/>
                <line x1="12" y1="6" x2="12" y2="3.5" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="12" cy="2.8" r="1.1" fill="#818cf8"/>
                <rect x="1"  y="9.5" width="2" height="4" rx="1" fill="#6366f1" opacity="0.65"/>
                <rect x="21" y="9.5" width="2" height="4" rx="1" fill="#6366f1" opacity="0.65"/>
              </svg>
            </div>
          </div>

          <div className="dcpl-brand">
            <div className="dcpl-name">Digi Chat</div>
            <div className="dcpl-sub">AI Chat Platform</div>
            <div className="dcpl-status">
              {progress < 40  && `Initializing${dots}`}
              {progress >= 40 && progress < 80  && `Loading resources${dots}`}
              {progress >= 80 && progress < 100 && `Almost ready${dots}`}
              {progress >= 100 && "Ready ✓"}
            </div>
          </div>

          <div className="dcpl-prog-wrap">
            <div className="dcpl-track">
              <div className="dcpl-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="dcpl-prog-row">
              <span className="dcpl-prog-label">Loading</span>
              <span className="dcpl-prog-pct">{Math.round(progress)}%</span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}