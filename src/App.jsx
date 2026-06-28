// ================================================================
// STREET TWICE V9
// Grass green + Royal blue · Fixed camera · Real teams only
// Diamond stakes · Bigger fonts · No fake players
// ================================================================
import { useState, useEffect, useRef, useCallback } from "react";

const SUPABASE_URL = "https://rfwfprrzbnjptwsdalyh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_SlsPL-ZkUzqFJIfPR8awBw_5-PzcVQe";

// ── Supabase ──────────────────────────────────────────────────
async function sbFetch(path, opts = {}) {
  const token = localStorage.getItem("sb_token");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Request failed"); }
  return res.status === 204 ? null : res.json();
}

async function sbAuth(email, password, mode = "login") {
  const ep = mode === "signup" ? "signup" : "token?grant_type=password";
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${ep}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.error || data.error_description) throw new Error(data.error_description || data.error || "Auth failed");
  if (data.access_token) localStorage.setItem("sb_token", data.access_token);
  return data;
}

async function sbGetUser() {
  const token = localStorage.getItem("sb_token");
  if (!token) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      // Token expired or invalid — clear it
      localStorage.removeItem("sb_token");
      return null;
    }
    const data = await res.json();
    // Supabase returns { id, email, ... } for valid users
    if (data && data.id && typeof data.id === "string") return data;
    return null;
  } catch { return null; }
}

async function sbSignOut() {
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${localStorage.getItem("sb_token")}` },
  }).catch(() => {});
  localStorage.removeItem("sb_token");
}

// ── Design ────────────────────────────────────────────────────
const C = {
  bg: "#050508",
  card: "#0a0a0f",
  green: "#00C851",
  greenD: "#009940",
  blue: "#0066FF",
  blueD: "#0044CC",
  gold: "#FFB800",
  red: "#FF2244",
  purple: "#AA44FF",
  cyan: "#00DDFF",
  white: "#FFFFFF",
  offwhite: "#E8E8F0",
  ghost: "#6666AA",
  muted: "#222233",
  border: "#1A1A2E",
  tiers: {
    bronze: { bg: "#1A0E00", b: "#CD7F32", t: "#F0B080", g: "#CD7F3255" },
    silver: { bg: "#0E0E18", b: "#A0A8C0", t: "#D0D8F0", g: "#A0A8C055" },
    gold:   { bg: "#140E00", b: "#FFB800", t: "#FFE080", g: "#FFB80055" },
    elite:  { bg: "#100800", b: "#FFD700", t: "#FFF066", g: "#FFD70088" },
    rare:   { bg: "#0A0618", b: "#CC44FF", t: "#EEB8FF", g: "#CC44FF88" },
  },
};

const POSITIONS = ["ST","CF","LW","RW","CAM","CM","CDM","LM","RM","LB","RB","CB","GK"];
const STATS_META = {
  pace:      { l: "PAC", icon: "⚡", color: C.green },
  shooting:  { l: "SHO", icon: "🎯", color: "#FF8844" },
  passing:   { l: "PAS", icon: "🔄", color: C.blue },
  dribbling: { l: "DRI", icon: "🌀", color: C.purple },
  defending: { l: "DEF", icon: "🛡️", color: "#4499FF" },
  physical:  { l: "PHY", icon: "💪", color: C.red },
  jumping:   { l: "JMP", icon: "⬆️", color: C.cyan },
  agility:   { l: "AGI", icon: "🏃", color: C.gold },
};
const BADGES = [
  { id: "stone_wall",   icon: "🧱", name: "Stone Wall",    rare: false },
  { id: "poacher",      icon: "⚽", name: "Poacher",       rare: false },
  { id: "tested",       icon: "🔁", name: "Battle Tested", rare: false },
  { id: "explosive",    icon: "⚡", name: "Explosive",     rare: false },
  { id: "silky",        icon: "🌀", name: "Silky",         rare: false },
  { id: "brick_hands",  icon: "🧤", name: "Brick Hands",   rare: false },
  { id: "sniper",       icon: "🎯", name: "Sniper",        rare: false },
  { id: "cannonball",   icon: "💥", name: "Cannonball",    rare: false },
  { id: "motm_king",    icon: "👑", name: "MOTM King",     rare: false },
  { id: "penalty_king", icon: "🥅", name: "Penalty King",  rare: false },
  { id: "league_champ", icon: "🏆", name: "League Champ",  rare: true  },
  { id: "rare_card",    icon: "🔥", name: "Rare",          rare: true  },
];

// Diamond tiers based on squad average overall
function squadDiamonds(playerList) {
  if (!playerList || playerList.length === 0) return 1;
  const avg = playerList.reduce((sum, p) => sum + (p.overall || ov(p.stats) || 50), 0) / playerList.length;
  if (avg >= 80) return 5;
  if (avg >= 70) return 4;
  if (avg >= 60) return 3;
  if (avg >= 50) return 2;
  return 1;
}

function diamondDisplay(n) {
  return "💎".repeat(n) + "◇".repeat(5 - n);
}

// Solo tests
const SOLO_TESTS = [
  { id: "sprint",  stat: "pace",      icon: "⚡", label: "Sprint Test",     camMode: "sprint",
    desc: "Sprint 20m — motion detection times you automatically vs your age group.",
    steps: ["Measure 20m and place a cone at each end", "Prop your phone sideways on the ground — BOTH cones must be visible", "Stand at the start cone", "Tap Start Sprint, then run as fast as you can"] },
  { id: "jump",    stat: "jumping",   icon: "⬆️", label: "Jump Height",     camMode: "jump",
    desc: "Camera measures hang time and converts to jump height in cm.",
    steps: ["Stand sideways to the camera — full body visible from head to feet", "Jump straight up as high as you can", "Camera detects when feet leave and land", "Do 5 jumps — best is saved"] },
  { id: "pushups", stat: "physical",  icon: "💪", label: "Push-up Counter", camMode: "pushups",
    desc: "Camera counts your reps automatically.",
    steps: ["Phone on the ground 2m away pointing sideways at you", "Full body must be visible", "Chest must touch the floor every rep", "Camera counts — do as many as you can"] },
  { id: "agility", stat: "agility",   icon: "🏃", label: "Agility Drill",   camMode: "agility",
    desc: "Random directions flash on screen. React and tap Done as fast as possible.",
    steps: ["Place 4 cones around you — front, back, left, right — 2m away", "Stand in the centre facing your phone", "React to each direction command", "10 commands — fastest average reaction wins"] },
  { id: "shooting",stat: "shooting",  icon: "🎯", label: "Shooting",        camMode: "record",
    desc: "Shoot at a marked target. Count your hits and enter your score.",
    steps: ["Mark a 60×60cm target on a wall with tape", "Stand 10m back — film from the side", "10 shots at the target", "Count hits and enter your score"] },
  { id: "passing", stat: "passing",   icon: "🔄", label: "Passing Accuracy", camMode: "record",
    desc: "Pass at targets from set distances.",
    steps: ["Mark a 50cm target on a wall", "10 passes from 10m — film from behind you", "Count hits", "Tier 2: 15m. Tier 3: 20m lofted"] },
  { id: "dribbling",stat:"dribbling", icon: "🌀", label: "Dribbling",       camMode: "record",
    desc: "Weave through cones. Cone touches reduce your score.",
    steps: ["6 cones in line, 1m apart", "Film from the side — all cones visible", "Dribble through and back, 3 attempts", "Best time counts. Every cone touch = -2 points"] },
];

// Benchmarks
const SPRINT_BENCH = { u12:{avg:4.2,elite:3.0}, u16:{avg:3.8,elite:2.8}, u20:{avg:3.4,elite:2.55}, adult:{avg:3.2,elite:2.45}, vet:{avg:3.7,elite:2.7}, senior:{avg:4.4,elite:3.0}, open:{avg:3.4,elite:2.5} };
const JUMP_BENCH   = { u12:{avg:28,elite:50}, u16:{avg:35,elite:58}, u20:{avg:42,elite:66}, adult:{avg:45,elite:70}, vet:{avg:38,elite:62}, senior:{avg:30,elite:54}, open:{avg:42,elite:66} };
const PUSH_BENCH   = { u12:{avg:12,elite:35}, u16:{avg:18,elite:45}, u20:{avg:24,elite:55}, adult:{avg:28,elite:60}, vet:{avg:22,elite:50}, senior:{avg:15,elite:40}, open:{avg:24,elite:55} };

// ── Utils ─────────────────────────────────────────────────────
function ov(stats) { const v = Object.values(stats||{}).filter(x=>x>0); return v.length ? Math.round(v.reduce((a,b)=>a+b,0)/v.length) : 0; }
function tier(overall, badges=[]) { if(badges.length>=3||overall>=90)return"rare"; if(overall>=85)return"elite"; if(overall>=75)return"gold"; if(overall>=65)return"silver"; return"bronze"; }
function sc(v) { if(!v)return C.ghost; if(v>=85)return C.gold; if(v>=75)return C.green; if(v>=65)return"#44BB44"; if(v>=55)return"#BBAA22"; return"#CC4433"; }
function calcAge(dob) { if(!dob)return null; const b=new Date(dob),n=new Date(); let a=n.getFullYear()-b.getFullYear(); const m=n.getMonth()-b.getMonth(); if(m<0||(m===0&&n.getDate()<b.getDate()))a--; return a; }
function ageGroup(age) { if(!age)return"open"; if(age<=12)return"u12"; if(age<=16)return"u16"; if(age<=20)return"u20"; if(age<=29)return"adult"; if(age<=39)return"vet"; return"senior"; }
const AGE_LABELS = { u12:"U12", u16:"13–16", u20:"17–20", adult:"21–29", vet:"30–39", senior:"40+", open:"Open" };
function randCode() { return Math.random().toString(36).slice(2,8).toUpperCase(); }
function fmtTime(s) { return `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`; }
function rawToScore(raw, bench) { const {avg,elite}=bench; if(raw>=elite)return Math.min(99,Math.round(88+((raw-elite)/elite)*11)); if(raw>=avg)return Math.round(50+((raw-avg)/(elite-avg))*38); return Math.max(15,Math.round(50*(raw/avg))); }
function sprintToScore(t, group) { const b=SPRINT_BENCH[group]||SPRINT_BENCH.open; if(t<=b.elite)return Math.min(99,88); if(t<=b.avg)return Math.round(50+((b.avg-t)/(b.avg-b.elite))*38); return Math.max(15,Math.round(50*(b.avg/t))); }

// ── Camera Hook — fixed ───────────────────────────────────────
function useCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [active, setActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState(null);
  const [err, setErr] = useState(null);
  const [ready, setReady] = useState(false);

  const startCam = useCallback(async (facing = "environment") => {
    setErr(null); setBlob(null); setReady(false);
    try {
      const constraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        // Must set these as properties AND attributes for cross-browser
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute("muted", "");
        video.setAttribute("autoplay", "");
        video.setAttribute("playsinline", "");
        // Wait for metadata then play
        await new Promise((resolve) => {
          video.onloadedmetadata = () => resolve();
          setTimeout(resolve, 1000); // fallback
        });
        await video.play().catch(() => {});
      }
      setActive(true);
      setReady(true);
    } catch (e) {
      if (e.name === "NotAllowedError") {
        setErr("Camera access denied.\n\nGo to your browser settings → Site permissions → Camera → Allow.");
      } else if (e.name === "NotFoundError") {
        setErr("No camera found on this device.");
      } else {
        setErr("Camera error: " + e.message);
      }
    }
  }, []);

  const stopCam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActive(false); setRecording(false); setReady(false);
  }, []);

  const recStart = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    try {
      const mr = new MediaRecorder(streamRef.current);
      mr.ondataavailable = e => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => { setBlob(new Blob(chunksRef.current, { type: "video/webm" })); };
      mr.start(100);
      recorderRef.current = mr;
      setRecording(true);
    } catch (e) { setErr("Recording error: " + e.message); }
  }, []);

  const recStop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  return { videoRef, canvasRef, active, ready, recording, blob, err, startCam, stopCam, recStart, recStop };
}

// Motion detection
function useMotion(videoRef, canvasRef, enabled, onMotion) {
  const prev = useRef(null), raf = useRef(null);
  useEffect(() => {
    if (!enabled) { cancelAnimationFrame(raf.current); return; }
    function detect() {
      const vid = videoRef.current, can = canvasRef.current;
      if (!vid || !can || vid.readyState < 2 || vid.paused) {
        raf.current = requestAnimationFrame(detect); return;
      }
      try {
        const ctx = can.getContext("2d");
        can.width = Math.floor(vid.videoWidth / 4) || 160;
        can.height = Math.floor(vid.videoHeight / 4) || 90;
        ctx.drawImage(vid, 0, 0, can.width, can.height);
        const cur = ctx.getImageData(0, 0, can.width, can.height).data;
        if (prev.current && cur.length === prev.current.length) {
          let diff = 0;
          for (let i = 0; i < cur.length; i += 4) {
            diff += Math.abs(cur[i] - prev.current[i]) + Math.abs(cur[i+1] - prev.current[i+1]) + Math.abs(cur[i+2] - prev.current[i+2]);
          }
          onMotion(diff / (can.width * can.height));
        }
        prev.current = new Uint8ClampedArray(cur);
      } catch (_) {}
      raf.current = requestAnimationFrame(detect);
    }
    raf.current = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(raf.current);
  }, [enabled]);
}

// Timer hook
function useTimer(secs, onEnd) {
  const [t, setT] = useState(secs), [on, setOn] = useState(false); const iv = useRef();
  const start = () => { setT(secs); setOn(true); };
  const stop = () => { setOn(false); clearInterval(iv.current); };
  const reset = () => { stop(); setT(secs); };
  useEffect(() => {
    if (on) {
      iv.current = setInterval(() => setT(p => {
        if (p <= 1) { clearInterval(iv.current); setOn(false); onEnd?.(); return 0; }
        return p - 1;
      }), 1000);
    }
    return () => clearInterval(iv.current);
  }, [on]);
  return { t, on, start, stop, reset, display: fmtTime(t) };
}

// ── UI Primitives ─────────────────────────────────────────────
function Btn({ children, onClick, v = "green", full, sm, disabled, style: sx = {} }) {
  const [p, setP] = useState(false);
  const vars = {
    green:  { background: `linear-gradient(135deg,${C.green},${C.greenD})`, color: "#000", border: "none", boxShadow: `0 4px 24px ${C.green}55` },
    blue:   { background: `linear-gradient(135deg,${C.blue},${C.blueD})`, color: "#fff", border: "none", boxShadow: `0 4px 24px ${C.blue}55` },
    gold:   { background: `linear-gradient(135deg,${C.gold},#CC8800)`, color: "#000", border: "none", boxShadow: `0 4px 24px ${C.gold}55` },
    ghost:  { background: "transparent", color: C.white, border: `2px solid #333355`, boxShadow: "none" },
    red:    { background: `${C.red}22`, color: C.red, border: `2px solid ${C.red}55`, boxShadow: "none" },
    dark:   { background: "#111122", color: C.white, border: `1px solid #222244`, boxShadow: "none" },
    purple: { background: `${C.purple}22`, color: C.purple, border: `2px solid ${C.purple}55`, boxShadow: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{ ...vars[v], borderRadius: 12, cursor: disabled ? "not-allowed" : "pointer",
        padding: sm ? "10px 18px" : "16px 24px", fontSize: sm ? 14 : 16,
        fontWeight: 800, width: full ? "100%" : "auto", letterSpacing: 0.5,
        fontFamily: "inherit", opacity: disabled ? 0.4 : 1,
        transform: p ? "scale(0.95)" : "scale(1)", transition: "transform 0.1s", ...sx }}>
      {children}
    </button>
  );
}

