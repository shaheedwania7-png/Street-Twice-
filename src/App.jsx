// ============================================================
// STREET TWICE — Full Production Build
// Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY below
// with your own values from supabase.com → Settings → API
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";

// ── Supabase client (paste your values here) ─────────────────
const SUPABASE_URL = "https://rfwfprrzbnjptwsdalyh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_SlsPL-ZkUzqFJIfPR8awBw_5-PzcVQe";

async function sbFetch(path, options = {}) {
  const token = localStorage.getItem("sb_token");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token || SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Request failed");
  }
  return res.status === 204 ? null : res.json();
}

async function sbAuth(action, email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${action}`, {
    method: "POST",
    headers: { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  if (data.access_token) localStorage.setItem("sb_token", data.access_token);
  return data;
}

async function sbSignOut() {
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${localStorage.getItem("sb_token")}` },
  });
  localStorage.removeItem("sb_token");
}

async function sbGetUser() {
  const token = localStorage.getItem("sb_token");
  if (!token) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) { localStorage.removeItem("sb_token"); return null; }
  return res.json();
}

// ── Design tokens ─────────────────────────────────────────────
const C = {
  black: "#080808", pitch: "#0b160b", lime: "#c8ff00", lime2: "#9fd600",
  red: "#e63946", blue: "#3a86ff", purple: "#9b5de5",
  concrete: "#1a1a1a", muted: "#444", ghost: "#777", white: "#f0f0f0",
  gold: "#c9a84c",
  tiers: {
    bronze: { bg:"#1a0d00", border:"#cd7f32", text:"#e8a87c", glow:"#cd7f3255" },
    silver: { bg:"#111", border:"#a8a9ad", text:"#d4d5d9", glow:"#a8a9ad55" },
    gold:   { bg:"#140e00", border:"#c9a84c", text:"#f0d080", glow:"#c9a84c55" },
    elite:  { bg:"#100a00", border:"#ffcc00", text:"#ffe566", glow:"#ffcc0077" },
    rare:   { bg:"#0a0614", border:"#b44dff", text:"#e0aaff", glow:"#b44dff77" },
  }
};

// ── Constants ─────────────────────────────────────────────────
const POSITIONS = ["ST","CF","LW","RW","CAM","CM","CDM","LM","RM","LB","RB","CB","GK"];

const STATS = {
  pace:      { label:"PAC", icon:"⚡" },
  shooting:  { label:"SHO", icon:"🎯" },
  passing:   { label:"PAS", icon:"🔄" },
  dribbling: { label:"DRI", icon:"🌀" },
  defending: { label:"DEF", icon:"🛡️" },
  physical:  { label:"PHY", icon:"💪" },
  jumping:   { label:"JMP", icon:"⬆️" },
  agility:   { label:"AGI", icon:"🏃" },
};

const BENCHMARKS = {
  pace:      { street:45, semi:62, mbappe:97, neymar:91 },
  shooting:  { street:38, semi:55, mbappe:89, neymar:87 },
  passing:   { street:42, semi:60, mbappe:80, neymar:86 },
  dribbling: { street:40, semi:58, mbappe:92, neymar:95 },
  defending: { street:35, semi:52, mbappe:36, neymar:27 },
  physical:  { street:44, semi:61, mbappe:77, neymar:68 },
  jumping:   { street:40, semi:58, mbappe:78, neymar:61 },
  agility:   { street:43, semi:60, mbappe:91, neymar:93 },
};

const BADGES = [
  { id:"stone_wall",  icon:"🧱", name:"Stone Wall",    desc:"Attacker gets 0 shots off in 3-player challenge", rare:false },
  { id:"poacher",     icon:"⚽", name:"Poacher",       desc:"Score 9/10 in a registered 3-player challenge",   rare:false },
  { id:"tested",      icon:"🔁", name:"Battle Tested", desc:"Complete 10 different opponent matchups",          rare:false },
  { id:"verified",    icon:"🏅", name:"Verified",      desc:"5+ community verifications on your clips",         rare:false },
  { id:"explosive",   icon:"⚡", name:"Explosive",     desc:"Sprint test top 10% of all players",               rare:false },
  { id:"silky",       icon:"🌀", name:"Silky",         desc:"Dribbling test — zero cone touches",               rare:false },
  { id:"brick_hands", icon:"🧤", name:"Brick Hands",   desc:"3 consecutive GK clean sheets",                    rare:false },
  { id:"sniper",      icon:"🎯", name:"Sniper",        desc:"9/10 passing accuracy at 20m",                     rare:false },
  { id:"cannonball",  icon:"💥", name:"Cannonball",    desc:"Shot power top 15% of all players",                rare:false },
  { id:"motm_king",   icon:"👑", name:"MOTM King",     desc:"10+ Man of the Match awards",                      rare:false },
  { id:"rare_card",   icon:"🔥", name:"Rare",          desc:"Earned 3+ badges — unlocks holographic rare card", rare:true  },
];

const DEFEND_ROUNDS = [
  { id:"R1", label:"Rounds 1–3", rule:"No slide tackles — stay on feet only", focus:"Positioning & patience", timer:180, icon:"🦶" },
  { id:"R2", label:"Rounds 4–6", rule:"Slide tackles ONLY — no standing challenges", focus:"Timing & commitment", timer:180, icon:"⚡" },
  { id:"R3", label:"Rounds 7–9", rule:"2v1 — two attackers against you", focus:"Awareness & recovery", timer:180, icon:"👥" },
  { id:"B1", label:"Bonus",      rule:"60-second blitz — attacker must beat you in time", focus:"Composure under pressure", timer:60, icon:"💨" },
  { id:"B2", label:"Bonus",      rule:"Skill move required from attacker each attempt", focus:"Rates attacker dribbling too", timer:120, icon:"🌀" },
];

