"use client";

import { useState, useEffect, useRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

type ShapeType = "circle" | "triangle" | "square" | "diamond" | "hexagon";

interface Shape {
  x: number;
  y: number;
  size: number;
  type: ShapeType;
  rotation: number;
  rotationSpeed: number;
  vx: number;
  vy: number;
  opacity: number;
  color: string;
}

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.866, y + r * 0.5);
  ctx.lineTo(x - r * 0.866, y + r * 0.5);
  ctx.closePath();
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.65, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.65, y);
  ctx.closePath();
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [cfToken, setCfToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shapesRef = useRef<Shape[]>([]);
  const rafRef = useRef<number>(0);

  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, turnstileToken: cfToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Login gagal");
        setIsLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setErrorMsg("Terjadi kesalahan. Coba lagi.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const COLORS = [
      "rgba(139,92,246,", "rgba(109,40,217,", "rgba(167,139,250,", "rgba(196,181,253,", "rgba(124,58,237,",
    ];
    const TYPES: ShapeType[] = ["circle", "triangle", "square", "diamond", "hexagon"];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = 28;
    shapesRef.current = Array.from({ length: COUNT }, () => {
      const size = 8 + Math.random() * 22;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size,
        type: TYPES[Math.floor(Math.random() * TYPES.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.008,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.18,
        opacity: 0.06 + Math.random() * 0.14,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const s of shapesRef.current) {
        s.x += s.vx;
        s.y += s.vy;
        s.rotation += s.rotationSpeed;

        const pad = s.size * 2;
        if (s.x < -pad) s.x = canvas.width + pad;
        if (s.x > canvas.width + pad) s.x = -pad;
        if (s.y < -pad) s.y = canvas.height + pad;
        if (s.y > canvas.height + pad) s.y = -pad;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);

        const fillColor = `${s.color}${s.opacity})`;
        const strokeColor = `${s.color}${Math.min(s.opacity + 0.08, 0.28)})`;

        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;

        switch (s.type) {
          case "circle":
            ctx.beginPath(); ctx.arc(0, 0, s.size, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); break;
          case "square":
            ctx.beginPath(); ctx.rect(-s.size, -s.size, s.size * 2, s.size * 2); ctx.fill(); ctx.stroke(); break;
          case "triangle":
            drawTriangle(ctx, 0, 0, s.size); ctx.fill(); ctx.stroke(); break;
          case "diamond":
            drawDiamond(ctx, 0, 0, s.size); ctx.fill(); ctx.stroke(); break;
          case "hexagon":
            drawHexagon(ctx, 0, 0, s.size); ctx.fill(); ctx.stroke(); break;
        }

        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Plus Jakarta Sans',sans-serif; overflow:hidden; }

        .lr {
          display:flex; width:100vw; height:100vh;
          font-family:'Plus Jakarta Sans',sans-serif;
        }

        .lp {
          flex:0 0 52%;
          background: linear-gradient(145deg, #6a82fb 0%, #8e54e9 45%, #c054e9 80%, #e054b8 100%);
          position:relative; display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          padding:40px; overflow:hidden;
        }

        .wave-svg {
          position:absolute; bottom:0; left:0; width:100%;
          pointer-events:none; z-index:1;
        }

        .orb {
          position:absolute; border-radius:50%; pointer-events:none;
          filter:blur(60px);
        }
        .orb1 { width:320px; height:320px; background:rgba(255,255,255,0.12); top:-80px; left:-60px; }
        .orb2 { width:240px; height:240px; background:rgba(255,255,255,0.08); bottom:60px; right:-40px; }

        .scene-wrap { position:relative; z-index:2; width:220px; height:220px; }

        .float-a { animation:floatA 3s ease-in-out infinite; }
        .float-b { animation:floatB 3.6s ease-in-out infinite 0.5s; }
        @keyframes floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes floatB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }

        .pulse-ring { animation:pulseRing 2.6s ease-out infinite; transform-origin:center; }
        @keyframes pulseRing { 0%{opacity:0.45;transform:scale(1)} 100%{opacity:0;transform:scale(1.4)} }

        .shimmer { animation:shim 2s ease-in-out infinite alternate; }
        @keyframes shim { from{opacity:0.3} to{opacity:0.9} }

        .check-draw {
          stroke-dasharray:20; stroke-dashoffset:20;
          animation:checkDraw 0.6s ease forwards 1.2s;
        }
        @keyframes checkDraw { to{stroke-dashoffset:0} }

        .left-text { position:relative; z-index:2; text-align:center; margin-top:22px; }
        .left-title { font-size:22px; font-weight:700; color:white; }
        .left-sub   { font-size:13px; color:rgba(255,255,255,0.75); margin-top:6px; line-height:1.6; }

        .badge-row {
          display:flex; gap:10px; justify-content:center; margin-top:22px;
          position:relative; z-index:2; flex-wrap:wrap;
        }
        .badge {
          display:inline-flex; align-items:center; gap:6px;
          background:rgba(255,255,255,0.15);
          backdrop-filter:blur(8px);
          border:1px solid rgba(255,255,255,0.22);
          border-radius:20px; padding:7px 16px;
          color:white; font-size:13px; font-weight:500;
          white-space:nowrap;
        }

        .rp {
          flex:1;
          background:#f4f5fb;
          position:relative; display:flex;
          align-items:center; justify-content:center;
          padding:40px; overflow:hidden;
        }

        .geo-canvas {
          position:absolute; inset:0;
          width:100%; height:100%;
          pointer-events:none;
        }

        .fc {
          background:white;
          border-radius:16px;
          box-shadow: 0 8px 40px rgba(100,80,200,0.13), 0 2px 10px rgba(100,80,200,0.07);
          padding:36px 40px;
          width:100%; max-width:380px;
          position:relative; z-index:2;
        }

        .area-badge {
          display:inline-flex; align-items:center; gap:5px;
          background:#ede9fe; color:#6d28d9;
          border-radius:20px; padding:4px 12px;
          font-size:11px; font-weight:600;
          letter-spacing:0.03em; margin-bottom:16px;
        }

        .welcome-title { font-size:22px; font-weight:700; color:#111827; margin-bottom:4px; text-align:center; }
        .welcome-sub   { font-size:13px; color:#6b7280; margin-bottom:24px; text-align:center; }

        .field-group { margin-bottom:14px; }
        .field-label {
          display:flex; align-items:center; gap:6px;
          font-size:13px; font-weight:600; color:#374151; margin-bottom:6px;
        }
        .field-wrap { position:relative; }
        .field-input {
          width:100%; padding:10px 14px;
          border:1px solid #e5e7eb; border-radius:8px;
          font-size:14px; font-family:'Plus Jakarta Sans',sans-serif;
          background:#f8f7ff; color:#111827; outline:none;
          transition:border-color .18s, box-shadow .18s, background .18s;
        }
        .field-input:focus {
          border-color:#8b5cf6;
          box-shadow:0 0 0 3px rgba(139,92,246,0.12);
          background:white;
        }
        .field-input::placeholder { color:#d1d5db; }

        .eye-btn {
          position:absolute; right:10px; top:50%; transform:translateY(-50%);
          background:none; border:none; cursor:pointer; color:#9ca3af;
          display:flex; padding:3px; transition:color .15s;
        }
        .eye-btn:hover { color:#7c3aed; }

        .check-row {
          display:flex; align-items:center; gap:7px;
          font-size:13px; color:#6b7280; cursor:pointer;
          user-select:none; margin:10px 0 20px;
        }
        .cb {
          width:15px; height:15px; border:1px solid #d1d5db;
          border-radius:3px; display:flex; align-items:center;
          justify-content:center; flex-shrink:0; background:white;
          transition:all .15s;
        }
        .cb.on { background:#7c3aed; border-color:#7c3aed; }

        .submit-btn {
          width:100%; padding:12px;
          background:linear-gradient(135deg, #8b5cf6 0%, #6d28d9 60%, #7c3aed 100%);
          color:white; border:none; border-radius:10px;
          font-size:15px; font-weight:600;
          font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition:opacity .18s, transform .1s;
          box-shadow:0 4px 16px rgba(109,40,217,0.35);
        }
        .submit-btn:hover:not(:disabled) { opacity:0.9; }
        .submit-btn:active:not(:disabled) { transform:scale(0.98); }
        .submit-btn:disabled { opacity:0.65; cursor:not-allowed; }

        .spinner {
          width:16px; height:16px;
          border:2px solid rgba(255,255,255,0.3);
          border-top-color:white; border-radius:50%;
          animation:spin .7s linear infinite;
        }
        @keyframes spin { to{transform:rotate(360deg)} }

        .footer-text {
          text-align:center; font-size:11px;
          color:#9ca3af; margin-top:20px;
        }

        @media(max-width:768px) {
          .lp { display:none; }
          .rp { background:linear-gradient(145deg,#6a82fb,#8e54e9); }
          .fc { box-shadow:none; }
        }
      `}</style>

      <div className="lr">

        <div className="lp">
          <div className="orb orb1" />
          <div className="orb orb2" />

          <div className="scene-wrap">
            <svg viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" width="220" height="220">
              <circle cx="110" cy="110" r="82" fill="rgba(255,255,255,0.1)" className="pulse-ring" />
              <circle cx="110" cy="110" r="70" fill="rgba(255,255,255,0.12)" />
              <circle cx="110" cy="110" r="58" fill="rgba(255,255,255,0.18)" />

              <g className="float-b">
                <rect x="72" y="66" width="54" height="68" rx="6" fill="rgba(255,255,255,0.15)" />
                <rect x="74" y="68" width="50" height="64" rx="5" fill="rgba(255,255,255,0.85)" />
                <rect x="82" y="80" width="34" height="3.5" rx="1.5" fill="#c4b5fd" className="shimmer" />
                <rect x="82" y="89" width="26" height="3" rx="1.5" fill="#ede9fe" />
                <rect x="82" y="97" width="30" height="3" rx="1.5" fill="#ede9fe" />
                <rect x="82" y="105" width="22" height="3" rx="1.5" fill="#ede9fe" />
                <rect x="82" y="113" width="28" height="3" rx="1.5" fill="#ede9fe" />
              </g>

              <g className="float-a">
                <rect x="96" y="84" width="50" height="60" rx="5" fill="white" stroke="rgba(196,181,253,0.6)" strokeWidth="1" />
                <rect x="105" y="96" width="32" height="3" rx="1.5" fill="#c4b5fd" />
                <rect x="105" y="104" width="24" height="3" rx="1.5" fill="#ede9fe" />
                <rect x="105" y="112" width="27" height="3" rx="1.5" fill="#ede9fe" />
                <circle cx="136" cy="132" r="11" fill="rgba(237,233,254,0.9)" />
                <circle cx="136" cy="132" r="8" fill="#7c3aed" />
                <polyline
                  points="132,132 135,135 141,129"
                  stroke="white" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" fill="none"
                  className="check-draw"
                />
              </g>

              <circle cx="72" cy="94" r="10" fill="rgba(255,255,255,0.7)" />
              <rect x="67" y="90" width="10" height="8" rx="1.5" fill="#a78bfa" />
              <rect x="67.5" y="88.5" width="4" height="2" rx="0.5" fill="#7c3aed" />
              <circle cx="158" cy="78" r="8" fill="rgba(255,255,255,0.7)" />
              <circle cx="158" cy="78" r="3" fill="#a78bfa" fillOpacity="0.5" />
              <circle cx="158" cy="78" r="1.5" fill="#7c3aed" />
            </svg>
          </div>

          <div className="left-text">
            <p className="left-title">Inventaris Dispora</p>
            <p className="left-sub">Pengelolaan aset daerah terpadu<br />Kabupaten Bojonegoro</p>
          </div>

          <div className="badge-row">
            <div className="badge">🚚 Distribusi Aktif</div>
            <div className="badge">📍 12 Lokasi</div>
            <div className="badge">📦 2.938 Aset</div>
          </div>

          <svg className="wave-svg" viewBox="0 0 600 80" preserveAspectRatio="none" style={{height: 64}}>
            <path d="M0,40 C100,70 200,10 300,40 C400,70 500,10 600,40 L600,80 L0,80 Z" fill="rgba(255,255,255,0.08)"/>
            <path d="M0,55 C120,30 240,75 360,50 C480,25 560,65 600,55 L600,80 L0,80 Z" fill="rgba(255,255,255,0.06)"/>
          </svg>
        </div>

        <div className="rp">
          <canvas ref={canvasRef} className="geo-canvas" />

          <div className="fc">
            <div style={{textAlign:"center"}}>
              <span className="area-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                Area Terproteksi
              </span>
            </div>

            <p className="welcome-title">Selamat Datang</p>
            <p className="welcome-sub">Masuk ke akun Anda untuk melanjutkan</p>

            <form onSubmit={handleSubmit}>
              <div className="field-group">
                <label className="field-label" htmlFor="username">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                  Username
                </label>
                <div className="field-wrap">
                  <input
                    id="username" type="text" className="field-input"
                    placeholder="Masukkan username"
                    value={username} onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username" required
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="password">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  Password
                </label>
                <div className="field-wrap">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="field-input"
                    placeholder="Masukkan password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password" required
                  />
                  <button
                    type="button" className="eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Sembunyikan" : "Tampilkan"}
                  >
                    {showPassword ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <label className="check-row" onClick={() => setRememberMe(!rememberMe)}>
                <div className={`cb${rememberMe ? " on" : ""}`}>
                  {rememberMe && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                Ingat saya
              </label>

              {/* Cloudflare Turnstile */}
              <div style={{marginBottom:16, display:'flex', justifyContent:'center'}}>
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
                  onSuccess={(token) => setCfToken(token)}
                  options={{ theme: "light", size: "normal" }}
                />
              </div>

              {errorMsg && (
                <div style={{
                  padding:'8px 12px', borderRadius:8, marginBottom:12,
                  background:'#fef2f2', border:'1px solid #fecaca',
                  color:'#991b1b', fontSize:13, display:'flex', alignItems:'center', gap:8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {errorMsg}
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={isLoading || !cfToken}>
                {isLoading ? (
                  <><div className="spinner" /> Memproses...</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
                      <polyline points="10 17 15 12 10 7"/>
                      <line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                    Masuk
                  </>
                )}
              </button>
            </form>

            <p className="footer-text">© 2025 Dinas Kepemudaan dan Olahraga — Kabupaten Bojonegoro</p>
          </div>
        </div>

      </div>
    </>
  );
}