function Input({ label, type = "text", value, onChange, placeholder, style: sx = {} }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", fontSize: 13, color: C.ghost, letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase", fontWeight: 700 }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        style={{ width: "100%", background: "#111122", border: `2px solid ${f ? C.green : "#222244"}`,
          borderRadius: 10, padding: "14px 16px", color: C.white, fontSize: 16,
          outline: "none", boxSizing: "border-box", transition: "border-color 0.2s", ...sx }} />
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", fontSize: 13, color: C.ghost, letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase", fontWeight: 700 }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)}
        style={{ width: "100%", background: "#111122", border: `2px solid ${f ? C.green : "#222244"}`,
          borderRadius: 10, padding: "14px 16px", color: value ? C.white : C.ghost, fontSize: 16,
          outline: "none", appearance: "none", boxSizing: "border-box",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3E%3Cpath fill='%23666688' d='M7 9L2 4h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center" }}>
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, maxLength = 160 }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", fontSize: 13, color: C.ghost, letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase", fontWeight: 700 }}>{label}</label>}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength}
        onFocus={() => setF(true)} onBlur={() => setF(false)} rows={3}
        style={{ width: "100%", background: "#111122", border: `2px solid ${f ? C.green : "#222244"}`,
          borderRadius: 10, padding: "14px 16px", color: C.white, fontSize: 16,
          outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
      <div style={{ textAlign: "right", fontSize: 12, color: C.ghost, marginTop: 4 }}>{value.length}/{maxLength}</div>
    </div>
  );
}

function StatBar({ label, value, color }) {
  const col = color || sc(value);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: C.ghost, letterSpacing: 1.5, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: col }}>{value || "—"}</span>
      </div>
      <div style={{ height: 6, background: "#1A1A2E", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${((value||0)/99)*100}%`, background: `linear-gradient(90deg,${col}88,${col})`, borderRadius: 3, transition: "width 1.4s cubic-bezier(.4,0,.2,1)", boxShadow: value > 0 ? `0 0 8px ${col}66` : "none" }} />
      </div>
    </div>
  );
}

function Toast({ msg, type = "ok" }) {
  if (!msg) return null;
  const cols = { ok: C.green, err: C.red, warn: C.gold, info: C.blue };
  return (
    <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: cols[type] || C.green, color: type === "ok" ? "#000" : C.white, borderRadius: 12, padding: "14px 24px", fontSize: 15, fontWeight: 800, zIndex: 9999, boxShadow: `0 4px 24px ${cols[type]}66`, whiteSpace: "nowrap", animation: "slideup 0.3s ease" }}>
      {msg}
    </div>
  );
}

function Hdr({ title, sub, back, right }) {
  return (
    <div style={{ background: "linear-gradient(180deg,#0A0A18,#050508)", borderBottom: `1px solid #1A1A2E`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 50 }}>
      {back && <button onClick={back} style={{ background: "#111122", border: "2px solid #222244", color: C.white, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "10px 14px", borderRadius: 10 }}>←</button>}
      <div style={{ flex: 1 }}>
        {sub && <div style={{ fontSize: 11, color: C.green, letterSpacing: 3, textTransform: "uppercase", marginBottom: 2, fontWeight: 700 }}>{sub}</div>}
        <div style={{ fontSize: 22, fontWeight: 900, color: C.white, letterSpacing: -0.5 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

function Pill({ children, color = C.green }) {
  return <span style={{ background: `${color}22`, border: `1.5px solid ${color}55`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 800, color, letterSpacing: 0.5 }}>{children}</span>;
}

function Card({ player, size = "full", glow = true }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 }), [hov, setHov] = useState(false);
  const ref = useRef();
  const overall = ov(player?.stats);
  const t = tier(overall, player?.badges || []);
  const ts = C.tiers[t];
  const W = size === "mini" ? 120 : size === "sm" ? 155 : size === "md" ? 195 : 265;
  const H = W * 1.46; const s = W / 265;
  const ms = [["PAC",player?.stats?.pace||0],["SHO",player?.stats?.shooting||0],["PAS",player?.stats?.passing||0],["DRI",player?.stats?.dribbling||0],["DEF",player?.stats?.defending||0],["PHY",player?.stats?.physical||0]];
  const bgs = { bronze:"linear-gradient(145deg,#1A0E00,#2A1800,#100A00,#CD7F3222)", silver:"linear-gradient(145deg,#0E0E18,#1C1C2C,#0A0A14,#A0A8C022)", gold:"linear-gradient(145deg,#140E00,#241800,#0E0A00,#FFB80028)", elite:"linear-gradient(145deg,#100800,#201400,#0A0600,#FFD70044)", rare:"linear-gradient(145deg,#0A0618,#180A2C,#060410,#CC44FF44)" };
  function onMove(e) { const r = ref.current?.getBoundingClientRect(); if (!r) return; setTilt({ x: ((e.clientX-r.left)/r.width-0.5)*18, y: ((e.clientY-r.top)/r.height-0.5)*-18 }); }
  return (
    <div ref={ref} onMouseMove={onMove} onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setTilt({x:0,y:0}); }}
      style={{ width: W, height: H, flexShrink: 0, borderRadius: 18*s, border: `2px solid ${ts.b}66`, transform: hov ? `perspective(700px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale(1.05)` : "perspective(700px) scale(1)", transition: hov ? "transform 0.06s" : "transform 0.5s", boxShadow: glow ? (hov ? `0 28px 70px ${ts.g},0 0 50px ${ts.g}` : `0 8px 30px ${ts.g}`) : "none", animation: size==="full"&&glow ? "cardfloat 4s ease-in-out infinite" : "none" }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 18*s, overflow: "hidden", background: bgs[t], position: "relative" }}>
        {hov && <div style={{ position: "absolute", inset: 0, borderRadius: 18*s, pointerEvents: "none", zIndex: 10, background: t==="rare" ? `linear-gradient(${110+tilt.x*3}deg,transparent 10%,${C.purple}28 35%,${C.cyan}18 55%,transparent 75%)` : `linear-gradient(${105+tilt.x*2}deg,transparent 20%,${ts.b}18 45%,transparent 65%)` }} />}
        <div style={{ padding: `${16*s}px ${16*s}px ${4*s}px`, position: "relative" }}>
          <div style={{ fontSize: 48*s, fontWeight: 900, lineHeight: 1, color: ts.t, fontFamily: "'Arial Black',sans-serif", textShadow: `0 0 20px ${ts.b}88` }}>{overall || "—"}</div>
          <div style={{ fontSize: 14*s, fontWeight: 800, color: ts.t, letterSpacing: 2, marginTop: 2*s }}>{player?.position || "ST"}</div>
          <div style={{ fontSize: 22*s, marginTop: 3*s }}>⚽</div>
          <div style={{ position: "absolute", top: 12*s, right: 12*s, background: `${ts.b}1A`, border: `1.5px solid ${ts.b}55`, borderRadius: 6*s, padding: `${2*s}px ${8*s}px`, fontSize: 9*s, fontWeight: 900, color: ts.t, letterSpacing: 1.5 }}>{t === "rare" ? "✦ RARE" : t === "elite" ? "★ ELITE" : t.toUpperCase()}</div>
        </div>
        <div style={{ width: W*0.68, height: W*0.68, margin: "0 auto", borderRadius: "50% 50% 0 0", overflow: "hidden", border: `2px solid ${ts.b}33`, background: "#050510" }}>
          {player?.photo_url ? <img src={player.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 52*s, opacity: 0.1 }}>👤</div></div>}
        </div>
        <div style={{ textAlign: "center", padding: `${7*s}px ${10*s}px ${4*s}px` }}>
          <div style={{ fontSize: 15*s, fontWeight: 900, color: C.white, letterSpacing: 2, fontFamily: "'Arial Black',sans-serif", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player?.name || "PLAYER"}</div>
          {player?.nationality && <div style={{ fontSize: 9*s, color: C.ghost, letterSpacing: 1, marginTop: 2*s }}>{player.nationality}</div>}
        </div>
        <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${ts.b}66,transparent)`, margin: `0 ${16*s}px ${6*s}px` }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: `0 ${16*s}px` }}>
          {ms.map(([l,v]) => <div key={l} style={{ textAlign: "center", paddingBottom: 5*s }}>
            <div style={{ fontSize: 16*s, fontWeight: 900, color: sc(v), fontFamily: "'Arial Black',sans-serif" }}>{v || "—"}</div>
            <div style={{ fontSize: 8*s, color: C.ghost, letterSpacing: 1, fontWeight: 700 }}>{l}</div>
          </div>)}
        </div>
        {(player?.badges||[]).length > 0 && <div style={{ display: "flex", justifyContent: "center", gap: 4*s, padding: `${4*s}px` }}>{(player.badges||[]).slice(0,5).map(bid => { const b = BADGES.find(x=>x.id===bid); return b ? <span key={bid} style={{ fontSize: 12*s }}>{b.icon}</span> : null; })}</div>}
      </div>
    </div>
  );
}

// ── CAMERA COMPONENT — Fixed fullscreen ───────────────────────
function CameraView({ mode = "record", onResult, instructions = [], timerSecs = 60, playerAge = 22 }) {
  const cam = useCamera();
  const [phase, setPhase] = useState("setup"); // setup | live | done
  const [sprintState, setSprintState] = useState("idle");
  const [sprintMs, setSprintMs] = useState(null);
  const [sprintTime, setSprintTime] = useState(null);
  const [pushCount, setPushCount] = useState(0);
  const [jumpHang, setJumpHang] = useState(null);
  const [airborne, setAirborne] = useState(false);
  const [scoreInput, setScoreInput] = useState("");
  const [facingMode, setFacingMode] = useState("environment");
  const sprintStart = useRef(null), jumpStart = useRef(null), motionBuf = useRef([]);
  const group = ageGroup(playerAge);
  const timer = useTimer(timerSecs, () => { cam.recStop(); setPhase("scoring"); });

  useMotion(cam.videoRef, cam.canvasRef, phase === "live" && cam.ready, (score) => {
    const now = Date.now();
    if (mode === "sprint") {
      if (sprintState === "waiting" && score > 55) { sprintStart.current = now; setSprintState("running"); }
      else if (sprintState === "running" && score < 12 && sprintStart.current) {
        const el = (now - sprintStart.current) / 1000;
        if (el > 0.4 && el < 10) { setSprintMs(el); setSprintTime(el.toFixed(2)); setSprintState("done"); }
      }
    }
    if (mode === "pushups") {
      motionBuf.current.push({ score, time: now });
      if (motionBuf.current.length > 30) motionBuf.current.shift();
      const r = motionBuf.current.slice(-8), p = motionBuf.current.slice(-16, -8);
      const ar = r.reduce((a,b) => a+b.score, 0) / r.length;
      const ap = p.length ? p.reduce((a,b) => a+b.score, 0) / p.length : 0;
      if (ap > 40 && ar < 12) setPushCount(c => c + 1);
    }
    if (mode === "jump") {
      if (!airborne && score > 90) { setAirborne(true); jumpStart.current = now; }
      if (airborne && score < 20 && jumpStart.current) {
        const h = (now - jumpStart.current) / 1000;
        if (h > 0.15 && h < 2.5) { setJumpHang(h.toFixed(3)); setAirborne(false); }
      }
    }
  });

  async function openCamera() {
    setPhase("live");
    await cam.startCam(facingMode);
  }

  async function flipCamera() {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    cam.stopCam();
    setTimeout(async () => { await cam.startCam(newFacing); }, 300);
  }

  function startRecording() {
    cam.recStart();
    if (mode === "sprint") { setSprintState("waiting"); timer.start(); }
    else timer.start();
  }

  function stopAndScore() {
    cam.recStop(); timer.stop();
    if (mode === "sprint" && sprintMs) {
      const s = sprintToScore(sprintMs, group);
      onResult({ score: s, label: `${sprintTime}s (avg: ${SPRINT_BENCH[group].avg}s)` });
    } else if (mode === "pushups") {
      const s = rawToScore(pushCount, PUSH_BENCH[group]);
      onResult({ score: s, label: `${pushCount} reps (avg: ${PUSH_BENCH[group].avg})` });
    } else if (mode === "jump" && jumpHang) {
      const h = parseFloat(jumpHang);
      const cm = Math.round(1.22 * h * h * 9.81 * 100);
      const s = rawToScore(cm, JUMP_BENCH[group]);
      onResult({ score: s, label: `${cm}cm (avg: ${JUMP_BENCH[group].avg}cm)` });
    } else {
      setPhase("scoring");
    }
  }

  const overlayColor = mode === "sprint" ? C.green : mode === "pushups" ? C.red : mode === "jump" ? C.cyan : C.blue;

  // SETUP SCREEN
  if (phase === "setup") return (
    <div style={{ background: "#0A0A18", borderRadius: 14, overflow: "hidden", border: `2px solid ${overlayColor}33` }}>
      <div style={{ padding: "20px 18px" }}>
        <div style={{ background: `${C.blue}18`, border: `1.5px solid ${C.blue}33`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.blue, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>Setup Steps</div>
          {instructions.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${overlayColor}22`, border: `2px solid ${overlayColor}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: overlayColor, flexShrink: 0 }}>{i + 1}</div>
              <p style={{ margin: 0, color: C.offwhite, fontSize: 14, lineHeight: 1.6 }}>{s}</p>
            </div>
          ))}
        </div>
        {cam.err && <div style={{ background: `${C.red}18`, border: `1.5px solid ${C.red}44`, borderRadius: 10, padding: 14, marginBottom: 14, color: C.red, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-line" }}>{cam.err}</div>}
        <Btn full onClick={openCamera} v="green" style={{ fontSize: 18 }}>📷 Open Camera</Btn>
      </div>
    </div>
  );

  // LIVE CAMERA — fullscreen-style
  if (phase === "live") return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 200, display: "flex", flexDirection: "column" }}>
      {/* Video — takes most of the screen */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <video
          ref={cam.videoRef}
          muted playsInline autoPlay
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", background: "#000" }}
        />
        <canvas ref={cam.canvasRef} style={{ display: "none" }} />

        {/* Loading overlay if not ready */}
        {!cam.ready && !cam.err && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#000", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 40, animation: "spin 1s linear infinite" }}>📷</div>
            <div style={{ fontSize: 16, color: C.ghost }}>Starting camera...</div>
          </div>
        )}

        {/* Error overlay */}
        {cam.err && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#000000DD", flexDirection: "column", gap: 16, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <div style={{ fontSize: 16, color: C.red, lineHeight: 1.6, whiteSpace: "pre-line" }}>{cam.err}</div>
            <Btn sm v="ghost" onClick={() => { cam.stopCam(); setPhase("setup"); }}>← Back</Btn>
          </div>
        )}

        {/* Overlays when ready */}
        {cam.ready && (
          <>
            {/* Sprint lines */}
            {mode === "sprint" && (
              <>
                <div style={{ position: "absolute", left: "8%", top: 0, bottom: 0, width: 3, background: C.green, boxShadow: `0 0 12px ${C.green}` }} />
                <div style={{ position: "absolute", right: "8%", top: 0, bottom: 0, width: 3, background: C.red, boxShadow: `0 0 12px ${C.red}` }} />
                <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", background: "#000000CC", borderRadius: 12, padding: "10px 20px", textAlign: "center", minWidth: 200 }}>
                  {sprintState === "idle" && <div style={{ fontSize: 15, color: C.green, fontWeight: 700 }}>Tap Start Sprint below</div>}
                  {sprintState === "waiting" && <div style={{ fontSize: 18, fontWeight: 900, color: C.green }}>⚡ GO — SPRINT NOW!</div>}
                  {sprintState === "running" && <div style={{ fontSize: 16, fontWeight: 900, color: C.gold }}>🏃 SPRINTING...</div>}
                  {sprintState === "done" && <div><div style={{ fontSize: 24, fontWeight: 900, color: C.green }}>{sprintTime}s ✓</div><div style={{ fontSize: 13, color: C.ghost }}>Avg: {SPRINT_BENCH[group].avg}s</div></div>}
                </div>
              </>
            )}

            {/* Push-up counter */}
            {mode === "pushups" && (
              <div style={{ position: "absolute", top: 16, right: 16, background: "#000000CC", borderRadius: 14, padding: "12px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 44, fontWeight: 900, color: C.green, lineHeight: 1 }}>{pushCount}</div>
                <div style={{ fontSize: 13, color: C.ghost }}>REPS</div>
              </div>
            )}

            {/* Jump height */}
            {mode === "jump" && (
              <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", background: "#000000CC", borderRadius: 12, padding: "10px 20px", textAlign: "center" }}>
                {jumpHang
                  ? <div style={{ fontSize: 22, fontWeight: 900, color: C.green }}>{Math.round(1.22 * parseFloat(jumpHang) * parseFloat(jumpHang) * 9.81 * 100)}cm ✓</div>
                  : <div style={{ fontSize: 15, color: airborne ? C.gold : C.ghost }}>{airborne ? "⬆️ AIRBORNE..." : "Jump when ready"}</div>}
              </div>
            )}

            {/* Timer */}
            {timer.on && (
              <div style={{ position: "absolute", top: 16, left: 16, background: "#000000CC", borderRadius: 10, padding: "8px 14px" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: timer.t < 10 ? C.red : C.white }}>{timer.display}</div>
              </div>
            )}

            {/* REC dot */}
            {cam.recording && (
              <div style={{ position: "absolute", bottom: 16, left: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.red, animation: "blink 1s infinite" }} />
                <span style={{ fontSize: 14, color: C.white, fontWeight: 700 }}>REC</span>
              </div>
            )}
          </>
        )}

        {/* Flip camera button */}
        <button onClick={flipCamera} style={{ position: "absolute", top: 16, right: 16, background: "#000000AA", border: "1.5px solid #333355", color: C.white, borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontSize: 20 }}>🔄</button>

        {/* Close button */}
        <button onClick={() => { cam.stopCam(); setPhase("setup"); }} style={{ position: "absolute", bottom: 16, right: 16, background: "#000000AA", border: "1.5px solid #333355", color: C.white, borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>✕ Close</button>
      </div>

      {/* Bottom controls */}
      <div style={{ background: "#0A0A18", padding: 16, display: "flex", gap: 10 }}>
        {!cam.recording && mode === "sprint" && sprintState === "idle" && <Btn full onClick={() => { cam.recStart(); setSprintState("waiting"); timer.start(); }} v="green" style={{ fontSize: 17 }}>⚡ Start Sprint</Btn>}
        {!cam.recording && mode !== "sprint" && <Btn full onClick={startRecording} v="green" style={{ fontSize: 17 }}>⏺ Start Recording</Btn>}
        {cam.recording && mode === "sprint" && sprintState === "done" && <Btn full onClick={stopAndScore} v="green" style={{ fontSize: 17 }}>✓ Save My Time</Btn>}
        {cam.recording && mode === "sprint" && sprintState !== "done" && <Btn full onClick={() => { cam.stopCam(); setSprintState("idle"); setPhase("setup"); }} v="ghost" style={{ fontSize: 17 }}>↩ Reset</Btn>}
        {cam.recording && mode !== "sprint" && <Btn full onClick={stopAndScore} v="red" style={{ fontSize: 17 }}>⏹ Stop & Score</Btn>}
      </div>

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );

  // SCORING SCREEN (for record mode)
  if (phase === "scoring") return (
    <div style={{ background: "#0A0A18", borderRadius: 14, padding: 20, border: `2px solid ${overlayColor}33` }}>
      <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8, color: C.white }}>Enter Your Score</div>
      <p style={{ color: C.ghost, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>Watch your clip back and enter your honest result. Your video will be uploaded for community verification.</p>
      <Input label="Your Score (0–99)" type="number" value={scoreInput} onChange={setScoreInput} placeholder="e.g. 65" />
      <Btn full onClick={() => { if (scoreInput) onResult({ score: parseInt(scoreInput), label: `Self-scored: ${scoreInput}/99` }); }} disabled={!scoreInput} v="green">✓ Submit Score</Btn>
    </div>
  );

  return null;
}

// ── Agility Drill ─────────────────────────────────────────────
function AgilityDrill({ onScore, playerAge = 22 }) {
  const CMDS = ["← LEFT", "RIGHT →", "↑ FORWARD", "↓ BACK", "✋ HOLD"];
  const COLS = [C.blue, C.green, C.gold, C.red, C.purple];
  const [cmd, setCmd] = useState(null), [cc, setCc] = useState(C.green);
  const [scores, setScores] = useState([]), [count, setCount] = useState(0), [done, setDone] = useState(false);
  const sr = useRef(null);
  function next() { if (count >= 10) { setDone(true); onScore(scores); return; } const i = Math.floor(Math.random() * CMDS.length); setCmd(CMDS[i]); setCc(COLS[i]); sr.current = Date.now(); setCount(n => n + 1); }
  function react() { if (!sr.current) return; const ms = Date.now() - sr.current; const ns = [...scores, ms]; setScores(ns); sr.current = null; if (ns.length >= 10) { setDone(true); onScore(ns); return; } setTimeout(next, 500); }
  if (done) { const avg = scores.reduce((a,b) => a+b, 0) / scores.length, s = avg<500?92:avg<700?82:avg<900?70:avg<1200?55:38; return <div style={{ textAlign: "center", padding: 24 }}><div style={{ fontSize: 44, fontWeight: 900, color: C.green }}>{Math.round(avg)}ms</div><div style={{ fontSize: 16, color: C.ghost, marginTop: 6 }}>Average reaction · Score: {s}/99</div></div>; }
  if (!cmd) return <div style={{ textAlign: "center", padding: 24 }}><p style={{ color: C.offwhite, fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>Place 4 cones around you — front, back, left, right — 2m away. Stand in the centre facing the phone.</p><Btn full onClick={next} v="green">▶ Start Drill</Btn></div>;
  return <div style={{ textAlign: "center", padding: 24 }}><div style={{ fontSize: 13, color: C.ghost, marginBottom: 14, fontWeight: 700 }}>{count} / 10</div><div style={{ fontSize: 56, fontWeight: 900, color: cc, letterSpacing: 2, fontFamily: "'Arial Black',sans-serif", animation: "cmdpop 0.15s ease", marginBottom: 28 }}>{cmd}</div><Btn full onClick={react} v="blue" style={{ fontSize: 18, padding: "18px 24px" }}>✓ Done it!</Btn><style>{`@keyframes cmdpop{from{transform:scale(0.6);opacity:0}to{transform:scale(1);opacity:1}}`}</style></div>;
}

// ── Loading Screen ────────────────────────────────────────────
function LoadingScreen({ onDone }) {
  const canvasRef = useRef(null), [progress, setProgress] = useState(0), [showTag, setShowTag] = useState(false), animRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize(); window.addEventListener("resize", resize);
    const particles = Array.from({ length: 80 }, () => ({ x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight, vx: (Math.random()-0.5)*0.6, vy: (Math.random()-0.5)*0.6, r: Math.random()*2+0.5, color: [C.green,C.gold,C.blue,C.purple,"#fff"][Math.floor(Math.random()*5)], alpha: Math.random()*0.6+0.1, pulse: Math.random()*Math.PI*2 }));
    const ball = { x: window.innerWidth/2, y: window.innerHeight/2, vx: 2.2, vy: 1.4, r: 18, angle: 0 }; const trail = []; let frame = 0;
    function draw() {
      frame++; ctx.clearRect(0,0,canvas.width,canvas.height);
      const grad = ctx.createRadialGradient(canvas.width/2,canvas.height/2,0,canvas.width/2,canvas.height/2,canvas.width*0.7); grad.addColorStop(0,"#080818"); grad.addColorStop(1,"#050508"); ctx.fillStyle=grad; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.save(); ctx.strokeStyle=C.green; ctx.globalAlpha=0.07; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(canvas.width/2,canvas.height/2,canvas.height*0.22,0,Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(canvas.width/2,0); ctx.lineTo(canvas.width/2,canvas.height); ctx.stroke(); ctx.restore();
      particles.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.pulse+=0.04; if(p.x<0||p.x>canvas.width)p.vx*=-1; if(p.y<0||p.y>canvas.height)p.vy*=-1; ctx.save(); ctx.globalAlpha=p.alpha*(0.7+0.3*Math.sin(p.pulse)); ctx.fillStyle=p.color; ctx.shadowColor=p.color; ctx.shadowBlur=6; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.restore(); });
      trail.push({x:ball.x,y:ball.y}); if(trail.length>24)trail.shift(); trail.forEach((t,i) => { ctx.save(); ctx.globalAlpha=(i/trail.length)*0.4; ctx.fillStyle=C.green; ctx.shadowColor=C.green; ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(t.x,t.y,(i/trail.length)*12,0,Math.PI*2); ctx.fill(); ctx.restore(); });
      ball.x+=ball.vx; ball.y+=ball.vy; ball.angle+=0.08; if(ball.x-ball.r<0||ball.x+ball.r>canvas.width)ball.vx*=-1; if(ball.y-ball.r<0||ball.y+ball.r>canvas.height)ball.vy*=-1;
      ctx.save(); ctx.translate(ball.x,ball.y); ctx.rotate(ball.angle); ctx.fillStyle="#fff"; ctx.shadowColor=C.green; ctx.shadowBlur=20; ctx.beginPath(); ctx.arc(0,0,ball.r,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#111"; ctx.shadowBlur=0; for(let i=0;i<5;i++){const a=(i/5)*Math.PI*2; ctx.beginPath(); ctx.arc(Math.cos(a)*ball.r*0.5,Math.sin(a)*ball.r*0.5,ball.r*0.22,0,Math.PI*2); ctx.fill();} ctx.beginPath(); ctx.arc(0,0,ball.r*0.22,0,Math.PI*2); ctx.fill(); ctx.restore();
      animRef.current = requestAnimationFrame(draw);
    }
    draw(); return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize",resize); };
  }, []);
  useEffect(() => { const iv = setInterval(() => setProgress(p => { if(p>=100){clearInterval(iv);return 100;} return Math.min(100,p+(p<60?1.8:p<85?1.2:0.6)); }), 40); return () => clearInterval(iv); }, []);
  useEffect(() => { if(progress>30)setShowTag(true); if(progress>=100)setTimeout(()=>onDone?.(),600); }, [progress]);
  const texts = ["Initialising database...","Loading card engine...","Calibrating benchmarks...","Syncing teams...","Building your card...","Almost ready..."];
  const ti = Math.min(Math.floor(progress/17), texts.length-1);
  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 360, width: "100%", padding: "0 24px" }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: C.green, letterSpacing: 8, fontWeight: 700, textTransform: "uppercase", marginBottom: 4, opacity: 0.8 }}>⚽ Street</div>
          <div style={{ fontSize: 92, fontWeight: 900, lineHeight: 0.85, color: C.white, fontFamily: "'Arial Black',sans-serif", textTransform: "uppercase", letterSpacing: -5, animation: "logopulse 3s ease-in-out infinite", textShadow: `0 0 60px ${C.green}44` }}>TWICE</div>
        </div>
        <div style={{ fontSize: 13, color: C.green, letterSpacing: 4, fontWeight: 700, textTransform: "uppercase", marginBottom: 48, height: 18, opacity: showTag ? 1 : 0, transition: "opacity 0.8s ease" }}>Your Game. Your Card. Your Legacy.</div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 48 }}>
          <div style={{ width: 120, height: 175, borderRadius: 14, background: `linear-gradient(145deg,#140E00,#241800,${C.gold}18)`, border: `2px solid ${C.gold}55`, boxShadow: `0 0 40px ${C.gold}33`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", animation: "cardpulse 2s ease-in-out infinite" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,transparent 30%,rgba(255,255,255,0.07) 50%,transparent 70%)", animation: "shimmer 2.5s ease-in-out infinite" }} />
            <div style={{ fontSize: 40, fontWeight: 900, color: C.gold, fontFamily: "'Arial Black',sans-serif" }}>{Math.min(99, Math.round(progress*0.85))}</div>
            <div style={{ fontSize: 11, color: C.gold, letterSpacing: 2, fontWeight: 700 }}>ST</div>
            <div style={{ fontSize: 24, marginTop: 6 }}>⚽</div>
            <div style={{ width: 66, height: 66, borderRadius: "50% 50% 0 0", background: "#00000033", marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 30, opacity: 0.3 }}>👤</div></div>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 4, background: "#1A1A2E", borderRadius: 2, overflow: "hidden", marginBottom: 12, position: "relative" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg,${C.greenD},${C.green})`, borderRadius: 2, transition: "width 0.08s linear", boxShadow: `0 0 12px ${C.green}88` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, color: C.ghost }}>{texts[ti]}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: C.green }}>{Math.round(progress)}%</div>
          </div>
        </div>
      </div>
      <style>{`@keyframes logopulse{0%,100%{text-shadow:0 0 40px ${C.green}44}50%{text-shadow:0 0 60px ${C.green}88}}@keyframes cardpulse{0%,100%{transform:translateY(0) rotateY(0deg)}50%{transform:translateY(-6px) rotateY(6deg)}}@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
    </div>
  );
}