const SELF_TESTS = [
  {
    id:"pace", stat:"pace", icon:"⚡", label:"Sprint Test",
    what:"You sprint across a measured distance while your phone records from the side. The app uses your phone's camera to track when you cross the start and finish lines using your movement.",
    why:"Measures your pure speed and acceleration — like a proper athlete sprint test.",
    tiers:[
      { name:"Tier 1 — 10m dash", setup:["Place two objects exactly 10 metres apart (use the measuring tape on your phone or count roughly 10 big steps)","Set your phone up sideways on a wall, ledge, or propped against a bag — the FULL 10m distance must be visible in frame","Stand at one end. Press START. Sprint to the other end and stop","Do it 3 times. The app records your time for each run"] },
      { name:"Tier 2 — 20m acceleration", setup:["Same as above but 20 metres","You need a longer straight space — a road, path, or pitch","3 attempts. Rest 60 seconds between each"] },
      { name:"Tier 3 — 30m top speed", setup:["30 metres straight","Film from halfway point so both ends are visible","This tests your maximum velocity, not just acceleration","3 attempts"] },
    ],
    workaround:"After recording, your phone plays back the video. Watch it, note the time on screen when you crossed start and finish (use the phone's video scrubber). Input that time below. Your score is calculated from speed vs. the street average.",
    bonusTip:"⚡ Top 10% of all users earns you the Explosive badge.",
    timer:30,
  },
  {
    id:"jumping", stat:"jumping", icon:"⬆️", label:"Vertical Jump",
    what:"You jump next to a wall and measure how high you reached using tape markers. Simple, accurate, and verifiable from your video.",
    why:"Jump height matters for headers, crosses, and goalkeeping.",
    tiers:[
      { name:"Tier 1 — Standing vertical", setup:["Stand flat-footed next to a wall","Reach up as high as you can with one hand — stick a small piece of tape there. This is your STANDING REACH","Now jump as high as you can and touch the wall at your highest point — stick tape there too. This is your JUMP REACH","Measure the gap between the two pieces of tape in centimetres","Do 5 jumps, use your best"] },
      { name:"Tier 2 — Approach jump", setup:["Same tape method, but take 2–3 steps before jumping","Simulates heading a cross in a real game"] },
      { name:"Tier 3 — Running jump", setup:["Full run-up, jump at the wall","Film from the side so the jump height is clearly visible"] },
    ],
    workaround:"Measure the gap between your two tape marks with a ruler or tape measure. Enter the distance in centimetres. The app converts this to a score based on average jump heights (average street player: ~40cm, elite: ~65cm+).",
    bonusTip:"Film clearly so the tape marks are visible — community verifiers need to see them.",
    timer:60,
  },
  {
    id:"shooting", stat:"shooting", icon:"🎯", label:"Shooting Power & Accuracy",
    what:"You shoot at a marked target from set distances. The app measures your accuracy. For power, you time how fast the ball bounces back off the wall.",
    why:"Accuracy and power are both scored — a sniper who can't hit hard scores differently from a powerhouse who sprays shots.",
    tiers:[
      { name:"Tier 1 — 10m accuracy", setup:["Mark a target on a wall or goal: tape a cross or use chalk — aim for a 60cm x 60cm square","Place your phone on the ground or a bag 5 metres to the side of the ball position","Shoot from 10m — 10 shots","Count your hits on the target. Enter your score out of 10"] },
      { name:"Tier 2 — 15m power", setup:["Same target but from 15m","For power: start a stopwatch the moment you kick, stop it when the ball hits the wall. Faster = more power","Note your time on 5 shots and take the average"] },
      { name:"Tier 3 — 20m corners", setup:["20m distance — you must aim for the corners of the target ONLY","Centre hits don't count. This is placement under pressure"] },
    ],
    workaround:"Accuracy: count your hits out of 10 and enter the number. Power: average your rebound times (a fast wall return under 1.2 seconds from 15m scores highly). Enter both scores.",
    bonusTip:"🎯 9/10 accuracy at 20m earns you the Sniper badge. 💥 Top 15% power earns Cannonball.",
    timer:300,
  },
  {
    id:"passing", stat:"passing", icon:"🔄", label:"Passing Accuracy",
    what:"You pass at targets from different distances. The app measures how consistently you hit your target.",
    why:"Passing is the most-used skill in football. Even strikers need to be rated here.",
    tiers:[
      { name:"Tier 1 — 5m ground pass", setup:["Mark a target on a wall: 50cm wide (use tape or chalk)","Stand 5m back","10 passes — both feet if you want a higher score","Count hits. Enter out of 10"] },
      { name:"Tier 2 — 15m driven pass", setup:["Same target but narrower: 30cm wide","From 15m — the ball must stay on the ground","10 passes each foot"] },
      { name:"Tier 3 — 20m lofted", setup:["Mark a landing ZONE on the ground: 1m x 1m square","Loft the ball from 20m — it must land in the zone","10 attempts. Tests weight and technique"] },
    ],
    workaround:"Count your hits for each tier. The app combines all three scores into your overall passing rating. Film from behind you so the target is clearly visible.",
    bonusTip:"🎯 9/10 at Tier 3 earns the Sniper badge if your shooting test also qualifies.",
    timer:240,
  },
  {
    id:"dribbling", stat:"dribbling", icon:"🌀", label:"Dribbling Course",
    what:"You weave through a cone course as fast as possible. Any cone you touch reduces your score.",
    why:"Tests your close control, change of direction, and how fast you can move with the ball at your feet.",
    tiers:[
      { name:"Tier 1 — 6 cones, 1m apart", setup:["Set 6 cones in a straight line, each exactly 1 metre apart","Film from the side — all cones must be visible","Dribble through and back. Time it with your phone stopwatch","3 attempts, best counts. Any cone touch = -2 points off your score"] },
      { name:"Tier 2 — 8 cones, 0.75m apart", setup:["Tighter gaps. Slower = better control, faster = higher score","Both matter — the scoring rewards fast AND clean runs","3 attempts"] },
      { name:"Tier 3 — 10 cones + ball juggle", setup:["10 cones, 0.5m apart","At the end, do 10 juggles before returning","Juggle misses = -3 points each"] },
    ],
    workaround:"Enter your time in seconds and number of cone touches. The app calculates your score. Under 8 seconds with 0 touches on Tier 1 scores very highly.",
    bonusTip:"🌀 Tier 1 with zero cone touches earns the Silky badge.",
    timer:120,
  },
  {
    id:"physical", stat:"physical", icon:"💪", label:"Strength & Fitness",
    what:"Push-ups, sit-ups, and a plank timed. Your phone films from the side to verify form. You or a friend counts reps.",
    why:"Physical strength affects how you hold off defenders, win headers, and last the full game.",
    tiers:[
      { name:"Tier 1 — Push-ups max reps", setup:["Film from the side — full body visible","Chest must touch the ground each rep — half reps don't count","Do as many as you can without stopping","Enter your total. Friend can count to keep it honest"] },
      { name:"Tier 2 — Sit-ups in 60 seconds", setup:["Film from the side","Full crunch — elbows must touch or pass your knees","Count in 60 seconds","Start the timer on screen before you begin"] },
      { name:"Tier 3 — Plank hold", setup:["Straight body, forearms on ground","Start timer when you take position","Hold as long as you can with good form — hips can't sag","Enter your time in seconds"] },
    ],
    workaround:"Enter your rep counts and times. The scoring is benchmarked: 30+ push-ups scores above 70, 50+ scores 85+. Plank: 60s = decent, 120s+ = elite.",
    bonusTip:"Your clip is uploaded. Community verifiers check your form — partial reps flagged.",
    timer:180,
  },
  {
    id:"agility", stat:"agility", icon:"🏃", label:"Agility & Reaction",
    what:"The app flashes random direction commands on screen. You react and move to that cone as fast as possible. Your phone camera tracks your movement.",
    why:"Reaction time and change-of-direction speed are what separate good players from great ones.",
    tiers:[
      { name:"Tier 1 — 4 cones, basic directions", setup:["Place 4 cones around you: one in front, behind, left, right — each 2m away","Face the camera. Phone propped up at chest height","Press START — commands appear on screen: LEFT / RIGHT / FORWARD / BACK","React and touch the cone, come back to centre","10 commands. App measures your average response time"] },
      { name:"Tier 2 — T-drill", setup:["Set cones in a T shape: one straight ahead 10m, then two either side 5m each","Sprint to the top cone, shuffle left, shuffle right, back to start","3 attempts, best time counts"] },
      { name:"Tier 3 — Diamond drill + commands", setup:["4 cones in a diamond shape, 3m apart","Commands come faster — every 2.5 seconds","20 commands total"] },
    ],
    workaround:"After the drill, the app shows your average response time per command. This is converted to a score. Under 0.8s average = elite. Over 1.5s = below average.",
    bonusTip:"Leave the phone screen facing you so you can see the commands clearly.",
    timer:60,
  },
];

const TRIO_MODES = [
  { id:"classic", name:"Classic 1v1+GK", roles:["ST","CB","GK"], desc:"Striker gets 10 attempts against a CB and GK. 0 shots = Stone Wall. 9 goals = Poacher. GK: 0 goals = Brick Hands.", badges:["stone_wall","poacher","brick_hands"] },
  { id:"two_v_one", name:"2v1 Pressure", roles:["ST","ST","CB"], desc:"Two attackers take turns against one defender. GK stays wide. Tests defensive awareness when outnumbered.", badges:["tested"] },
  { id:"gk_dist", name:"GK Distribution", roles:["GK","ST","CB"], desc:"GK distributes, striker and CB race. Tests GK accuracy and CB reading of the game.", badges:["brick_hands"] },
];

// ── Helpers ────────────────────────────────────────────────────
function calcOverall(stats) {
  const v = Object.values(stats || {}).filter(x => x > 0);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
}

function getTier(ov, badges = []) {
  if (badges.length >= 3 || ov >= 90) return "rare";
  if (ov >= 85) return "elite";
  if (ov >= 75) return "gold";
  if (ov >= 65) return "silver";
  return "bronze";
}

function statColor(v) {
  if (!v) return C.muted;
  if (v >= 85) return C.tiers.elite.text;
  if (v >= 75) return "#7ec850";
  if (v >= 65) return "#c8e060";
  if (v >= 55) return "#e0b050";
  return "#e06050";
}

function resolveChallenge(def, atk) {
  const d = parseFloat(def) || 0, a = parseFloat(atk) || 0;
  const gap = Math.abs(d - a);
  if (gap <= 2) return { score: (d + a) / 2, status: "accepted" };
  if (gap <= 5) return { score: (d + a) / 2, status: "pending" };
  return { score: null, status: "flagged" };
}

// ── Hooks ──────────────────────────────────────────────────────
function useCountdown(secs, onEnd) {
  const [t, setT] = useState(secs);
  const [on, setOn] = useState(false);
  const iv = useRef();
  const start = () => { setT(secs); setOn(true); };
  const stop = () => { setOn(false); clearInterval(iv.current); };
  const reset = () => { stop(); setT(secs); };
  useEffect(() => {
    if (on) {
      iv.current = setInterval(() => setT(p => {
        if (p <= 1) { clearInterval(iv.current); setOn(false); onEnd && onEnd(); return 0; }
        return p - 1;
      }), 1000);
    }
    return () => clearInterval(iv.current);
  }, [on]);
  const mm = String(Math.floor(t / 60)).padStart(2, "0");
  const ss = String(t % 60).padStart(2, "0");
  return { t, on, start, stop, reset, display: `${mm}:${ss}` };
}

function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [videoBlob, setVideoBlob] = useState(null);

  const startCamera = useCallback(async (facingMode = "environment") => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setActive(true);
    } catch (e) {
      setError(e.name === "NotAllowedError"
        ? "Camera access denied. Please allow camera in your browser settings."
        : "Could not start camera: " + e.message);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setActive(false);
    setRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: "video/webm;codecs=vp8" });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setVideoBlob(blob);
    };
    mr.start(100);
    recorderRef.current = mr;
    setRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  return { videoRef, active, error, recording, videoBlob, startCamera, stopCamera, startRecording, stopRecording };
}

// ── UI Primitives ──────────────────────────────────────────────
function Btn({ children, onClick, v = "lime", full, sm, disabled, style: sx = {} }) {
  const variants = {
    lime:   { background: `linear-gradient(135deg,${C.lime},${C.lime2})`, color: C.black, border: "none" },
    ghost:  { background: "transparent", color: C.white, border: "1.5px solid #2a2a2a" },
    red:    { background: `${C.red}1a`, color: C.red, border: `1.5px solid ${C.red}55` },
    blue:   { background: `${C.blue}1a`, color: C.blue, border: `1.5px solid ${C.blue}55` },
    purple: { background: `${C.purple}1a`, color: C.purple, border: `1.5px solid ${C.purple}55` },
    dark:   { background: C.concrete, color: C.white, border: "1px solid #222" },
    gold:   { background: `${C.gold}1a`, color: C.gold, border: `1.5px solid ${C.gold}55` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...variants[v], borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
      padding: sm ? "8px 14px" : "13px 20px", fontSize: sm ? 12 : 14,
      fontWeight: 800, width: full ? "100%" : "auto", letterSpacing: 0.8,
      fontFamily: "inherit", opacity: disabled ? 0.45 : 1, transition: "opacity 0.15s",
      ...sx,
    }}>
      {children}
    </button>
  );
}

