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

// ── Solo Test Definitions ─────────────────────────────────────
const STAT_CHALLENGES = {
  pace: {
    label: "Pace & Speed", icon: "⚡", color: C.green,
    desc: "4 challenges measuring explosive acceleration, top speed, sprint endurance and football movement.",
    challenges: [
      { id:"pace_1", level:"Beginner",   icon:"💥", name:"10m Launch",
        purpose:"Measure explosive acceleration from a standing start.",
        equipment:["Tape measure","2 cones"],
        layout:"START ——— 10m ——— FINISH",
        camera:"Side-on. Both cones fully visible. Player's full body in frame.",
        rules:["Standing start behind the line","Sprint as fast as possible","3 attempts — best counts","No rolling start"],
        measures:["First-step quickness","Raw acceleration"],
        attempts:3, timer:15, camMode:"sprint", autScore:true },
      { id:"pace_2", level:"Intermediate", icon:"⚡", name:"Flying Sprint",
        purpose:"Measure maximum top-end speed — not acceleration.",
        equipment:["Tape measure","4 cones"],
        layout:"5m build-up → [START] ——— 20m timed ——— [FINISH] → 5m slowdown",
        camera:"Side-on covering the entire 30m. Start and finish cones visible.",
        rules:["Sprint from 5m before start cone","Timer starts when you cross start cone","Don't slow down until past finish cone","3 attempts"],
        measures:["Maximum velocity","Top-end speed"],
        attempts:3, timer:20, camMode:"sprint", autScore:true },
      { id:"pace_3", level:"Advanced", icon:"♾️", name:"Sprint Repeat",
        purpose:"Measure sprint consistency and fatigue resistance.",
        equipment:["Tape measure","2 cones","Timer visible on screen"],
        layout:"START ——— 30m ——— FINISH (repeat 6 times)",
        camera:"Side-on. Both cones in frame throughout all 6 sprints.",
        rules:["6 sprints of 30m","20 seconds rest between each","Time every sprint","Sprint, walk back, rest, repeat"],
        measures:["Fatigue resistance","Recovery speed","Sprint consistency"],
        attempts:6, timer:300, camMode:"record", autScore:false },
      { id:"pace_4", level:"Elite", icon:"🏟️", name:"Football Sprint Circuit",
        purpose:"Measure real football movement — not straight-line speed.",
        equipment:["6 cones","Tape measure"],
        layout:"Sprint 10m → Backpedal 5m → Sprint 20m → Side shuffle 5m → Sprint 10m → Finish",
        camera:"Wide angle. All cones visible. Bird's eye if possible.",
        rules:["Follow the exact sequence","No cheating the backpedal or shuffle","3 attempts — best time counts","Film the full circuit"],
        measures:["Football-specific movement","Multi-directional pace"],
        attempts:3, timer:30, camMode:"record", autScore:false },
    ]
  },
  jumping: {
    label: "Jumping", icon: "⬆️", color: C.cyan,
    desc: "4 challenges measuring vertical power, explosive endurance and jump consistency.",
    challenges: [
      { id:"jump_1", level:"Beginner", icon:"⬆️", name:"Standing Vertical",
        purpose:"Measure pure vertical jump height from a standing start.",
        equipment:["Wall or flat surface","Chalk or tape","Tape measure"],
        layout:"Stand side-on to wall. Mark standing reach. Jump and mark highest touch.",
        camera:"Side-on. Full body visible — feet to fingertips.",
        rules:["Stand flat-footed","Jump as high as possible","Touch the wall at peak","3 attempts — best height counts","No step or run-up"],
        measures:["Pure vertical power","Lower body explosiveness"],
        attempts:3, timer:null, camMode:"jump", autScore:true },
      { id:"jump_2", level:"Intermediate", icon:"🏃", name:"Running Vertical",
        purpose:"Measure jump height with a short approach — more football-realistic.",
        equipment:["Wall or post","Chalk or tape","Tape measure","3 cones for approach"],
        layout:"3-step approach → takeoff zone → wall touch",
        camera:"Side-on. Full approach and jump visible.",
        rules:["Maximum 3 steps before jump","Must take off from one foot","Touch wall at peak","3 attempts — best counts"],
        measures:["Approach jump height","Heading ability"],
        attempts:3, timer:null, camMode:"jump", autScore:true },
      { id:"jump_3", level:"Advanced", icon:"🦘", name:"Triple Jump Distance",
        purpose:"Measure horizontal explosive power over 3 consecutive jumps.",
        equipment:["Tape measure","Flat ground","Start line marker"],
        layout:"HOP — STEP — JUMP → measure total distance from start to landing",
        camera:"Side-on. Full run-up and all 3 jumps visible.",
        rules:["3 consecutive jumps without stopping","Hop (same foot) → Step (other foot) → Jump (both feet)","Measure from start line to back of heels on landing","3 attempts — best distance counts"],
        measures:["Horizontal explosive power","Jump endurance"],
        attempts:3, timer:null, camMode:"record", autScore:false },
      { id:"jump_4", level:"Elite", icon:"🔄", name:"Repeated Jump (30s)",
        purpose:"Measure how well you maintain jump height under fatigue.",
        equipment:["Wall","Chalk","Tape measure","Timer"],
        layout:"Mark height target on wall. Jump continuously for 30 seconds touching the mark.",
        camera:"Side-on. Wall and full body visible.",
        rules:["Set target height at 80% of your Standing Vertical best","Jump continuously — touch target every time","30 seconds","Count successful touches","Rest 2 mins before attempting"],
        measures:["Power retention","Jump endurance"],
        attempts:1, timer:30, camMode:"record", autScore:false },
    ]
  },
  agility: {
    label: "Agility", icon: "🏃", color: C.gold,
    desc: "4 challenges testing turning speed, reaction, football intelligence and ball control under movement.",
    challenges: [
      { id:"agility_1", level:"Beginner", icon:"↔️", name:"5-10-5 Shuttle",
        purpose:"Measure change-of-direction speed.",
        equipment:["3 cones","Tape measure"],
        layout:"[LEFT] ——5m—— [CENTRE] ——5m—— [RIGHT]",
        camera:"Front-on or wide side. All 3 cones visible.",
        rules:["Start at centre cone","Sprint 5m right, touch cone","Sprint 10m left, touch cone","Sprint 5m back to centre","3 attempts — best time counts"],
        measures:["Change-of-direction speed","Lateral quickness"],
        attempts:3, timer:20, camMode:"record", autScore:false },
      { id:"agility_2", level:"Intermediate", icon:"⬜", name:"Box Agility",
        purpose:"Measure multi-directional turning and balance.",
        equipment:["4 cones","Tape measure"],
        layout:"A(TL) ——5m—— B(TR)\n|                    |\nD(BL) ——5m—— C(BR)\nTouch every cone in order: A→B→C→D→A",
        camera:"Above or wide front angle. All 4 cones visible.",
        rules:["Touch every cone in sequence A B C D","3 attempts — best time counts","Must touch or cross each cone"],
        measures:["Turning speed","Balance","Multi-directional agility"],
        attempts:3, timer:25, camMode:"record", autScore:false },
      { id:"agility_3", level:"Advanced", icon:"🔵", name:"Figure Eight Dribble",
        purpose:"Measure turning ability and ball control under fatigue.",
        equipment:["2 cones","Ball"],
        layout:"[CONE A] ——— 3m ——— [CONE B]\nDribble around both in figure-of-eight pattern continuously",
        camera:"Above or front angle. Both cones visible.",
        rules:["Dribble only — no carrying","60 seconds continuous","Count complete figure-eights","Ball must go fully around each cone"],
        measures:["Turning with ball","Ball control under fatigue"],
        attempts:1, timer:60, camMode:"record", autScore:false },
      { id:"agility_4", level:"Elite", icon:"🧠", name:"Chaos Circuit",
        purpose:"Test football intelligence, reaction and memory under physical stress.",
        equipment:["8 numbered cones (1-8)","Tape measure"],
        layout:"Place 8 cones in a circle, 3m apart, numbered 1-8\nApp generates random sequence. Memorise it. Run it.",
        camera:"Above or wide front. All 8 cones visible.",
        rules:["Study the sequence for 10 seconds","Run to each cone in order","Touch base cone between each","Wrong cone = attempt failed","3 attempts"],
        measures:["Football intelligence","Memory under pressure","Agility with cognitive load"],
        attempts:3, timer:60, camMode:"chaos", autScore:false },
    ]
  },
  shooting: {
    label: "Shooting", icon: "🎯", color: "#FF8844",
    desc: "4 challenges from basic accuracy to pressure finishing under fatigue.",
    challenges: [
      { id:"shoot_1", level:"Beginner", icon:"🎯", name:"Target Shooting",
        purpose:"Measure shooting accuracy from a set distance.",
        equipment:["Ball","Goal or wall","Tape to mark targets"],
        layout:"Mark 4 targets (corners + centre). Shoot from 10m.",
        camera:"Side-on. Target and player both visible.",
        rules:["20 shots total","5 at each zone","Score 1pt per target hit","Film continuously"],
        measures:["Accuracy","Shot placement"],
        attempts:20, timer:null, camMode:"record", autScore:false },
      { id:"shoot_2", level:"Intermediate", icon:"⚡", name:"Rapid Fire",
        purpose:"Measure accuracy and speed together.",
        equipment:["10 balls","Goal or wall","Target tape"],
        layout:"10 balls lined up. Shoot all 10 within 90 seconds.",
        camera:"Side-on or front. Player and goal visible.",
        rules:["10 balls in 90 seconds","Accuracy and speed both scored","Ball must hit inside the target zone","No rush — control matters"],
        measures:["Speed-accuracy trade-off","Decision making under time"],
        attempts:10, timer:90, camMode:"record", autScore:false },
      { id:"shoot_3", level:"Advanced", icon:"🦶", name:"Weak Foot Challenge",
        purpose:"Measure weak foot shooting ability.",
        equipment:["Ball","Goal or wall","Target tape"],
        layout:"Same as Challenge 1 but using weaker foot only.",
        camera:"Side-on. Full body and target visible.",
        rules:["Only weak foot allowed","20 shots","Same scoring as Challenge 1","Film foot placement clearly"],
        measures:["Weak foot ability","Two-footedness"],
        attempts:20, timer:null, camMode:"record", autScore:false },
      { id:"shoot_4", level:"Elite", icon:"🏃", name:"Pressure Finishing",
        purpose:"Measure finishing ability under physical fatigue.",
        equipment:["Ball","Goal","Cones for sprint start"],
        layout:"Sprint 15m → receive or collect ball → shoot → sprint back → repeat",
        camera:"Side-on or wide. Sprint and goal both visible.",
        rules:["Sprint before every shot","10 attempts","No rest between attempts","Score on accuracy not power"],
        measures:["Finishing under fatigue","Football fitness"],
        attempts:10, timer:300, camMode:"record", autScore:false },
    ]
  },
  passing: {
    label: "Passing", icon: "🔄", color: C.blue,
    desc: "4 challenges from stationary accuracy to passing under full sprint fatigue.",
    challenges: [
      { id:"pass_1", level:"Beginner", icon:"🎯", name:"Target Passing",
        purpose:"Measure passing accuracy to stationary targets.",
        equipment:["Ball","5 cones or targets on wall","Tape measure"],
        layout:"5 targets marked at varying heights. Pass from 10m. 60 seconds.",
        camera:"Side-on or behind player.",
        rules:["5 targets","60 seconds","Count hits only","Both feet allowed"],
        measures:["Passing accuracy","Weight of pass"],
        attempts:null, timer:60, camMode:"record", autScore:false },
      { id:"pass_2", level:"Intermediate", icon:"🔢", name:"Sequence Passing",
        purpose:"Measure accuracy when targets change in sequence.",
        equipment:["4 coloured cones (Red Blue Yellow Green)","Ball"],
        layout:"Cones at corners of a 5m square. App gives random colour sequence.",
        camera:"Front-on. All cones visible.",
        rules:["Follow colour sequence shown on screen","Wrong target = 0 pts for that attempt","10 targets in sequence","Both feet allowed"],
        measures:["Decision making","Accuracy under cognitive pressure"],
        attempts:10, timer:90, camMode:"record", autScore:false },
      { id:"pass_3", level:"Advanced", icon:"🏃", name:"Wall Pass Rondo",
        purpose:"Measure passing repetitions and first touch.",
        equipment:["Ball","Wall"],
        layout:"Stand 3m from wall. Pass and receive continuously.",
        camera:"Side-on. Player and wall both visible.",
        rules:["One touch only — receive and pass immediately","90 seconds","Count successful one-touch passes","Ball above knee = invalid"],
        measures:["First touch","Passing rhythm"],
        attempts:1, timer:90, camMode:"record", autScore:false },
      { id:"pass_4", level:"Elite", icon:"💪", name:"Pressure Passing",
        purpose:"Measure passing accuracy under full physical fatigue.",
        equipment:["Ball","Wall target","Cone for sprint start"],
        layout:"Sprint 10m → receive ball → pass target → sprint back → repeat",
        camera:"Side-on covering full sprint and target.",
        rules:["Sprint every time before passing","10 attempts","Target must be hit cleanly","No rest"],
        measures:["Passing under fatigue","Football passing fitness"],
        attempts:10, timer:300, camMode:"record", autScore:false },
    ]
  },
  dribbling: {
    label: "Ball Control", icon: "🌀", color: C.purple,
    desc: "4 challenges from juggling to 360 ball mastery under a 60s time trial.",
    challenges: [
      { id:"drib_1", level:"Beginner", icon:"🌀", name:"Max Juggle",
        purpose:"Measure basic ball control and touch.",
        equipment:["Ball"],
        layout:"Open space. Juggle as many times as possible.",
        camera:"Side-on. Full body visible.",
        rules:["Ball must not touch ground","Any body part above knee counts","3 attempts — best count saves","Count out loud or use app counter"],
        measures:["Touch quality","Ball feel"],
        attempts:3, timer:null, camMode:"record", autScore:false },
      { id:"drib_2", level:"Intermediate", icon:"🦶", name:"Weak Foot Juggling",
        purpose:"Measure weak foot ball control.",
        equipment:["Ball"],
        layout:"Same as Challenge 1 but weak foot only.",
        camera:"Side-on. Foot contact clearly visible.",
        rules:["Weak foot only","Ball can touch thigh of same leg","3 attempts"],
        measures:["Weak foot technique"],
        attempts:3, timer:null, camMode:"record", autScore:false },
      { id:"drib_3", level:"Advanced", icon:"↔️", name:"Alternating Feet",
        purpose:"Measure coordination and two-footedness.",
        equipment:["Ball"],
        layout:"Juggle but every touch must alternate feet — right, left, right, left.",
        camera:"Front-on. Both feet clearly visible.",
        rules:["Must alternate feet every touch","Same foot twice = restart","Thigh touches allowed to reset rhythm","3 attempts — best count"],
        measures:["Two-footedness","Coordination"],
        attempts:3, timer:null, camMode:"record", autScore:false },
      { id:"drib_4", level:"Elite", icon:"🔄", name:"360 Ball Mastery",
        purpose:"Measure technical ball mastery under time pressure.",
        equipment:["Ball"],
        layout:"Continuous combinations: inside touch → outside touch → sole roll → drag back. 60 seconds.",
        camera:"Top-down or side. Feet and ball clearly visible.",
        rules:["Sequence: inside → outside → sole → drag back","Each complete cycle = 1 point","60 seconds","Ball must not travel more than 1m from starting position"],
        measures:["Technical ability","Ball mastery"],
        attempts:1, timer:60, camMode:"record", autScore:false },
    ]
  },
  physical: {
    label: "Physical", icon: "💪", color: C.red,
    desc: "4 challenges from push-ups to a full football fitness circuit.",
    challenges: [
      { id:"phys_1", level:"Beginner", icon:"💪", name:"Push-up Max",
        purpose:"Measure upper body and core strength.",
        equipment:["Flat ground"],
        layout:"Standard push-up position. Camera side-on.",
        camera:"Side-on. Full body visible from head to feet.",
        rules:["Chest must touch ground every rep","Straight body throughout","No rest at bottom","60 seconds — max reps"],
        measures:["Upper body strength","Core stability"],
        attempts:1, timer:60, camMode:"pushups", autScore:true },
      { id:"phys_2", level:"Intermediate", icon:"🧱", name:"Wall Sit Hold",
        purpose:"Measure leg endurance and mental toughness.",
        equipment:["Wall"],
        layout:"Back flat against wall. Knees at 90 degrees. Hold.",
        camera:"Side-on. Knee angle visible.",
        rules:["Knees must stay at 90 degrees","Back flat on wall","Hands on thighs","Time stops when form breaks"],
        measures:["Leg endurance","Mental toughness"],
        attempts:1, timer:null, camMode:"record", autScore:false },
      { id:"phys_3", level:"Advanced", icon:"⚡", name:"Burpee Challenge",
        purpose:"Measure total body explosive power.",
        equipment:["Flat ground","Timer"],
        layout:"Standard burpee. Count max reps in 60 seconds.",
        camera:"Side-on. Full body visible.",
        rules:["Chest to floor on every rep","Must jump at top with hands above head","60 seconds — max reps"],
        measures:["Total body power","Cardiovascular fitness"],
        attempts:1, timer:60, camMode:"record", autScore:false },
      { id:"phys_4", level:"Elite", icon:"🏟️", name:"Football Fitness Circuit",
        purpose:"Measure functional football fitness.",
        equipment:["Flat ground","Cones","Ball (optional)"],
        layout:"5 push-ups → 10 squats → 20m sprint → 10 mountain climbers → repeat for 5 minutes",
        camera:"Wide angle covering full circuit.",
        rules:["No stopping between exercises","Count full rounds completed","5 minutes total","Film continuously"],
        measures:["Football endurance","Functional fitness"],
        attempts:1, timer:300, camMode:"record", autScore:false },
    ]
  },
};