// ── AUTH ──────────────────────────────────────────────────────
const COUNTRIES = ["Afghanistan","Albania","Algeria","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Bulgaria","Burkina Faso","Cameroon","Canada","Chile","China","Colombia","Congo","Costa Rica","Croatia","Cuba","Czech Republic","Denmark","Dominican Republic","DR Congo","Ecuador","Egypt","El Salvador","England","Estonia","Ethiopia","Finland","France","Gabon","Georgia","Germany","Ghana","Greece","Guatemala","Guinea","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Ivory Coast","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kosovo","Kuwait","Latvia","Lebanon","Libya","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Mali","Malta","Mexico","Moldova","Montenegro","Morocco","Mozambique","Namibia","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palestine","Panama","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Scotland","Senegal","Serbia","Sierra Leone","Slovakia","Slovenia","Somalia","South Africa","South Korea","Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria","Tanzania","Thailand","Togo","Trinidad and Tobago","Tunisia","Turkey","Uganda","Ukraine","United Arab Emirates","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Wales","Zambia","Zimbabwe"].sort();

function Landing({ onNav }) {
  const demo = { name: "STRIKER", position: "ST", photo_url: null, nationality: "Nigeria", badges: ["explosive","silky"], stats: { pace:82,shooting:86,passing:74,dribbling:88,defending:42,physical:79,jumping:77,agility:85 } };
  const [tick, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick(t => t+1), 3000); return () => clearInterval(iv); }, []);
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.07 }}><ellipse cx="50%" cy="50%" rx="42%" ry="28%" fill="none" stroke={C.green} strokeWidth="1.5"/><line x1="50%" y1="0" x2="50%" y2="100%" stroke={C.green} strokeWidth="1"/><circle cx="50%" cy="50%" r="7%" fill="none" stroke={C.green} strokeWidth="1"/></svg>
      <div style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", background: `radial-gradient(circle,${C.green}0d,transparent 70%)`, top: "5%", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }} />
      <div style={{ zIndex: 1, maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: C.green, letterSpacing: 8, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>⚽ Street</div>
        <div style={{ fontSize: 90, fontWeight: 900, lineHeight: 0.85, color: C.white, fontFamily: "'Arial Black',sans-serif", textTransform: "uppercase", letterSpacing: -5, marginBottom: 10, textShadow: `0 0 60px ${C.green}33`, animation: "logopulse 3s ease-in-out infinite" }}>TWICE</div>
        <div style={{ fontSize: 16, color: C.green, letterSpacing: 3, marginBottom: 48, fontWeight: 700 }}>{["YOUR GAME.","YOUR CARD.","YOUR LEGACY."][tick%3]}</div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 52, filter: `drop-shadow(0 0 40px ${C.gold}44)` }}><Card player={demo} size="md" glow /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          <Btn full onClick={() => onNav("signup")}>Create Your Card →</Btn>
          <Btn full v="ghost" onClick={() => onNav("login")}>Sign In</Btn>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
          {["Bronze","Silver","Gold","Elite","✦ Rare"].map((t, i) => <div key={t} style={{ fontSize: 11, color: [C.tiers.bronze.t,C.tiers.silver.t,C.tiers.gold.t,C.tiers.elite.t,C.tiers.rare.t][i], fontWeight: 700, letterSpacing: 1 }}>{t}</div>)}
        </div>
      </div>
      <style>{`@keyframes cardfloat{0%,100%{transform:perspective(700px) translateY(0)}50%{transform:perspective(700px) translateY(-8px)}}@keyframes logopulse{0%,100%{text-shadow:0 0 40px ${C.green}33}50%{text-shadow:0 0 60px ${C.green}77}}@keyframes slideup{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}`}</style>
    </div>
  );
}