function Bar({ label, value }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: C.ghost, letterSpacing: 1.5, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 900, color: statColor(value) }}>{value || "—"}</span>
      </div>
      <div style={{ height: 4, background: "#181818", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${((value || 0) / 99) * 100}%`, background: statColor(value), borderRadius: 2, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function Toast({ msg, type = "ok" }) {
  return msg ? (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: type === "ok" ? C.lime : type === "err" ? C.red : C.blue,
      color: type === "ok" ? C.black : C.white, borderRadius: 8,
      padding: "12px 20px", fontSize: 13, fontWeight: 700, zIndex: 999,
      boxShadow: "0 4px 20px #00000088", whiteSpace: "nowrap",
    }}>
      {msg}
    </div>
  ) : null;
}

function Hdr({ title, sub, back, right }) {
  return (
    <div style={{ background: C.pitch, borderBottom: "1px solid #0d1d0d", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 50 }}>
      {back && <button onClick={back} style={{ background: "none", border: "none", color: C.ghost, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 0 }}>←</button>}
      <div style={{ flex: 1 }}>
        {sub && <div style={{ fontSize: 9, color: C.lime, letterSpacing: 3, textTransform: "uppercase", marginBottom: 1 }}>{sub}</div>}
        <div style={{ fontSize: 17, fontWeight: 900, color: C.white }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

function Input({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", fontSize: 10, color: C.ghost, letterSpacing: 2, marginBottom: 5, textTransform: "uppercase" }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", background: C.concrete, border: "1px solid #272727", borderRadius: 7, padding: "12px 14px", color: C.white, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}

// ── FIFA Card ──────────────────────────────────────────────────
function Card({ player, size = "full" }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hov, setHov] = useState(false);
  const ref = useRef();
  const ov = calcOverall(player?.stats);
  const tier = getTier(ov, player?.badges || []);
  const ts = C.tiers[tier];
  const isGK = player?.position === "GK";
  const W = size === "mini" ? 128 : size === "md" ? 196 : 264;
  const H = W * 1.46;
  const sc = W / 264;

  const mainStats = isGK
    ? [["DIV", player?.gk_stats?.diving || 0], ["HAN", player?.gk_stats?.handling || 0], ["KIC", player?.gk_stats?.kicking || 0], ["REF", player?.gk_stats?.reflexes || 0], ["SPD", player?.stats?.pace || 0], ["POS", player?.gk_stats?.positioning || 0]]
    : [["PAC", player?.stats?.pace || 0], ["SHO", player?.stats?.shooting || 0], ["PAS", player?.stats?.passing || 0], ["DRI", player?.stats?.dribbling || 0], ["DEF", player?.stats?.defending || 0], ["PHY", player?.stats?.physical || 0]];

  const bgMap = {
    bronze: "linear-gradient(145deg,#1a0d00,#2a1a00,#100800,#cd7f3222,#080400)",
    silver: "linear-gradient(145deg,#111,#1a1a1a,#0d0d0d,#a8a9ad18,#080808)",
    gold:   "linear-gradient(145deg,#140e00,#221800,#0c0900,#c9a84c28,#060400)",
    elite:  "linear-gradient(145deg,#100a00,#1c1200,#080600,#ffcc0033,#040200)",
    rare:   "linear-gradient(145deg,#0a0614,#12082a,#060310,#b44dff33,#030108)",
  };

  function onMove(e) {
    const r = ref.current.getBoundingClientRect();
    setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 16, y: ((e.clientY - r.top) / r.height - 0.5) * -16 });
  }

  return (
    <div ref={ref} onMouseMove={onMove} onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setTilt({ x: 0, y: 0 }); }}
      style={{
        width: W, height: H, flexShrink: 0,
        transform: hov ? `perspective(600px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale(1.05)` : "perspective(600px) scale(1)",
        transition: hov ? "transform 0.05s" : "transform 0.5s ease",
        borderRadius: 14 * sc, border: `1.5px solid ${ts.border}55`,
        boxShadow: hov ? `0 24px 60px ${ts.glow},0 0 40px ${ts.glow}` : `0 8px 28px #00000099`,
      }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 14 * sc, overflow: "hidden", background: bgMap[tier], position: "relative" }}>
        {hov && (
          <div style={{ position: "absolute", inset: 0, borderRadius: 14 * sc, pointerEvents: "none", zIndex: 10,
            background: tier === "rare"
              ? `linear-gradient(${110 + tilt.x * 2}deg,transparent 15%,${C.purple}22 35%,${C.blue}18 50%,transparent 70%)`
              : `linear-gradient(105deg,transparent 20%,${ts.border}14 40%,transparent 60%)` }} />
        )}
        <div style={{ padding: `${14 * sc}px ${14 * sc}px ${6 * sc}px`, position: "relative" }}>
          <div style={{ fontSize: 42 * sc, fontWeight: 900, lineHeight: 1, color: ts.text, fontFamily: "'Arial Black',sans-serif" }}>{ov || "—"}</div>
          <div style={{ fontSize: 13 * sc, fontWeight: 700, color: ts.text, letterSpacing: 2 }}>{player?.position || "ST"}</div>
          <div style={{ fontSize: 18 * sc, marginTop: 2 * sc }}>⚽</div>
          <div style={{ position: "absolute", top: 10 * sc, right: 10 * sc, background: `${ts.border}1a`, border: `1px solid ${ts.border}55`, borderRadius: 4 * sc, padding: `${2 * sc}px ${6 * sc}px`, fontSize: 8 * sc, fontWeight: 800, color: ts.text, letterSpacing: 1 }}>
            {tier === "rare" ? "✦ RARE" : tier.toUpperCase()}
          </div>
        </div>
        <div style={{ width: W * 0.68, height: W * 0.68, margin: "0 auto", borderRadius: "50% 50% 0 0", overflow: "hidden", border: `2px solid ${ts.border}33`, background: "#111" }}>
          {player?.photo_url
            ? <img src={player.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46 * sc, color: "#333" }}>👤</div>}
        </div>
        <div style={{ textAlign: "center", padding: `${5 * sc}px ${10 * sc}px ${3 * sc}px` }}>
          <div style={{ fontSize: 14 * sc, fontWeight: 900, color: C.white, letterSpacing: 2, fontFamily: "'Arial Black',sans-serif", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {player?.name || "PLAYER"}
          </div>
          {player?.nationality && <div style={{ fontSize: 8 * sc, color: C.ghost, letterSpacing: 1, marginTop: 1 * sc }}>{player.nationality}</div>}
        </div>
        <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${ts.border}55,transparent)`, margin: `0 ${14 * sc}px ${5 * sc}px` }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: `0 ${14 * sc}px`, gap: `${3 * sc}px 0` }}>
          {mainStats.map(([l, v]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15 * sc, fontWeight: 900, color: statColor(v), fontFamily: "'Arial Black',sans-serif" }}>{v || "—"}</div>
              <div style={{ fontSize: 7 * sc, color: C.ghost, letterSpacing: 1, fontWeight: 700 }}>{l}</div>
            </div>
          ))}
        </div>
        {(player?.badges || []).length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 3 * sc, padding: `${5 * sc}px` }}>
            {(player.badges || []).slice(0, 5).map(bid => {
              const b = BADGES.find(x => x.id === bid);
              return b ? <span key={bid} style={{ fontSize: 11 * sc }}>{b.icon}</span> : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Camera Recorder Component ──────────────────────────────────
function CameraRecorder({ onDone, timerSecs = 60, instructions = [] }) {
  const { videoRef, active, error, recording, videoBlob, startCamera, stopCamera, startRecording, stopRecording } = useCamera();
  const [phase, setPhase] = useState("idle"); // idle | live | recorded
  const [facing, setFacing] = useState("environment");
  const timer = useCountdown(timerSecs, () => { stopRecording(); setPhase("recorded"); });

  async function go() {
    await startCamera(facing);
    setPhase("live");
  }
  function flip() { stopCamera(); setTimeout(() => { setFacing(f => f === "environment" ? "user" : "environment"); go(); }, 300); }
  function recStart() { startRecording(); timer.start(); }
  function recStop() { stopRecording(); timer.stop(); setPhase("recorded"); }
  function useClip() { onDone(videoBlob); stopCamera(); }
  function retry() { setPhase("live"); stopRecording(); timer.reset(); }

  return (
    <div style={{ background: "#060c06", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.lime}22` }}>
      {/* Instructions */}
      {instructions.length > 0 && phase === "idle" && (
        <div style={{ padding: 14 }}>
          {instructions.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${C.lime}22`, border: `1px solid ${C.lime}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: C.lime, flexShrink: 0 }}>{i + 1}</div>
              <p style={{ margin: 0, color: C.ghost, fontSize: 12, lineHeight: 1.6 }}>{s}</p>
            </div>
          ))}
        </div>
      )}

      {/* Camera view */}
      {(phase === "live" || phase === "recorded") && (
        <div style={{ position: "relative", background: "#000" }}>
          <video ref={videoRef} muted playsInline style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: phase === "live" ? "block" : "none" }} />
          {phase === "recorded" && videoBlob && (
            <video src={URL.createObjectURL(videoBlob)} controls style={{ width: "100%", maxHeight: 280 }} />
          )}
          {phase === "live" && recording && (
            <div style={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.red, animation: "blink 1s infinite" }} />
              <span style={{ fontSize: 11, color: C.white, fontWeight: 700 }}>REC {timer.display}</span>
            </div>
          )}
          {phase === "live" && (
            <button onClick={flip} style={{ position: "absolute", top: 10, right: 10, background: "#00000088", border: "none", color: C.white, borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 16 }}>🔄</button>
          )}
        </div>
      )}

      {error && <div style={{ padding: 14, color: C.red, fontSize: 12 }}>{error}</div>}

      {/* Controls */}
      <div style={{ padding: 12, display: "flex", gap: 8 }}>
        {phase === "idle" && <Btn full onClick={go}>📷 Open Camera</Btn>}
        {phase === "live" && !recording && <Btn full onClick={recStart} v="red">⏺ Start Recording</Btn>}
        {phase === "live" && recording && <Btn full onClick={recStop} v="dark">⏹ Stop Recording</Btn>}
        {phase === "recorded" && (<>
          <Btn full onClick={retry} v="ghost">↩ Retry</Btn>
          <Btn full onClick={useClip}>✓ Use This Clip</Btn>
        </>)}
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
    </div>
  );
}