// ── Camera Hook ────────────────────────────────────────────────
function useCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState(null);
  const [err, setErr] = useState(null);

  const startCam = useCallback(async (facing = "environment") => {
    setErr(null); setBlob(null); setReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true; video.autoplay = true; video.playsInline = true;
        video.setAttribute("muted",""); video.setAttribute("autoplay",""); video.setAttribute("playsinline","");
        await new Promise(r => { video.onloadedmetadata = r; setTimeout(r, 1000); });
        await video.play().catch(() => {});
      }
      setActive(true); setReady(true);
    } catch(e) {
      setErr(e.name === "NotAllowedError"
        ? "Camera access denied.\n\nGo to browser Settings → Site permissions → Camera → Allow."
        : e.name === "NotFoundError" ? "No camera found on this device."
        : "Camera error: " + e.message);
    }
  }, []);

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false); setRecording(false); setReady(false);
  }, []);

  const recStart = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    try {
      const mr = new MediaRecorder(streamRef.current);
      mr.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => setBlob(new Blob(chunksRef.current, { type: "video/webm" }));
      mr.start(100); recorderRef.current = mr; setRecording(true);
    } catch(e) { setErr("Recording error: " + e.message); }
  }, []);

  const recStop = useCallback(() => {
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
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
      if (!vid || !can || vid.readyState < 2 || vid.paused) { raf.current = requestAnimationFrame(detect); return; }
      try {
        const ctx = can.getContext("2d");
        can.width = Math.floor(vid.videoWidth / 4) || 160;
        can.height = Math.floor(vid.videoHeight / 4) || 90;
        ctx.drawImage(vid, 0, 0, can.width, can.height);
        const cur = ctx.getImageData(0, 0, can.width, can.height).data;
        if (prev.current && cur.length === prev.current.length) {
          let diff = 0;
          for (let i = 0; i < cur.length; i += 4)
            diff += Math.abs(cur[i]-prev.current[i]) + Math.abs(cur[i+1]-prev.current[i+1]) + Math.abs(cur[i+2]-prev.current[i+2]);
          onMotion(diff / (can.width * can.height));
        }
        prev.current = new Uint8ClampedArray(cur);
      } catch(_) {}
      raf.current = requestAnimationFrame(detect);
    }
    raf.current = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(raf.current);
  }, [enabled]);
}

// Timer
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