function Signup({ onNav, onLogin }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name:"",email:"",password:"",position:"ST",nationality:"",foot:"Right",date_of_birth:"",bio:"" });
  const [photo, setPhoto] = useState(null), [loading, setLoading] = useState(false), [err, setErr] = useState("");
  const fileRef = useRef(); const set = (k,v) => setForm(p => ({...p,[k]:v}));
  const previewAge = form.date_of_birth ? calcAge(form.date_of_birth) : null;
  async function submit() {
    if (!form.name||!form.email||!form.password) { setErr("Please fill all fields."); return; }
    if (!form.date_of_birth) { setErr("Date of birth required."); return; }
    if (!form.nationality) { setErr("Please select your country."); return; }
    setLoading(true); setErr("");
    try {
      const auth = await sbAuth(form.email, form.password, "signup");
      const uid = auth?.user?.id || auth?.id;
      if (!uid) throw new Error("Could not get user ID. Please try again.");
      const player = { id:uid, email:form.email, name:form.name, position:form.position, nationality:form.nationality, foot:form.foot, date_of_birth:form.date_of_birth, bio:form.bio, photo_url:photo||null, stats:{pace:0,shooting:0,passing:0,dribbling:0,defending:0,physical:0,jumping:0,agility:0}, peer_stats:{}, gk_stats:{}, badges:[], team_id:null, team_role:"player", team_code:null, team_name:null, pending_team_code:null, motm_votes:0, games_played:0, challenge_code:randCode(), last_benchmark:new Date().toISOString(), diamonds:0 };
      await sbFetch("players", { method: "POST", body: JSON.stringify(player) });
      onLogin(player); onNav("app");
    } catch(e) { setErr(e.message); }
    setLoading(false);
  }
  return (
    <div style={{ minHeight:"100vh", background:C.bg, padding:"28px 22px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <Btn v="ghost" sm onClick={() => onNav("landing")} style={{ marginBottom:28 }}>← Back</Btn>
        <div style={{ height:4, background:"#1A1A2E", borderRadius:2, marginBottom:28, overflow:"hidden" }}><div style={{ height:"100%", width:step===1?"50%":"100%", background:`linear-gradient(90deg,${C.blue},${C.green})`, transition:"width 0.4s ease" }}/></div>
        <h1 style={{ color:C.white, fontSize:32, fontWeight:900, margin:"0 0 28px", letterSpacing:-1 }}>{step===1?"Create Account":"Your Profile"}</h1>
        {err && <div style={{ background:`${C.red}18`, border:`2px solid ${C.red}44`, borderRadius:10, padding:"14px 16px", color:C.red, fontSize:15, marginBottom:18 }}>{err}</div>}
        {step===1 && <>
          <Input label="Full Name" value={form.name} onChange={v=>set("name",v)} placeholder="Your name"/>
          <Input label="Email" type="email" value={form.email} onChange={v=>set("email",v)} placeholder="you@email.com"/>
          <Input label="Password" type="password" value={form.password} onChange={v=>set("password",v)} placeholder="Min 6 characters"/>
          <div style={{ marginBottom:18 }}>
            <label style={{ display:"block", fontSize:13, color:C.ghost, letterSpacing:1.5, marginBottom:8, textTransform:"uppercase", fontWeight:700 }}>Date of Birth</label>
            <input type="date" value={form.date_of_birth} onChange={e=>set("date_of_birth",e.target.value)} max={new Date().toISOString().split("T")[0]} style={{ width:"100%", background:"#111122", border:"2px solid #222244", borderRadius:10, padding:"14px 16px", color:C.white, fontSize:16, outline:"none", boxSizing:"border-box" }}/>
            {previewAge!==null && <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:8 }}><Pill color={C.green}>{AGE_LABELS[ageGroup(previewAge)]}</Pill><span style={{ fontSize:13, color:C.ghost }}>Benchmarks calibrated for this group</span></div>}
          </div>
          <Btn full onClick={() => { if(!form.name||!form.email||!form.password||!form.date_of_birth){setErr("Fill all fields");return;} setErr("");setStep(2); }}>Continue →</Btn>
          <p style={{ textAlign:"center", marginTop:20, color:C.ghost, fontSize:14 }}>Have an account? <span onClick={()=>onNav("login")} style={{ color:C.green, cursor:"pointer", fontWeight:700 }}>Sign in</span></p>
        </>}
        {step===2 && <>
          <div style={{ textAlign:"center", marginBottom:24 }}>
            <div onClick={() => fileRef.current.click()} style={{ width:96, height:96, borderRadius:"50%", margin:"0 auto 12px", background:"#111122", border:`3px dashed ${C.green}44`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", overflow:"hidden" }}>
              {photo ? <img src={photo} style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span style={{ fontSize:36 }}>📸</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{const r=new FileReader();r.onload=ev=>setPhoto(ev.target.result);r.readAsDataURL(e.target.files[0]);}}/>
            <span style={{ fontSize:14, color:C.ghost, cursor:"pointer" }} onClick={() => fileRef.current.click()}>Tap to add photo</span>
          </div>
          <Select label="Nationality / Country" value={form.nationality} onChange={v=>set("nationality",v)} options={COUNTRIES} placeholder="Select your country"/>
          <div style={{ marginBottom:16 }}><label style={{ display:"block", fontSize:13, color:C.ghost, letterSpacing:1.5, marginBottom:8, textTransform:"uppercase", fontWeight:700 }}>Position</label><select value={form.position} onChange={e=>set("position",e.target.value)} style={{ width:"100%", background:"#111122", border:"2px solid #222244", borderRadius:10, padding:"14px 16px", color:C.white, fontSize:16, outline:"none" }}>{POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
          <div style={{ marginBottom:18 }}><label style={{ display:"block", fontSize:13, color:C.ghost, letterSpacing:1.5, marginBottom:10, textTransform:"uppercase", fontWeight:700 }}>Preferred Foot</label><div style={{ display:"flex", gap:10 }}>{["Left","Right","Both"].map(f=><button key={f} onClick={()=>set("foot",f)} style={{ flex:1, padding:14, borderRadius:10, border:`2px solid ${form.foot===f?C.green:"#222244"}`, background:form.foot===f?`${C.green}18`:"transparent", color:form.foot===f?C.green:C.ghost, cursor:"pointer", fontSize:15, fontWeight:800 }}>{f}</button>)}</div></div>
          <Textarea label="Player Bio (optional)" value={form.bio} onChange={v=>set("bio",v)} placeholder="Your style, your strengths..." maxLength={160}/>
          <Btn full onClick={submit} disabled={loading}>{loading?"Creating your card...":"Create My Card ⚽"}</Btn>
        </>}
      </div>
    </div>
  );
}

function Login({ onNav, onLogin }) {
  const [email, setEmail] = useState(""), [pw, setPw] = useState(""), [loading, setLoading] = useState(false), [err, setErr] = useState("");
  async function submit() {
    if (!email||!pw) { setErr("Enter email and password."); return; }
    setLoading(true); setErr("");
    try {
      // Step 1: authenticate and store token
      await sbAuth(email, pw, "login");
      // Step 2: always fetch user from /auth/v1/user using the stored token
      // This is the most reliable way — token is now in localStorage
      const token = localStorage.getItem("sb_token");
      if (!token) throw new Error("Authentication failed — no token received. Please try again.");
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
      });
      if (!userRes.ok) throw new Error("Could not verify your account. Please try again.");
      const userData = await userRes.json();
      const uid = userData?.id;
      if (!uid) throw new Error("Could not get your user ID. Please try again.");
      // Step 3: fetch player profile
      const rows = await sbFetch(`players?id=eq.${uid}&limit=1`);
      if (!rows?.[0]) throw new Error("Profile not found. Please sign up first.");
      onLogin(rows[0]); onNav("app");
    } catch(e) { setErr(e.message); }
    setLoading(false);
  }
  return (
    <div style={{ minHeight:"100vh", background:C.bg, padding:"28px 22px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <Btn v="ghost" sm onClick={() => onNav("landing")} style={{ marginBottom:28 }}>← Back</Btn>
        <h1 style={{ color:C.white, fontSize:32, fontWeight:900, margin:"0 0 10px", letterSpacing:-1 }}>Welcome back</h1>
        <p style={{ color:C.ghost, fontSize:16, marginBottom:32 }}>Sign in to access your card.</p>
        {err && <div style={{ background:`${C.red}18`, border:`2px solid ${C.red}44`, borderRadius:10, padding:"14px 16px", color:C.red, fontSize:15, marginBottom:18, lineHeight:1.6 }}>{err}</div>}
        <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com"/>
        <Input label="Password" type="password" value={pw} onChange={setPw} placeholder="Your password"/>
        <Btn full onClick={submit} disabled={loading} style={{ marginTop:8 }}>{loading?"Signing in...":"Sign In"}</Btn>
        <p style={{ textAlign:"center", marginTop:20, color:C.ghost, fontSize:14 }}>No account? <span onClick={() => onNav("signup")} style={{ color:C.green, cursor:"pointer", fontWeight:700 }}>Create one</span></p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════════════════════════

// ── HOME ──────────────────────────────────────────────────────
function HomeTab({ player, onUpdate }) {
  const overall = ov(player?.stats);
  const t = tier(overall, player?.badges||[]);
  const ts = C.tiers[t];
  const age = calcAge(player?.date_of_birth);
  const [friendCode, setFriendCode] = useState(""), [friendResult, setFriendResult] = useState(null), [friends, setFriends] = useState([]);
  const [toast, setToast] = useState("");
  const showToast = (m, ty="ok") => { setToast({m,ty}); setTimeout(()=>setToast(""),2500); };

  async function findFriend() {
    if (!friendCode.trim()) return;
    try { const r = await sbFetch(`players?challenge_code=eq.${friendCode.trim().toUpperCase()}&limit=1`); if (!r?.[0]) { showToast("Player not found","err"); return; } setFriendResult(r[0]); }
    catch { showToast("Search failed","err"); }
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.white, paddingBottom:100 }}>
      <Toast msg={toast?.m} type={toast?.ty}/>
      {/* Header */}
      <div style={{ background:`linear-gradient(180deg,#0A0A18,${C.bg})`, padding:"22px 20px 0", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", width:280, height:280, borderRadius:"50%", background:`radial-gradient(circle,${ts.g},transparent 70%)`, top:-80, right:-60, pointerEvents:"none" }}/>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
          <div>
            <div style={{ fontSize:11, color:C.green, letterSpacing:4, textTransform:"uppercase", marginBottom:3, fontWeight:700 }}>Street Twice</div>
            <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.5 }}>{player?.name}</div>
            <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
              <Pill color={ts.t}>{t.toUpperCase()}</Pill>
              {age && <Pill color={C.blue}>{AGE_LABELS[ageGroup(age)]}</Pill>}
            </div>
          </div>
          <div style={{ textAlign:"right", marginTop:4 }}>
            <div style={{ fontSize:42, fontWeight:900, color:ts.t, lineHeight:1, textShadow:`0 0 24px ${ts.b}88` }}>{overall||"—"}</div>
            <div style={{ fontSize:11, color:C.ghost, letterSpacing:2, textTransform:"uppercase" }}>Overall</div>
          </div>
        </div>
      </div>

      <div style={{ padding:"0 20px", maxWidth:480, margin:"0 auto" }}>
        {/* Card */}
        <div style={{ display:"flex", justifyContent:"center", margin:"28px 0", position:"relative" }}>
          <div style={{ position:"absolute", width:240, height:240, borderRadius:"50%", background:`radial-gradient(circle,${ts.g},transparent 70%)`, top:"50%", left:"50%", transform:"translate(-50%,-50%)", pointerEvents:"none" }}/>
          <Card player={player} size="full"/>
        </div>

        {player?.bio && <div style={{ background:"#0A0A18", borderRadius:14, padding:16, marginBottom:18, border:`1px solid #1A1A2E` }}><div style={{ fontSize:15, color:C.offwhite, fontStyle:"italic", lineHeight:1.7 }}>"{player.bio}"</div></div>}

        {/* Challenge code */}
        <div style={{ background:"linear-gradient(135deg,#0A0A18,#111122)", border:`2px solid ${C.green}33`, borderRadius:14, padding:"16px 18px", marginBottom:18, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:11, color:C.ghost, letterSpacing:2, textTransform:"uppercase", marginBottom:5, fontWeight:700 }}>Your Challenge Code</div>
            <div style={{ fontSize:28, fontWeight:900, color:C.green, letterSpacing:8, fontFamily:"'Arial Black',sans-serif" }}>{player?.challenge_code||"——"}</div>
          </div>
          <div style={{ fontSize:13, color:C.ghost, textAlign:"right", lineHeight:1.6 }}>Share with<br/>opponents &<br/>teammates</div>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
          {[{val:player?.games_played||0,label:"Games",col:C.green,e:"⚽"},{val:player?.motm_votes||0,label:"MOTM",col:C.gold,e:"🏅"},{val:(player?.badges||[]).length,label:"Badges",col:C.purple,e:"🔥"}].map(s=>(
            <div key={s.label} style={{ background:`linear-gradient(135deg,${s.col}14,${s.col}06)`, borderRadius:14, padding:16, textAlign:"center", border:`2px solid ${s.col}33` }}>
              <div style={{ fontSize:13, marginBottom:5 }}>{s.e}</div>
              <div style={{ fontSize:30, fontWeight:900, color:s.col, textShadow:`0 0 14px ${s.col}66` }}>{s.val}</div>
              <div style={{ fontSize:11, color:C.ghost, letterSpacing:1.5, textTransform:"uppercase", marginTop:3, fontWeight:700 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div style={{ background:"#0A0A18", borderRadius:14, padding:16, marginBottom:18, border:`1px solid #1A1A2E` }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ fontSize:15, fontWeight:800 }}>Card Progress</div>
            <div style={{ fontSize:16, fontWeight:900, color:C.green }}>{Object.values(player?.stats||{}).filter(v=>v>0).length}/{Object.keys(STATS_META).length}</div>
          </div>
          <div style={{ height:8, background:"#1A1A2E", borderRadius:4, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(Object.values(player?.stats||{}).filter(v=>v>0).length/Object.keys(STATS_META).length)*100}%`, background:`linear-gradient(90deg,${C.blue},${C.green})`, borderRadius:4, transition:"width 1.2s", boxShadow:`0 0 10px ${C.green}55` }}/>
          </div>
          <div style={{ fontSize:13, color:C.ghost, marginTop:8 }}>Complete all tests to unlock your full card rating</div>
        </div>

        {/* Diamonds */}
        <div style={{ background:"linear-gradient(135deg,#0A0A18,#111122)", border:`2px solid ${C.gold}33`, borderRadius:14, padding:16, marginBottom:18 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:11, color:C.ghost, letterSpacing:2, textTransform:"uppercase", marginBottom:5, fontWeight:700 }}>Your Diamonds</div>
              <div style={{ fontSize:32, fontWeight:900, color:C.gold }}>{player?.diamonds||0} 💎</div>
            </div>
            <div style={{ fontSize:13, color:C.ghost, textAlign:"right", lineHeight:1.7 }}>Win matches to<br/>earn diamonds<br/>Lose = forfeit</div>
          </div>
        </div>

        {/* Badges */}
        {(player?.badges||[]).length > 0 && (
          <div style={{ background:"#0A0A18", borderRadius:14, padding:16, marginBottom:18, border:`1px solid #1A1A2E` }}>
            <div style={{ fontSize:15, fontWeight:800, marginBottom:14 }}>Your Badges</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {(player.badges||[]).map(bid => { const b = BADGES.find(x=>x.id===bid); return b ? <div key={bid} style={{ background:b.rare?`${C.purple}18`:`${C.green}10`, border:`2px solid ${b.rare?C.purple:C.green+"55"}`, borderRadius:12, padding:"12px 16px", textAlign:"center", boxShadow:b.rare?`0 0 20px ${C.purple}44`:`0 0 10px ${C.green}22` }}><div style={{ fontSize:28 }}>{b.icon}</div><div style={{ fontSize:11, color:b.rare?C.purple:C.green, fontWeight:700, marginTop:6, letterSpacing:0.5 }}>{b.name}</div></div> : null; })}
            </div>
          </div>
        )}

        {/* Friends */}
        <div style={{ background:"#0A0A18", borderRadius:14, padding:16, border:`1px solid #1A1A2E` }}>
          <div style={{ fontSize:15, fontWeight:800, marginBottom:14 }}>Friends <Pill color={C.blue}>{friends.length}</Pill></div>
          <div style={{ display:"flex", gap:10, marginBottom:14 }}>
            <input value={friendCode} onChange={e => setFriendCode(e.target.value.toUpperCase())} placeholder="Enter challenge code" style={{ flex:1, background:"#111122", border:"2px solid #222244", borderRadius:10, padding:"12px 14px", color:C.white, fontSize:15, outline:"none", letterSpacing:3, fontWeight:700 }}/>
            <Btn sm onClick={findFriend} v="blue">Find</Btn>
          </div>
          {friendResult && (
            <div style={{ background:`${C.green}0a`, border:`2px solid ${C.green}22`, borderRadius:12, padding:14, marginBottom:14, display:"flex", alignItems:"center", gap:14 }}>
              <Card player={friendResult} size="mini" glow={false}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:800 }}>{friendResult.name}</div>
                <div style={{ fontSize:13, color:C.ghost }}>{friendResult.position} · OVR {ov(friendResult.stats)}</div>
                {calcAge(friendResult.date_of_birth) && <Pill color={C.blue}>{AGE_LABELS[ageGroup(calcAge(friendResult.date_of_birth))]}</Pill>}
              </div>
              <Btn sm onClick={() => { setFriends(f=>[...f,friendResult]); setFriendResult(null); setFriendCode(""); showToast("Friend added ✓"); }}>Add</Btn>
            </div>
          )}
          {friends.length === 0 && !friendResult && <div style={{ textAlign:"center", padding:"16px 0", color:C.ghost, fontSize:14 }}>No friends yet — enter a challenge code to find someone</div>}
          {friends.map((f,i) => (
            <div key={i} style={{ background:"#111122", borderRadius:12, padding:14, marginBottom:10, display:"flex", alignItems:"center", gap:14 }}>
              <Card player={f} size="mini" glow={false}/>
              <div style={{ flex:1 }}><div style={{ fontSize:15, fontWeight:700 }}>{f.name}</div><div style={{ fontSize:13, color:C.ghost }}>{f.position} · OVR {ov(f.stats)}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── DEVELOP ───────────────────────────────────────────────────
function DevelopTab({ player, onStat }) {
  const [view, setView] = useState("menu");
  const [selTest, setSelTest] = useState(null);
  const [phase, setPhase] = useState("intro");
  const [toast, setToast] = useState("");
  const [linkedCode, setLinkedCode] = useState(""), [linked, setLinked] = useState(null);
  const [challengePhase, setChallengePhase] = useState("link");
  const age = calcAge(player?.date_of_birth);
  const showToast = (m,t="ok") => { setToast({m,t}); setTimeout(()=>setToast(""),2500); };

  async function findOpponent() {
    if (!linkedCode.trim()) return;
    try { const r = await sbFetch(`players?challenge_code=eq.${linkedCode.trim().toUpperCase()}&limit=1`); if (!r?.[0]) { showToast("Code not found","err"); return; } setLinked(r[0]); }
    catch { showToast("Search failed","err"); }
  }

  function handleTestResult(res) {
    if (res.score != null && selTest?.stat) {
      const s = Math.min(99, Math.max(15, Math.round(res.score)));
      onStat(selTest.stat, s);
      showToast(`Score saved: ${s}/99 ✓`);
    }
    setPhase("done");
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.white, paddingBottom:100 }}>
      <Hdr title={view==="menu"?"Develop":view==="tests"?"Solo Tests":view==="challenges"?"Challenges":selTest?.label||"Test"} sub="Level Up" back={view!=="menu"?()=>{ setView("menu"); setSelTest(null); setPhase("intro"); setChallengePhase("link"); }:undefined}/>
      <Toast msg={toast?.m} type={toast?.t}/>
      <div style={{ padding:"20px 20px", maxWidth:480, margin:"0 auto" }}>

        {view==="menu" && <>
          {/* Stats */}
          <div style={{ background:"#0A0A18", borderRadius:14, padding:18, marginBottom:20, border:`1px solid #1A1A2E` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:17, fontWeight:900 }}>Your Stats</div>
              {age && <Pill color={C.blue}>{AGE_LABELS[ageGroup(age)]}</Pill>}
            </div>
            {Object.entries(STATS_META).map(([k,m]) => <StatBar key={k} label={m.l} value={player?.stats?.[k]} color={m.color}/>)}
          </div>

          {[
            { id:"tests", icon:"🧪", label:"Solo Tests", desc:"7 camera-based assessments — sprint timing, jump height, push-up counter, agility and more", color:C.green },
            { id:"challenges", icon:"⚔️", label:"1v1 Challenges", desc:"Link up with a registered opponent. Progressive rounds with age-weighted XP", color:C.blue },
          ].map(m => (
            <button key={m.id} onClick={() => setView(m.id)} style={{ width:"100%", background:`linear-gradient(135deg,${m.color}14,${m.color}06)`, border:`2px solid ${m.color}33`, borderRadius:16, padding:20, textAlign:"left", cursor:"pointer", color:C.white, marginBottom:14, display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ fontSize:44 }}>{m.icon}</div>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:m.color, marginBottom:5 }}>{m.label}</div>
                <div style={{ fontSize:14, color:C.ghost, lineHeight:1.6 }}>{m.desc}</div>
              </div>
            </button>
          ))}
        </>}

        {view==="tests" && selTest===null && <>
          <div style={{ background:`${C.blue}14`, border:`1.5px solid ${C.blue}33`, borderRadius:12, padding:14, marginBottom:18 }}>
            <div style={{ fontSize:14, color:C.blue, fontWeight:700, marginBottom:4 }}>📏 Age-calibrated benchmarks</div>
            <div style={{ fontSize:13, color:C.ghost }}>Sprint, jump and push-up scores are measured against the average for <strong style={{ color:C.white }}>{age?AGE_LABELS[ageGroup(age)]:"your age group"}</strong>.</div>
          </div>
          {SOLO_TESTS.map(test => {
            const v = player?.stats?.[test.stat]||0;
            return (
              <button key={test.id} onClick={() => { setSelTest(test); setPhase("intro"); }} style={{ width:"100%", background:"#0A0A18", border:`2px solid ${v>0?C.green+"55":"#1A1A2E"}`, borderRadius:14, padding:16, textAlign:"left", cursor:"pointer", color:C.white, display:"flex", alignItems:"center", gap:16, marginBottom:10 }}>
                <div style={{ fontSize:36 }}>{test.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:17, fontWeight:800, marginBottom:4 }}>{test.label}</div>
                  <div style={{ fontSize:13, color:C.ghost }}>{["sprint","jump","pushups","agility"].includes(test.camMode)?"🤖 Auto-measured":"📷 Camera + manual"}</div>
                </div>
                <div>{v>0?<div style={{ fontSize:26, fontWeight:900, color:sc(v) }}>{v}</div>:<div style={{ width:38, height:38, borderRadius:"50%", border:`2px solid #333355`, display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{ width:12, height:12, borderRadius:"50%", background:"#333355" }}/></div>}</div>
              </button>
            );
          })}
        </>}

        {view==="tests" && selTest && <>
          {phase==="intro" && <>
            <div style={{ textAlign:"center", marginBottom:24 }}>
              <div style={{ fontSize:64, marginBottom:14 }}>{selTest.icon}</div>
              <div style={{ fontSize:24, fontWeight:900, marginBottom:10 }}>{selTest.label}</div>
              <p style={{ color:C.offwhite, fontSize:15, lineHeight:1.7 }}>{selTest.desc}</p>
            </div>
            {age && selTest.camMode && selTest.camMode!=="record" && (
              <div style={{ background:`${C.blue}14`, border:`1.5px solid ${C.blue}33`, borderRadius:12, padding:14, marginBottom:16 }}>
                <div style={{ fontSize:13, color:C.blue, fontWeight:700, marginBottom:4 }}>Your Age Group Benchmark</div>
                {selTest.id==="sprint" && <div style={{ fontSize:15, color:C.white }}>Avg: <strong style={{ color:C.green }}>{SPRINT_BENCH[ageGroup(age)].avg}s</strong> · Elite: <strong style={{ color:C.gold }}>{SPRINT_BENCH[ageGroup(age)].elite}s</strong></div>}
                {selTest.id==="jump" && <div style={{ fontSize:15, color:C.white }}>Avg: <strong style={{ color:C.green }}>{JUMP_BENCH[ageGroup(age)].avg}cm</strong> · Elite: <strong style={{ color:C.gold }}>{JUMP_BENCH[ageGroup(age)].elite}cm</strong></div>}
                {selTest.id==="pushups" && <div style={{ fontSize:15, color:C.white }}>Avg: <strong style={{ color:C.green }}>{PUSH_BENCH[ageGroup(age)].avg} reps</strong> · Elite: <strong style={{ color:C.gold }}>{PUSH_BENCH[ageGroup(age)].elite}</strong></div>}
              </div>
            )}
            <Btn full onClick={() => setPhase("camera")} v="green" style={{ fontSize:18 }}>
              {selTest.camMode==="agility" ? "▶ Start Agility Drill" : "📷 Open Camera"}
            </Btn>
          </>}

          {phase==="camera" && (
            selTest.camMode==="agility"
              ? <div style={{ background:"#0A0A18", borderRadius:14, padding:6, border:`2px solid ${C.gold}33` }}><AgilityDrill playerAge={age||22} onScore={scores => { const avg=scores.reduce((a,b)=>a+b,0)/scores.length; const s=avg<500?92:avg<700?82:avg<900?70:avg<1200?55:38; onStat("agility",s); showToast(`Agility score: ${s}/99 ✓`); setPhase("done"); }}/></div>
              : <CameraView mode={selTest.camMode} onResult={handleTestResult} instructions={selTest.steps} timerSecs={120} playerAge={age||22}/>
          )}

          {phase==="done" && (
            <div style={{ textAlign:"center", padding:28 }}>
              <div style={{ fontSize:72, marginBottom:18 }}>✅</div>
              <div style={{ fontSize:26, fontWeight:900, marginBottom:10 }}>Score Saved!</div>
              <p style={{ color:C.ghost, fontSize:15, lineHeight:1.7, marginBottom:28 }}>Benchmarked against your age group. Keep testing different skills to complete your card.</p>
              <div style={{ display:"flex", gap:12 }}>
                <Btn v="dark" full onClick={() => { setSelTest(null); setPhase("intro"); }}>← More Tests</Btn>
                <Btn full onClick={() => setView("menu")}>Develop</Btn>
              </div>
            </div>
          )}
        </>}

        {view==="challenges" && <>
          {challengePhase==="link" && <>
            <div style={{ background:"#0A0A18", border:`2px solid ${C.blue}33`, borderRadius:14, padding:18, marginBottom:16 }}>
              <div style={{ fontSize:17, fontWeight:800, color:C.blue, marginBottom:8 }}>🔗 Link Your Opponent</div>
              <p style={{ color:C.ghost, fontSize:14, lineHeight:1.6, marginBottom:14 }}>Ask your opponent for their Challenge Code, then enter it here to link up. Both of you need to be registered.</p>
              {linked ? (
                <div style={{ background:`${C.green}0a`, border:`2px solid ${C.green}22`, borderRadius:12, padding:14, display:"flex", gap:14, alignItems:"center" }}>
                  <Card player={linked} size="sm" glow={false}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:16, fontWeight:800, color:C.green }}>✓ Linked</div>
                    <div style={{ fontSize:17, fontWeight:900 }}>{linked.name}</div>
                    <div style={{ fontSize:13, color:C.ghost }}>{linked.position} · OVR {ov(linked.stats)}</div>
                    {calcAge(linked.date_of_birth) && <Pill color={C.blue}>{AGE_LABELS[ageGroup(calcAge(linked.date_of_birth))]}</Pill>}
                    {age && calcAge(linked.date_of_birth) && Math.abs(age-calcAge(linked.date_of_birth))>=3 && <div style={{ fontSize:13, color:C.gold, fontWeight:700, marginTop:6 }}>⚡ Age gap — XP weighted</div>}
                  </div>
                  <Btn sm v="ghost" onClick={() => setLinked(null)}>✕</Btn>
                </div>
              ) : (
                <div style={{ display:"flex", gap:10 }}>
                  <input value={linkedCode} onChange={e => setLinkedCode(e.target.value.toUpperCase())} placeholder="e.g. AB12XY" style={{ flex:1, background:"#111122", border:"2px solid #222244", borderRadius:10, padding:"12px 14px", color:C.white, fontSize:18, fontWeight:800, outline:"none", letterSpacing:5 }}/>
                  <Btn onClick={findOpponent} v="blue">Link</Btn>
                </div>
              )}
            </div>
            {linked && <Btn full v="green" onClick={() => setChallengePhase("rounds")} style={{ fontSize:17 }}>Start Challenges →</Btn>}
          </>}

          {challengePhase==="rounds" && linked && <>
            <div style={{ background:`${C.green}0a`, border:`2px solid ${C.green}22`, borderRadius:12, padding:14, marginBottom:16, display:"flex", gap:14, alignItems:"center" }}>
              <Card player={linked} size="sm" glow={false}/>
              <div><div style={{ fontSize:15, fontWeight:700, color:C.green }}>Playing vs</div><div style={{ fontSize:18, fontWeight:900 }}>{linked.name}</div></div>
            </div>
            <div style={{ background:"#0A0A18", borderRadius:14, padding:16, border:`1px solid #1A1A2E`, marginBottom:14 }}>
              <div style={{ fontSize:17, fontWeight:800, marginBottom:14 }}>Challenge Rounds</div>
              {[{icon:"🦶",label:"Round 1–3",rule:"No slide tackles — positioning only",timer:180},{icon:"⚡",label:"Round 4–6",rule:"Slide tackles ONLY",timer:180},{icon:"👥",label:"Round 7–9",rule:"2v1 — two attackers",timer:180},{icon:"💨",label:"60s Blitz",rule:"Beat defender in 60 seconds",timer:60},{icon:"🌀",label:"Skill Round",rule:"Attacker must use a skill move",timer:120}].map((r,i) => (
                <div key={i} style={{ display:"flex", gap:12, alignItems:"center", padding:"12px 0", borderBottom:i<4?`1px solid #1A1A2E`:"none" }}>
                  <div style={{ fontSize:24 }}>{r.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:700 }}>{r.label}</div>
                    <div style={{ fontSize:13, color:C.ghost }}>{r.rule} · {r.timer>=60?Math.floor(r.timer/60)+"min":r.timer+"s"}</div>
                  </div>
                </div>
              ))}
            </div>
            <Btn full v="green" onClick={() => { showToast("Challenge started! Both players record simultaneously."); }} style={{ fontSize:17 }}>Start Challenge Session</Btn>
            <div style={{ marginTop:14, background:`${C.blue}14`, border:`1.5px solid ${C.blue}33`, borderRadius:12, padding:14 }}>
              <div style={{ fontSize:14, color:C.blue, fontWeight:700, marginBottom:4 }}>🔒 Anti-Cheat</div>
              <div style={{ fontSize:13, color:C.ghost, lineHeight:1.6 }}>Both players film simultaneously. Score gap ≤2 = auto-averaged. 3–5 = pending. 6+ = community frozen. Age gap XP applied.</div>
            </div>
          </>}
        </>}
      </div>
    </div>
  );
}

// ── CLUB ──────────────────────────────────────────────────────
function ClubTab({ player, onUpdate }) {
  const [tab, setTab] = useState("squad");
  const [squad, setSquad] = useState([]);
  const [requests, setRequests] = useState([]);
  const [joinCode, setJoinCode] = useState(""), [createName, setCreateName] = useState("");
  const [matchForm, setMatchForm] = useState({ opponentCode:"", date:"", time:"", location:"", format:"5v5", diamondStake:1 });
  const [matchRequests, setMatchRequests] = useState([]);
  const [votes, setVotes] = useState({});
  const [ratingTarget, setRatingTarget] = useState(null);
  const [ratings, setRatings] = useState({ effort:0, quality:0, communication:0 });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (m,t="ok") => { setToast({m,t}); setTimeout(()=>setToast(""),2500); };
  const isCapOrVice = player?.team_role==="captain"||player?.team_role==="vice";
  const mf = (k,v) => setMatchForm(p => ({...p,[k]:v}));
  const teamCode = player?.team_code;

  // Load real squad — no fake players
  useEffect(() => {
    if (!teamCode) return;
    sbFetch(`players?team_code=eq.${teamCode}&id=neq.${player.id}&select=id,name,position,stats,badges,date_of_birth,team_role,photo_url`)
      .then(r => setSquad(r||[]))
      .catch(() => {});
    if (isCapOrVice) {
      sbFetch(`players?pending_team_code=eq.${teamCode}&select=id,name,position,stats,date_of_birth,challenge_code,photo_url`)
        .then(r => setRequests(r||[]))
        .catch(() => {});
    }
  }, [teamCode, player?.id]);

  async function createTeam() {
    if (!createName.trim()) { showToast("Enter a team name","err"); return; }
    if (player?.team_code) { showToast("You're already in a team","err"); return; }
    const code = randCode();
    setLoading(true);
    try {
      await sbFetch(`players?id=eq.${player.id}`, { method:"PATCH", body:JSON.stringify({ team_code:code, team_role:"captain", team_name:createName.trim(), diamonds:0 }), prefer:"return=minimal" });
      onUpdate({ ...player, team_code:code, team_role:"captain", team_name:createName.trim() });
      showToast("Team created! Share code: " + code);
      setCreateName("");
    } catch(e) { showToast(e.message,"err"); }
    setLoading(false);
  }

  async function joinTeam() {
    if (!joinCode.trim()) { showToast("Enter a team code","err"); return; }
    if (player?.team_code) { showToast("Leave your current team first","err"); return; }
    setLoading(true);
    try {
      const cap = await sbFetch(`players?team_code=eq.${joinCode.trim().toUpperCase()}&team_role=eq.captain&limit=1`);
      if (!cap?.[0]) { showToast("Team not found — check the code","err"); setLoading(false); return; }
      // Check team isn't full (max 11)
      const members = await sbFetch(`players?team_code=eq.${joinCode.trim().toUpperCase()}&select=id`);
      if ((members||[]).length >= 11) { showToast("Team is full — max 11 players","err"); setLoading(false); return; }
      await sbFetch(`players?id=eq.${player.id}`, { method:"PATCH", body:JSON.stringify({ pending_team_code:joinCode.trim().toUpperCase() }), prefer:"return=minimal" });
      showToast("Join request sent! Waiting for captain.");
      setJoinCode("");
    } catch(e) { showToast(e.message,"err"); }
    setLoading(false);
  }

  async function leaveTeam() {
    setLoading(true);
    try {
      await sbFetch(`players?id=eq.${player.id}`, { method:"PATCH", body:JSON.stringify({ team_code:null, team_role:"player", team_name:null, pending_team_code:null }), prefer:"return=minimal" });
      onUpdate({ ...player, team_code:null, team_role:"player", team_name:null });
      setSquad([]); setRequests([]);
      showToast("Left the team");
    } catch(e) { showToast(e.message,"err"); }
    setLoading(false);
  }

  async function acceptRequest(p) {
    try {
      await sbFetch(`players?id=eq.${p.id}`, { method:"PATCH", body:JSON.stringify({ team_code:player.team_code, pending_team_code:null, team_role:"player", team_name:player.team_name }), prefer:"return=minimal" });
      setRequests(r => r.filter(x => x.id!==p.id));
      setSquad(s => [...s, { ...p, team_role:"player" }]);
      showToast(p.name + " accepted ✓");
    } catch(e) { showToast(e.message,"err"); }
  }

  async function declineRequest(p) {
    try {
      await sbFetch(`players?id=eq.${p.id}`, { method:"PATCH", body:JSON.stringify({ pending_team_code:null }), prefer:"return=minimal" });
      setRequests(r => r.filter(x => x.id!==p.id));
      showToast(p.name + " declined");
    } catch(e) { showToast(e.message,"err"); }
  }

  async function sendMatchRequest() {
    if (!matchForm.opponentCode.trim()) { showToast("Enter opponent team code","err"); return; }
    try {
      const opp = await sbFetch(`players?team_code=eq.${matchForm.opponentCode.trim().toUpperCase()}&team_role=eq.captain&limit=1`);
      if (!opp?.[0]) { showToast("Opponent team not found","err"); return; }
      // In a real app this would create a match_requests table entry
      showToast("Match request sent! ✓");
      mf("opponentCode","");
    } catch(e) { showToast(e.message,"err"); }
  }

  const allSquad = squad;
  const teamName = player?.team_name || "My Team";
  const squadDiam = squadDiamonds([player, ...squad].map(p => ({ overall: ov(p?.stats) })));

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.white, paddingBottom:100 }}>
      <Hdr title={teamCode ? teamName : "Club"} sub={teamCode ? "Your Squad" : "Join or Create a Team"}
        right={teamCode && <div style={{ background:`#0A0A18`, border:`2px solid ${C.green}33`, borderRadius:10, padding:"8px 14px", textAlign:"center" }}><div style={{ fontSize:11, color:C.ghost, letterSpacing:1, fontWeight:700 }}>TEAM CODE</div><div style={{ fontSize:18, fontWeight:900, color:C.green, letterSpacing:4 }}>{teamCode}</div></div>}/>
      <Toast msg={toast?.m} type={toast?.t}/>

      {!teamCode ? (
        <div style={{ padding:"20px 20px", maxWidth:480, margin:"0 auto" }}>
          {/* Join */}
          <div style={{ background:"linear-gradient(135deg,#0A0A18,#111122)", border:`2px solid ${C.blue}33`, borderRadius:16, padding:20, marginBottom:16 }}>
            <div style={{ fontSize:20, fontWeight:900, color:C.blue, marginBottom:6 }}>🚪 Join a Team</div>
            <div style={{ fontSize:14, color:C.ghost, marginBottom:16, lineHeight:1.6 }}>Enter the team code your captain gave you. Your request will go to them for approval.</div>
            <div style={{ display:"flex", gap:10 }}>
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="Team code e.g. AB12XY" style={{ flex:1, background:"#111122", border:"2px solid #222244", borderRadius:10, padding:"13px 15px", color:C.white, fontSize:17, fontWeight:800, outline:"none", letterSpacing:4 }}/>
              <Btn onClick={joinTeam} v="blue" disabled={loading}>Join</Btn>
            </div>
            <div style={{ fontSize:13, color:C.ghost, marginTop:10 }}>Maximum 11 players per team. You can only be in one team at a time.</div>
          </div>

          {/* Create */}
          <div style={{ background:"linear-gradient(135deg,#0A0A18,#111122)", border:`2px solid ${C.gold}33`, borderRadius:16, padding:20 }}>
            <div style={{ fontSize:20, fontWeight:900, color:C.gold, marginBottom:6 }}>👑 Create a Team</div>
            <div style={{ fontSize:14, color:C.ghost, marginBottom:16, lineHeight:1.6 }}>You become the captain. Share your team code with your squad.</div>
            <Input label="Team Name" value={createName} onChange={setCreateName} placeholder="e.g. Street Kings FC"/>
            <Btn full onClick={createTeam} v="gold" disabled={loading}>{loading?"Creating...":"Create & Become Captain"}</Btn>
          </div>
        </div>
      ) : (
        <div>
          {/* Diamond rating */}
          <div style={{ background:`linear-gradient(135deg,${C.gold}18,${C.gold}08)`, borderBottom:`1px solid ${C.gold}33`, padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div><div style={{ fontSize:12, color:C.gold, letterSpacing:2, textTransform:"uppercase", fontWeight:700 }}>Squad Rating</div><div style={{ fontSize:24, fontWeight:900, color:C.gold }}>{diamondDisplay(squadDiam)}</div></div>
            <div style={{ textAlign:"right" }}><div style={{ fontSize:12, color:C.ghost }}>{squad.length+1}/11 players</div><div style={{ fontSize:13, color:C.ghost, marginTop:2 }}>Your diamonds: {player?.diamonds||0} 💎</div></div>
          </div>

          <div style={{ display:"flex", borderBottom:`1px solid #1A1A2E`, overflowX:"auto" }}>
            {["squad","matches","rate","motm"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex:1, minWidth:80, padding:"14px 8px", background:"none", border:"none", cursor:"pointer", color:tab===t?C.green:C.ghost, fontWeight:800, fontSize:13, borderBottom:`2px solid ${tab===t?C.green:"transparent"}`, textTransform:"uppercase", letterSpacing:0.8, whiteSpace:"nowrap", transition:"color 0.2s" }}>
                {t==="squad"?"Squad":t==="matches"?"Matches":t==="rate"?"Rate":"MOTM"}
              </button>
            ))}
          </div>

          <div style={{ padding:"20px 20px", maxWidth:480, margin:"0 auto" }}>
            {tab==="squad" && <>
              {/* You */}
              <div style={{ background:"linear-gradient(135deg,#0A0A18,#111122)", border:`2px solid ${C.green}44`, borderRadius:14, padding:16, marginBottom:12, display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:52, height:52, borderRadius:"50%", background:"#111122", border:`2px solid ${C.green}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, overflow:"hidden", flexShrink:0 }}>
                  {player?.photo_url ? <img src={player.photo_url} style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : "👤"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:17, fontWeight:800 }}>{player?.name} <span style={{ fontSize:14, color:C.green }}>(You)</span></div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:5 }}>
                    <Pill color={C.gold}>{player?.team_role==="captain"?"👑 Captain":player?.team_role==="vice"?"⚡ Vice":"Player"}</Pill>
                    <Pill color={C.blue}>{player?.position}</Pill>
                    {age && <Pill color={C.ghost}>{AGE_LABELS[ageGroup(age)]}</Pill>}
                  </div>
                </div>
                <div style={{ fontSize:28, fontWeight:900, color:sc(ov(player?.stats)) }}>{ov(player?.stats)||"—"}</div>
              </div>

              {/* Real squad members only */}
              {squad.length === 0 && (
                <div style={{ background:"#0A0A18", borderRadius:14, padding:24, textAlign:"center", color:C.ghost, fontSize:15, border:`1px solid #1A1A2E`, marginBottom:12, lineHeight:1.7 }}>
                  No teammates yet.<br/>Share your team code <strong style={{ color:C.green, letterSpacing:3 }}>{teamCode}</strong><br/>with your squad so they can join.
                </div>
              )}
              {squad.map((p, i) => {
                const pa = calcAge(p.date_of_birth);
                return (
                  <div key={p.id||i} style={{ background:"#0A0A18", borderRadius:14, padding:16, marginBottom:10, display:"flex", alignItems:"center", gap:14, border:`1px solid #1A1A2E` }}>
                    <div style={{ width:52, height:52, borderRadius:"50%", background:"#111122", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, border:`1px solid #222244`, overflow:"hidden", flexShrink:0 }}>
                      {p.photo_url ? <img src={p.photo_url} style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : "👤"}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:16, fontWeight:800 }}>{p.name}</div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:5 }}>
                        <Pill color={C.blue}>{p.position}</Pill>
                        {pa && <Pill color={C.ghost}>{AGE_LABELS[ageGroup(pa)]}</Pill>}
                        {p.team_role==="vice" && <Pill color={C.cyan}>⚡ Vice</Pill>}
                      </div>
                    </div>
                    <div style={{ fontSize:28, fontWeight:900, color:sc(ov(p.stats)) }}>{ov(p.stats)||"—"}</div>
                  </div>
                );
              })}

              {/* Join requests — captain only */}
              {isCapOrVice && requests.length > 0 && (
                <div style={{ background:`${C.red}0a`, border:`2px solid ${C.red}22`, borderRadius:14, padding:16, marginTop:14 }}>
                  <div style={{ fontSize:16, fontWeight:800, color:C.red, marginBottom:14 }}>📥 Join Requests ({requests.length})</div>
                  {requests.map((r,i) => (
                    <div key={r.id||i} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12, background:"#111122", borderRadius:12, padding:12 }}>
                      <div style={{ width:46, height:46, borderRadius:"50%", background:"#1A1A2E", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>👤</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:15, fontWeight:700 }}>{r.name}</div>
                        <div style={{ fontSize:13, color:C.ghost }}>{r.position}{calcAge(r.date_of_birth)?` · ${AGE_LABELS[ageGroup(calcAge(r.date_of_birth))]}`:""}</div>
                      </div>
                      <Btn sm onClick={() => acceptRequest(r)}>✓ Accept</Btn>
                      <Btn sm v="red" onClick={() => declineRequest(r)}>✕</Btn>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop:16, display:"flex", gap:10 }}>
                {isCapOrVice && <Btn v="ghost" full sm>Promote Vice-Captain</Btn>}
                <Btn v="red" full sm onClick={leaveTeam} disabled={loading}>Leave Team</Btn>
              </div>
            </>}

            {tab==="matches" && <>
              {!isCapOrVice && (
                <div style={{ background:`${C.gold}14`, border:`2px solid ${C.gold}33`, borderRadius:14, padding:18, marginBottom:18 }}>
                  <div style={{ fontSize:18, fontWeight:900, color:C.gold, marginBottom:6 }}>👑 Captain Only</div>
                  <p style={{ color:C.ghost, fontSize:14, margin:0, lineHeight:1.7 }}>Only captains and vice-captains can arrange matches and challenge other teams. Speak to your captain.</p>
                </div>
              )}

              {isCapOrVice && <>
                <div style={{ background:"#0A0A18", borderRadius:14, padding:18, marginBottom:16, border:`1px solid #1A1A2E` }}>
                  <div style={{ fontSize:18, fontWeight:900, marginBottom:16 }}>📅 Challenge a Team</div>
                  <Input label="Opponent Team Code" value={matchForm.opponentCode} onChange={v=>mf("opponentCode",v)} placeholder="Their 6-digit code"/>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <Input label="Date" type="date" value={matchForm.date} onChange={v=>mf("date",v)}/>
                    <Input label="Time" type="time" value={matchForm.time} onChange={v=>mf("time",v)}/>
                  </div>
                  <Input label="Venue / Location" value={matchForm.location} onChange={v=>mf("location",v)} placeholder="e.g. Hackney Astro, London"/>
                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:"block", fontSize:13, color:C.ghost, letterSpacing:1.5, marginBottom:10, textTransform:"uppercase", fontWeight:700 }}>Format</label>
                    <div style={{ display:"flex", gap:10 }}>{["5v5","7v7","11v11"].map(f=><button key={f} onClick={()=>mf("format",f)} style={{ flex:1, padding:13, borderRadius:10, border:`2px solid ${matchForm.format===f?C.green:"#222244"}`, background:matchForm.format===f?`${C.green}18`:"transparent", color:matchForm.format===f?C.green:C.ghost, cursor:"pointer", fontSize:15, fontWeight:800 }}>{f}</button>)}</div>
                  </div>

                  {/* Diamond stake */}
                  <div style={{ marginBottom:18 }}>
                    <label style={{ display:"block", fontSize:13, color:C.ghost, letterSpacing:1.5, marginBottom:10, textTransform:"uppercase", fontWeight:700 }}>Diamond Stake 💎</label>
                    <div style={{ background:`${C.gold}0a`, border:`1.5px solid ${C.gold}33`, borderRadius:12, padding:14, marginBottom:10 }}>
                      <div style={{ fontSize:13, color:C.gold, lineHeight:1.6 }}>Both teams bet the same amount of diamonds. Winner takes all. Loser forfeits theirs. Both captains must agree on the stake.</div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>mf("diamondStake",n)} style={{ flex:1, padding:13, borderRadius:10, border:`2px solid ${matchForm.diamondStake===n?C.gold:"#222244"}`, background:matchForm.diamondStake===n?`${C.gold}18`:"transparent", color:matchForm.diamondStake===n?C.gold:C.ghost, cursor:"pointer", fontSize:15, fontWeight:800 }}>{n}💎</button>)}</div>
                    <div style={{ fontSize:13, color:C.ghost, marginTop:8 }}>Your stake: {matchForm.diamondStake}💎 · Your balance: {player?.diamonds||0}💎</div>
                    {(player?.diamonds||0) < matchForm.diamondStake && <div style={{ fontSize:13, color:C.red, marginTop:4, fontWeight:700 }}>⚠️ Not enough diamonds for this stake</div>}
                  </div>

                  <Btn full v="green" onClick={sendMatchRequest} style={{ fontSize:17 }}>Send Match Challenge →</Btn>
                </div>

                {/* Incoming match requests */}
                <div style={{ background:"#0A0A18", borderRadius:14, padding:18, border:`1px solid #1A1A2E` }}>
                  <div style={{ fontSize:17, fontWeight:800, marginBottom:14 }}>Incoming Challenges</div>
                  {matchRequests.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"16px 0", color:C.ghost, fontSize:14 }}>No incoming match challenges yet</div>
                  ) : matchRequests.map((r,i) => (
                    <div key={i} style={{ background:"#111122", borderRadius:12, padding:14, marginBottom:10 }}>
                      <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>{r.from} want to play</div>
                      <div style={{ fontSize:13, color:C.ghost, marginBottom:10 }}>{r.format} · {r.date} · {r.location} · Stake: {r.stake}💎</div>
                      <div style={{ display:"flex", gap:10 }}><Btn full sm>✓ Accept</Btn><Btn full sm v="red">✕ Decline</Btn></div>
                    </div>
                  ))}
                </div>
              </>}

              {/* Past match */}
              <div style={{ background:"#0A0A18", borderRadius:14, padding:18, marginTop:16, border:`1px solid #1A1A2E` }}>
                <div style={{ fontSize:15, color:C.ghost, letterSpacing:2, textTransform:"uppercase", marginBottom:12, fontWeight:700 }}>Last Result</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:8, alignItems:"center", marginBottom:12 }}>
                  <div style={{ textAlign:"center" }}><div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>{teamName}</div><div style={{ fontSize:44, fontWeight:900, color:C.green, textShadow:`0 0 20px ${C.green}66` }}>3</div></div>
                  <div style={{ fontSize:16, fontWeight:900, color:C.ghost }}>—</div>
                  <div style={{ textAlign:"center" }}><div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Eastside XI</div><div style={{ fontSize:44, fontWeight:900, color:C.ghost }}>1</div></div>
                </div>
                <div style={{ display:"flex", justifyContent:"center", gap:12, marginBottom:12 }}>
                  <Pill color={C.green}>{teamName} won</Pill>
                  <Pill color={C.gold}>+2 💎 earned</Pill>
                </div>
              </div>
            </>}

            {tab==="rate" && <>
              <div style={{ background:`${C.gold}14`, border:`2px solid ${C.gold}33`, borderRadius:14, padding:16, marginBottom:18 }}>
                <div style={{ fontSize:17, fontWeight:900, color:C.gold, marginBottom:6 }}>⭐ Post-Game Ratings</div>
                <p style={{ color:C.ghost, fontSize:14, margin:0, lineHeight:1.6 }}>Rate teammates on Effort, Quality and Communication out of 10. Outlier votes excluded automatically.</p>
              </div>
              {ratingTarget ? (
                <div>
                  <div style={{ background:"#0A0A18", borderRadius:14, padding:16, marginBottom:16, display:"flex", gap:14, alignItems:"center", border:`1px solid #1A1A2E` }}>
                    <div style={{ width:52, height:52, borderRadius:"50%", background:"#111122", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>👤</div>
                    <div><div style={{ fontSize:18, fontWeight:800 }}>{ratingTarget.name}</div><div style={{ fontSize:14, color:C.ghost }}>{ratingTarget.position}</div></div>
                  </div>
                  {[["Effort","💪","How hard did they work?"],["Quality","⭐","How well did they play?"],["Communication","📢","Did they organise and communicate?"]].map(([label,icon,desc]) => (
                    <div key={label} style={{ background:"#0A0A18", borderRadius:12, padding:16, marginBottom:12, border:`1px solid #1A1A2E` }}>
                      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12 }}>
                        <span style={{ fontSize:22 }}>{icon}</span>
                        <div><div style={{ fontSize:16, fontWeight:700 }}>{label}</div><div style={{ fontSize:13, color:C.ghost }}>{desc}</div></div>
                      </div>
                      <div style={{ display:"flex", gap:5 }}>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <button key={n} onClick={() => setRatings(r => ({...r,[label.toLowerCase()]:n}))} style={{ flex:1, padding:"10px 0", borderRadius:8, border:`2px solid ${ratings[label.toLowerCase()]>=n?C.gold:"#222244"}`, background:ratings[label.toLowerCase()]>=n?`${C.gold}18`:"#111122", color:ratings[label.toLowerCase()]>=n?C.gold:C.ghost, cursor:"pointer", fontSize:12, fontWeight:800, transition:"all 0.1s" }}>{n}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div style={{ display:"flex", gap:12, marginTop:8 }}>
                    <Btn v="ghost" full onClick={() => setRatingTarget(null)}>← Back</Btn>
                    <Btn v="gold" full onClick={() => { showToast(`${ratingTarget.name} rated ✓`,"ok"); setRatingTarget(null); setRatings({effort:0,quality:0,communication:0}); }}>Submit Rating</Btn>
                  </div>
                </div>
              ) : (
                squad.length === 0
                  ? <div style={{ textAlign:"center", padding:"24px 0", color:C.ghost, fontSize:15 }}>No teammates yet. Rate buttons will appear here once your squad joins.</div>
                  : squad.map((p,i) => (
                    <div key={p.id||i} style={{ background:"#0A0A18", borderRadius:14, padding:16, marginBottom:10, display:"flex", alignItems:"center", gap:14, border:`1px solid #1A1A2E` }}>
                      <div style={{ width:46, height:46, borderRadius:"50%", background:"#111122", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>👤</div>
                      <div style={{ flex:1 }}><div style={{ fontSize:16, fontWeight:700 }}>{p.name}</div><div style={{ fontSize:13, color:C.ghost }}>{p.position}</div></div>
                      <Btn sm v="gold" onClick={() => setRatingTarget(p)}>Rate</Btn>
                    </div>
                  ))
              )}
            </>}

            {tab==="motm" && <>
              <div style={{ background:`${C.gold}14`, border:`2px solid ${C.gold}33`, borderRadius:14, padding:16, marginBottom:18 }}>
                <div style={{ fontSize:17, fontWeight:900, color:C.gold, marginBottom:6 }}>🏅 MOTM Voting</div>
                <p style={{ color:C.ghost, fontSize:14, margin:0, lineHeight:1.6 }}>All players who played vote. Winner gets +2 to their lowest stat. Outlier votes excluded automatically.</p>
              </div>
              {squad.length === 0
                ? <div style={{ textAlign:"center", padding:"24px 0", color:C.ghost, fontSize:15 }}>No teammates yet — vote buttons appear once your squad joins.</div>
                : [...squad, { id:"you", name:player?.name||"You", position:player?.position||"ST", isYou:true }].map((p,i) => (
                  <div key={p.id||i} style={{ background:votes[i]?`${C.green}0a`:"#0A0A18", border:`2px solid ${votes[i]?C.green+"44":"#1A1A2E"}`, borderRadius:14, padding:16, marginBottom:10, display:"flex", alignItems:"center", gap:14, transition:"all 0.2s" }}>
                    <div style={{ width:46, height:46, borderRadius:"50%", background:votes[i]?`${C.green}22`:"#111122", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, border:`2px solid ${votes[i]?C.green+"44":"#222244"}` }}>👤</div>
                    <div style={{ flex:1 }}><div style={{ fontSize:16, fontWeight:800 }}>{p.name}{p.isYou?" (You)":""}</div><div style={{ fontSize:13, color:C.ghost }}>{p.position}</div></div>
                    <button onClick={() => setVotes({[i]:true})} style={{ background:votes[i]?`${C.green}22`:"#111122", border:`2px solid ${votes[i]?C.green:"#333355"}`, color:votes[i]?C.green:C.ghost, borderRadius:10, padding:"11px 18px", cursor:"pointer", fontSize:14, fontWeight:800, transition:"all 0.2s", boxShadow:votes[i]?`0 0 14px ${C.green}44`:"none" }}>
                      {votes[i]?"✓ Voted":"Vote"}
                    </button>
                  </div>
                ))
              }
            </>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── COMPETE ───────────────────────────────────────────────────
function CompeteTab({ player }) {
  const [view, setView] = useState("menu");
  const [filter, setFilter] = useState("all");
  const [lbData, setLbData] = useState(null);
  const age = calcAge(player?.date_of_birth);

  useEffect(() => {
    if (view === "leaderboard") {
      sbFetch("players?select=name,position,stats,badges,motm_votes,date_of_birth,diamonds&order=motm_votes.desc&limit=30")
        .then(r => { if (r?.length > 0) setLbData(r); })
        .catch(() => {});
    }
  }, [view]);

  const fallback = [
    { name:"Jaden S.", position:"ST", stats:{pace:84,shooting:87,passing:74,dribbling:82,defending:38,physical:76,jumping:72,agility:85}, badges:["poacher","explosive"], motm_votes:8, date_of_birth:"1999-03-15", diamonds:12 },
    { name:"Marcus T.", position:"CM", stats:{pace:72,shooting:65,passing:80,dribbling:76,defending:60,physical:74,jumping:66,agility:78}, badges:["tested"], motm_votes:5, date_of_birth:"2001-07-22", diamonds:7 },
    { name:player?.name||"You", position:player?.position||"ST", stats:player?.stats||{}, badges:player?.badges||[], motm_votes:player?.motm_votes||0, date_of_birth:player?.date_of_birth, diamonds:player?.diamonds||0, you:true },
  ];
  let rows = ((lbData&&lbData.length>0)?lbData:fallback).map(p => ({ ...p, overall:ov(p.stats), t:tier(ov(p.stats),p.badges||[]), age:calcAge(p.date_of_birth), group:ageGroup(calcAge(p.date_of_birth)) })).sort((a,b) => b.overall-a.overall);
  if (filter !== "all") rows = rows.filter(r => r.group === filter);

  const BENCH = { pace:{street:45,semi:62,mbappe:97,neymar:91}, shooting:{street:38,semi:55,mbappe:89,neymar:87}, passing:{street:42,semi:60,mbappe:80,neymar:86}, dribbling:{street:40,semi:58,mbappe:92,neymar:95}, defending:{street:35,semi:52,mbappe:36,neymar:27}, physical:{street:44,semi:61,mbappe:77,neymar:68}, jumping:{street:40,semi:58,mbappe:78,neymar:61}, agility:{street:43,semi:60,mbappe:91,neymar:93} };

  const items = [
    { icon:"🏆",label:"League",desc:"Table, fixtures & stats",col:C.purple,v:"league" },
    { icon:"📈",label:"Leaderboard",desc:"Global rankings",col:C.green,v:"leaderboard" },
    { icon:"📊",label:"Compare",desc:"vs Mbappé & elite",col:C.blue,v:"compare" },
    { icon:"🏅",label:"Badges",desc:"Your achievements",col:C.gold,v:"badges" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.white, paddingBottom:100 }}>
      <Hdr title="Compete" sub="Leagues & Rankings" right={view!=="menu"?<button onClick={()=>setView("menu")} style={{ background:"#111122", border:"2px solid #222244", color:C.white, cursor:"pointer", fontSize:14, padding:"10px 16px", borderRadius:10, fontWeight:700 }}>← Back</button>:null}/>
      <div style={{ padding:"20px 20px", maxWidth:480, margin:"0 auto" }}>

        {view==="menu" && <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {items.map(it => (
            <button key={it.v} onClick={() => setView(it.v)} style={{ background:`linear-gradient(135deg,${it.col}18,${it.col}08)`, border:`2px solid ${it.col}44`, borderRadius:16, padding:22, textAlign:"left", cursor:"pointer", color:C.white, transition:"all 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.transform="translateY(-3px)"}
              onMouseLeave={e => e.currentTarget.style.transform="translateY(0)"}>
              <div style={{ fontSize:44, marginBottom:14 }}>{it.icon}</div>
              <div style={{ fontSize:18, fontWeight:800, color:it.col, marginBottom:5 }}>{it.label}</div>
              <div style={{ fontSize:13, color:C.ghost, lineHeight:1.5 }}>{it.desc}</div>
            </button>
          ))}
        </div>}

        {view==="leaderboard" && <>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, color:C.ghost, letterSpacing:1.5, textTransform:"uppercase", fontWeight:700, marginBottom:10 }}>Filter by Age Group</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>{[["all","All"],["u12","U12"],["u16","13–16"],["u20","17–20"],["adult","21–29"],["vet","30+"]].map(([k,l]) => (
              <button key={k} onClick={() => setFilter(k)} style={{ background:filter===k?`${C.green}22`:"#0A0A18", border:`2px solid ${filter===k?C.green+"66":"#1A1A2E"}`, borderRadius:8, padding:"8px 14px", fontSize:13, color:filter===k?C.green:C.ghost, cursor:"pointer", fontWeight:700 }}>{l}</button>
            ))}</div>
          </div>
          {rows.map((p,i) => { const ts = C.tiers[p.t]; return (
            <div key={i} style={{ background:p.you?`${C.green}0a`:"#0A0A18", border:`2px solid ${p.you?C.green+"44":"#1A1A2E"}`, borderRadius:14, padding:16, marginBottom:10, display:"flex", alignItems:"center", gap:14, boxShadow:p.you?`0 0 20px ${C.green}22`:"none" }}>
              <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0, background:i<3?[C.gold,"#888","#8B4513"][i]:"#1A1A2E", display:"flex", alignItems:"center", justifyContent:"center", fontSize:i<3?18:13, fontWeight:900, color:i<3?"#000":C.ghost }}>{i<3?["🥇","🥈","🥉"][i]:i+1}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:800 }}>{p.name}{p.you?" (You)":""}</div>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginTop:4 }}>
                  <span style={{ fontSize:13, color:C.ghost }}>{p.position}</span>
                  {p.age && <span style={{ background:"#1A1A2E", borderRadius:6, padding:"2px 8px", fontSize:11, color:C.ghost }}>{AGE_LABELS[p.group]}</span>}
                  {(p.diamonds||0)>0 && <span style={{ fontSize:12, color:C.gold }}>💎 {p.diamonds}</span>}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:28, fontWeight:900, color:ts.t, textShadow:`0 0 12px ${ts.b}88` }}>{p.overall||"—"}</div>
                <div style={{ fontSize:11, color:ts.t, letterSpacing:1, textTransform:"uppercase", fontWeight:700 }}>{p.t}</div>
              </div>
            </div>
          );})}
        </>}

        {view==="compare" && <>
          {age && <div style={{ background:`${C.blue}14`, border:`1.5px solid ${C.blue}33`, borderRadius:12, padding:14, marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}><div style={{ fontSize:14, color:C.ghost }}>Calibrated for <strong style={{ color:C.white }}>{AGE_LABELS[ageGroup(age)]}</strong></div><Pill color={C.blue}>{AGE_LABELS[ageGroup(age)]}</Pill></div>}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:18 }}>{[{l:"You",c:C.green},{l:"Street",c:C.ghost},{l:"Semi-Pro",c:C.blue},{l:"Mbappé",c:C.gold},{l:"Neymar",c:C.red}].map(x=><div key={x.l} style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:12, height:12, borderRadius:3, background:x.c }}/><span style={{ fontSize:13, color:C.ghost }}>{x.l}</span></div>)}</div>
          {Object.entries(BENCH).map(([k,b]) => { const you=player?.stats?.[k]||0; const m=STATS_META[k]; return (
            <div key={k} style={{ background:"#0A0A18", borderRadius:14, padding:16, marginBottom:12, border:`1px solid ${m.color}18` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}><span style={{ fontSize:22 }}>{m.icon}</span><span style={{ fontSize:16, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase", color:m.color }}>{m.l}</span></div>
                <span style={{ fontSize:26, fontWeight:900, color:you?sc(you):C.ghost }}>{you||"?"}</span>
              </div>
              {[{l:"You",v:you,c:C.green},{l:"Street avg",v:b.street,c:C.ghost},{l:"Semi-Pro",v:b.semi,c:C.blue},{l:"Mbappé",v:b.mbappe,c:C.gold},{l:"Neymar",v:b.neymar,c:C.red}].map(row=><div key={row.l} style={{ marginBottom:6 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}><span style={{ fontSize:12, color:C.ghost }}>{row.l}</span><span style={{ fontSize:13, fontWeight:700, color:row.c }}>{row.v||"—"}</span></div>
                <div style={{ height:5, background:"#1A1A2E", borderRadius:2, overflow:"hidden" }}><div style={{ height:"100%", width:`${(row.v/99)*100}%`, background:row.c, borderRadius:2, transition:"width 1s ease" }}/></div>
              </div>)}
            </div>
          );})}
        </>}

        {view==="badges" && <>
          <div style={{ background:`${C.purple}14`, border:`2px solid ${C.purple}33`, borderRadius:14, padding:16, marginBottom:18 }}>
            <div style={{ fontSize:17, fontWeight:900, color:C.purple, marginBottom:5 }}>✦ Rare Card</div>
            <p style={{ color:C.ghost, fontSize:14, margin:0, lineHeight:1.6 }}>Earn any 3 badges and your card upgrades to Rare holographic.</p>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <span style={{ fontSize:15, fontWeight:800 }}>{(player?.badges||[]).length}/{BADGES.length} earned</span>
            {(player?.badges||[]).length>=3 && <Pill color={C.purple}>✦ RARE ACTIVE</Pill>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {BADGES.map(b => { const e=(player?.badges||[]).includes(b.id); return (
              <div key={b.id} style={{ background:e?(b.rare?`${C.purple}18`:`${C.green}12`):"#0A0A18", border:`2px solid ${e?(b.rare?C.purple:C.green+"55"):"#1A1A2E"}`, borderRadius:14, padding:16, opacity:e?1:0.35, filter:e&&b.rare?`drop-shadow(0 0 14px ${C.purple}66)`:"none", boxShadow:e?(b.rare?`0 4px 20px ${C.purple}33`:`0 4px 14px ${C.green}22`):"none" }}>
                <div style={{ fontSize:36, marginBottom:8 }}>{b.icon}</div>
                <div style={{ fontSize:15, fontWeight:800, color:e?(b.rare?C.purple:C.green):C.ghost, marginBottom:4 }}>{b.name}</div>
                {e && <div style={{ fontSize:12, color:e?(b.rare?C.purple:C.green):C.ghost, fontWeight:700, letterSpacing:0.5 }}>✓ EARNED</div>}
              </div>
            );})}
          </div>
        </>}

        {view==="league" && <>
          <div style={{ background:`${C.purple}14`, border:`2px solid ${C.purple}33`, borderRadius:12, padding:"14px 18px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:17, fontWeight:900, color:C.purple }}>East London League</div>
            <Pill color={C.green}>ACTIVE</Pill>
          </div>
          <div style={{ background:"#0A0A18", borderRadius:14, overflow:"hidden", border:`1px solid #1A1A2E` }}>
            <div style={{ display:"grid", gridTemplateColumns:"auto 1fr repeat(5,36px)", padding:"12px 16px", borderBottom:`1px solid #1A1A2E` }}>{["#","Team","P","W","L","GD","PTS"].map(h=><div key={h} style={{ fontSize:12, color:C.ghost, letterSpacing:1.5, fontWeight:700, textAlign:"center" }}>{h}</div>)}</div>
            {[{team:"Street Kings FC",p:6,w:4,d:1,l:1,gd:8,pts:13,you:true},{team:"Brick FC",p:6,w:4,d:0,l:2,gd:5,pts:12},{team:"Eastside XI",p:6,w:2,d:2,l:2,gd:-1,pts:8},{team:"Northside",p:6,w:1,d:1,l:4,gd:-12,pts:4}].map((row,i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"auto 1fr repeat(5,36px)", padding:"14px 16px", borderBottom:`1px solid #1A1A2E`, background:row.you?`${C.green}08`:"transparent", alignItems:"center" }}>
                <div style={{ width:26, fontSize:15, fontWeight:900, color:i===0?C.gold:i===1?"#888":C.ghost, marginRight:8 }}>{i+1}</div>
                <div style={{ fontSize:15, fontWeight:800, color:row.you?C.green:C.white }}>{row.team}{row.you?" ★":""}</div>
                {[row.p,row.w,row.l,row.gd,row.pts].map((v,j) => <div key={j} style={{ textAlign:"center", fontSize:14, fontWeight:j===4?900:400, color:j===4?C.white:C.ghost }}>{v}</div>)}
              </div>
            ))}
          </div>
          <Btn full v="ghost" style={{ marginTop:14, fontSize:16 }}>+ Create New League</Btn>
        </>}
      </div>
    </div>
  );
}

// ── PROFILE ───────────────────────────────────────────────────
function ProfileTab({ player, onSignOut, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ bio:player?.bio||"", nationality:player?.nationality||"", position:player?.position||"ST", foot:player?.foot||"Right" });
  const [toast, setToast] = useState("");
  const showToast = (m,t="ok") => { setToast({m,t}); setTimeout(()=>setToast(""),2500); };
  const age = calcAge(player?.date_of_birth);
  const overall = ov(player?.stats); const t = tier(overall, player?.badges||[]); const ts = C.tiers[t];

  async function save() {
    try { await sbFetch(`players?id=eq.${player?.id}`, { method:"PATCH", body:JSON.stringify(form), prefer:"return=minimal" }); onUpdate({...player,...form}); showToast("Profile updated ✓"); setEditing(false); }
    catch(e) { showToast(e.message,"err"); }
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.white, paddingBottom:100 }}>
      <Hdr title="Profile" sub="Your Player Card"
        right={<button onClick={() => setEditing(!editing)} style={{ background:editing?`${C.red}18`:`${C.green}18`, border:`2px solid ${editing?C.red:C.green}44`, color:editing?C.red:C.green, borderRadius:10, padding:"10px 16px", cursor:"pointer", fontSize:14, fontWeight:800 }}>{editing?"Cancel":"Edit"}</button>}/>
      <Toast msg={toast?.m} type={toast?.t}/>
      <div style={{ padding:"20px 20px", maxWidth:480, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:28, position:"relative" }}>
          <div style={{ position:"absolute", width:220, height:220, borderRadius:"50%", background:`radial-gradient(circle,${ts.g},transparent 70%)`, top:"50%", left:"50%", transform:"translate(-50%,-50%)", pointerEvents:"none" }}/>
          <Card player={{...player,...(editing?form:{})}} size="full"/>
        </div>

        {!editing ? (
          <div style={{ background:"#0A0A18", borderRadius:14, padding:18, marginBottom:18, border:`1px solid #1A1A2E` }}>
            {[["Name",player?.name],["Email",player?.email],["Nationality",player?.nationality],["Position",player?.position],["Preferred Foot",player?.foot],["Date of Birth",player?.date_of_birth],["Age",age?`${age} years (${AGE_LABELS[ageGroup(age)]})`:null],["Challenge Code",player?.challenge_code],["Team Code",player?.team_code],["Team Role",player?.team_role],["Diamonds",player?.diamonds!=null?`${player.diamonds} 💎`:null]].filter(([,v])=>v).map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingBottom:12, marginBottom:12, borderBottom:`1px solid #1A1A2E` }}>
                <span style={{ fontSize:14, color:C.ghost }}>{k}</span>
                <span style={{ fontSize:15, fontWeight:700 }}>{v}</span>
              </div>
            ))}
            {player?.bio && <div style={{ paddingTop:4 }}><div style={{ fontSize:13, color:C.ghost, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8, fontWeight:700 }}>Bio</div><div style={{ fontSize:15, color:C.offwhite, lineHeight:1.7, fontStyle:"italic" }}>"{player.bio}"</div></div>}
          </div>
        ) : (
          <div style={{ background:"#0A0A18", borderRadius:14, padding:18, marginBottom:18, border:`2px solid ${C.green}33` }}>
            <Textarea label="Bio" value={form.bio} onChange={v => setForm(p=>({...p,bio:v}))} placeholder="Your style, your strengths..."/>
            <Select label="Nationality" value={form.nationality} onChange={v => setForm(p=>({...p,nationality:v}))} options={COUNTRIES}/>
            <div style={{ marginBottom:16 }}><label style={{ display:"block", fontSize:13, color:C.ghost, letterSpacing:1.5, marginBottom:8, textTransform:"uppercase", fontWeight:700 }}>Position</label><select value={form.position} onChange={e => setForm(p=>({...p,position:e.target.value}))} style={{ width:"100%", background:"#111122", border:"2px solid #222244", borderRadius:10, padding:"14px 16px", color:C.white, fontSize:16, outline:"none" }}>{POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
            <div style={{ marginBottom:18 }}><label style={{ display:"block", fontSize:13, color:C.ghost, letterSpacing:1.5, marginBottom:10, textTransform:"uppercase", fontWeight:700 }}>Preferred Foot</label><div style={{ display:"flex", gap:10 }}>{["Left","Right","Both"].map(f=><button key={f} onClick={()=>setForm(p=>({...p,foot:f}))} style={{ flex:1, padding:14, borderRadius:10, border:`2px solid ${form.foot===f?C.green:"#222244"}`, background:form.foot===f?`${C.green}18`:"transparent", color:form.foot===f?C.green:C.ghost, cursor:"pointer", fontSize:15, fontWeight:800 }}>{f}</button>)}</div></div>
            <Btn full v="green" onClick={save} style={{ fontSize:17 }}>Save Changes</Btn>
          </div>
        )}

        <div style={{ background:"#0A0A18", borderRadius:14, padding:18, marginBottom:18, border:`1px solid #1A1A2E` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
            <div style={{ fontSize:17, fontWeight:900 }}>Full Stats</div>
            {age && <Pill color={C.blue}>{AGE_LABELS[ageGroup(age)]}</Pill>}
          </div>
          {Object.entries(STATS_META).map(([k,m]) => <StatBar key={k} label={m.l} value={player?.stats?.[k]} color={m.color}/>)}
        </div>

        <div style={{ display:"flex", gap:12, marginBottom:22 }}>
          {[{val:player?.games_played||0,label:"Games",col:C.green},{val:player?.motm_votes||0,label:"MOTM",col:C.gold},{val:player?.diamonds||0,label:"Diamonds",col:C.gold}].map(s => (
            <div key={s.label} style={{ flex:1, background:`linear-gradient(135deg,${s.col}18,${s.col}08)`, borderRadius:14, padding:16, textAlign:"center", border:`2px solid ${s.col}33` }}>
              <div style={{ fontSize:30, fontWeight:900, color:s.col, textShadow:`0 0 14px ${s.col}66` }}>{s.val}</div>
              <div style={{ fontSize:12, color:C.ghost, letterSpacing:1, textTransform:"uppercase", marginTop:4, fontWeight:700 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <Btn full v="red" onClick={onSignOut} style={{ fontSize:17 }}>Sign Out</Btn>
      </div>
    </div>
  );
}

// ── BOTTOM NAV ────────────────────────────────────────────────
function BottomNav({ active, onTab, player }) {
  const overall = ov(player?.stats); const t = tier(overall, player?.badges||[]); const ts = C.tiers[t];
  const tabs = [
    { id:"home",    emoji:"🏠", label:"Home",    ac:ts.b },
    { id:"develop", emoji:"⚡", label:"Develop",  ac:C.green },
    { id:"club",    emoji:"👥", label:"Club",     ac:C.blue },
    { id:"compete", emoji:"🏆", label:"Compete",  ac:C.purple },
    { id:"profile", emoji:"👤", label:"Profile",  ac:C.gold },
  ];
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"linear-gradient(180deg,#080818EE,#050508)", backdropFilter:"blur(16px)", borderTop:`2px solid #1A1A2E`, display:"flex", zIndex:100, paddingBottom:"env(safe-area-inset-bottom,0)" }}>
      {tabs.map(tab => {
        const isA = active === tab.id;
        return (
          <button key={tab.id} onClick={() => onTab(tab.id)} style={{ flex:1, padding:"12px 4px 10px", background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, position:"relative" }}>
            {isA && <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:3, background:tab.ac, borderRadius:"0 0 3px 3px", boxShadow:`0 0 10px ${tab.ac}` }}/>}
            <div style={{ fontSize:24, filter:isA?`drop-shadow(0 0 10px ${tab.ac})`:"none", transform:isA?"scale(1.15)":"scale(1)", transition:"all 0.2s" }}>{tab.emoji}</div>
            <div style={{ fontSize:10, fontWeight:isA?900:600, color:isA?tab.ac:C.ghost, letterSpacing:0.5, transition:"color 0.2s" }}>{tab.label}</div>
          </button>
        );
      })}
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [tab, setTab] = useState("home");
  const [player, setPlayer] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [loadingDone, setLoadingDone] = useState(false);

  useEffect(() => {
    sbGetUser().then(async user => {
      if (user && user.id) {
        try {
          const rows = await sbFetch(`players?id=eq.${user.id}&limit=1`);
          if (rows?.[0]) { setPlayer(rows[0]); setScreen("app"); }
        } catch (_) {}
      }
      setAuthReady(true);
    }).catch(() => setAuthReady(true));
  }, []);

  useEffect(() => { if (authReady && loadingDone) setShowLoading(false); }, [authReady, loadingDone]);

  async function handleStat(key, value) {
    if (!key || value == null) return;
    const ns = { ...(player?.stats||{}), [key]: Math.min(99, Math.max(1, Math.round(value))) };
    setPlayer(p => ({ ...p, stats:ns }));
    if (player?.id) await sbFetch(`players?id=eq.${player.id}`, { method:"PATCH", body:JSON.stringify({stats:ns}), prefer:"return=minimal" }).catch(() => {});
  }

  function handleUpdate(updated) { if (updated) setPlayer(updated); }

  async function signOut() { await sbSignOut(); setPlayer(null); setScreen("landing"); setTab("home"); }

  if (showLoading) return <LoadingScreen onDone={() => setLoadingDone(true)}/>;

  if (screen === "app" && !player) {
    setTimeout(() => setScreen("landing"), 100);
    return <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{ fontSize:14, color:C.ghost, letterSpacing:3 }}>Loading...</div></div>;
  }

  return (
    <div style={{ fontFamily: "Inter,system-ui,sans-serif", background: C.bg, minHeight: "100vh", color: C.white }}>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        input::placeholder { color:#333355; }
        select option { background:#111122; }
        textarea::placeholder { color:#333355; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#1A1A2E; border-radius:2px; }
        @keyframes cardfloat { 0%,100%{transform:perspective(700px) translateY(0)} 50%{transform:perspective(700px) translateY(-10px)} }
        @keyframes logopulse { 0%,100%{text-shadow:0 0 40px ${C.green}44} 50%{text-shadow:0 0 70px ${C.green}88} }
        @keyframes slideup { from{transform:translateX(-50%) translateY(20px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
      {screen === "landing" && <Landing onNav={setScreen}/>}
      {screen === "signup"  && <Signup onNav={s => { if(s==="app")setScreen("app"); else setScreen(s); }} onLogin={setPlayer}/>}
      {screen === "login"   && <Login  onNav={s => { if(s==="app")setScreen("app"); else setScreen(s); }} onLogin={setPlayer}/>}
      {screen === "app" && player && <>
        {tab === "home"    && <HomeTab    player={player} onUpdate={handleUpdate}/>}
        {tab === "develop" && <DevelopTab player={player} onStat={handleStat}/>}
        {tab === "club"    && <ClubTab    player={player} onUpdate={handleUpdate}/>}
        {tab === "compete" && <CompeteTab player={player}/>}
        {tab === "profile" && <ProfileTab player={player} onSignOut={signOut} onUpdate={handleUpdate}/>}
        <BottomNav active={tab} onTab={setTab} player={player}/>
      </>}
    </div>
  );
}