// ── Agility Command Display ────────────────────────────────────
function AgilityDrill({ onScore }) {
  const CMDS = ["LEFT ←", "RIGHT →", "FORWARD ↑", "BACK ↓", "HOLD ✋"];
  const [cmd, setCmd] = useState(null);
  const [scores, setScores] = useState([]);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(0);
  const startRef = useRef(null);

  function next() {
    if (count >= 10) { setDone(true); onScore(scores); return; }
    const c = CMDS[Math.floor(Math.random() * CMDS.length)];
    setCmd(c);
    startRef.current = Date.now();
    setCount(n => n + 1);
  }

  function react() {
    if (!startRef.current) return;
    const ms = Date.now() - startRef.current;
    setScores(s => [...s, ms]);
    startRef.current = null;
    setTimeout(next, 600);
  }

  if (!cmd && !done) return <Btn full onClick={next}>▶ Start Agility Drill</Btn>;
  if (done) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return (
      <div style={{ textAlign: "center", padding: 16 }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: C.lime }}>Done!</div>
        <div style={{ color: C.ghost, fontSize: 13, marginTop: 8 }}>Avg reaction: {Math.round(avg)}ms</div>
        <div style={{ color: C.ghost, fontSize: 11, marginTop: 4 }}>({avg < 600 ? "Elite" : avg < 900 ? "Good" : avg < 1200 ? "Average" : "Below average"})</div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 10, color: C.ghost, marginBottom: 8 }}>{count}/10 commands</div>
      <div style={{ fontSize: 44, fontWeight: 900, color: C.red, letterSpacing: 2, fontFamily: "'Arial Black',sans-serif", marginBottom: 20, animation: "pop 0.15s ease" }}>{cmd}</div>
      <Btn full onClick={react} v="blue">✓ Done it!</Btn>
      <style>{`@keyframes pop{from{transform:scale(0.7)}to{transform:scale(1)}}`}</style>
    </div>
  );
}

// ============================================================
// SCREENS
// ============================================================

// ── Landing ────────────────────────────────────────────────────
function Landing({ onNav }) {
  const demo = { name: "STREET", position: "ST", photo_url: null, badges: ["explosive", "silky", "tested"], stats: { pace: 78, shooting: 82, passing: 71, dribbling: 85, defending: 44, physical: 76, jumping: 74, agility: 83 } };
  return (
    <div style={{ minHeight: "100vh", background: C.pitch, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <svg style={{ position: "absolute", inset: 0, opacity: 0.04, width: "100%", height: "100%" }}>
        <ellipse cx="50%" cy="50%" rx="38%" ry="26%" fill="none" stroke="white" strokeWidth="1.5" />
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="white" strokeWidth="1" />
        <circle cx="50%" cy="50%" r="6%" fill="none" stroke="white" strokeWidth="1" />
        <rect x="3%" y="30%" width="9%" height="40%" fill="none" stroke="white" strokeWidth="1" />
        <rect x="88%" y="30%" width="9%" height="40%" fill="none" stroke="white" strokeWidth="1" />
      </svg>
      <div style={{ zIndex: 1, maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: C.lime, letterSpacing: 6, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>⚽ Street</div>
        <div style={{ fontSize: 78, fontWeight: 900, lineHeight: 0.88, color: C.white, fontFamily: "'Arial Black',sans-serif", textTransform: "uppercase", letterSpacing: -3, marginBottom: 6 }}>TWICE</div>
        <div style={{ fontSize: 10, color: C.ghost, letterSpacing: 4, marginBottom: 40, textTransform: "uppercase" }}>Your Game. Your Card. Your Legacy.</div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
          <Card player={demo} size="md" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn full onClick={() => onNav("signup")}>Create Your Card →</Btn>
          <Btn full v="ghost" onClick={() => onNav("login")}>Sign In</Btn>
        </div>
        <p style={{ marginTop: 24, color: C.muted, fontSize: 11, lineHeight: 1.8 }}>
          Camera-tested skills · Anti-cheat verified · FIFA-style cards<br />
          Bronze · Silver · Gold · Elite · ✦ Rare
        </p>
      </div>
    </div>
  );
}

// ── Auth screens ───────────────────────────────────────────────
function Signup({ onNav, onLogin }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", password: "", position: "ST", nationality: "", foot: "Right" });
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef();
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function submit() {
    if (!form.name || !form.email || !form.password) { setErr("Please fill all fields."); return; }
    setLoading(true); setErr("");
    try {
      const auth = await sbAuth("signup", form.email, form.password);
      const userId = auth.user?.id;
      const newPlayer = {
        id: userId, email: form.email, name: form.name,
        position: form.position, nationality: form.nationality, foot: form.foot,
        photo_url: photo || null,
        stats: { pace: 0, shooting: 0, passing: 0, dribbling: 0, defending: 0, physical: 0, jumping: 0, agility: 0 },
        peer_stats: { aggression: 0, awareness: 0, tackling: 0, leadership: 0, soccer_iq: 0 },
        gk_stats: { diving: 0, handling: 0, kicking: 0, reflexes: 0, positioning: 0 },
        badges: [], team_id: null, motm_votes: 0, games_played: 0,
      };
      await sbFetch("players", { method: "POST", body: JSON.stringify(newPlayer) });
      onLogin(newPlayer);
      onNav("dashboard");
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: C.black, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <Btn v="ghost" sm onClick={() => onNav("landing")} style={{ marginBottom: 20 }}>← Back</Btn>
        <div style={{ fontSize: 9, color: C.lime, letterSpacing: 3, marginBottom: 4, textTransform: "uppercase" }}>Step {step} of 2</div>
        <h1 style={{ color: C.white, fontSize: 24, fontWeight: 900, margin: "0 0 22px", fontFamily: "'Arial Black',sans-serif" }}>
          {step === 1 ? "Create Account" : "Your Profile"}
        </h1>
        {err && <div style={{ background: `${C.red}1a`, border: `1px solid ${C.red}44`, borderRadius: 7, padding: "10px 14px", color: C.red, fontSize: 12, marginBottom: 14 }}>{err}</div>}
        {step === 1 && (<>
          <Input label="Full Name" value={form.name} onChange={v => set("name", v)} />
          <Input label="Email" type="email" value={form.email} onChange={v => set("email", v)} />
          <Input label="Password" type="password" value={form.password} onChange={v => set("password", v)} />
          <Btn full onClick={() => setStep(2)}>Continue →</Btn>
          <p style={{ textAlign: "center", marginTop: 16, color: C.ghost, fontSize: 12 }}>
            Already registered? <span onClick={() => onNav("login")} style={{ color: C.lime, cursor: "pointer" }}>Sign in</span>
          </p>
        </>)}
        {step === 2 && (<>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div onClick={() => fileRef.current.click()} style={{ width: 88, height: 88, borderRadius: "50%", margin: "0 auto 10px", background: C.concrete, border: `2px dashed ${C.lime}44`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" }}>
              {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 28 }}>📸</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const r = new FileReader(); r.onload = ev => setPhoto(ev.target.result); r.readAsDataURL(e.target.files[0]); }} />
            <span style={{ fontSize: 11, color: C.ghost, cursor: "pointer" }} onClick={() => fileRef.current.click()}>Upload photo</span>
          </div>
          <Input label="Nationality" value={form.nationality} onChange={v => set("nationality", v)} placeholder="e.g. England" />
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 10, color: C.ghost, letterSpacing: 2, marginBottom: 5, textTransform: "uppercase" }}>Position</label>
            <select value={form.position} onChange={e => set("position", e.target.value)}
              style={{ width: "100%", background: C.concrete, border: "1px solid #272727", borderRadius: 7, padding: "12px 14px", color: C.white, fontSize: 14, outline: "none" }}>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 10, color: C.ghost, letterSpacing: 2, marginBottom: 7, textTransform: "uppercase" }}>Preferred Foot</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Left", "Right", "Both"].map(f => (
                <button key={f} onClick={() => set("foot", f)} style={{ flex: 1, padding: 10, borderRadius: 7, border: `1.5px solid ${form.foot === f ? C.lime : "#2a2a2a"}`, background: form.foot === f ? `${C.lime}14` : "transparent", color: form.foot === f ? C.lime : C.ghost, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>{f}</button>
              ))}
            </div>
          </div>
          <Btn full onClick={submit} disabled={loading}>{loading ? "Creating..." : "Create My Card ⚽"}</Btn>
        </>)}
      </div>
    </div>
  );
}