// ── Jump Camera — auto measures hang time, 3 attempts ─────────
function JumpCamera({ onResult, playerAge = 22 }) {
  const cam = useCamera();
  const [phase, setPhase] = useState("setup"); // setup | live | done
  const [attempts, setAttempts] = useState([]); // array of cm values
  const [currentHang, setCurrentHang] = useState(null);
  const [airborne, setAirborne] = useState(false);
  const [waitingJump, setWaitingJump] = useState(false);
  const jumpStart = useRef(null);
  const group = ageGroup(playerAge);

  useMotion(cam.videoRef, cam.canvasRef, phase === "live" && cam.ready && waitingJump, (score) => {
    const now = Date.now();
    if (!airborne && score > 90) { setAirborne(true); jumpStart.current = now; }
    if (airborne && score < 20 && jumpStart.current) {
      const h = (now - jumpStart.current) / 1000;
      if (h > 0.15 && h < 2.5) {
        const cm = Math.round(1.22 * h * h * 9.81 * 100);
        setCurrentHang(cm);
        setAirborne(false);
        setWaitingJump(false);
        jumpStart.current = null;
      }
    }
  });

  function saveAttempt() {
    if (currentHang === null) return;
    const newAttempts = [...attempts, currentHang];
    setAttempts(newAttempts);
    setCurrentHang(null);
    if (newAttempts.length >= 3) {
      const best = Math.max(...newAttempts);
      const score = rawToScore(best, JUMP_BENCH[group]);
      cam.stopCam();
      setPhase("done");
      onResult({ score, best, attempts: newAttempts });
    } else {
      setWaitingJump(false);
    }
  }

  function discardAttempt() {
    setCurrentHang(null);
    setWaitingJump(false);
  }

  async function openCamera() {
    await cam.startCam("environment");
    setPhase("live");
  }

  const best = attempts.length > 0 ? Math.max(...attempts) : null;

  if (phase === "setup") return (
    <div style={{ background:"#0A0A18", borderRadius:14, padding:20, border:`2px solid ${C.cyan}33` }}>
      <div style={{ fontSize:15, fontWeight:700, color:C.white, marginBottom:12 }}>How it works</div>
      <div style={{ fontSize:14, color:C.ghost, lineHeight:1.7, marginBottom:16 }}>
        Camera detects when your feet leave the ground and land again. Hang time is converted to jump height in cm. You get 3 attempts — best one is saved.
      </div>
      <div style={{ background:`${C.blue}14`, border:"1.5px solid #0066FF33", borderRadius:10, padding:12, marginBottom:16 }}>
        <div style={{ fontSize:13, color:C.blue, fontWeight:700, marginBottom:4 }}>Your Benchmark ({AGE_LABELS[group]})</div>
        <div style={{ fontSize:14, color:C.white }}>Average: <strong style={{ color:C.green }}>{JUMP_BENCH[group].avg}cm</strong> · Elite: <strong style={{ color:C.gold }}>{JUMP_BENCH[group].elite}cm</strong></div>
      </div>
      {cam.err && <div style={{ background:`${C.red}18`, border:"1.5px solid #FF224455", borderRadius:10, padding:12, marginBottom:14, color:C.red, fontSize:14, whiteSpace:"pre-line" }}>{cam.err}</div>}
      <Btn full onClick={openCamera} v="green" style={{ fontSize:17 }}>📷 Open Camera</Btn>
    </div>
  );

  if (phase === "live") return (
    <div style={{ position:"fixed", inset:0, zIndex:9000, display:"flex", flexDirection:"column", background:"#000" }}>
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <video ref={cam.videoRef} muted playsInline autoPlay style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
        <canvas ref={cam.canvasRef} style={{ display:"none" }}/>
        {!cam.ready && <div style={{ position:"absolute", inset:0, background:"#000", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}><div style={{ fontSize:48 }}>📷</div><div style={{ fontSize:18, color:C.ghost }}>Starting camera...</div></div>}
        {cam.ready && (
          <>
            {/* Attempts tracker */}
            <div style={{ position:"absolute", top:20, left:20, background:"#000000CC", borderRadius:12, padding:"10px 16px" }}>
              <div style={{ fontSize:12, color:C.ghost, marginBottom:4 }}>ATTEMPTS</div>
              <div style={{ display:"flex", gap:8 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width:36, height:36, borderRadius:"50%", background:i < attempts.length ? C.green : "#333355", border:`2px solid ${i < attempts.length ? C.green : "#444466"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:i < attempts.length ? "#000" : C.ghost }}>
                    {i < attempts.length ? attempts[i]+"cm" : i+1}
                  </div>
                ))}
              </div>
              {best && <div style={{ fontSize:12, color:C.green, marginTop:6, fontWeight:700 }}>Best: {best}cm</div>}
            </div>

            {/* Jump result overlay */}
            {currentHang !== null ? (
              <div style={{ position:"absolute", inset:0, background:"#000000BB", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
                <div style={{ fontSize:72, fontWeight:900, color:C.green, textShadow:`0 0 30px ${C.green}` }}>{currentHang}cm</div>
                <div style={{ fontSize:16, color:C.ghost }}>Jump detected · Attempt {attempts.length + 1} of 3</div>
                <div style={{ display:"flex", gap:12 }}>
                  <Btn v="green" onClick={saveAttempt}>✓ Save this jump</Btn>
                  <Btn v="ghost" onClick={discardAttempt}>↩ Redo</Btn>
                </div>
              </div>
            ) : waitingJump ? (
              <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"#000000CC", borderRadius:14, padding:"16px 28px", textAlign:"center" }}>
                <div style={{ fontSize:44, marginBottom:8 }}>⬆️</div>
                <div style={{ fontSize:18, fontWeight:700, color:C.cyan }}>{airborne ? "AIRBORNE..." : "Jump now!"}</div>
              </div>
            ) : null}
          </>
        )}
        <button onClick={() => { cam.stopCam(); setPhase("setup"); }} style={{ position:"absolute", bottom:16, right:16, background:"#000000AA", border:"1.5px solid #333355", color:C.white, borderRadius:10, padding:"10px 18px", cursor:"pointer", fontSize:15, fontWeight:700 }}>✕ Close</button>
      </div>

      {/* Controls */}
      <div style={{ background:"#0A0A18", borderTop:"2px solid #1A1A2E", padding:"16px 20px", flexShrink:0 }}>
        {cam.ready && currentHang === null && !waitingJump && (
          <Btn full v="green" onClick={() => setWaitingJump(true)} style={{ fontSize:18, padding:"18px" }}>
            ⬆️ Start Jump {attempts.length + 1} of 3
          </Btn>
        )}
        {!cam.ready && <div style={{ textAlign:"center", color:C.ghost, fontSize:14 }}>Starting camera...</div>}
      </div>
    </div>
  );

  if (phase === "done") return null;
  return null;
}

// ── Sprint Camera — auto-times, 3 attempts ────────────────────
function SprintCamera({ onResult, playerAge = 22, distance = 10 }) {
  const cam = useCamera();
  const [phase, setPhase] = useState("setup");
  const [state, setState] = useState("idle"); // idle | waiting | running | done
  const [attempts, setAttempts] = useState([]);
  const [currentTime, setCurrentTime] = useState(null);
  const sprintStart = useRef(null);
  const group = ageGroup(playerAge);

  useMotion(cam.videoRef, cam.canvasRef, phase === "live" && cam.ready && state === "waiting", (score) => {
    const now = Date.now();
    if (state === "waiting" && score > 55) { sprintStart.current = now; setState("running"); }
  });

  useMotion(cam.videoRef, cam.canvasRef, phase === "live" && cam.ready && state === "running", (score) => {
    const now = Date.now();
    if (state === "running" && score < 12 && sprintStart.current) {
      const el = (now - sprintStart.current) / 1000;
      if (el > 0.4 && el < 12) {
        setCurrentTime(parseFloat(el.toFixed(2)));
        setState("done");
        sprintStart.current = null;
      }
    }
  });

  function saveAttempt() {
    if (currentTime === null) return;
    const newAttempts = [...attempts, currentTime];
    setAttempts(newAttempts);
    setCurrentTime(null);
    setState("idle");
    if (newAttempts.length >= 3) {
      const best = Math.min(...newAttempts); // lower = faster
      const score = sprintToScore(best, group);
      cam.stopCam();
      onResult({ score, best, attempts: newAttempts });
    }
  }

  async function openCamera() {
    await cam.startCam("environment");
    setPhase("live");
  }

  const best = attempts.length > 0 ? Math.min(...attempts) : null;

  if (phase === "setup") return (
    <div style={{ background:"#0A0A18", borderRadius:14, padding:20, border:`2px solid ${C.green}33` }}>
      <div style={{ fontSize:15, fontWeight:700, marginBottom:10 }}>Auto-timing — {distance}m Sprint</div>
      <div style={{ fontSize:14, color:C.ghost, lineHeight:1.7, marginBottom:14 }}>Motion detection times your sprint automatically. Press Start Sprint, then run as fast as you can. 3 attempts — best counts.</div>
      <div style={{ background:`${C.blue}14`, border:"1.5px solid #0066FF33", borderRadius:10, padding:12, marginBottom:14 }}>
        <div style={{ fontSize:13, color:C.blue, fontWeight:700, marginBottom:4 }}>Benchmark ({AGE_LABELS[group]})</div>
        <div style={{ fontSize:14, color:C.white }}>Average: <strong style={{ color:C.green }}>{SPRINT_BENCH[group].avg}s</strong> · Elite: <strong style={{ color:C.gold }}>{SPRINT_BENCH[group].elite}s</strong></div>
      </div>
      {cam.err && <div style={{ background:`${C.red}18`, border:"1.5px solid #FF224455", borderRadius:10, padding:12, marginBottom:14, color:C.red, fontSize:14, whiteSpace:"pre-line" }}>{cam.err}</div>}
      <Btn full onClick={openCamera} v="green" style={{ fontSize:17 }}>📷 Open Camera</Btn>
    </div>
  );

  if (phase === "live") return (
    <div style={{ position:"fixed", inset:0, zIndex:9000, display:"flex", flexDirection:"column", background:"#000" }}>
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <video ref={cam.videoRef} muted playsInline autoPlay style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
        <canvas ref={cam.canvasRef} style={{ display:"none" }}/>
        {cam.ready && (
          <>
            <div style={{ position:"absolute", left:"8%", top:0, bottom:0, width:4, background:C.green, boxShadow:`0 0 14px ${C.green}` }}/>
            <div style={{ position:"absolute", right:"8%", top:0, bottom:0, width:4, background:C.red, boxShadow:`0 0 14px ${C.red}` }}/>
            {/* Attempt tracker */}
            <div style={{ position:"absolute", top:20, left:20, background:"#000000CC", borderRadius:12, padding:"10px 16px" }}>
              <div style={{ fontSize:12, color:C.ghost, marginBottom:6 }}>ATTEMPTS</div>
              <div style={{ display:"flex", gap:8 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ background:i<attempts.length?C.green:"#333355", border:`2px solid ${i<attempts.length?C.green:"#444466"}`, borderRadius:8, padding:"4px 10px", fontSize:13, fontWeight:900, color:i<attempts.length?"#000":C.ghost }}>
                    {i<attempts.length ? attempts[i]+"s" : i+1}
                  </div>
                ))}
              </div>
              {best && <div style={{ fontSize:12, color:C.green, marginTop:6, fontWeight:700 }}>Best: {best}s</div>}
            </div>
            {/* Status */}
            <div style={{ position:"absolute", top:20, left:"50%", transform:"translateX(-50%)", background:"#000000CC", borderRadius:14, padding:"12px 22px", textAlign:"center", minWidth:200 }}>
              {state==="idle"    && <div style={{ fontSize:15, color:C.green, fontWeight:700 }}>Press Start Sprint ↓</div>}
              {state==="waiting" && <div style={{ fontSize:20, fontWeight:900, color:C.green }}>⚡ RUN NOW!</div>}
              {state==="running" && <div style={{ fontSize:18, fontWeight:900, color:C.gold }}>🏃 SPRINTING...</div>}
              {state==="done"    && currentTime !== null && (
                <div>
                  <div style={{ fontSize:32, fontWeight:900, color:C.green }}>{currentTime}s ✓</div>
                  <div style={{ fontSize:13, color:C.ghost }}>Attempt {attempts.length+1} of 3</div>
                </div>
              )}
            </div>
          </>
        )}
        <button onClick={() => { cam.stopCam(); setPhase("setup"); }} style={{ position:"absolute", bottom:16, right:16, background:"#000000AA", border:"1.5px solid #333355", color:C.white, borderRadius:10, padding:"10px 18px", cursor:"pointer", fontSize:15, fontWeight:700 }}>✕ Close</button>
      </div>
      <div style={{ background:"#0A0A18", borderTop:"2px solid #1A1A2E", padding:"16px 20px", flexShrink:0, display:"flex", gap:12 }}>
        {state==="idle" && <Btn full v="green" onClick={() => setState("waiting")} style={{ fontSize:18, padding:"18px" }}>⚡ Start Sprint {attempts.length+1}</Btn>}
        {state==="waiting" && <Btn full v="ghost" onClick={() => setState("idle")} style={{ fontSize:18, padding:"18px" }}>↩ Cancel</Btn>}
        {state==="running" && <Btn full v="ghost" onClick={() => { setState("idle"); sprintStart.current=null; }} style={{ fontSize:18, padding:"18px" }}>↩ Reset</Btn>}
        {state==="done" && <><Btn full v="green" onClick={saveAttempt} style={{ fontSize:18, padding:"18px" }}>✓ Save {currentTime}s</Btn><Btn v="ghost" onClick={() => { setState("idle"); setCurrentTime(null); }} style={{ fontSize:16, padding:"18px 14px" }}>↩</Btn></>}
      </div>
    </div>
  );
  return null;
}

// ── Push-up Camera — auto-counts ──────────────────────────────
function PushupCamera({ onResult, playerAge = 22 }) {
  const cam = useCamera();
  const [phase, setPhase] = useState("setup");
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const motionBuf = useRef([]);
  const group = ageGroup(playerAge);
  const timer = useTimer(60, () => {
    cam.recStop();
    const score = rawToScore(count, PUSH_BENCH[group]);
    onResult({ score, raw: count, label: `${count} reps in 60s` });
  });

  useMotion(cam.videoRef, cam.canvasRef, phase === "live" && cam.ready && started, (score) => {
    motionBuf.current.push({ score, time: Date.now() });
    if (motionBuf.current.length > 30) motionBuf.current.shift();
    const r = motionBuf.current.slice(-8), p = motionBuf.current.slice(-16,-8);
    const ar = r.reduce((a,b) => a+b.score, 0) / r.length;
    const ap = p.length ? p.reduce((a,b) => a+b.score, 0) / p.length : 0;
    if (ap > 40 && ar < 12) setCount(c => c+1);
  });

  async function openCamera() { await cam.startCam("environment"); setPhase("live"); }
  function startTest() { setStarted(true); cam.recStart(); timer.start(); }

  if (phase === "setup") return (
    <div style={{ background:"#0A0A18", borderRadius:14, padding:20, border:`2px solid ${C.red}33` }}>
      <div style={{ fontSize:14, color:C.ghost, lineHeight:1.7, marginBottom:14 }}>Camera counts your push-up reps automatically. Position phone 2m to the side — full body visible. 60 seconds max.</div>
      <div style={{ background:`${C.blue}14`, border:"1.5px solid #0066FF33", borderRadius:10, padding:12, marginBottom:14 }}>
        <div style={{ fontSize:13, color:C.blue, fontWeight:700, marginBottom:4 }}>Benchmark ({AGE_LABELS[group]})</div>
        <div style={{ fontSize:14, color:C.white }}>Average: <strong style={{ color:C.green }}>{PUSH_BENCH[group].avg}</strong> · Elite: <strong style={{ color:C.gold }}>{PUSH_BENCH[group].elite}</strong> reps</div>
      </div>
      {cam.err && <div style={{ background:`${C.red}18`, borderRadius:10, padding:12, marginBottom:14, color:C.red, fontSize:14, whiteSpace:"pre-line" }}>{cam.err}</div>}
      <Btn full onClick={openCamera} v="green" style={{ fontSize:17 }}>📷 Open Camera</Btn>
    </div>
  );

  if (phase === "live") return (
    <div style={{ position:"fixed", inset:0, zIndex:9000, display:"flex", flexDirection:"column", background:"#000" }}>
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <video ref={cam.videoRef} muted playsInline autoPlay style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
        <canvas ref={cam.canvasRef} style={{ display:"none" }}/>
        {cam.ready && <>
          <div style={{ position:"absolute", top:20, right:20, background:"#000000CC", borderRadius:16, padding:"14px 20px", textAlign:"center" }}>
            <div style={{ fontSize:56, fontWeight:900, color:C.green, lineHeight:1 }}>{count}</div>
            <div style={{ fontSize:14, color:C.ghost, marginTop:4 }}>REPS</div>
          </div>
          {timer.on && (
            <div style={{ position:"absolute", top:20, left:20, background:"#000000CC", borderRadius:10, padding:"8px 16px" }}>
              <div style={{ fontSize:26, fontWeight:900, color:timer.t<10?C.red:C.white }}>{timer.display}</div>
            </div>
          )}
          {cam.recording && (
            <div style={{ position:"absolute", bottom:20, left:20, display:"flex", alignItems:"center", gap:8, background:"#000000AA", borderRadius:8, padding:"8px 14px" }}>
              <div style={{ width:12, height:12, borderRadius:"50%", background:C.red, animation:"blink 1s infinite" }}/>
              <span style={{ fontSize:14, color:C.white, fontWeight:700 }}>RECORDING</span>
            </div>
          )}
        </>}
        <button onClick={() => { cam.stopCam(); timer.stop(); setPhase("setup"); }} style={{ position:"absolute", bottom:16, right:16, background:"#000000AA", border:"1.5px solid #333355", color:C.white, borderRadius:10, padding:"10px 18px", cursor:"pointer", fontSize:15, fontWeight:700 }}>✕ Close</button>
      </div>
      <div style={{ background:"#0A0A18", borderTop:"2px solid #1A1A2E", padding:"16px 20px", flexShrink:0 }}>
        {!started && cam.ready && <Btn full v="green" onClick={startTest} style={{ fontSize:18, padding:"18px" }}>💪 Start 60s Test</Btn>}
        {started && <div style={{ textAlign:"center", color:C.ghost, fontSize:14 }}>Keep going! Camera is counting automatically...</div>}
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
    </div>
  );
  return null;
}

// ── Chaos Agility — screen FLASH commands, no tapping ─────────
function ChaosAgility({ onResult, attempts = 3 }) {
  const [phase, setPhase] = useState("setup"); // setup | memorise | run | rest | done
  const [sequence, setSequence] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [attemptResults, setAttemptResults] = useState([]);
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [flashColor, setFlashColor] = useState(null);
  const [reactionTimes, setReactionTimes] = useState([]);
  const cmdStart = useRef(null);
  const flashTimeout = useRef(null);
  const CONES = ["1","2","3","4","5","6","7","8"];
  const CONE_COLORS = ["#FF2244","#0066FF","#00C851","#FFB800","#AA44FF","#00DDFF","#FF8844","#FF44AA"];

  function generateSequence() {
    const seq = [];
    const shuffled = [...CONES].sort(() => Math.random()-0.5);
    for (let i = 0; i < 6; i++) seq.push(shuffled[i]);
    return seq;
  }

  function startAttempt() {
    const seq = generateSequence();
    setSequence(seq);
    setPhase("memorise");
    setTimeout(() => {
      setPhase("run");
      setCurrentIdx(0);
      setReactionTimes([]);
      showNextCommand(seq, 0);
    }, 8000); // 8 seconds to memorise
  }

  function showNextCommand(seq, idx) {
    if (idx >= seq.length) {
      // Attempt done
      const avg = reactionTimes.length > 0 ? reactionTimes.reduce((a,b)=>a+b,0)/reactionTimes.length : 999;
      const newResults = [...attemptResults, avg];
      setAttemptResults(newResults);
      setFlashColor(null);
      if (currentAttempt >= attempts) {
        setPhase("done");
        const best = Math.min(...newResults);
        const score = best<600?88:best<800?76:best<1000?64:best<1300?52:38;
        onResult({ score, best, attempts: newResults });
      } else {
        setPhase("rest");
        setCurrentAttempt(c=>c+1);
      }
      return;
    }
    // Flash the command
    const coneIdx = parseInt(seq[idx]) - 1;
    setFlashColor(CONE_COLORS[coneIdx]);
    setCurrentIdx(idx);
    cmdStart.current = Date.now();
    // Auto-advance after 2 seconds (no tapping needed — just run to it)
    flashTimeout.current = setTimeout(() => {
      const rt = Date.now() - cmdStart.current;
      setReactionTimes(prev => [...prev, rt]);
      setFlashColor(null);
      setTimeout(() => showNextCommand(seq, idx+1), 500);
    }, 2000);
  }

  return (
    <div style={{ borderRadius:14, overflow:"hidden", border:`2px solid ${C.gold}33` }}>
      {phase==="setup" && (
        <div style={{ background:"#0A0A18", padding:20 }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:12 }}>🧠 Chaos Circuit</div>
          <div style={{ fontSize:14, color:C.ghost, lineHeight:1.7, marginBottom:16 }}>
            Place 8 numbered cones in a circle, 3m apart. A random sequence of 6 cones will flash on screen — one every 2 seconds. Run to each one in order. No tapping needed — just run!
          </div>
          <div style={{ background:`${C.gold}14`, border:"1.5px solid #FFB80033", borderRadius:10, padding:12, marginBottom:16 }}>
            <div style={{ fontSize:13, color:C.gold, fontWeight:700, marginBottom:4 }}>⚠️ Setup Required</div>
            <div style={{ fontSize:13, color:C.ghost }}>8 numbered cones in a circle, each 3m from centre. You stand in the middle.</div>
          </div>
          <Btn full v="gold" onClick={startAttempt} style={{ fontSize:17 }}>▶ Start Attempt {currentAttempt} of {attempts}</Btn>
        </div>
      )}

      {phase==="memorise" && (
        <div style={{ background:"#0A0A18", padding:24, textAlign:"center" }}>
          <div style={{ fontSize:14, color:C.gold, fontWeight:700, marginBottom:16 }}>MEMORISE THIS SEQUENCE — 8 SECONDS</div>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginBottom:16 }}>
            {sequence.map((cone,i) => (
              <div key={i} style={{ width:52, height:52, borderRadius:"50%", background:CONE_COLORS[parseInt(cone)-1], display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color:"#000" }}>
                {cone}
              </div>
            ))}
          </div>
          <div style={{ fontSize:16, color:C.ghost }}>Run starts in 8 seconds...</div>
        </div>
      )}

      {phase==="run" && (
        <div style={{ background:flashColor||"#0A0A18", minHeight:280, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", transition:"background 0.1s" }}>
          {flashColor ? (
            <>
              <div style={{ fontSize:120, fontWeight:900, color:"#000000CC", lineHeight:1 }}>{sequence[currentIdx]}</div>
              <div style={{ fontSize:20, color:"#000000AA", fontWeight:700, marginTop:8 }}>RUN TO CONE {sequence[currentIdx]}</div>
            </>
          ) : (
            <div style={{ fontSize:18, color:C.ghost }}>Get ready...</div>
          )}
          <div style={{ position:"absolute", top:20, right:20, background:"#000000AA", borderRadius:8, padding:"8px 14px" }}>
            <div style={{ fontSize:14, color:C.white, fontWeight:700 }}>{currentIdx+1} / {sequence.length}</div>
          </div>
        </div>
      )}

      {phase==="rest" && (
        <div style={{ background:"#0A0A18", padding:24, textAlign:"center" }}>
          <div style={{ fontSize:24, fontWeight:900, color:C.green, marginBottom:10 }}>Attempt {currentAttempt-1} Done ✓</div>
          <div style={{ fontSize:14, color:C.ghost, marginBottom:20 }}>Rest 30 seconds, then start next attempt.</div>
          <Btn full v="green" onClick={startAttempt} style={{ fontSize:17 }}>▶ Start Attempt {currentAttempt} of {attempts}</Btn>
        </div>
      )}

      {phase==="done" && (
        <div style={{ background:"#0A0A18", padding:24, textAlign:"center" }}>
          <div style={{ fontSize:56, marginBottom:12 }}>✅</div>
          <div style={{ fontSize:22, fontWeight:900, color:C.green }}>All attempts complete</div>
        </div>
      )}
    </div>
  );
}

// ── General Record Camera (for manual score entry) ─────────────
function RecordCamera({ challenge, onResult }) {
  const cam = useCamera();
  const [phase, setPhase] = useState("setup");
  const [scoreInput, setScoreInput] = useState("");
  const timer = useTimer(challenge.timer || 120, () => { cam.recStop(); setPhase("scoring"); });

  async function openCamera() { await cam.startCam("environment"); setPhase("live"); }

  if (phase === "setup") return (
    <div style={{ background:"#0A0A18", borderRadius:14, padding:20, border:`2px solid ${C.blue}33` }}>
      <div style={{ fontSize:14, color:C.ghost, lineHeight:1.7, marginBottom:16 }}>Film your attempt. When done, stop the camera and enter your score.</div>
      {cam.err && <div style={{ background:`${C.red}18`, borderRadius:10, padding:12, marginBottom:14, color:C.red, fontSize:14, whiteSpace:"pre-line" }}>{cam.err}</div>}
      <Btn full onClick={openCamera} v="green" style={{ fontSize:17 }}>📷 Open Camera</Btn>
    </div>
  );

  if (phase === "live") return (
    <div style={{ position:"fixed", inset:0, zIndex:9000, display:"flex", flexDirection:"column", background:"#000" }}>
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <video ref={cam.videoRef} muted playsInline autoPlay style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
        {cam.ready && <>
          {timer.on && <div style={{ position:"absolute", top:20, left:20, background:"#000000CC", borderRadius:10, padding:"8px 16px" }}><div style={{ fontSize:26, fontWeight:900, color:timer.t<10?C.red:C.white }}>{timer.display}</div></div>}
          {cam.recording && <div style={{ position:"absolute", bottom:20, left:20, display:"flex", alignItems:"center", gap:8, background:"#000000AA", borderRadius:8, padding:"8px 14px" }}><div style={{ width:12, height:12, borderRadius:"50%", background:C.red, animation:"blink 1s infinite" }}/><span style={{ fontSize:14, color:C.white, fontWeight:700 }}>RECORDING</span></div>}
        </>}
        <button onClick={() => { cam.stopCam(); timer.stop(); setPhase("setup"); }} style={{ position:"absolute", bottom:16, right:16, background:"#000000AA", border:"1.5px solid #333355", color:C.white, borderRadius:10, padding:"10px 18px", cursor:"pointer", fontSize:15, fontWeight:700 }}>✕ Close</button>
      </div>
      <div style={{ background:"#0A0A18", borderTop:"2px solid #1A1A2E", padding:"16px 20px", flexShrink:0, display:"flex", gap:12 }}>
        {!cam.recording && cam.ready && <Btn full v="green" onClick={() => { cam.recStart(); if(challenge.timer) timer.start(); }} style={{ fontSize:18, padding:"18px" }}>⏺ Start Recording</Btn>}
        {cam.recording && <Btn full v="red" onClick={() => { cam.recStop(); timer.stop(); setPhase("scoring"); }} style={{ fontSize:18, padding:"18px" }}>⏹ Stop & Score</Btn>}
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
    </div>
  );

  if (phase === "scoring") return (
    <div style={{ background:"#0A0A18", borderRadius:14, padding:22, border:`2px solid ${C.green}33` }}>
      <div style={{ fontSize:18, fontWeight:900, marginBottom:10 }}>Enter Your Score</div>
      <p style={{ color:C.ghost, fontSize:14, lineHeight:1.7, marginBottom:16 }}>Watch your clip back honestly. Enter your result. Your video is saved for community verification.</p>
      <Input label={challenge.id.startsWith("jump") ? "Distance (cm)" : challenge.id.startsWith("pace") ? "Time (seconds)" : "Your Score"} type="number" value={scoreInput} onChange={setScoreInput} placeholder={challenge.id.startsWith("pace") ? "e.g. 4.2" : "e.g. 75"}/>
      <Btn full onClick={() => { if(scoreInput) onResult({ score: parseInt(scoreInput)||parseFloat(scoreInput), label: scoreInput }); }} disabled={!scoreInput} v="green" style={{ fontSize:17 }}>✓ Submit</Btn>
    </div>
  );
  return null;
}

// ── DEVELOP TAB ────────────────────────────────────────────────
function DevelopTab({ player, onStat }) {
  const [view, setView] = useState("menu"); // menu | stat | challenge
  const [selStat, setSelStat] = useState(null);
  const [selChallenge, setSelChallenge] = useState(null);
  const [phase, setPhase] = useState("brief"); // brief | camera | done
  const [linkedCode, setLinkedCode] = useState("");
  const [linked, setLinked] = useState(null);
  const [challengePhase, setChallengePhase] = useState("link");
  const [toast, setToast] = useState("");
  const age = calcAge(player?.date_of_birth);
  const group = ageGroup(age);
  const showToast = (m,t="ok") => { setToast({m,t}); setTimeout(()=>setToast(""),2500); };

  async function findOpponent() {
    if (!linkedCode.trim()) return;
    try {
      const r = await sbFetch(`players?challenge_code=eq.${linkedCode.trim().toUpperCase()}&limit=1`);
      if (!r?.[0]) { showToast("Code not found","err"); return; }
      setLinked(r[0]);
    } catch { showToast("Search failed","err"); }
  }

  function handleResult(res, statKey) {
    if (res.score != null) {
      onStat(statKey, Math.min(99, Math.max(15, Math.round(res.score))));
      showToast("Score saved ✓");
    }
    setPhase("done");
  }

  function goBack() {
    if (phase !== "brief") { setPhase("brief"); return; }
    if (selChallenge) { setSelChallenge(null); setPhase("brief"); return; }
    if (selStat) { setSelStat(null); setView("menu"); return; }
    if (view !== "menu") { setView("menu"); setChallengePhase("link"); }
  }

  const statDef = selStat ? STAT_CHALLENGES[selStat] : null;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.white, paddingBottom:100 }}>
      <Hdr
        title={selChallenge ? selChallenge.name : selStat ? statDef.label : view==="menu" ? "Develop" : "Challenges"}
        sub={selChallenge ? selChallenge.level : "Level Up"}
        back={view!=="menu"||selStat||selChallenge ? goBack : undefined}
      />
      <Toast msg={toast?.m} type={toast?.t}/>
      <div style={{ padding:"20px 20px", maxWidth:480, margin:"0 auto" }}>

        {/* ── MENU ── */}
        {view==="menu" && !selStat && (
          <>
            {/* Stats overview */}
            <div style={{ background:"#0A0A18", borderRadius:14, padding:18, marginBottom:20, border:"1px solid #1A1A2E" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontSize:17, fontWeight:900 }}>Your Stats</div>
                {age && <Pill color={C.blue}>{AGE_LABELS[group]}</Pill>}
              </div>
              {Object.entries(STATS_META).map(([k,m]) => <StatBar key={k} label={m.l} value={player?.stats?.[k]} color={m.color}/>)}
            </div>

            {/* Stat categories */}
            <div style={{ fontSize:12, color:C.ghost, letterSpacing:2, textTransform:"uppercase", fontWeight:700, marginBottom:12 }}>Choose a Stat to Train</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
              {Object.entries(STAT_CHALLENGES).map(([key, def]) => {
                const v = player?.stats?.[key] || 0;
                const done = def.challenges.filter((_,i) => v > 0 && i === 0).length;
                return (
                  <button key={key} onClick={() => { setSelStat(key); setView("stat"); }}
                    style={{ background:`linear-gradient(135deg,${def.color}18,${def.color}08)`, border:`2px solid ${def.color}44`, borderRadius:14, padding:16, textAlign:"left", cursor:"pointer", color:C.white }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>{def.icon}</div>
                    <div style={{ fontSize:15, fontWeight:800, color:def.color, marginBottom:4 }}>{def.label}</div>
                    <div style={{ fontSize:12, color:C.ghost }}>{def.challenges.length} challenges</div>
                    {v > 0 && <div style={{ marginTop:8, fontSize:18, fontWeight:900, color:sc(v) }}>{v}</div>}
                  </button>
                );
              })}
            </div>

            {/* 1v1 challenges */}
            <button onClick={() => setView("challenges")}
              style={{ width:"100%", background:`linear-gradient(135deg,${C.blue}18,${C.blue}08)`, border:`2px solid ${C.blue}44`, borderRadius:16, padding:20, textAlign:"left", cursor:"pointer", color:C.white, display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ fontSize:44 }}>⚔️</div>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:C.blue, marginBottom:5 }}>1v1 Challenges</div>
                <div style={{ fontSize:14, color:C.ghost, lineHeight:1.6 }}>Link up with a registered opponent. Age-weighted XP.</div>
              </div>
            </button>
          </>
        )}

        {/* ── STAT DETAIL ── */}
        {view==="stat" && selStat && !selChallenge && statDef && (
          <>
            <div style={{ background:`linear-gradient(135deg,${statDef.color}18,${statDef.color}08)`, border:`2px solid ${statDef.color}44`, borderRadius:14, padding:18, marginBottom:20, display:"flex", gap:14, alignItems:"center" }}>
              <div style={{ fontSize:48 }}>{statDef.icon}</div>
              <div>
                <div style={{ fontSize:20, fontWeight:900, color:statDef.color }}>{statDef.label}</div>
                <div style={{ fontSize:13, color:C.ghost, marginTop:4, lineHeight:1.6 }}>{statDef.desc}</div>
                {player?.stats?.[selStat] > 0 && <div style={{ marginTop:8, fontSize:22, fontWeight:900, color:sc(player.stats[selStat]) }}>Current: {player.stats[selStat]}</div>}
              </div>
            </div>

            {/* Challenge list */}
            {statDef.challenges.map((ch, i) => (
              <button key={ch.id} onClick={() => { setSelChallenge(ch); setPhase("brief"); }}
                style={{ width:"100%", background:"#0A0A18", border:`2px solid ${i===0?statDef.color+"55":"#1A1A2E"}`, borderRadius:14, padding:16, textAlign:"left", cursor:"pointer", color:C.white, marginBottom:10, display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:44, height:44, borderRadius:10, background:`${statDef.color}22`, border:`1.5px solid ${statDef.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{ch.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <div style={{ fontSize:15, fontWeight:800 }}>{ch.name}</div>
                    <span style={{ background:`${statDef.color}22`, border:`1px solid ${statDef.color}44`, borderRadius:6, padding:"2px 8px", fontSize:10, color:statDef.color, fontWeight:700 }}>{ch.level}</span>
                  </div>
                  <div style={{ fontSize:13, color:C.ghost }}>{ch.purpose}</div>
                  <div style={{ marginTop:5, display:"flex", gap:6, flexWrap:"wrap" }}>
                    {ch.autScore && <span style={{ background:`${C.green}18`, border:`1px solid ${C.green}44`, borderRadius:4, padding:"2px 8px", fontSize:10, color:C.green, fontWeight:700 }}>🤖 AUTO</span>}
                    {ch.attempts && <span style={{ background:"#1A1A2E", borderRadius:4, padding:"2px 8px", fontSize:10, color:C.ghost }}>{ch.attempts} attempt{ch.attempts>1?"s":""}</span>}
                    {ch.timer && <span style={{ background:"#1A1A2E", borderRadius:4, padding:"2px 8px", fontSize:10, color:C.ghost }}>⏱ {ch.timer>=60?Math.floor(ch.timer/60)+"min":ch.timer+"s"}</span>}
                  </div>
                </div>
                <div style={{ fontSize:20, color:statDef.color }}>→</div>
              </button>
            ))}
          </>
        )}

        {/* ── CHALLENGE BRIEF ── */}
        {selChallenge && phase==="brief" && statDef && (
          <>
            {/* Header card */}
            <div style={{ background:`linear-gradient(135deg,${statDef.color}18,${statDef.color}06)`, border:`2px solid ${statDef.color}44`, borderRadius:14, padding:20, marginBottom:18, textAlign:"center" }}>
              <div style={{ fontSize:52, marginBottom:10 }}>{selChallenge.icon}</div>
              <div style={{ fontSize:22, fontWeight:900, marginBottom:6 }}>{selChallenge.name}</div>
              <div style={{ fontSize:13, color:C.ghost, lineHeight:1.6 }}>{selChallenge.purpose}</div>
            </div>

            {/* Layout diagram */}
            {selChallenge.layout && (
              <div style={{ background:"#0A0A18", borderRadius:12, padding:16, marginBottom:14, border:"1px solid #1A1A2E" }}>
                <div style={{ fontSize:12, color:C.ghost, letterSpacing:2, textTransform:"uppercase", fontWeight:700, marginBottom:10 }}>Layout</div>
                <div style={{ fontFamily:"monospace", fontSize:13, color:C.green, lineHeight:1.8, whiteSpace:"pre-wrap" }}>{selChallenge.layout}</div>
              </div>
            )}

            {/* Equipment */}
            {selChallenge.equipment?.length > 0 && (
              <div style={{ background:"#0A0A18", borderRadius:12, padding:16, marginBottom:14, border:"1px solid #1A1A2E" }}>
                <div style={{ fontSize:12, color:C.ghost, letterSpacing:2, textTransform:"uppercase", fontWeight:700, marginBottom:10 }}>Equipment</div>
                {selChallenge.equipment.map((e,i) => (
                  <div key={i} style={{ display:"flex", gap:10, marginBottom:6 }}>
                    <div style={{ color:C.green, fontWeight:700 }}>✓</div>
                    <div style={{ fontSize:14, color:C.white }}>{e}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Camera placement */}
            {selChallenge.camera && (
              <div style={{ background:`${C.blue}14`, border:"1.5px solid #0066FF33", borderRadius:12, padding:14, marginBottom:14 }}>
                <div style={{ fontSize:12, color:C.blue, letterSpacing:2, textTransform:"uppercase", fontWeight:700, marginBottom:6 }}>📷 Camera Placement</div>
                <div style={{ fontSize:14, color:C.white }}>{selChallenge.camera}</div>
              </div>
            )}

            {/* Rules */}
            {selChallenge.rules?.length > 0 && (
              <div style={{ background:"#0A0A18", borderRadius:12, padding:16, marginBottom:14, border:"1px solid #1A1A2E" }}>
                <div style={{ fontSize:12, color:C.ghost, letterSpacing:2, textTransform:"uppercase", fontWeight:700, marginBottom:10 }}>Rules</div>
                {selChallenge.rules.map((r,i) => (
                  <div key={i} style={{ display:"flex", gap:12, marginBottom:8 }}>
                    <div style={{ width:24, height:24, borderRadius:"50%", background:`${statDef.color}22`, border:`1.5px solid ${statDef.color}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:statDef.color, flexShrink:0 }}>{i+1}</div>
                    <div style={{ fontSize:14, color:C.offwhite, lineHeight:1.5 }}>{r}</div>
                  </div>
                ))}
              </div>
            )}

            {/* What it measures */}
            {selChallenge.measures?.length > 0 && (
              <div style={{ background:`${C.gold}0a`, border:"1.5px solid #FFB80033", borderRadius:12, padding:14, marginBottom:18 }}>
                <div style={{ fontSize:12, color:C.gold, letterSpacing:2, textTransform:"uppercase", fontWeight:700, marginBottom:8 }}>What This Measures</div>
                {selChallenge.measures.map((m,i) => <div key={i} style={{ fontSize:14, color:C.white, marginBottom:4 }}>⭐ {m}</div>)}
              </div>
            )}

            <Btn full onClick={() => setPhase("camera")} v="green" style={{ fontSize:18 }}>
              {selChallenge.autScore ? "📷 Open Camera — Auto Measure" : "📷 Open Camera"}
            </Btn>
          </>
        )}

        {/* ── CAMERA PHASE ── */}
        {selChallenge && phase==="camera" && statDef && (
          <>
            {/* Sprint challenges */}
            {(selChallenge.id==="pace_1"||selChallenge.id==="pace_2") && (
              <SprintCamera
                onResult={res => handleResult(res, selStat)}
                playerAge={age||22}
                distance={selChallenge.id==="pace_1"?10:20}
              />
            )}
            {/* Jumping auto */}
            {(selChallenge.id==="jump_1"||selChallenge.id==="jump_2") && (
              <JumpCamera onResult={res => handleResult(res, selStat)} playerAge={age||22}/>
            )}
            {/* Push-ups auto */}
            {selChallenge.id==="phys_1" && (
              <PushupCamera onResult={res => handleResult(res, selStat)} playerAge={age||22}/>
            )}
            {/* Chaos agility */}
            {selChallenge.id==="agility_4" && (
              <ChaosAgility onResult={res => handleResult(res, selStat)} attempts={3}/>
            )}
            {/* Everything else — record + manual */}
            {!["pace_1","pace_2","jump_1","jump_2","phys_1","agility_4"].includes(selChallenge.id) && (
              <RecordCamera challenge={selChallenge} onResult={res => handleResult(res, selStat)}/>
            )}
          </>
        )}

        {/* ── DONE ── */}
        {selChallenge && phase==="done" && (
          <div style={{ textAlign:"center", padding:28 }}>
            <div style={{ fontSize:72, marginBottom:18 }}>✅</div>
            <div style={{ fontSize:26, fontWeight:900, marginBottom:10 }}>Result Saved!</div>
            <p style={{ color:C.ghost, fontSize:15, lineHeight:1.7, marginBottom:12 }}>Your video is stored on your profile for community verification. Verified results count more toward your rating.</p>
            <div style={{ background:`${C.blue}14`, border:"1.5px solid #0066FF33", borderRadius:12, padding:14, marginBottom:24, textAlign:"left" }}>
              <div style={{ fontSize:13, color:C.blue, fontWeight:700, marginBottom:6 }}>Verification</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {["Community ✓","Team ✓","Coach ✓","Scout ✓"].map((v,i) => (
                  <span key={i} style={{ background:"#1A1A2E", border:"1px solid #333355", borderRadius:6, padding:"4px 10px", fontSize:11, color:C.ghost }}>{v}</span>
                ))}
              </div>
              <div style={{ fontSize:12, color:C.ghost, marginTop:8 }}>Share your challenge code with teammates and opponents to get your videos verified. 3 verifications = Verified badge.</div>
            </div>
            <div style={{ display:"flex", gap:12 }}>
              <Btn v="dark" full onClick={() => { setSelChallenge(null); setPhase("brief"); }}>← More Challenges</Btn>
              <Btn full onClick={() => { setSelStat(null); setSelChallenge(null); setView("menu"); }}>Develop</Btn>
            </div>
          </div>
        )}

        {/* ── 1v1 CHALLENGES ── */}
        {view==="challenges" && (
          <>
            {challengePhase==="link" && (
              <>
                <div style={{ background:"#0A0A18", border:`2px solid ${C.blue}33`, borderRadius:14, padding:18, marginBottom:16 }}>
                  <div style={{ fontSize:17, fontWeight:800, color:C.blue, marginBottom:8 }}>🔗 Link Your Opponent</div>
                  <p style={{ color:C.ghost, fontSize:14, lineHeight:1.6, marginBottom:14 }}>Ask your opponent for their Challenge Code. Enter it below to link up. Both must be registered.</p>
                  {linked ? (
                    <div style={{ background:`${C.green}0a`, border:`2px solid ${C.green}22`, borderRadius:12, padding:14, display:"flex", gap:14, alignItems:"center" }}>
                      <Card player={linked} size="sm" glow={false}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:16, fontWeight:800, color:C.green }}>✓ Linked</div>
                        <div style={{ fontSize:17, fontWeight:900 }}>{linked.name}</div>
                        <div style={{ fontSize:13, color:C.ghost }}>{linked.position} · OVR {ov(linked.stats)}</div>
                        {calcAge(linked.date_of_birth) && <Pill color={C.blue}>{AGE_LABELS[ageGroup(calcAge(linked.date_of_birth))]}</Pill>}
                      </div>
                      <Btn sm v="ghost" onClick={() => setLinked(null)}>✕</Btn>
                    </div>
                  ) : (
                    <div style={{ display:"flex", gap:10 }}>
                      <input value={linkedCode} onChange={e => setLinkedCode(e.target.value.toUpperCase())} placeholder="e.g. AB12XY"
                        style={{ flex:1, background:"#111122", border:"2px solid #222244", borderRadius:10, padding:"12px 14px", color:C.white, fontSize:18, fontWeight:800, outline:"none", letterSpacing:5 }}/>
                      <Btn onClick={findOpponent} v="blue">Link</Btn>
                    </div>
                  )}
                </div>
                {linked && <Btn full v="green" onClick={() => setChallengePhase("rounds")} style={{ fontSize:17 }}>Start Challenges →</Btn>}
              </>
            )}
            {challengePhase==="rounds" && linked && (
              <>
                <div style={{ background:`${C.green}0a`, border:`2px solid ${C.green}22`, borderRadius:12, padding:14, marginBottom:16, display:"flex", gap:14, alignItems:"center" }}>
                  <Card player={linked} size="sm" glow={false}/>
                  <div><div style={{ fontSize:15, fontWeight:700, color:C.green }}>Playing vs</div><div style={{ fontSize:18, fontWeight:900 }}>{linked.name}</div></div>
                </div>
                {[{icon:"🦶",label:"Round 1–3",rule:"No slide tackles — positioning only",timer:180},{icon:"⚡",label:"Round 4–6",rule:"Slide tackles ONLY",timer:180},{icon:"👥",label:"Round 7–9",rule:"2v1 — two attackers",timer:180},{icon:"💨",label:"60s Blitz",rule:"Beat defender in 60 seconds",timer:60},{icon:"🌀",label:"Skill Round",rule:"Attacker must use a skill move",timer:120}].map((r,i) => (
                  <div key={i} style={{ background:"#0A0A18", borderRadius:12, padding:14, marginBottom:8, display:"flex", gap:12, alignItems:"center", border:"1px solid #1A1A2E" }}>
                    <div style={{ fontSize:24 }}>{r.icon}</div>
                    <div style={{ flex:1 }}><div style={{ fontSize:15, fontWeight:700 }}>{r.label}</div><div style={{ fontSize:13, color:C.ghost }}>{r.rule}</div></div>
                    <div style={{ fontSize:12, color:C.ghost }}>{r.timer>=60?Math.floor(r.timer/60)+"m":r.timer+"s"}</div>
                  </div>
                ))}
                <Btn full v="green" onClick={() => showToast("Both players start recording simultaneously!")} style={{ fontSize:17, marginTop:10 }}>Start Challenge Session</Btn>
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}


// ── CLUB TAB ──────────────────────────────────────────────────
function ClubTab({ player, onUpdate }) {
  const [tab, setTab] = useState("squad");
  const [squad, setSquad] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [clubName, setClubName] = useState("");
  const [clubSymbol, setClubSymbol] = useState("⚽");
  const [joinCode, setJoinCode] = useState("");
  const [matchForm, setMatchForm] = useState({ opponentCode:"", date:"", time:"", location:"", format:"5v5", diamondStake:1, formation:"4-3-3" });
  const [votes, setVotes] = useState({});
  const [ratingTarget, setRatingTarget] = useState(null);
  const [ratings, setRatings] = useState({ effort:0, quality:0, communication:0 });
  const [toast, setToast] = useState("");
  const showToast = (m,t="ok") => { setToast({m,t}); setTimeout(()=>setToast(""),2500); };
  const isCapOrVice = player?.team_role==="captain" || player?.team_role==="vice";
  const teamCode = player?.team_code;
  const teamName = player?.team_name || "My Club";
  const teamSymbol = player?.team_symbol || "⚽";
  const mf = (k,v) => setMatchForm(p=>({...p,[k]:v}));

  const SYMBOLS = ["⚽","🦁","🐯","🦅","🐉","⚡","🔥","🌊","🏆","👑","💎","🛡️","⚔️","🌟","🦊","🐺","🦋","🌪️","🔱","🏴"];
  const FORMATIONS = ["4-4-2","4-3-3","3-5-2","4-2-3-1","5-3-2","3-4-3","4-5-1","4-1-4-1"];

  useEffect(() => {
    if (!teamCode || !player?.id) return;
    sbFetch(`players?team_code=eq.${teamCode}&id=neq.${player.id}&select=id,name,position,stats,badges,date_of_birth,team_role,photo_url`)
      .then(r => setSquad(r||[]))
      .catch(() => {});
    if (isCapOrVice) {
      sbFetch(`players?pending_team_code=eq.${teamCode}&select=id,name,position,stats,date_of_birth,photo_url`)
        .then(r => setRequests(r||[]))
        .catch(() => {});
    }
  }, [teamCode, player?.id, isCapOrVice]);

  async function createClub() {
    if (!clubName.trim()) { showToast("Enter a club name","err"); return; }
    if (player?.team_code) { showToast("Leave your current club first","err"); return; }
    setLoading(true);
    try {
      const code = randCode();
      await sbFetch(`players?id=eq.${player.id}`, {
        method:"PATCH",
        body:JSON.stringify({ team_code:code, team_role:"captain", team_name:clubName.trim(), team_symbol:clubSymbol }),
        prefer:"return=minimal"
      });
      onUpdate({ ...player, team_code:code, team_role:"captain", team_name:clubName.trim(), team_symbol:clubSymbol });
      showToast("Club created! Share code: " + code);
      setCreating(false);
    } catch(e) { showToast(e.message,"err"); }
    setLoading(false);
  }

  async function joinClub() {
    if (!joinCode.trim()) { showToast("Enter a club code","err"); return; }
    if (player?.team_code) { showToast("Leave your current club first","err"); return; }
    setLoading(true);
    try {
      const cap = await sbFetch(`players?team_code=eq.${joinCode.trim().toUpperCase()}&team_role=eq.captain&limit=1`);
      if (!cap?.[0]) { showToast("Club not found — check the code","err"); setLoading(false); return; }
      const members = await sbFetch(`players?team_code=eq.${joinCode.trim().toUpperCase()}&select=id`);
      if ((members||[]).length >= 11) { showToast("Club is full — max 11 players","err"); setLoading(false); return; }
      await sbFetch(`players?id=eq.${player.id}`, { method:"PATCH", body:JSON.stringify({ pending_team_code:joinCode.trim().toUpperCase() }), prefer:"return=minimal" });
      showToast("Join request sent! Captain will approve.");
      setJoinCode("");
    } catch(e) { showToast(e.message,"err"); }
    setLoading(false);
  }

  async function leaveClub() {
    setLoading(true);
    try {
      await sbFetch(`players?id=eq.${player.id}`, { method:"PATCH", body:JSON.stringify({ team_code:null, team_role:"player", team_name:null, team_symbol:null, pending_team_code:null }), prefer:"return=minimal" });
      onUpdate({ ...player, team_code:null, team_role:"player", team_name:null, team_symbol:null });
      setSquad([]); setRequests([]);
      showToast("Left the club");
    } catch(e) { showToast(e.message,"err"); }
    setLoading(false);
  }

  async function acceptRequest(p) {
    try {
      await sbFetch(`players?id=eq.${p.id}`, { method:"PATCH", body:JSON.stringify({ team_code:player.team_code, pending_team_code:null, team_role:"player", team_name:player.team_name }), prefer:"return=minimal" });
      setRequests(r => r.filter(x=>x.id!==p.id));
      setSquad(s => [...s, {...p, team_role:"player"}]);
      showToast(p.name+" accepted ✓");
    } catch(e) { showToast(e.message,"err"); }
  }

  async function declineRequest(p) {
    try {
      await sbFetch(`players?id=eq.${p.id}`, { method:"PATCH", body:JSON.stringify({ pending_team_code:null }), prefer:"return=minimal" });
      setRequests(r => r.filter(x=>x.id!==p.id));
      showToast(p.name+" declined");
    } catch(e) { showToast(e.message,"err"); }
  }

  async function sendMatchChallenge() {
    if (!matchForm.opponentCode.trim()) { showToast("Enter opponent club code","err"); return; }
    if (!matchForm.date || !matchForm.time) { showToast("Set date and time","err"); return; }
    if (!matchForm.location.trim()) { showToast("Enter a location","err"); return; }
    if ((player?.diamonds||0) < matchForm.diamondStake) { showToast("Not enough diamonds","err"); return; }
    try {
      const opp = await sbFetch(`players?team_code=eq.${matchForm.opponentCode.trim().toUpperCase()}&team_role=eq.captain&limit=1`);
      if (!opp?.[0]) { showToast("Club not found","err"); return; }
      showToast("Match challenge sent! ✓");
      mf("opponentCode","");
    } catch(e) { showToast(e.message,"err"); }
  }

  const allMembers = [player, ...squad].filter(Boolean);
  const squadDiam = squadDiamonds(allMembers.map(p => ({ overall: ov(p?.stats||{}) })));

  // ── NO CLUB ───────────────────────────────────────────────────
  if (!teamCode) return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.white, paddingBottom:100 }}>
      <Hdr title="Club" sub="Join or Create"/>
      <Toast msg={toast?.m} type={toast?.t}/>
      <div style={{ padding:"20px 20px", maxWidth:480, margin:"0 auto" }}>

        {!creating ? <>
          {/* Create */}
          <div style={{ background:`linear-gradient(135deg,${C.gold}18,${C.gold}08)`, border:`2px solid ${C.gold}44`, borderRadius:16, padding:22, marginBottom:16 }}>
            <div style={{ fontSize:22, fontWeight:900, color:C.gold, marginBottom:6 }}>👑 Create a Club</div>
            <div style={{ fontSize:14, color:C.ghost, lineHeight:1.7, marginBottom:16 }}>You become the captain. Choose a name and symbol, then share your club code with your squad.</div>
            <Btn full v="gold" onClick={() => setCreating(true)} style={{ fontSize:17 }}>Create My Club</Btn>
          </div>

          {/* Join */}
          <div style={{ background:`linear-gradient(135deg,${C.blue}18,${C.blue}08)`, border:`2px solid ${C.blue}44`, borderRadius:16, padding:22 }}>
            <div style={{ fontSize:22, fontWeight:900, color:C.blue, marginBottom:6 }}>🚪 Join a Club</div>
            <div style={{ fontSize:14, color:C.ghost, lineHeight:1.7, marginBottom:14 }}>Enter the club code your captain shared. Your request will go to them for approval. Max 11 players per club.</div>
            <div style={{ display:"flex", gap:10 }}>
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="Club code e.g. AB12XY"
                style={{ flex:1, background:"#111122", border:"2px solid #222244", borderRadius:10, padding:"13px 15px", color:C.white, fontSize:17, fontWeight:800, outline:"none", letterSpacing:4 }}/>
              <Btn onClick={joinClub} v="blue" disabled={loading}>Join</Btn>
            </div>
          </div>
        </> : (
          // Create club form
          <div style={{ background:"#0A0A18", borderRadius:16, padding:22, border:`2px solid ${C.gold}44` }}>
            <div style={{ fontSize:20, fontWeight:900, color:C.gold, marginBottom:18 }}>Create Your Club</div>

            <Input label="Club Name" value={clubName} onChange={setClubName} placeholder="e.g. Street Kings FC"/>

            <div style={{ marginBottom:18 }}>
              <label style={{ display:"block", fontSize:13, color:C.ghost, letterSpacing:1.5, marginBottom:10, textTransform:"uppercase", fontWeight:700 }}>Club Symbol</label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
                {SYMBOLS.map(s => (
                  <button key={s} onClick={() => setClubSymbol(s)} style={{ width:"100%", aspectRatio:"1", fontSize:28, borderRadius:12, border:`2px solid ${clubSymbol===s?C.gold:"#222244"}`, background:clubSymbol===s?`${C.gold}22`:"#111122", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {clubName && (
              <div style={{ background:`${C.gold}14`, border:`1.5px solid ${C.gold}33`, borderRadius:12, padding:16, marginBottom:18, display:"flex", gap:14, alignItems:"center" }}>
                <div style={{ width:56, height:56, borderRadius:14, background:`${C.gold}22`, border:`2px solid ${C.gold}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30 }}>{clubSymbol}</div>
                <div>
                  <div style={{ fontSize:18, fontWeight:900, color:C.white }}>{clubName}</div>
                  <div style={{ fontSize:13, color:C.ghost, marginTop:3 }}>Captain: {player?.name}</div>
                </div>
              </div>
            )}

            <div style={{ display:"flex", gap:12 }}>
              <Btn v="ghost" full onClick={() => setCreating(false)}>Cancel</Btn>
              <Btn v="gold" full onClick={createClub} disabled={loading||!clubName.trim()}>{loading?"Creating...":"Create Club"}</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── HAS CLUB ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.white, paddingBottom:100 }}>
      <Hdr title={teamName} sub="Your Club"
        right={
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <div style={{ background:"#0A0A18", border:`2px solid ${C.green}33`, borderRadius:10, padding:"6px 12px", textAlign:"center" }}>
              <div style={{ fontSize:10, color:C.ghost, letterSpacing:1, fontWeight:700 }}>CLUB CODE</div>
              <div style={{ fontSize:16, fontWeight:900, color:C.green, letterSpacing:3 }}>{teamCode}</div>
            </div>
            <div style={{ width:44, height:44, borderRadius:12, background:`${C.gold}22`, border:`2px solid ${C.gold}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{teamSymbol}</div>
          </div>
        }
      />
      <Toast msg={toast?.m} type={toast?.t}/>

      {/* Diamond rating bar */}
      <div style={{ background:`linear-gradient(135deg,${C.gold}18,${C.gold}06)`, borderBottom:`1px solid ${C.gold}33`, padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:11, color:C.gold, letterSpacing:2, textTransform:"uppercase", fontWeight:700, marginBottom:4 }}>Club Rating</div>
          <div style={{ fontSize:26, fontWeight:900, color:C.gold, letterSpacing:2 }}>{diamondDisplay(squadDiam)}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:13, color:C.ghost }}>{allMembers.length}/11 players</div>
          <div style={{ fontSize:14, color:C.gold, fontWeight:700, marginTop:2 }}>Your 💎 {player?.diamonds||0}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:"1px solid #1A1A2E", overflowX:"auto" }}>
        {[["squad","Squad"],["matches","Matches"],["rate","Rate"],["motm","MOTM"]].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex:1, minWidth:80, padding:"14px 8px", background:"none", border:"none", cursor:"pointer", color:tab===t?C.green:C.ghost, fontWeight:800, fontSize:13, borderBottom:`2px solid ${tab===t?C.green:"transparent"}`, textTransform:"uppercase", letterSpacing:0.8, whiteSpace:"nowrap" }}>
            {l}{t==="squad"&&requests.length>0?<span style={{ background:C.red, color:"#fff", borderRadius:"50%", fontSize:10, padding:"1px 5px", marginLeft:5 }}>{requests.length}</span>:null}
          </button>
        ))}
      </div>

      <div style={{ padding:"20px 20px", maxWidth:480, margin:"0 auto" }}>

        {/* ── SQUAD ── */}
        {tab==="squad" && (
          <>
            {/* You */}
            <div style={{ background:`linear-gradient(135deg,#0A0A18,#111122)`, border:`2px solid ${C.green}44`, borderRadius:14, padding:16, marginBottom:12, display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:54, height:54, borderRadius:"50%", background:"#111122", border:`2px solid ${C.green}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, overflow:"hidden", flexShrink:0 }}>
                {player?.photo_url ? <img src={player.photo_url} style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : "👤"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:17, fontWeight:800 }}>{player?.name} <span style={{ fontSize:14, color:C.green }}>(You)</span></div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:5 }}>
                  <Pill color={player?.team_role==="captain"?C.gold:player?.team_role==="vice"?C.cyan:C.ghost}>
                    {player?.team_role==="captain"?"👑 Captain":player?.team_role==="vice"?"⚡ Vice":"Player"}
                  </Pill>
                  <Pill color={C.blue}>{player?.position}</Pill>
                </div>
              </div>
              <div style={{ fontSize:28, fontWeight:900, color:sc(ov(player?.stats)), textShadow:`0 0 12px ${sc(ov(player?.stats))}66` }}>{ov(player?.stats)||"—"}</div>
            </div>

            {/* Real squad */}
            {squad.length === 0 ? (
              <div style={{ background:"#0A0A18", borderRadius:14, padding:24, textAlign:"center", border:"1px solid #1A1A2E", marginBottom:12 }}>
                <div style={{ fontSize:36, marginBottom:10 }}>{teamSymbol}</div>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>No teammates yet</div>
                <div style={{ fontSize:14, color:C.ghost, lineHeight:1.7 }}>Share your club code with your squad:</div>
                <div style={{ fontSize:28, fontWeight:900, color:C.green, letterSpacing:6, margin:"12px 0" }}>{teamCode}</div>
                <div style={{ fontSize:13, color:C.ghost }}>They enter this code under Club → Join a Club</div>
              </div>
            ) : squad.map((p,i) => {
              const pa = calcAge(p.date_of_birth);
              return (
                <div key={p.id||i} style={{ background:"#0A0A18", borderRadius:14, padding:16, marginBottom:10, display:"flex", alignItems:"center", gap:14, border:"1px solid #1A1A2E" }}>
                  <div style={{ width:52, height:52, borderRadius:"50%", background:"#111122", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, border:"1px solid #222244", overflow:"hidden", flexShrink:0 }}>
                    {p.photo_url ? <img src={p.photo_url} style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : "👤"}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:16, fontWeight:800 }}>{p.name}</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:4 }}>
                      <Pill color={C.blue}>{p.position}</Pill>
                      {pa && <Pill color={C.ghost}>{AGE_LABELS[ageGroup(pa)]}</Pill>}
                      {p.team_role==="vice" && <Pill color={C.cyan}>⚡ Vice</Pill>}
                    </div>
                  </div>
                  <div style={{ fontSize:28, fontWeight:900, color:sc(ov(p.stats)), textShadow:`0 0 10px ${sc(ov(p.stats))}55` }}>{ov(p.stats)||"—"}</div>
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
              {isCapOrVice && squad.length > 0 && <Btn v="ghost" full sm>Promote Vice-Captain</Btn>}
              <Btn v="red" full sm onClick={leaveClub} disabled={loading}>Leave Club</Btn>
            </div>
          </>
        )}

        {/* ── MATCHES ── */}
        {tab==="matches" && (
          <>
            {!isCapOrVice ? (
              <div style={{ background:`${C.gold}14`, border:`2px solid ${C.gold}33`, borderRadius:14, padding:20, marginBottom:16 }}>
                <div style={{ fontSize:20, fontWeight:900, color:C.gold, marginBottom:8 }}>👑 Captain Only</div>
                <p style={{ color:C.ghost, fontSize:15, margin:0, lineHeight:1.7 }}>Only captains and vice-captains can arrange matches. Speak to your captain.</p>
              </div>
            ) : (
              <div style={{ background:"#0A0A18", borderRadius:14, padding:20, marginBottom:16, border:"1px solid #1A1A2E" }}>
                <div style={{ fontSize:18, fontWeight:900, marginBottom:18 }}>⚔️ Challenge a Club</div>

                <Input label="Opponent Club Code" value={matchForm.opponentCode} onChange={v=>mf("opponentCode",v)} placeholder="Their 6-digit code"/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Input label="Date" type="date" value={matchForm.date} onChange={v=>mf("date",v)}/>
                  <Input label="Time" type="time" value={matchForm.time} onChange={v=>mf("time",v)}/>
                </div>
                <Input label="Venue / Location" value={matchForm.location} onChange={v=>mf("location",v)} placeholder="e.g. Hackney Astro, E8"/>

                {/* Format */}
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:"block", fontSize:13, color:C.ghost, letterSpacing:1.5, marginBottom:10, textTransform:"uppercase", fontWeight:700 }}>Format</label>
                  <div style={{ display:"flex", gap:8 }}>
                    {["5v5","7v7","11v11"].map(f => (
                      <button key={f} onClick={() => mf("format",f)} style={{ flex:1, padding:13, borderRadius:10, border:`2px solid ${matchForm.format===f?C.green:"#222244"}`, background:matchForm.format===f?`${C.green}18`:"transparent", color:matchForm.format===f?C.green:C.ghost, cursor:"pointer", fontSize:15, fontWeight:800 }}>{f}</button>
                    ))}
                  </div>
                </div>

                {/* Formation */}
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:"block", fontSize:13, color:C.ghost, letterSpacing:1.5, marginBottom:10, textTransform:"uppercase", fontWeight:700 }}>Your Formation</label>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {FORMATIONS.map(f => (
                      <button key={f} onClick={() => mf("formation",f)} style={{ padding:"10px 14px", borderRadius:10, border:`2px solid ${matchForm.formation===f?C.blue:"#222244"}`, background:matchForm.formation===f?`${C.blue}18`:"transparent", color:matchForm.formation===f?C.blue:C.ghost, cursor:"pointer", fontSize:13, fontWeight:700 }}>{f}</button>
                    ))}
                  </div>
                </div>

                {/* Diamond stake */}
                <div style={{ marginBottom:18 }}>
                  <label style={{ display:"block", fontSize:13, color:C.ghost, letterSpacing:1.5, marginBottom:10, textTransform:"uppercase", fontWeight:700 }}>Diamond Stake 💎</label>
                  <div style={{ background:`${C.gold}0a`, border:"1.5px solid #FFB80033", borderRadius:10, padding:12, marginBottom:12 }}>
                    <div style={{ fontSize:13, color:C.gold, lineHeight:1.6 }}>Both clubs put up the same stake. Winner takes both. Loser forfeits theirs. Your balance: <strong style={{ color:C.gold }}>{player?.diamonds||0} 💎</strong></div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => mf("diamondStake",n)}
                        style={{ flex:1, padding:13, borderRadius:10, border:`2px solid ${matchForm.diamondStake===n?C.gold:"#222244"}`, background:matchForm.diamondStake===n?`${C.gold}18`:"transparent", color:matchForm.diamondStake===n?C.gold:C.ghost, cursor:"pointer", fontSize:15, fontWeight:800 }}>{n}💎</button>
                    ))}
                  </div>
                  {(player?.diamonds||0) < matchForm.diamondStake && (
                    <div style={{ fontSize:13, color:C.red, marginTop:8, fontWeight:700 }}>⚠️ Not enough diamonds for this stake</div>
                  )}
                </div>

                <Btn full v="green" onClick={sendMatchChallenge} style={{ fontSize:17 }}>Send Match Challenge →</Btn>
              </div>
            )}

            {/* Club rating preview for challenge */}
            <div style={{ background:`linear-gradient(135deg,${C.gold}14,${C.gold}06)`, border:`1.5px solid ${C.gold}33`, borderRadius:14, padding:16, marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.gold, marginBottom:10 }}>Your Club in This Match</div>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ width:52, height:52, borderRadius:14, background:`${C.gold}22`, border:`2px solid ${C.gold}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>{teamSymbol}</div>
                <div>
                  <div style={{ fontSize:16, fontWeight:800 }}>{teamName}</div>
                  <div style={{ fontSize:14, color:C.gold }}>{diamondDisplay(squadDiam)}</div>
                  <div style={{ fontSize:12, color:C.ghost, marginTop:2 }}>{allMembers.length} players · {matchForm.formation}</div>
                </div>
              </div>
            </div>

            {/* Last result */}
            <div style={{ background:"#0A0A18", borderRadius:14, padding:18, border:"1px solid #1A1A2E" }}>
              <div style={{ fontSize:13, color:C.ghost, letterSpacing:2, textTransform:"uppercase", fontWeight:700, marginBottom:12 }}>Recent Results</div>
              <div style={{ textAlign:"center", padding:"16px 0", color:C.ghost, fontSize:14 }}>No matches played yet. Challenge another club above.</div>
            </div>
          </>
        )}

        {/* ── RATE ── */}
        {tab==="rate" && (
          <>
            <div style={{ background:`${C.gold}14`, border:`2px solid ${C.gold}33`, borderRadius:14, padding:16, marginBottom:18 }}>
              <div style={{ fontSize:17, fontWeight:900, color:C.gold, marginBottom:6 }}>⭐ Post-Game Ratings</div>
              <p style={{ color:C.ghost, fontSize:14, margin:0, lineHeight:1.6 }}>Rate teammates on Effort, Quality and Communication out of 10. Outlier votes are excluded automatically.</p>
            </div>
            {ratingTarget ? (
              <div>
                <div style={{ background:"#0A0A18", borderRadius:14, padding:16, marginBottom:16, display:"flex", gap:14, alignItems:"center", border:"1px solid #1A1A2E" }}>
                  <div style={{ width:52, height:52, borderRadius:"50%", background:"#111122", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>👤</div>
                  <div><div style={{ fontSize:18, fontWeight:800 }}>{ratingTarget.name}</div><div style={{ fontSize:14, color:C.ghost }}>{ratingTarget.position}</div></div>
                </div>
                {[["Effort","💪","How hard did they work?"],["Quality","⭐","How well did they play?"],["Communication","📢","Did they organise and lead?"]].map(([label,icon,desc]) => (
                  <div key={label} style={{ background:"#0A0A18", borderRadius:12, padding:16, marginBottom:12, border:"1px solid #1A1A2E" }}>
                    <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12 }}>
                      <span style={{ fontSize:22 }}>{icon}</span>
                      <div><div style={{ fontSize:16, fontWeight:700 }}>{label}</div><div style={{ fontSize:13, color:C.ghost }}>{desc}</div></div>
                    </div>
                    <div style={{ display:"flex", gap:4 }}>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <button key={n} onClick={() => setRatings(r=>({...r,[label.toLowerCase()]:n}))}
                          style={{ flex:1, padding:"10px 0", borderRadius:8, border:`2px solid ${ratings[label.toLowerCase()]>=n?C.gold:"#222244"}`, background:ratings[label.toLowerCase()]>=n?`${C.gold}18`:"#111122", color:ratings[label.toLowerCase()]>=n?C.gold:C.ghost, cursor:"pointer", fontSize:12, fontWeight:800 }}>{n}</button>
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{ display:"flex", gap:12, marginTop:8 }}>
                  <Btn v="ghost" full onClick={() => setRatingTarget(null)}>← Back</Btn>
                  <Btn v="gold" full onClick={() => { showToast(`${ratingTarget.name} rated ✓`); setRatingTarget(null); setRatings({effort:0,quality:0,communication:0}); }}>Submit Rating</Btn>
                </div>
              </div>
            ) : (
              squad.length === 0
                ? <div style={{ textAlign:"center", padding:"24px 0", color:C.ghost, fontSize:15 }}>No teammates yet — rating buttons appear once your squad joins.</div>
                : squad.map((p,i) => (
                  <div key={p.id||i} style={{ background:"#0A0A18", borderRadius:14, padding:16, marginBottom:10, display:"flex", alignItems:"center", gap:14, border:"1px solid #1A1A2E" }}>
                    <div style={{ width:46, height:46, borderRadius:"50%", background:"#111122", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>👤</div>
                    <div style={{ flex:1 }}><div style={{ fontSize:16, fontWeight:700 }}>{p.name}</div><div style={{ fontSize:13, color:C.ghost }}>{p.position}</div></div>
                    <Btn sm v="gold" onClick={() => setRatingTarget(p)}>Rate</Btn>
                  </div>
                ))
            )}
          </>
        )}

        {/* ── MOTM ── */}
        {tab==="motm" && (
          <>
            <div style={{ background:`${C.gold}14`, border:`2px solid ${C.gold}33`, borderRadius:14, padding:16, marginBottom:18 }}>
              <div style={{ fontSize:17, fontWeight:900, color:C.gold, marginBottom:6 }}>🏅 MOTM Voting</div>
              <p style={{ color:C.ghost, fontSize:14, margin:0, lineHeight:1.6 }}>All players vote. Winner gets +2 to their lowest stat. Outlier votes excluded automatically.</p>
            </div>
            {squad.length === 0
              ? <div style={{ textAlign:"center", padding:"24px 0", color:C.ghost, fontSize:15 }}>No teammates yet.</div>
              : [...squad, {id:"you",name:player?.name,position:player?.position,isYou:true}].map((p,i) => (
                <div key={p.id||i} style={{ background:votes[i]?`${C.green}0a`:"#0A0A18", border:`2px solid ${votes[i]?C.green+"44":"#1A1A2E"}`, borderRadius:14, padding:16, marginBottom:10, display:"flex", alignItems:"center", gap:14, transition:"all 0.2s" }}>
                  <div style={{ width:46, height:46, borderRadius:"50%", background:votes[i]?`${C.green}22`:"#111122", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, border:`2px solid ${votes[i]?C.green+"44":"#222244"}` }}>👤</div>
                  <div style={{ flex:1 }}><div style={{ fontSize:16, fontWeight:800 }}>{p.name}{p.isYou?" (You)":""}</div><div style={{ fontSize:13, color:C.ghost }}>{p.position}</div></div>
                  <button onClick={() => setVotes({[i]:true})}
                    style={{ background:votes[i]?`${C.green}22`:"#111122", border:`2px solid ${votes[i]?C.green:"#333355"}`, color:votes[i]?C.green:C.ghost, borderRadius:10, padding:"11px 18px", cursor:"pointer", fontSize:14, fontWeight:800, transition:"all 0.2s", boxShadow:votes[i]?`0 0 14px ${C.green}44`:"none" }}>
                    {votes[i]?"✓ Voted":"Vote"}
                  </button>
                </div>
              ))
            }
          </>
        )}
      </div>
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