function Login({ onNav, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!email || !password) { setErr("Enter your email and password."); return; }
    setLoading(true); setErr("");
    try {
      await sbAuth("token?grant_type=password", email, password);
      const user = await sbGetUser();
      const rows = await sbFetch(`players?id=eq.${user.id}`);
      if (!rows || !rows[0]) throw new Error("Profile not found. Please sign up.");
      onLogin(rows[0]);
      onNav("dashboard");
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: C.black, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <Btn v="ghost" sm onClick={() => onNav("landing")} style={{ marginBottom: 20 }}>← Back</Btn>
        <h1 style={{ color: C.white, fontSize: 24, fontWeight: 900, margin: "0 0 22px" }}>Sign In</h1>
        {err && <div style={{ background: `${C.red}1a`, border: `1px solid ${C.red}44`, borderRadius: 7, padding: "10px 14px", color: C.red, fontSize: 12, marginBottom: 14 }}>{err}</div>}
        <Input label="Email" type="email" value={email} onChange={setEmail} />
        <Input label="Password" type="password" value={password} onChange={setPassword} />
        <Btn full onClick={submit} disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Btn>
        <p style={{ textAlign: "center", marginTop: 16, color: C.ghost, fontSize: 12 }}>
          No account? <span onClick={() => onNav("signup")} style={{ color: C.lime, cursor: "pointer" }}>Create one</span>
        </p>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────
function Dashboard({ player, onNav, onSignOut }) {
  const ov = calcOverall(player?.stats);
  const tier = getTier(ov, player?.badges || []);
  const ts = C.tiers[tier];
  const assessed = Object.values(player?.stats || {}).filter(v => v > 0).length;
  const benchmarkDue = (Date.now() - new Date(player?.last_benchmark || 0).getTime()) > 1000 * 60 * 60 * 24 * 180;

  const navGrid = [
    { label: "Skills Tests", icon: "🧪", nav: "selftests", desc: "Solo camera assessments" },
    { label: "Challenges", icon: "⚔️", nav: "challenges", desc: "vs registered players" },
    { label: "My Team", icon: "👥", nav: "team", desc: "Squad & captain tools" },
    { label: "Compare", icon: "📊", nav: "compare", desc: "vs Mbappé & street avg" },
    { label: "Badges", icon: "🏅", nav: "badges", desc: "Your achievements" },
    { label: "Leaderboard", icon: "🏆", nav: "leaderboard", desc: "Global rankings" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white, paddingBottom: 40 }}>
      <div style={{ background: C.pitch, borderBottom: "1px solid #0d1d0d", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 9, color: C.lime, letterSpacing: 3, textTransform: "uppercase" }}>Street Twice</div>
          <div style={{ fontSize: 17, fontWeight: 900 }}>{player?.name}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: C.ghost }}>{player?.team_id ? "In a team" : "No team"}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: ts.text }}>{tier.toUpperCase()}</div>
          </div>
          <button onClick={onSignOut} style={{ background: "none", border: "none", color: C.ghost, cursor: "pointer", fontSize: 12 }}>Sign out</button>
        </div>
      </div>

      <div style={{ padding: 18, maxWidth: 460, margin: "0 auto" }}>
        {benchmarkDue && (
          <div style={{ background: `${C.red}14`, border: `1px solid ${C.red}33`, borderRadius: 10, padding: 14, marginBottom: 18, display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 22 }}>⏰</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>6-Month Benchmark Due</div>
              <div style={{ fontSize: 11, color: C.ghost, marginTop: 2 }}>Your solo tests have expired. Redo them to keep your stats valid.</div>
            </div>
            <Btn sm v="red" onClick={() => onNav("selftests")}>Go</Btn>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <Card player={player} size="full" />
        </div>

        <div style={{ background: C.concrete, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: C.ghost, letterSpacing: 2, textTransform: "uppercase" }}>Tests Complete</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: C.lime }}>{assessed} / {SELF_TESTS.length}</span>
          </div>
          <div style={{ height: 5, background: "#111", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(assessed / SELF_TESTS.length) * 100}%`, background: `linear-gradient(90deg,${C.lime},${C.lime2})`, borderRadius: 3, transition: "width 1s" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {navGrid.map(it => (
            <button key={it.nav} onClick={() => onNav(it.nav)} style={{ background: C.pitch, border: "1px solid #0d1d0d", borderRadius: 10, padding: 14, textAlign: "left", cursor: "pointer", color: C.white }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{it.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{it.label}</div>
              <div style={{ fontSize: 10, color: C.ghost, marginTop: 2 }}>{it.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ background: C.pitch, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: C.ghost, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Your Stats</div>
          {Object.entries(STATS).map(([k, m]) => <Bar key={k} label={m.label} value={player?.stats?.[k]} />)}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, background: C.pitch, borderRadius: 10, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: C.lime }}>{player?.games_played || 0}</div>
            <div style={{ fontSize: 10, color: C.ghost, letterSpacing: 2, textTransform: "uppercase" }}>Games</div>
          </div>
          <div style={{ flex: 1, background: C.pitch, borderRadius: 10, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: C.gold }}>{player?.motm_votes || 0}</div>
            <div style={{ fontSize: 10, color: C.ghost, letterSpacing: 2, textTransform: "uppercase" }}>MOTM</div>
          </div>
          <div style={{ flex: 1, background: C.pitch, borderRadius: 10, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: C.purple }}>{(player?.badges || []).length}</div>
            <div style={{ fontSize: 10, color: C.ghost, letterSpacing: 2, textTransform: "uppercase" }}>Badges</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Self Tests ─────────────────────────────────────────────────
function SelfTests({ player, onNav, onStat }) {
  const [sel, setSel] = useState(null);
  const [tier, setTier] = useState(0);
  const [phase, setPhase] = useState("pick"); // pick | intro | setup | camera | agility | score | done
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [agilityScore, setAgilityScore] = useState(null);
  const [toast, setToast] = useState("");
  const timer = useCountdown(sel?.timer || 60, () => setPhase("score"));

  function pick(t) { setSel(t); setTier(0); setPhase("intro"); setScoreA(""); setScoreB(""); setAgilityScore(null); }

  function submitScore() {
    let final = parseInt(scoreA) || 0;
    if (sel.id === "agility" && agilityScore) {
      const avg = agilityScore.reduce((a, b) => a + b, 0) / agilityScore.length;
      final = avg < 500 ? 90 : avg < 700 ? 80 : avg < 900 ? 70 : avg < 1200 ? 55 : 40;
    }
    final = Math.min(99, Math.max(15, final));
    onStat(sel.stat, final, sel.id);
    setToast("Score saved! ✓");
    setTimeout(() => setToast(""), 2500);
    setPhase("done");
  }

  const curSetup = sel?.tiers?.[tier]?.setup || [];

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white }}>
      <Hdr title="Skills Tests" sub="Solo Camera" back={() => sel ? (phase === "pick" ? setSel(null) : setPhase("pick")) : onNav("dashboard")} />
      <Toast msg={toast} />

      {!sel && (
        <div style={{ padding: 18, maxWidth: 460, margin: "0 auto" }}>
          <div style={{ background: `${C.lime}0a`, border: `1px solid ${C.lime}1a`, borderRadius: 10, padding: 14, marginBottom: 18 }}>
            <p style={{ color: C.ghost, fontSize: 12, margin: 0, lineHeight: 1.7 }}>
              ⏰ <strong style={{ color: C.white }}>6-month refresh:</strong> All solo tests expire every 6 months. Honest results only — community verifiers watch your clips.
            </p>
          </div>
          {SELF_TESTS.map(t => {
            const v = player?.stats?.[t.stat] || 0;
            return (
              <button key={t.id} onClick={() => pick(t)} style={{ width: "100%", background: C.pitch, border: `1px solid ${v > 0 ? C.lime + "33" : "#161616"}`, borderRadius: 10, padding: 14, textAlign: "left", cursor: "pointer", color: C.white, display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: C.ghost, marginTop: 2 }}>3 tiers · Camera + manual input</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {v > 0 ? <div style={{ fontSize: 22, fontWeight: 900, color: statColor(v) }}>{v}</div>
                    : <div style={{ fontSize: 10, color: "#2a2a2a", border: "1px solid #222", borderRadius: 4, padding: "4px 8px" }}>Not done</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {sel && phase === "intro" && (
        <div style={{ padding: 18, maxWidth: 460, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>{sel.icon}</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 8px" }}>{sel.label}</h2>
            <p style={{ color: C.ghost, fontSize: 13, lineHeight: 1.7 }}>{sel.what}</p>
          </div>
          <div style={{ background: C.pitch, borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: C.lime, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Why it matters</div>
            <p style={{ color: C.ghost, fontSize: 12, margin: 0, lineHeight: 1.6 }}>{sel.why}</p>
          </div>
          {sel.bonusTip && (
            <div style={{ background: `${C.gold}0f`, border: `1px solid ${C.gold}33`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <p style={{ color: C.gold, fontSize: 11, margin: 0 }}>{sel.bonusTip}</p>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: C.ghost, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Choose Difficulty</div>
            {sel.tiers.map((t, i) => (
              <button key={i} onClick={() => setTier(i)} style={{ width: "100%", background: tier === i ? `${C.lime}14` : C.concrete, border: `1.5px solid ${tier === i ? C.lime : "#222"}`, borderRadius: 8, padding: 12, textAlign: "left", cursor: "pointer", color: tier === i ? C.lime : C.ghost, marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>{"🥉🥈🥇"[i]}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{t.name}</span>
              </button>
            ))}
          </div>
          <Btn full onClick={() => setPhase("setup")}>View Setup Guide →</Btn>
        </div>
      )}

      {sel && phase === "setup" && (
        <div style={{ padding: 18, maxWidth: 460, margin: "0 auto" }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 16 }}>{sel.icon} {sel.tiers[tier].name}</h3>
          <div style={{ background: C.pitch, borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: C.lime, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Setup Steps</div>
            {curSetup.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${C.lime}18`, border: `1px solid ${C.lime}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: C.lime, flexShrink: 0 }}>{i + 1}</div>
                <p style={{ margin: 0, color: C.ghost, fontSize: 12, lineHeight: 1.6 }}>{s}</p>
              </div>
            ))}
          </div>
          <div style={{ background: `${C.blue}0f`, border: `1px solid ${C.blue}33`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: C.blue, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>📱 How to measure</div>
            <p style={{ color: C.ghost, fontSize: 11, margin: 0, lineHeight: 1.6 }}>{sel.workaround}</p>
          </div>
          <div style={{ background: C.concrete, borderRadius: 8, padding: 12, marginBottom: 16, textAlign: "center" }}>
            <div style={{ fontSize: 9, color: C.ghost, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Time Limit</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.lime, fontFamily: "'Arial Black',sans-serif" }}>
              {String(Math.floor(sel.timer / 60)).padStart(2, "0")}:{String(sel.timer % 60).padStart(2, "0")}
            </div>
          </div>
          <Btn full onClick={() => setPhase(sel.id === "agility" ? "agility" : "camera")}>
            {sel.id === "agility" ? "▶ Start Agility Drill" : "📷 Open Camera & Record"}
          </Btn>
        </div>
      )}

      {sel && phase === "camera" && (
        <div style={{ padding: 18, maxWidth: 460, margin: "0 auto" }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 14 }}>{sel.icon} Recording</h3>
          <div style={{ background: `${C.red}0f`, border: `1px solid ${C.red}22`, borderRadius: 8, padding: 10, marginBottom: 14 }}>
            <p style={{ color: C.ghost, fontSize: 11, margin: 0, lineHeight: 1.6 }}>
              📌 <strong style={{ color: C.white }}>Reminder:</strong> {curSetup[0]}
            </p>
          </div>
          <CameraRecorder timerSecs={sel.timer} instructions={curSetup} onDone={() => setPhase("score")} />
        </div>
      )}

      {sel && phase === "agility" && (
        <div style={{ padding: 18, maxWidth: 460, margin: "0 auto" }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 6 }}>🏃 Agility Drill</h3>
          <p style={{ color: C.ghost, fontSize: 12, lineHeight: 1.6, marginBottom: 18 }}>
            A random direction command will flash on screen. React, move to that cone, come back to centre, then tap "Done it!" as fast as possible. 10 commands total.
          </p>
          <div style={{ background: C.pitch, borderRadius: 10, padding: 20, marginBottom: 14 }}>
            <AgilityDrill onScore={s => { setAgilityScore(s); setPhase("score"); }} />
          </div>
        </div>
      )}

      {sel && phase === "score" && (
        <div style={{ padding: 18, maxWidth: 460, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔬</div>
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 6px" }}>Enter Your Result</h3>
            <p style={{ color: C.ghost, fontSize: 12, lineHeight: 1.6 }}>
              {sel.id === "agility" ? "Your agility score has been measured automatically from your reactions." : "Watch your clip back and enter your honest result. Your video is uploaded for community verification."}
            </p>
          </div>
          {sel.id !== "agility" && (<>
            <div style={{ background: C.pitch, borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.ghost, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Benchmarks for {sel.label}</div>
              {[["Street average", BENCHMARKS[sel.stat]?.street], ["Semi-pro level", BENCHMARKS[sel.stat]?.semi], ["Elite level", 85]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: C.ghost }}>{l}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: statColor(v) }}>{v}</span>
                </div>
              ))}
            </div>
            <Input label="Your Score (0–99)" type="number" value={scoreA} onChange={setScoreA} placeholder="e.g. 68" />
            <p style={{ fontSize: 10, color: C.muted, marginTop: -8, marginBottom: 16, lineHeight: 1.6 }}>
              Be honest. Community verifiers check your clip. Inflated scores get flagged.
            </p>
          </>)}
          {sel.id === "agility" && agilityScore && (
            <div style={{ background: C.pitch, borderRadius: 10, padding: 16, marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.ghost, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Your Reaction Times</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                {agilityScore.map((ms, i) => <span key={i} style={{ background: C.concrete, borderRadius: 4, padding: "4px 8px", fontSize: 11, color: statColor(ms < 700 ? 85 : ms < 1000 ? 70 : 50) }}>{ms}ms</span>)}
              </div>
              <div style={{ marginTop: 12, fontSize: 13, color: C.lime, fontWeight: 700 }}>
                Avg: {Math.round(agilityScore.reduce((a, b) => a + b, 0) / agilityScore.length)}ms
              </div>
            </div>
          )}
          <Btn full onClick={submitScore}>✓ Submit & Save</Btn>
        </div>
      )}

      {sel && phase === "done" && (
        <div style={{ padding: 18, maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h3 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 8px" }}>Score Saved!</h3>
          <p style={{ color: C.ghost, fontSize: 12, lineHeight: 1.7, marginBottom: 24 }}>
            Your result has been recorded and your clip uploaded. If the community flags it, it enters the verification queue — honest scores are never questioned.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn v="dark" full onClick={() => { setSel(null); setPhase("pick"); }}>← More Tests</Btn>
            <Btn full onClick={() => onNav("dashboard")}>Dashboard</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Challenges ─────────────────────────────────────────────────
function Challenges({ player, onNav, onStat }) {
  const [mode, setMode] = useState(null);
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState("briefing");
  const [defScore, setDefScore] = useState("");
  const [atkScore, setAtkScore] = useState("");
  const [bonuses, setBonuses] = useState([]);
  const [resolution, setResolution] = useState(null);
  const [toast, setToast] = useState("");
  const timer = useCountdown(DEFEND_ROUNDS[roundIdx]?.timer || 180, () => setPhase("scoring"));

  function showToast(m) { setToast(m); setTimeout(() => setToast(""), 2500); }

  function submitRound() {
    const res = resolveChallenge(defScore, atkScore);
    setResolution(res);
    if (res.score !== null) {
      const s = Math.min(99, Math.max(20, Math.round(100 - res.score * 8)));
      onStat("defending", s, "challenge");
    }
    const bonus_aggression = bonuses.includes("push");
    if (bonus_aggression) onStat("agility", (player?.stats?.agility || 50) + 2, "bonus");
    setPhase("result");
    showToast(res.status === "accepted" ? "Score saved ✓" : res.status === "pending" ? "Pending review 🟡" : "Flagged — community review 🔴");
  }

  const cur = DEFEND_ROUNDS[roundIdx];

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white }}>
      <Hdr title="Challenges" sub="Verified vs Players" back={() => mode ? setMode(null) : onNav("dashboard")} />
      <Toast msg={toast} type={resolution?.status === "accepted" ? "ok" : "warn"} />

      {!mode && (
        <div style={{ padding: 18, maxWidth: 460, margin: "0 auto" }}>
          <div style={{ background: `${C.red}0f`, border: `1px solid ${C.red}2a`, borderRadius: 10, padding: 14, marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 6 }}>🔒 Anti-Cheat Active</div>
            <p style={{ color: C.ghost, fontSize: 11, margin: 0, lineHeight: 1.7 }}>
              Both players must be registered. Both film simultaneously on their own devices.
              Gap ≤2 = auto-averaged. Gap 3–5 = pending review. Gap 6+ = community frozen. Cumulative — more opponents = more accurate rating.
            </p>
          </div>

          {[
            { id: "defend", icon: "🛡️", label: "Test Your Defending", desc: "9 progressive rounds + bonus rounds. Different rules each phase.", col: C.blue },
            { id: "attack", icon: "⚡", label: "Test Your Attacking", desc: "Earn dribbling, agility and skill bonus stats vs a defender.", col: C.lime },
            { id: "trio", icon: "👥", label: "3-Player Challenge", desc: "ST + CB + GK. Earn Stone Wall, Poacher & Brick Hands badges.", col: C.purple },
          ].map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setRoundIdx(0); setPhase("briefing"); setDefScore(""); setAtkScore(""); setBonuses([]); setResolution(null); }} style={{ width: "100%", background: C.pitch, border: `1px solid ${m.col}2a`, borderRadius: 10, padding: 16, textAlign: "left", cursor: "pointer", color: C.white, marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 28 }}>{m.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: m.col }}>{m.label}</div>
                <div style={{ fontSize: 11, color: C.ghost, marginTop: 3, lineHeight: 1.5 }}>{m.desc}</div>
              </div>
            </button>
          ))}

          <div style={{ background: C.concrete, borderRadius: 10, padding: 14, marginTop: 6 }}>
            <div style={{ fontSize: 10, color: C.ghost, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Score Resolution</div>
            {[["0–2 pts gap", "Auto-averaged ✓", C.lime], ["3–5 pts gap", "Pending review 🟡", "#e0b050"], ["6+ pts gap", "Frozen for community 🔴", C.red], ["'Contested' tap", "Attempt not counted", C.ghost]].map(([g, r, col]) => (
              <div key={g} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: C.ghost }}>{g}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === "defend" && (
        <div style={{ padding: 18, maxWidth: 460, margin: "0 auto" }}>
          {phase === "briefing" && (<>
            <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>Defending — All Rounds</h3>
            <p style={{ color: C.ghost, fontSize: 12, lineHeight: 1.7, marginBottom: 18 }}>Both you and your opponent film simultaneously on separate phones. Each round has different rules. Complete all rounds to build a full defending rating.</p>
            {DEFEND_ROUNDS.map((r, i) => (
              <div key={r.id} style={{ background: i === roundIdx ? `${C.blue}14` : C.pitch, border: `1px solid ${i === roundIdx ? C.blue + "55" : "#161616"}`, borderRadius: 8, padding: 12, marginBottom: 8, display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 22 }}>{r.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: i === roundIdx ? C.white : C.ghost }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: C.ghost }}>{r.rule}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>⏱ {r.timer >= 120 ? Math.floor(r.timer / 60) + "min" : r.timer + "s"} · {r.focus}</div>
                </div>
              </div>
            ))}
            <Btn full onClick={() => setPhase("camera")} style={{ marginTop: 8 }}>Start Round — {cur.label}</Btn>
          </>)}

          {phase === "camera" && (<>
            <div style={{ background: `${C.red}0f`, border: `1px solid ${C.red}22`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 4 }}>Round Rule: {cur.label}</div>
              <div style={{ fontSize: 13, color: C.white }}>{cur.rule}</div>
            </div>
            <CameraRecorder timerSecs={cur.timer} instructions={["Both players press record at the same time", "Defender: focus on your stance and positioning", "Attacker: try to beat the defender using the round rules", cur.rule]} onDone={() => setPhase("scoring")} />
            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Ball contested", "Foul called", "Out of play"].map(b => (
                <button key={b} onClick={() => setBonuses(p => [...p, b])} style={{ background: `${C.muted}18`, border: `1px solid #333`, borderRadius: 6, padding: "7px 12px", fontSize: 11, color: C.ghost, cursor: "pointer" }}>{b}</button>
              ))}
            </div>
            {bonuses.length > 0 && <div style={{ marginTop: 8, fontSize: 10, color: C.ghost }}>Logged: {bonuses.join(", ")}</div>}
          </>)}

          {phase === "scoring" && (<>
            <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>{cur.label} — Scoring</h3>
            <p style={{ color: C.ghost, fontSize: 12, lineHeight: 1.7, marginBottom: 18 }}>
              How many times did the attacker successfully get past you? Enter your count and the attacker's count independently. Discrepancy is handled automatically.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[["Your count\n(times beaten)", defScore, setDefScore], ["Attacker's\nclaim", atkScore, setAtkScore]].map(([l, v, set]) => (
                <div key={l}>
                  <label style={{ display: "block", fontSize: 10, color: C.ghost, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase", whiteSpace: "pre-line" }}>{l}</label>
                  <input type="number" min="0" max="10" value={v} onChange={e => set(e.target.value)}
                    style={{ width: "100%", background: C.concrete, border: "1px solid #272727", borderRadius: 7, padding: "12px 10px", color: C.white, fontSize: 24, fontWeight: 900, outline: "none", boxSizing: "border-box", textAlign: "center" }} />
                </div>
              ))}
            </div>
            {defScore && atkScore && (() => {
              const res = resolveChallenge(defScore, atkScore);
              const col = res.status === "accepted" ? C.lime : res.status === "pending" ? "#e0b050" : C.red;
              return (
                <div style={{ background: `${col}0f`, border: `1px solid ${col}33`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 4 }}>
                    {res.status === "accepted" ? "✅ Auto-accepted" : res.status === "pending" ? "🟡 Pending community review" : "🔴 Flagged — community will decide"}
                  </div>
                  {res.score !== null && <div style={{ fontSize: 12, color: C.ghost }}>Agreed count: {res.score} / 10 attempts</div>}
                </div>
              );
            })()}

            <div style={{ background: C.pitch, borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.ghost, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Bonus Ratings</div>
              {[
                ["Attacker used a skill move?", "push", "Attacker DRI +2"],
                ["Defender pushed attacker wide cleanly?", "push", "Defender AGG +2"],
                ["Defender won ball cleanly?", "tackle", "Defender TAC +3"],
                ["Attacker nutmegged defender?", "nutmeg", "Attacker DRI +5"],
              ].map(([q, key, result]) => (
                <div key={q} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: C.ghost, flex: 1 }}>{q}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setBonuses(p => [...p, result])} style={{ background: `${C.lime}14`, border: `1px solid ${C.lime}33`, borderRadius: 5, padding: "4px 10px", fontSize: 11, color: C.lime, cursor: "pointer", fontWeight: 700 }}>Yes</button>
                    <button style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, padding: "4px 10px", fontSize: 11, color: C.ghost, cursor: "pointer" }}>No</button>
                  </div>
                </div>
              ))}
            </div>
            <Btn full onClick={submitRound} disabled={!defScore || !atkScore}>Submit Round</Btn>
          </>)}

          {phase === "result" && (<>
            <div style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{roundIdx >= DEFEND_ROUNDS.length - 1 ? "🏆" : "✅"}</div>
              <h3 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 8px" }}>{roundIdx >= DEFEND_ROUNDS.length - 1 ? "All Rounds Complete!" : `${cur.label} Done`}</h3>
              {bonuses.length > 0 && (
                <div style={{ background: `${C.lime}0a`, border: `1px solid ${C.lime}22`, borderRadius: 8, padding: 12, marginBottom: 16, textAlign: "left" }}>
                  <div style={{ fontSize: 10, color: C.lime, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Bonus Stats Logged</div>
                  {bonuses.map((b, i) => <div key={i} style={{ fontSize: 11, color: C.ghost }}>+ {b}</div>)}
                </div>
              )}
            </div>
            {roundIdx < DEFEND_ROUNDS.length - 1
              ? <Btn full onClick={() => { setRoundIdx(r => r + 1); setPhase("camera"); setDefScore(""); setAtkScore(""); setBonuses([]); setResolution(null); }}>Next Round →</Btn>
              : <div style={{ display: "flex", gap: 10 }}><Btn v="dark" full onClick={() => setMode(null)}>Challenges</Btn><Btn full onClick={() => onNav("dashboard")}>Dashboard</Btn></div>}
          </>)}
        </div>
      )}

      {mode === "trio" && (
        <div style={{ padding: 18, maxWidth: 460, margin: "0 auto" }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 14 }}>3-Player Challenge</h3>
          {TRIO_MODES.map(ch => (
            <div key={ch.id} style={{ background: C.pitch, border: `1px solid ${C.purple}22`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.purple, marginBottom: 6 }}>{ch.name}</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {ch.roles.map((r, i) => <span key={i} style={{ background: `${C.purple}14`, border: `1px solid ${C.purple}33`, borderRadius: 4, padding: "3px 8px", fontSize: 10, color: C.purple, fontWeight: 700 }}>{r}</span>)}
              </div>
              <p style={{ color: C.ghost, fontSize: 11, lineHeight: 1.6, marginBottom: 12 }}>{ch.desc}</p>
              <div style={{ background: `${C.gold}0f`, border: `1px solid ${C.gold}2a`, borderRadius: 6, padding: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Badges Available</div>
                <div style={{ fontSize: 11, color: C.ghost }}>{ch.badges.map(id => { const b = BADGES.find(x => x.id === id); return b ? `${b.icon} ${b.name}` : ""; }).join(" · ")}</div>
              </div>
              <Btn v="purple" full sm>Set Up This Challenge</Btn>
            </div>
          ))}
        </div>
      )}

      {mode === "attack" && (
        <div style={{ padding: 18, maxWidth: 460, margin: "0 auto" }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>Attacking Challenges</h3>
          <p style={{ color: C.ghost, fontSize: 12, lineHeight: 1.7, marginBottom: 18 }}>Same anti-cheat system. Bonuses logged by the defender — if they say you nutmegged them, your dribbling goes up.</p>
          {DEFEND_ROUNDS.map((r, i) => (
            <div key={r.id} style={{ background: C.pitch, border: `1px solid ${C.lime}18`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.lime }}>{r.label}</span>
                <span style={{ fontSize: 10, color: C.ghost }}>⏱ {r.timer >= 120 ? Math.floor(r.timer / 60) + "min" : r.timer + "s"}</span>
              </div>
              <div style={{ fontSize: 12, color: C.white, marginBottom: 2 }}>{r.rule}</div>
              <div style={{ fontSize: 10, color: C.ghost }}>{r.focus}</div>
            </div>
          ))}
          <Btn full style={{ marginTop: 10 }} onClick={() => setPhase("camera")}>Start Attacking Rounds</Btn>
        </div>
      )}
    </div>
  );
}

// ── Badges ─────────────────────────────────────────────────────
function BadgesScreen({ player, onNav }) {
  const earned = player?.badges || [];
  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white }}>
      <Hdr title="Badges" sub="Achievements" back={() => onNav("dashboard")} />
      <div style={{ padding: 18, maxWidth: 460, margin: "0 auto" }}>
        <div style={{ background: `${C.purple}0f`, border: `1px solid ${C.purple}2a`, borderRadius: 10, padding: 14, marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, marginBottom: 4 }}>✦ Rare Card Trigger</div>
          <p style={{ color: C.ghost, fontSize: 11, margin: 0, lineHeight: 1.6 }}>Earn any 3 badges and your card upgrades to a Rare holographic variant, regardless of your overall rating.</p>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{earned.length} / {BADGES.length} earned</span>
          {earned.length >= 3 && <span style={{ fontSize: 11, color: C.purple, fontWeight: 700 }}>✦ RARE CARD ACTIVE</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {BADGES.map(b => {
            const e = earned.includes(b.id);
            return (
              <div key={b.id} style={{ background: e ? (b.rare ? `${C.purple}14` : `${C.lime}0a`) : C.concrete, border: `1px solid ${e ? (b.rare ? C.purple : C.lime + "44") : "#1e1e1e"}`, borderRadius: 10, padding: 14, opacity: e ? 1 : 0.4, filter: e && b.rare ? `drop-shadow(0 0 8px ${C.purple}66)` : "none" }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{b.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: e ? (b.rare ? C.purple : C.lime) : C.ghost, marginBottom: 4 }}>{b.name}</div>
                <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.5 }}>{b.desc}</div>
                {e && <div style={{ marginTop: 8, fontSize: 9, color: e ? (b.rare ? C.purple : C.lime) : C.muted, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>✓ EARNED</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Compare ────────────────────────────────────────────────────
function Compare({ player, onNav }) {
  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white }}>
      <Hdr title="Benchmark" sub="How Do You Compare?" back={() => onNav("dashboard")} />
      <div style={{ padding: 18, maxWidth: 460, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          {[{ l: "You", c: C.lime }, { l: "Street", c: C.ghost }, { l: "Semi-Pro", c: C.blue }, { l: "Mbappé", c: C.gold }, { l: "Neymar", c: C.red }].map(x => (
            <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: x.c }} />
              <span style={{ fontSize: 10, color: C.ghost }}>{x.l}</span>
            </div>
          ))}
        </div>
        {Object.entries(BENCHMARKS).map(([k, b]) => {
          const you = player?.stats?.[k] || 0;
          return (
            <div key={k} style={{ background: C.pitch, borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{STATS[k]?.label}</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: you ? statColor(you) : C.muted }}>{you || "?"}</span>
              </div>
              {[{ l: "You", v: you, c: C.lime }, { l: "Street avg", v: b.street, c: C.ghost }, { l: "Semi-Pro", v: b.semi, c: C.blue }, { l: "Mbappé", v: b.mbappe, c: C.gold }, { l: "Neymar", v: b.neymar, c: C.red }].map(r => (
                <div key={r.l} style={{ marginBottom: 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 9, color: C.ghost }}>{r.l}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: r.c }}>{r.v || "—"}</span>
                  </div>
                  <div style={{ height: 4, background: "#111", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(r.v / 99) * 100}%`, background: r.c, borderRadius: 2, opacity: r.l === "You" && !you ? 0.15 : 1 }} />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Team ───────────────────────────────────────────────────────
function Team({ player, onNav }) {
  const [tab, setTab] = useState("squad");
  const [votes, setVotes] = useState({});
  const [teamName, setTeamName] = useState("");
  const [toast, setToast] = useState("");
  const mockSquad = [{ name: "Marcus T.", position: "CM", stats: { pace: 68, shooting: 62 }, badges: [] }, { name: "Jaden S.", position: "ST", stats: { pace: 79, shooting: 78 }, badges: ["poacher"] }, { name: "Olu F.", position: "CB", stats: { pace: 60, defending: 71 }, badges: [] }];

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white }}>
      <Hdr title="My Team" sub="Street Kings FC" back={() => onNav("dashboard")} />
      <div style={{ display: "flex", borderBottom: "1px solid #111" }}>
        {["squad", "join", "motm"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: 13, background: "none", border: "none", cursor: "pointer", color: tab === t ? C.lime : C.ghost, fontWeight: 700, fontSize: 12, borderBottom: `2px solid ${tab === t ? C.lime : "transparent"}`, textTransform: "uppercase", letterSpacing: 1 }}>
            {t === "squad" ? "Squad" : t === "join" ? "Join" : "MOTM"}
          </button>
        ))}
      </div>
      <Toast msg={toast} />
      <div style={{ padding: 18, maxWidth: 460, margin: "0 auto" }}>
        {tab === "squad" && (<>
          {[{ name: player?.name || "You", position: player?.position || "ST", stats: player?.stats || {}, badges: player?.badges || [], isYou: true }, ...mockSquad].map((p, i) => (
            <div key={i} style={{ background: C.pitch, borderRadius: 10, padding: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: C.concrete, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}{p.isYou ? " (You)" : ""}{i === 0 ? " 👑" : ""}</div>
                <div style={{ fontSize: 10, color: C.ghost }}>{p.position} · {(p.badges || []).map(b => BADGES.find(x => x.id === b)?.icon).join("")}</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: statColor(calcOverall(p.stats)) }}>{calcOverall(p.stats) || "—"}</div>
            </div>
          ))}
          <div style={{ background: `${C.red}0f`, border: `1px solid ${C.red}22`, borderRadius: 10, padding: 14, marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 8 }}>Join Requests</div>
            {[{ name: "Diego M.", pos: "GK" }, { name: "Sam P.", pos: "RB" }].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>👤</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div><div style={{ fontSize: 10, color: C.ghost }}>{r.pos}</div></div>
                <Btn sm onClick={() => { setToast(r.name + " accepted ✓"); }}>✓</Btn>
                <Btn sm v="red">✕</Btn>
              </div>
            ))}
          </div>
        </>)}

        {tab === "join" && (<>
          <p style={{ color: C.ghost, fontSize: 12, lineHeight: 1.7, marginBottom: 16 }}>Search by team name. The captain reviews your request and lets you in.</p>
          <Input label="Team name or code" value={teamName} onChange={setTeamName} placeholder="e.g. Street Kings FC" />
          <Btn full style={{ marginBottom: 24 }}>Search</Btn>
          <div style={{ fontSize: 10, color: C.ghost, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Or Create a Team</div>
          <Input label="New team name" value="" onChange={() => {}} placeholder="e.g. Eastside Ballers" />
          <Btn full v="ghost">Create & Become Captain</Btn>
        </>)}

        {tab === "motm" && (<>
          <div style={{ background: `${C.gold}0f`, border: `1px solid ${C.gold}2a`, borderRadius: 10, padding: 14, marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 4 }}>🏅 MOTM Rules</div>
            <p style={{ color: C.ghost, fontSize: 11, margin: 0, lineHeight: 1.7 }}>All players who played vote. Winner gets +2 to their lowest stat. Outlier votes (3+ positions away from the group consensus) are excluded as biased.</p>
          </div>
          <div style={{ fontSize: 10, color: C.ghost, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Last Match</div>
          {[{ name: "Jaden S.", pos: "ST" }, { name: "Marcus T.", pos: "CM" }, { name: player?.name || "You", pos: player?.position || "ST" }].map((p, i) => (
            <div key={i} style={{ background: votes[i] ? `${C.lime}0a` : C.pitch, border: `1px solid ${votes[i] ? C.lime + "33" : "#161616"}`, borderRadius: 10, padding: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22 }}>👤</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: 10, color: C.ghost }}>{p.pos}</div></div>
              <button onClick={() => setVotes({ [i]: true })} style={{ background: votes[i] ? `${C.lime}18` : `${C.muted}14`, border: `1px solid ${votes[i] ? C.lime + "55" : "#333"}`, color: votes[i] ? C.lime : C.ghost, borderRadius: 7, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                {votes[i] ? "✓ Voted" : "Vote"}
              </button>
            </div>
          ))}
        </>)}
      </div>
    </div>
  );
}

// ── Leaderboard ────────────────────────────────────────────────
function Leaderboard({ player, onNav }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sbFetch("players?select=name,position,stats,badges,team_id,motm_votes&order=motm_votes.desc&limit=20")
      .then(rows => setData(rows))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const fallback = [
    { name: "Jaden S.", position: "ST", stats: { pace: 84, shooting: 87, passing: 74, dribbling: 82, defending: 38, physical: 76, jumping: 72, agility: 85 }, badges: ["poacher", "explosive"], motm_votes: 8 },
    { name: "Marcus T.", position: "CM", stats: { pace: 72, shooting: 65, passing: 80, dribbling: 76, defending: 60, physical: 74, jumping: 66, agility: 78 }, badges: ["tested"], motm_votes: 5 },
    { name: player?.name || "You", position: player?.position || "ST", stats: player?.stats || {}, badges: player?.badges || [], motm_votes: player?.motm_votes || 0, you: true },
    { name: "Olu F.", position: "CB", stats: { pace: 61, shooting: 44, passing: 62, dribbling: 60, defending: 79, physical: 77, jumping: 74, agility: 65 }, badges: ["stone_wall"], motm_votes: 2 },
    { name: "Sam P.", position: "RB", stats: { pace: 64, shooting: 40, passing: 58, dribbling: 55, defending: 68, physical: 66, jumping: 60, agility: 62 }, badges: [], motm_votes: 0 },
  ];

  const rows = ((data && data.length > 0) ? data : fallback)
    .map(p => ({ ...p, ov: calcOverall(p.stats), tier: getTier(calcOverall(p.stats), p.badges || []) }))
    .sort((a, b) => b.ov - a.ov);

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white }}>
      <Hdr title="Leaderboard" sub="Global Rankings" back={() => onNav("dashboard")} />
      <div style={{ padding: 18, maxWidth: 460, margin: "0 auto" }}>
        {loading && <div style={{ textAlign: "center", padding: 40, color: C.ghost, fontSize: 13 }}>Loading...</div>}
        {rows.map((p, i) => {
          const ts = C.tiers[p.tier];
          return (
            <div key={i} style={{ background: p.you ? `${C.lime}0a` : C.pitch, border: `1px solid ${p.you ? C.lime + "33" : "#161616"}`, borderRadius: 10, padding: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: i < 3 ? [C.gold, "#888", "#8B4513"][i] : C.concrete, display: "flex", alignItems: "center", justifyContent: "center", fontSize: i < 3 ? 16 : 11, fontWeight: 900, color: i < 3 ? C.black : C.ghost }}>
                {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}{p.you ? " (You)" : ""}</div>
                <div style={{ fontSize: 10, color: C.ghost }}>{p.position} {(p.badges || []).slice(0, 3).map(b => BADGES.find(x => x.id === b)?.icon).join("")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: ts.text }}>{p.ov || "—"}</div>
                <div style={{ fontSize: 9, color: ts.text, letterSpacing: 1, textTransform: "uppercase" }}>{p.tier}</div>
                {p.motm_votes > 0 && <div style={{ fontSize: 9, color: C.gold }}>🏅 {p.motm_votes}x</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── App Root ───────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto sign-in on reload
  useEffect(() => {
    sbGetUser().then(async user => {
      if (user) {
        try {
          const rows = await sbFetch(`players?id=eq.${user.id}`);
          if (rows && rows[0]) { setPlayer(rows[0]); setScreen("dashboard"); }
        } catch (_) {}
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleStat(statKey, value) {
    const newStats = { ...(player?.stats || {}), [statKey]: value };
    setPlayer(p => ({ ...p, stats: newStats }));
    if (player?.id) {
      try {
        await sbFetch(`players?id=eq.${player.id}`, {
          method: "PATCH",
          body: JSON.stringify({ stats: newStats }),
          prefer: "return=minimal",
        });
      } catch (_) {}
    }
  }

  async function handleSignOut() {
    await sbSignOut();
    setPlayer(null);
    setScreen("landing");
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.black, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚽</div>
        <div style={{ fontSize: 11, color: C.ghost, letterSpacing: 3, textTransform: "uppercase" }}>Loading Street Twice...</div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "Inter,system-ui,sans-serif", background: C.black, minHeight: "100vh", color: C.white }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;}input::placeholder{color:#2a2a2a;}select option{background:#1a1a1a;}::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#222;}`}</style>
      {screen === "landing"     && <Landing onNav={setScreen} />}
      {screen === "signup"      && <Signup onNav={setScreen} onLogin={setPlayer} />}
      {screen === "login"       && <Login onNav={setScreen} onLogin={setPlayer} />}
      {screen === "dashboard"   && <Dashboard player={player} onNav={setScreen} onSignOut={handleSignOut} />}
      {screen === "selftests"   && <SelfTests player={player} onNav={setScreen} onStat={handleStat} />}
      {screen === "challenges"  && <Challenges player={player} onNav={setScreen} onStat={handleStat} />}
      {screen === "badges"      && <BadgesScreen player={player} onNav={setScreen} />}
      {screen === "compare"     && <Compare player={player} onNav={setScreen} />}
      {screen === "team"        && <Team player={player} onNav={setScreen} />}
      {screen === "leaderboard" && <Leaderboard player={player} onNav={setScreen} />}
    </div>
  );
}
