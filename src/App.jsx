// ================================================================
// STREET TWICE V5
// Age-weighted XP · DOB · Country dropdown · Bio · Fixed sprint scoring
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
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.message||"Request failed"); }
  return res.status === 204 ? null : res.json();
}
async function sbAuth(email, password, mode="login") {
  const ep = mode==="signup" ? "signup" : "token?grant_type=password";
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${ep}`, {
    method:"POST", headers:{apikey:SUPABASE_ANON_KEY,"Content-Type":"application/json"},
    body: JSON.stringify({email, password}),
  });
  const data = await res.json();
  if (data.error||data.error_description) throw new Error(data.error_description||data.error||"Auth failed");
  if (data.access_token) localStorage.setItem("sb_token", data.access_token);
  return data;
}
async function sbGetUser() {
  const token = localStorage.getItem("sb_token");
  if (!token) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers:{apikey:SUPABASE_ANON_KEY, Authorization:`Bearer ${token}`},
  });
  if (!res.ok) { localStorage.removeItem("sb_token"); return null; }
  return res.json();
}
async function sbSignOut() {
  await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:"POST",headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${localStorage.getItem("sb_token")}`}}).catch(()=>{});
  localStorage.removeItem("sb_token");
}

// ── Countries ─────────────────────────────────────────────────
const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahrain","Bangladesh","Belarus","Belgium","Bolivia","Bosnia and Herzegovina","Botswana","Brazil",
  "Bulgaria","Burkina Faso","Cameroon","Canada","Chile","China","Colombia","Congo","Costa Rica",
  "Croatia","Cuba","Czech Republic","Denmark","Dominican Republic","DR Congo","Ecuador","Egypt",
  "El Salvador","England","Estonia","Ethiopia","Finland","France","Gabon","Georgia","Germany",
  "Ghana","Greece","Guatemala","Guinea","Haiti","Honduras","Hungary","Iceland","India","Indonesia",
  "Iran","Iraq","Ireland","Israel","Italy","Ivory Coast","Jamaica","Japan","Jordan","Kazakhstan",
  "Kenya","Kosovo","Kuwait","Latvia","Lebanon","Libya","Lithuania","Luxembourg","Madagascar","Malawi",
  "Malaysia","Mali","Malta","Mexico","Moldova","Montenegro","Morocco","Mozambique","Namibia",
  "Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway",
  "Oman","Pakistan","Palestine","Panama","Paraguay","Peru","Philippines","Poland","Portugal",
  "Qatar","Romania","Russia","Rwanda","Saudi Arabia","Scotland","Senegal","Serbia","Sierra Leone",
  "Slovakia","Slovenia","Somalia","South Africa","South Korea","Spain","Sri Lanka","Sudan","Sweden",
  "Switzerland","Syria","Tanzania","Thailand","Togo","Trinidad and Tobago","Tunisia","Turkey",
  "Uganda","Ukraine","United Arab Emirates","United States","Uruguay","Uzbekistan","Venezuela",
  "Vietnam","Wales","Zambia","Zimbabwe"
].sort();

// ── Age System ─────────────────────────────────────────────────
function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m===0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function ageGroup(age) {
  if (!age) return "open";
  if (age <= 12) return "u12";
  if (age <= 16) return "u16";
  if (age <= 20) return "u20";
  if (age <= 29) return "adult";
  if (age <= 39) return "vet";
  return "senior";
}

const AGE_GROUP_LABELS = {
  u12:"Under 12", u16:"13–16", u20:"17–20",
  adult:"21–29", vet:"30–39", senior:"40+", open:"Open"
};

// Sprint benchmarks by age group (20m time in seconds)
// [average, good, elite] — lower is faster
const SPRINT_BENCH = {
  u12:   { avg:4.2, good:3.6, elite:3.0, label:"Under 12" },
  u16:   { avg:3.8, good:3.2, elite:2.8, label:"13–16" },
  u20:   { avg:3.4, good:2.9, elite:2.55, label:"17–20" },
  adult: { avg:3.2, good:2.75, elite:2.45, label:"21–29" },
  vet:   { avg:3.7, good:3.1, elite:2.7,  label:"30–39" },
  senior:{ avg:4.4, good:3.6, elite:3.0,  label:"40+" },
  open:  { avg:3.4, good:2.9, elite:2.5,  label:"Open" },
};

// Jump benchmarks by age group (cm)
const JUMP_BENCH = {
  u12:   { avg:28, good:38, elite:50 },
  u16:   { avg:35, good:46, elite:58 },
  u20:   { avg:42, good:54, elite:66 },
  adult: { avg:45, good:57, elite:70 },
  vet:   { avg:38, good:50, elite:62 },
  senior:{ avg:30, good:42, elite:54 },
  open:  { avg:42, good:54, elite:66 },
};

// Push-up benchmarks by age group (reps)
const PUSHUP_BENCH = {
  u12:   { avg:12, good:22, elite:35 },
  u16:   { avg:18, good:30, elite:45 },
  u20:   { avg:24, good:38, elite:55 },
  adult: { avg:28, good:42, elite:60 },
  vet:   { avg:22, good:35, elite:50 },
  senior:{ avg:15, good:26, elite:40 },
  open:  { avg:24, good:38, elite:55 },
};

// Convert raw measurement to score (0–99) relative to age group
function rawToScore(raw, bench) {
  const { avg, good, elite } = bench;
  if (raw >= elite) return Math.min(99, Math.round(88 + ((raw - elite) / elite) * 11));
  if (raw >= good)  return Math.round(72 + ((raw - good) / (elite - good)) * 16);
  if (raw >= avg)   return Math.round(50 + ((raw - avg) / (good - avg)) * 22);
  return Math.max(15, Math.round(50 * (raw / avg)));
}

// Sprint: LOWER time = better. Invert the scale.
function sprintToScore(timeSecs, group) {
  const bench = SPRINT_BENCH[group] || SPRINT_BENCH.open;
  const { avg, good, elite } = bench;
  // Invert: faster time = higher score
  if (timeSecs <= elite) return Math.min(99, Math.round(88 + ((elite - timeSecs) / elite) * 11));
  if (timeSecs <= good)  return Math.round(72 + ((good - timeSecs) / (good - elite)) * 16);
  if (timeSecs <= avg)   return Math.round(50 + ((avg - timeSecs) / (avg - good)) * 22);
  return Math.max(15, Math.round(50 * (avg / timeSecs)));
}

// Age-weighted XP for challenges
// Returns { defenderGain, attackerGain, description }
function calcAgeWeightedXP(defAge, atkAge, timesBeaten, totalAttempts) {
  const defGroup = ageGroup(defAge);
  const atkGroup = ageGroup(atkAge);
  const ageDiff = Math.abs((defAge||22) - (atkAge||22));
  const successRate = timesBeaten / totalAttempts; // attacker's success rate

  // Base stat change
  let defBase = Math.round((1 - successRate) * 8);  // defender gains more if they held out
  let atkBase = Math.round(successRate * 8);          // attacker gains more if they beat them

  // Age weighting multiplier
  // Younger player beating older = big bonus for younger, small penalty for older
  // Older player beating younger = small bonus for older, no penalty for younger
  let atkMultiplier = 1.0;
  let defMultiplier = 1.0;

  if (ageDiff >= 3) {
    const olderIsDefending = (defAge||22) > (atkAge||22);
    if (olderIsDefending) {
      // Older defending vs younger attacking
      // If younger beats older = massive XP for attacker
      // If older holds = decent XP for defender (expected)
      atkMultiplier = 1.0 + (ageDiff * 0.15); // up to 2.5x for big gap
      defMultiplier = 0.8; // lower reward for older defending younger
    } else {
      // Younger defending vs older attacking
      // If younger holds older = huge XP for defender
      // If older beats younger = small gain (expected)
      defMultiplier = 1.0 + (ageDiff * 0.18);
      atkMultiplier = 0.7;
    }
  }

  const finalDefGain = Math.round(defBase * defMultiplier);
  const finalAtkGain = Math.round(atkBase * atkMultiplier);

  // Description
  let desc = "";
  if (ageDiff >= 8) desc = `⚡ Huge age gap (${ageDiff} years) — XP heavily weighted`;
  else if (ageDiff >= 4) desc = `Age gap of ${ageDiff} years — XP adjusted`;
  else desc = "Similar age — standard XP";

  return { defGain: finalDefGain, atkGain: finalAtkGain, desc };
}

// ── Design ────────────────────────────────────────────────────
const C = {
  bg:"#060608", pitch:"#080f08", card:"#0d0d0d",
  lime:"#b8ff00", limeD:"#8fd400", gold:"#f0c040", goldD:"#c49a20",
  red:"#ff3344", blue:"#2288ff", purple:"#aa44ff", cyan:"#00ddff",
  white:"#f4f4f4", ghost:"#666", muted:"#333", border:"#1a1a1a",
  tiers:{
    bronze:{ bg:"#1c0e00", b:"#cd7f32", t:"#f0b080", g:"#cd7f3266" },
    silver:{ bg:"#101010", b:"#b0b8c0", t:"#d8dde2", g:"#b0b8c066" },
    gold:  { bg:"#160e00", b:"#f0c040", t:"#ffe880", g:"#f0c04066" },
    elite: { bg:"#140800", b:"#ffdd00", t:"#fff066", g:"#ffdd0088" },
    rare:  { bg:"#0c0618", b:"#cc44ff", t:"#eeb8ff", g:"#cc44ff88" },
  },
};

const POSITIONS = ["ST","CF","LW","RW","CAM","CM","CDM","LM","RM","LB","RB","CB","GK"];
const STATS_META = {
  pace:      { l:"PAC", icon:"⚡", color:"#b8ff00" },
  shooting:  { l:"SHO", icon:"🎯", color:"#ff8844" },
  passing:   { l:"PAS", icon:"🔄", color:"#44bbff" },
  dribbling: { l:"DRI", icon:"🌀", color:"#aa44ff" },
  defending: { l:"DEF", icon:"🛡️", color:"#4488ff" },
  physical:  { l:"PHY", icon:"💪", color:"#ff4466" },
  jumping:   { l:"JMP", icon:"⬆️", color:"#00ddff" },
  agility:   { l:"AGI", icon:"🏃", color:"#ffdd00" },
};

const BADGES = [
  { id:"stone_wall",  icon:"🧱", name:"Stone Wall",    rare:false },
  { id:"poacher",     icon:"⚽", name:"Poacher",       rare:false },
  { id:"tested",      icon:"🔁", name:"Battle Tested", rare:false },
  { id:"verified",    icon:"🏅", name:"Verified",      rare:false },
  { id:"explosive",   icon:"⚡", name:"Explosive",     rare:false },
  { id:"silky",       icon:"🌀", name:"Silky",         rare:false },
  { id:"brick_hands", icon:"🧤", name:"Brick Hands",   rare:false },
  { id:"sniper",      icon:"🎯", name:"Sniper",        rare:false },
  { id:"cannonball",  icon:"💥", name:"Cannonball",    rare:false },
  { id:"motm_king",   icon:"👑", name:"MOTM King",     rare:false },
  { id:"young_gun",   icon:"🌟", name:"Young Gun",     rare:false },
  { id:"league_champ",icon:"🏆", name:"League Champ",  rare:true  },
  { id:"rare_card",   icon:"🔥", name:"Rare",          rare:true  },
];

const DEFEND_ROUNDS = [
  { id:"R1", label:"Rounds 1–3", rule:"No slide tackles — feet only", timer:180, icon:"🦶" },
  { id:"R2", label:"Rounds 4–6", rule:"Slide tackles ONLY", timer:180, icon:"⚡" },
  { id:"R3", label:"Rounds 7–9", rule:"2v1 — two attackers", timer:180, icon:"👥" },
  { id:"B1", label:"60s Blitz",  rule:"Beat defender in 60 seconds", timer:60, icon:"💨" },
  { id:"B2", label:"Skill Round",rule:"Attacker must use a skill move", timer:120, icon:"🌀" },
];

// ── Utilities ─────────────────────────────────────────────────
function ov(stats) {
  const v = Object.values(stats||{}).filter(x=>x>0);
  return v.length ? Math.round(v.reduce((a,b)=>a+b,0)/v.length) : 0;
}
function tier(overall, badges=[]) {
  if (badges.length>=3||overall>=90) return "rare";
  if (overall>=85) return "elite";
  if (overall>=75) return "gold";
  if (overall>=65) return "silver";
  return "bronze";
}
function sc(v) {
  if (!v) return C.ghost;
  if (v>=85) return C.gold;
  if (v>=75) return C.lime;
  if (v>=65) return "#88cc44";
  if (v>=55) return "#ccaa22";
  return "#cc4433";
}
function resolveGap(a, b) {
  const gap = Math.abs(a-b);
  if (gap<=2) return {score:(a+b)/2, status:"accepted"};
  if (gap<=5) return {score:(a+b)/2, status:"pending"};
  return {score:null, status:"flagged"};
}
function randCode() { return Math.random().toString(36).slice(2,8).toUpperCase(); }
function fmtTime(secs) { return `${Math.floor(secs/60).toString().padStart(2,"0")}:${(secs%60).toString().padStart(2,"0")}`; }

// ── Hooks ─────────────────────────────────────────────────────
function useTimer(secs, onEnd) {
  const [t, setT] = useState(secs);
  const [on, setOn] = useState(false);
  const iv = useRef();
  const start = () => { setT(secs); setOn(true); };
  const stop = () => { setOn(false); clearInterval(iv.current); };
  const reset = () => { stop(); setT(secs); };
  useEffect(()=>{
    if(on){
      iv.current = setInterval(()=>setT(p=>{
        if(p<=1){clearInterval(iv.current);setOn(false);onEnd?.();return 0;}
        return p-1;
      }),1000);
    }
    return ()=>clearInterval(iv.current);
  },[on]);
  return {t, on, start, stop, reset, display:fmtTime(t)};
}

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

  const startCam = useCallback(async (facing="environment")=>{
    setErr(null); setBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video:{facingMode:facing, width:{ideal:1280}, height:{ideal:720}}, audio:false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("autoplay","");
        videoRef.current.setAttribute("muted","");
        videoRef.current.setAttribute("playsinline","");
        await videoRef.current.play().catch(()=>{});
      }
      setActive(true);
    } catch(e) {
      setErr(e.name==="NotAllowedError"?"Camera access denied — allow camera in browser settings.":"Could not start camera: "+e.message);
    }
  },[]);

  const stopCam = useCallback(()=>{
    streamRef.current?.getTracks().forEach(t=>t.stop());
    streamRef.current=null; setActive(false); setRecording(false);
  },[]);

  const recStart = useCallback(()=>{
    if(!streamRef.current) return;
    chunksRef.current=[];
    const mr = new MediaRecorder(streamRef.current);
    mr.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};
    mr.onstop=()=>setBlob(new Blob(chunksRef.current,{type:"video/webm"}));
    mr.start(100); recorderRef.current=mr; setRecording(true);
  },[]);

  const recStop = useCallback(()=>{
    if(recorderRef.current?.state!=="inactive") recorderRef.current?.stop();
    setRecording(false);
  },[]);

  return {videoRef, canvasRef, active, recording, blob, err, startCam, stopCam, recStart, recStop};
}

// Motion detection
function useMotion(videoRef, canvasRef, enabled, onMotion) {
  const prev = useRef(null);
  const raf = useRef(null);
  useEffect(()=>{
    if(!enabled){cancelAnimationFrame(raf.current);return;}
    function detect(){
      const vid=videoRef.current, can=canvasRef.current;
      if(!vid||!can||vid.readyState<2){raf.current=requestAnimationFrame(detect);return;}
      const ctx=can.getContext("2d");
      can.width=vid.videoWidth/4; can.height=vid.videoHeight/4;
      ctx.drawImage(vid,0,0,can.width,can.height);
      const cur=ctx.getImageData(0,0,can.width,can.height).data;
      if(prev.current){
        let diff=0;
        for(let i=0;i<cur.length;i+=4){
          diff+=Math.abs(cur[i]-prev.current[i])+Math.abs(cur[i+1]-prev.current[i+1])+Math.abs(cur[i+2]-prev.current[i+2]);
        }
        onMotion(diff/(can.width*can.height));
      }
      prev.current=new Uint8ClampedArray(cur);
      raf.current=requestAnimationFrame(detect);
    }
    raf.current=requestAnimationFrame(detect);
    return ()=>cancelAnimationFrame(raf.current);
  },[enabled]);
}

// ── UI Primitives ─────────────────────────────────────────────
function Btn({children,onClick,v="lime",full,sm,disabled,style:sx={}}) {
  const [pressed,setPressed]=useState(false);
  const vars={
    lime:{background:`linear-gradient(135deg,${C.lime},${C.limeD})`,color:"#000",border:"none",boxShadow:`0 4px 20px ${C.lime}44`},
    gold:{background:`linear-gradient(135deg,${C.gold},${C.goldD})`,color:"#000",border:"none",boxShadow:`0 4px 20px ${C.gold}44`},
    ghost:{background:"transparent",color:C.white,border:"1.5px solid #2a2a2a",boxShadow:"none"},
    red:{background:`${C.red}18`,color:C.red,border:`1.5px solid ${C.red}44`,boxShadow:"none"},
    blue:{background:`${C.blue}18`,color:C.blue,border:`1.5px solid ${C.blue}44`,boxShadow:"none"},
    purple:{background:`${C.purple}18`,color:C.purple,border:`1.5px solid ${C.purple}44`,boxShadow:"none"},
    dark:{background:"#1a1a1a",color:C.white,border:"1px solid #2a2a2a",boxShadow:"none"},
    cyan:{background:`${C.cyan}18`,color:C.cyan,border:`1.5px solid ${C.cyan}44`,boxShadow:"none"},
  };
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseDown={()=>setPressed(true)} onMouseUp={()=>setPressed(false)}
      onTouchStart={()=>setPressed(true)} onTouchEnd={()=>setPressed(false)}
      style={{...vars[v],borderRadius:10,cursor:disabled?"not-allowed":"pointer",
        padding:sm?"8px 14px":"14px 22px",fontSize:sm?12:14,fontWeight:800,
        width:full?"100%":"auto",letterSpacing:0.8,fontFamily:"inherit",
        opacity:disabled?0.4:1,transform:pressed?"scale(0.96)":"scale(1)",
        transition:"transform 0.1s,opacity 0.15s",
        ...sx}}>{children}</button>
  );
}

function Input({label,type="text",value,onChange,placeholder,style:sx={}}) {
  const [focused,setFocused]=useState(false);
  return (
    <div style={{marginBottom:14}}>
      {label&&<label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:2,marginBottom:5,textTransform:"uppercase"}}>{label}</label>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{width:"100%",background:"#111",border:`1.5px solid ${focused?C.lime+"88":"#222"}`,borderRadius:8,
          padding:"13px 14px",color:C.white,fontSize:14,outline:"none",
          boxSizing:"border-box",transition:"border-color 0.2s",...sx}}/>
    </div>
  );
}

function Select({label,value,onChange,options,placeholder}) {
  const [focused,setFocused]=useState(false);
  return (
    <div style={{marginBottom:14}}>
      {label&&<label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:2,marginBottom:5,textTransform:"uppercase"}}>{label}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{width:"100%",background:"#111",border:`1.5px solid ${focused?C.lime+"88":"#222"}`,borderRadius:8,
          padding:"13px 14px",color:value?C.white:C.ghost,fontSize:14,outline:"none",appearance:"none",
          boxSizing:"border-box",transition:"border-color 0.2s",
          backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat:"no-repeat",backgroundPosition:"right 14px center"}}>
        {placeholder&&<option value="" disabled>{placeholder}</option>}
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Textarea({label,value,onChange,placeholder,maxLength=160}) {
  const [focused,setFocused]=useState(false);
  return (
    <div style={{marginBottom:14}}>
      {label&&<label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:2,marginBottom:5,textTransform:"uppercase"}}>{label}</label>}
      <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        rows={3}
        style={{width:"100%",background:"#111",border:`1.5px solid ${focused?C.lime+"88":"#222"}`,borderRadius:8,
          padding:"13px 14px",color:C.white,fontSize:14,outline:"none",resize:"none",
          boxSizing:"border-box",transition:"border-color 0.2s",fontFamily:"inherit"}}/>
      <div style={{textAlign:"right",fontSize:10,color:C.ghost,marginTop:3}}>{value.length}/{maxLength}</div>
    </div>
  );
}

function StatBar({label,value,color}) {
  const col=color||sc(value);
  return (
    <div style={{marginBottom:9}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:10,color:C.ghost,letterSpacing:2,fontWeight:700}}>{label}</span>
        <span style={{fontSize:13,fontWeight:900,color:col}}>{value||"—"}</span>
      </div>
      <div style={{height:4,background:"#181818",borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${((value||0)/99)*100}%`,background:`linear-gradient(90deg,${col}88,${col})`,borderRadius:2,transition:"width 1.2s cubic-bezier(.4,0,.2,1)"}}/>
      </div>
    </div>
  );
}

function Toast({msg,type="ok"}) {
  if(!msg) return null;
  const cols={ok:C.lime,err:C.red,warn:C.gold,info:C.blue};
  return (
    <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",
      background:cols[type]||C.lime,color:type==="ok"?"#000":C.white,
      borderRadius:10,padding:"12px 22px",fontSize:13,fontWeight:800,
      zIndex:999,boxShadow:`0 4px 24px ${cols[type]}66`,whiteSpace:"nowrap",
      animation:"slideup 0.3s ease"}}>
      {msg}
    </div>
  );
}

function Hdr({title,sub,back,right}) {
  return (
    <div style={{background:"linear-gradient(180deg,#0d140d,#080808)",borderBottom:`1px solid #0f1f0f`,
      padding:"14px 18px",display:"flex",alignItems:"center",gap:12,
      position:"sticky",top:0,zIndex:50}}>
      {back&&<button onClick={back} style={{background:"#111",border:"1px solid #222",color:C.white,
        cursor:"pointer",fontSize:16,lineHeight:1,padding:"8px 12px",borderRadius:8}}>←</button>}
      <div style={{flex:1}}>
        {sub&&<div style={{fontSize:9,color:C.lime,letterSpacing:3,textTransform:"uppercase",marginBottom:1}}>{sub}</div>}
        <div style={{fontSize:18,fontWeight:900,color:C.white,letterSpacing:-0.5}}>{title}</div>
      </div>
      {right}
    </div>
  );
}

function Pill({children,color=C.lime}) {
  return <span style={{background:`${color}18`,border:`1px solid ${color}44`,borderRadius:20,
    padding:"3px 10px",fontSize:10,fontWeight:700,color,letterSpacing:1}}>{children}</span>;
}

function AgeBadge({age}) {
  if(!age) return null;
  const g=ageGroup(age);
  const cols={u12:C.cyan,u16:C.lime,u20:C.gold,adult:C.white,vet:"#ff8844",senior:C.ghost};
  return <Pill color={cols[g]||C.white}>{AGE_GROUP_LABELS[g]} · {age}y</Pill>;
}

// ── FIFA Card ─────────────────────────────────────────────────
function Card({player,size="full",glow=true}) {
  const [tilt,setTilt]=useState({x:0,y:0});
  const [hov,setHov]=useState(false);
  const ref=useRef();
  const overall=ov(player?.stats);
  const t=tier(overall,player?.badges||[]);
  const ts=C.tiers[t];
  const isGK=player?.position==="GK";
  const W=size==="mini"?120:size==="md"?190:260;
  const H=W*1.46;
  const sc2=W/260;

  const mainStats=isGK
    ?[["DIV",player?.gk_stats?.diving||0],["HAN",player?.gk_stats?.handling||0],["KIC",player?.gk_stats?.kicking||0],["REF",player?.gk_stats?.reflexes||0],["SPD",player?.stats?.pace||0],["POS",player?.gk_stats?.positioning||0]]
    :[["PAC",player?.stats?.pace||0],["SHO",player?.stats?.shooting||0],["PAS",player?.stats?.passing||0],["DRI",player?.stats?.dribbling||0],["DEF",player?.stats?.defending||0],["PHY",player?.stats?.physical||0]];

  function onMove(e){
    const r=ref.current?.getBoundingClientRect();
    if(!r) return;
    setTilt({x:((e.clientX-r.left)/r.width-0.5)*18,y:((e.clientY-r.top)/r.height-0.5)*-18});
  }
  const age=calcAge(player?.date_of_birth);
  const g=ageGroup(age);
  const bgs={
    bronze:"linear-gradient(145deg,#1c0e00,#2a1800,#100a00,#cd7f3218)",
    silver:"linear-gradient(145deg,#101010,#1c1c1c,#0c0c0c,#b0b8c018)",
    gold:"linear-gradient(145deg,#160e00,#241800,#0e0a00,#f0c04028)",
    elite:"linear-gradient(145deg,#140a00,#201400,#0a0600,#ffdd0044)",
    rare:"linear-gradient(145deg,#0c0618,#180a2c,#060410,#cc44ff44)",
  };

  return (
    <div ref={ref} onMouseMove={onMove} onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>{setHov(false);setTilt({x:0,y:0});}}
      style={{width:W,height:H,flexShrink:0,position:"relative",
        transform:hov?`perspective(700px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale(1.05)`:"perspective(700px) scale(1)",
        transition:hov?"transform 0.06s":"transform 0.5s cubic-bezier(.2,.8,.2,1)",
        borderRadius:16*sc2,border:`1.5px solid ${ts.b}66`,
        boxShadow:glow?(hov?`0 28px 70px ${ts.g},0 0 50px ${ts.g}`:`0 8px 30px ${ts.g}66`):"none",
        animation:size==="full"&&glow?"cardfloat 4s ease-in-out infinite":"none"}}>
      <div style={{width:"100%",height:"100%",borderRadius:16*sc2,overflow:"hidden",background:bgs[t],position:"relative"}}>
        {hov&&<div style={{position:"absolute",inset:0,borderRadius:16*sc2,pointerEvents:"none",zIndex:10,
          background:t==="rare"
            ?`linear-gradient(${110+tilt.x*3}deg,transparent 10%,${C.purple}28 35%,${C.cyan}18 55%,transparent 75%)`
            :`linear-gradient(${105+tilt.x*2}deg,transparent 20%,${ts.b}18 45%,transparent 65%)`}}/>}
        <div style={{padding:`${14*sc2}px ${14*sc2}px ${4*sc2}px`,position:"relative"}}>
          <div style={{fontSize:44*sc2,fontWeight:900,lineHeight:1,color:ts.t,fontFamily:"'Arial Black',sans-serif",textShadow:`0 0 20px ${ts.b}88`}}>
            {overall||"—"}
          </div>
          <div style={{fontSize:13*sc2,fontWeight:800,color:ts.t,letterSpacing:2,marginTop:1*sc2}}>{player?.position||"ST"}</div>
          <div style={{fontSize:20*sc2,marginTop:3*sc2}}>⚽</div>
          <div style={{position:"absolute",top:10*sc2,right:10*sc2,background:`${ts.b}18`,border:`1px solid ${ts.b}55`,
            borderRadius:5*sc2,padding:`${2*sc2}px ${7*sc2}px`,fontSize:8*sc2,fontWeight:900,color:ts.t,letterSpacing:1.5}}>
            {t==="rare"?"✦ RARE":t==="elite"?"★ ELITE":t.toUpperCase()}
          </div>
          {/* Age group badge on card */}
          {age&&<div style={{position:"absolute",bottom:4*sc2,right:10*sc2,fontSize:7*sc2,color:`${ts.t}99`,fontWeight:700,letterSpacing:0.5}}>
            {AGE_GROUP_LABELS[g]}
          </div>}
        </div>
        <div style={{width:W*0.68,height:W*0.68,margin:"0 auto",borderRadius:"50% 50% 0 0",overflow:"hidden",border:`2px solid ${ts.b}33`,background:"#0a0a0a"}}>
          {player?.photo_url
            ?<img src={player.photo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{fontSize:50*sc2,opacity:0.15}}>👤</div>
            </div>}
        </div>
        <div style={{textAlign:"center",padding:`${6*sc2}px ${10*sc2}px ${3*sc2}px`}}>
          <div style={{fontSize:14*sc2,fontWeight:900,color:C.white,letterSpacing:2.5,
            fontFamily:"'Arial Black',sans-serif",textTransform:"uppercase",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {player?.name||"PLAYER"}
          </div>
          {player?.nationality&&<div style={{fontSize:8*sc2,color:C.ghost,letterSpacing:1,marginTop:1*sc2}}>{player.nationality}</div>}
        </div>
        <div style={{height:1,background:`linear-gradient(90deg,transparent,${ts.b}66,transparent)`,margin:`0 ${14*sc2}px ${5*sc2}px`}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:`0 ${14*sc2}px`}}>
          {mainStats.map(([l,v])=>(
            <div key={l} style={{textAlign:"center",paddingBottom:4*sc2}}>
              <div style={{fontSize:15*sc2,fontWeight:900,color:sc(v),fontFamily:"'Arial Black',sans-serif",textShadow:`0 0 8px ${sc(v)}66`}}>{v||"—"}</div>
              <div style={{fontSize:7*sc2,color:C.ghost,letterSpacing:1,fontWeight:700}}>{l}</div>
            </div>
          ))}
        </div>
        {(player?.badges||[]).length>0&&(
          <div style={{display:"flex",justifyContent:"center",gap:3*sc2,padding:`${4*sc2}px`}}>
            {(player.badges||[]).slice(0,5).map(bid=>{const b=BADGES.find(x=>x.id===bid);return b?<span key={bid} style={{fontSize:11*sc2}}>{b.icon}</span>:null;})}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Smart Camera with proper motion detection ─────────────────
function SmartCamera({mode="record",onResult,instructions=[],timerSecs=60,playerAge=22}) {
  const cam=useCamera();
  const [phase,setPhase]=useState("setup");
  const [sprintState,setSprintState]=useState("idle");
  const [sprintTime,setSprintTime]=useState(null);
  const [sprintMs,setSprintMs]=useState(null);
  const [pushCount,setPushCount]=useState(0);
  const [jumpHang,setJumpHang]=useState(null);
  const [airborne,setAirborne]=useState(false);
  const sprintStart=useRef(null);
  const jumpStart=useRef(null);
  const motionBuf=useRef([]);
  const timer=useTimer(timerSecs,()=>{cam.recStop();setPhase("done");});
  const group=ageGroup(playerAge);

  useMotion(cam.videoRef,cam.canvasRef,phase==="live",(score)=>{
    const now=Date.now();

    if(mode==="sprint"){
      if(sprintState==="waiting"&&score>55){
        sprintStart.current=now; setSprintState("running");
      } else if(sprintState==="running"&&score<15&&sprintStart.current){
        const elapsed=(now-sprintStart.current)/1000;
        if(elapsed>0.4&&elapsed<8){
          setSprintTime(elapsed.toFixed(2));
          setSprintMs(elapsed);
          setSprintState("done");
        }
      }
    }

    if(mode==="pushups"){
      motionBuf.current.push({score,time:now});
      if(motionBuf.current.length>30) motionBuf.current.shift();
      const recent=motionBuf.current.slice(-8);
      const prev=motionBuf.current.slice(-16,-8);
      const avgR=recent.reduce((a,b)=>a+b.score,0)/recent.length;
      const avgP=prev.length?prev.reduce((a,b)=>a+b.score,0)/prev.length:0;
      if(avgP>40&&avgR<12) setPushCount(c=>c+1);
    }

    if(mode==="jump"){
      if(!airborne&&score>90){setAirborne(true);jumpStart.current=now;}
      if(airborne&&score<20&&jumpStart.current){
        const hang=(now-jumpStart.current)/1000;
        if(hang>0.15&&hang<2.5){setJumpHang(hang.toFixed(3));setAirborne(false);}
      }
    }
  });

  async function openCamera(){
    await cam.startCam("environment");
    setPhase("live");
    if(mode!=="sprint"){cam.recStart();timer.start();}
  }

  function startSprint(){setSprintState("waiting");cam.recStart();timer.start();}

  function finish(){
    cam.recStop();timer.stop();setPhase("done");
    const bench20m=SPRINT_BENCH[group];
    const jumpBench=JUMP_BENCH[group];
    const pushBench=PUSHUP_BENCH[group];

    if(mode==="sprint"&&sprintMs){
      const s=sprintToScore(sprintMs,group);
      const cm20=Math.round(2000/sprintMs*0.1);
      onResult({score:s, raw:sprintTime+"s", label:`${sprintTime}s (20m) — ${bench20m.label} avg: ${bench20m.avg}s`, detail:`Score: ${s}/99 vs ${bench20m.label} average`});
    } else if(mode==="pushups"){
      const s=rawToScore(pushCount,pushBench);
      onResult({score:s, raw:pushCount, label:`${pushCount} push-ups`, detail:`Score: ${s}/99 vs ${AGE_GROUP_LABELS[group]} average: ${pushBench.avg} reps`});
    } else if(mode==="jump"&&jumpHang){
      const h=parseFloat(jumpHang);
      const cm=Math.round(1.22*h*h*9.81*100);
      const s=rawToScore(cm,jumpBench);
      onResult({score:s, raw:jumpHang+"s hang", label:`${cm}cm jump height`, detail:`Score: ${s}/99 vs ${AGE_GROUP_LABELS[group]} average: ${jumpBench.avg}cm`});
    } else {
      onResult({score:null, blob:cam.blob});
    }
  }

  const overlayCol=mode==="sprint"?C.lime:mode==="pushups"?C.red:C.cyan;

  return (
    <div style={{background:"#060606",borderRadius:14,overflow:"hidden",border:`1px solid ${overlayCol}22`}}>
      {phase==="setup"&&(
        <div style={{padding:16}}>
          {/* Age group context */}
          {mode!=="record"&&<div style={{background:`${C.blue}0f`,border:`1px solid ${C.blue}22`,borderRadius:8,padding:10,marginBottom:14}}>
            <div style={{fontSize:10,color:C.blue,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>Your Age Group</div>
            <div style={{fontSize:12,color:C.white}}>{AGE_GROUP_LABELS[group]} — benchmarks calibrated for your age</div>
            {mode==="sprint"&&<div style={{fontSize:11,color:C.ghost,marginTop:3}}>Avg 20m: {SPRINT_BENCH[group].avg}s · Elite: {SPRINT_BENCH[group].elite}s</div>}
            {mode==="pushups"&&<div style={{fontSize:11,color:C.ghost,marginTop:3}}>Avg: {PUSHUP_BENCH[group].avg} reps · Elite: {PUSHUP_BENCH[group].elite} reps</div>}
            {mode==="jump"&&<div style={{fontSize:11,color:C.ghost,marginTop:3}}>Avg: {JUMP_BENCH[group].avg}cm · Elite: {JUMP_BENCH[group].elite}cm</div>}
          </div>}
          {instructions.map((s,i)=>(
            <div key={i} style={{display:"flex",gap:10,marginBottom:10}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:`${overlayCol}18`,border:`1px solid ${overlayCol}44`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:overlayCol,flexShrink:0}}>{i+1}</div>
              <p style={{margin:0,color:C.ghost,fontSize:12,lineHeight:1.6}}>{s}</p>
            </div>
          ))}
          {cam.err&&<div style={{color:C.red,fontSize:12,marginBottom:10}}>{cam.err}</div>}
          <Btn full onClick={openCamera} style={{marginTop:8}}>📷 Open Camera</Btn>
        </div>
      )}

      {phase==="live"&&(
        <div>
          <div style={{position:"relative",background:"#000"}}>
            <video ref={cam.videoRef} muted playsInline autoPlay
              style={{width:"100%",maxHeight:300,objectFit:"cover",display:"block"}}/>
            <canvas ref={cam.canvasRef} style={{display:"none"}}/>

            {/* Overlays */}
            <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
              {mode==="sprint"&&(<>
                <div style={{position:"absolute",left:"8%",top:0,bottom:0,width:3,background:C.lime,opacity:0.9,boxShadow:`0 0 10px ${C.lime}`}}/>
                <div style={{position:"absolute",right:"8%",top:0,bottom:0,width:3,background:C.red,opacity:0.9,boxShadow:`0 0 10px ${C.red}`}}/>
                <div style={{position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",background:"#000000cc",borderRadius:8,padding:"8px 16px",textAlign:"center",minWidth:160}}>
                  {sprintState==="idle"&&<div style={{fontSize:11,color:C.lime,fontWeight:700}}>Press START below to begin</div>}
                  {sprintState==="waiting"&&<div style={{fontSize:14,fontWeight:900,color:C.lime,animation:"blink 0.5s infinite"}}>⚡ GO — SPRINT NOW!</div>}
                  {sprintState==="running"&&<div style={{fontSize:13,fontWeight:900,color:C.gold}}>🏃 SPRINTING...</div>}
                  {sprintState==="done"&&<div>
                    <div style={{fontSize:22,fontWeight:900,color:C.lime}}>{sprintTime}s ✓</div>
                    <div style={{fontSize:10,color:C.ghost}}>vs avg {SPRINT_BENCH[group].avg}s</div>
                  </div>}
                </div>
              </>)}

              {mode==="pushups"&&(
                <div style={{position:"absolute",top:10,right:10,background:"#000000cc",borderRadius:10,padding:"10px 16px",textAlign:"center"}}>
                  <div style={{fontSize:32,fontWeight:900,color:C.lime,fontFamily:"'Arial Black',sans-serif"}}>{pushCount}</div>
                  <div style={{fontSize:10,color:C.ghost}}>REPS</div>
                  <div style={{fontSize:9,color:C.ghost,marginTop:2}}>avg: {PUSHUP_BENCH[group].avg}</div>
                </div>
              )}

              {mode==="jump"&&(
                <div style={{position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",background:"#000000cc",borderRadius:8,padding:"8px 14px",textAlign:"center"}}>
                  {jumpHang
                    ?<div>
                      <div style={{fontSize:18,fontWeight:900,color:C.lime}}>{Math.round(1.22*parseFloat(jumpHang)*parseFloat(jumpHang)*9.81*100)}cm ✓</div>
                      <div style={{fontSize:9,color:C.ghost}}>vs avg {JUMP_BENCH[group].avg}cm</div>
                    </div>
                    :<div style={{fontSize:12,color:airborne?C.gold:C.ghost}}>{airborne?"⬆️ AIRBORNE...":"Jump when ready"}</div>}
                </div>
              )}

              {cam.recording&&(
                <div style={{position:"absolute",top:10,left:10,display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:C.red,animation:"blink 1s infinite"}}/>
                  <span style={{fontSize:11,color:C.white,fontWeight:700,background:"#000000aa",padding:"2px 8px",borderRadius:4}}>
                    {mode!=="sprint"?timer.display:"REC"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div style={{padding:12,display:"flex",gap:8}}>
            {mode==="sprint"&&sprintState==="idle"&&<Btn full onClick={startSprint} v="lime">⚡ Start Sprint</Btn>}
            {mode==="sprint"&&sprintState==="done"&&<Btn full onClick={finish} v="lime">✓ Save This Time</Btn>}
            {mode==="sprint"&&(sprintState==="waiting"||sprintState==="running")&&<Btn full onClick={()=>setSprintState("idle")} v="ghost">↩ Reset</Btn>}
            {mode!=="sprint"&&<Btn full onClick={finish} v="red">⏹ Stop & Save</Btn>}
          </div>
        </div>
      )}

      {phase==="done"&&(
        <div style={{padding:20,textAlign:"center"}}>
          <div style={{fontSize:44,marginBottom:8}}>✅</div>
          <div style={{fontSize:13,fontWeight:700,color:C.white}}>Done</div>
        </div>
      )}
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
    </div>
  );
}

// ── Agility Drill ─────────────────────────────────────────────
function AgilityDrill({onScore,playerAge=22}) {
  const CMDS=["← LEFT","RIGHT →","↑ FORWARD","↓ BACK","✋ HOLD"];
  const COLS=[C.blue,C.lime,C.gold,C.red,C.purple];
  const [cmd,setCmd]=useState(null);
  const [cmdColor,setCmdColor]=useState(C.lime);
  const [scores,setScores]=useState([]);
  const [count,setCount]=useState(0);
  const [done,setDone]=useState(false);
  const startRef=useRef(null);
  const group=ageGroup(playerAge);

  function next(){
    if(count>=10){setDone(true);onScore(scores);return;}
    const i=Math.floor(Math.random()*CMDS.length);
    setCmd(CMDS[i]);setCmdColor(COLS[i]);
    startRef.current=Date.now();setCount(n=>n+1);
  }
  function react(){
    if(!startRef.current) return;
    const ms=Date.now()-startRef.current;
    const ns=[...scores,ms]; setScores(ns); startRef.current=null;
    if(ns.length>=10){setDone(true);onScore(ns);return;}
    setTimeout(next,500);
  }

  if(done){
    const avg=scores.reduce((a,b)=>a+b,0)/scores.length;
    const s=avg<500?92:avg<700?82:avg<900?70:avg<1200?55:38;
    return (
      <div style={{textAlign:"center",padding:20}}>
        <div style={{fontSize:48,marginBottom:12}}>⚡</div>
        <div style={{fontSize:32,fontWeight:900,color:C.lime}}>{Math.round(avg)}ms</div>
        <div style={{fontSize:12,color:C.ghost,marginTop:4}}>Average reaction time</div>
        <div style={{marginTop:8,fontSize:11,color:C.ghost}}>Age group: {AGE_GROUP_LABELS[group]}</div>
        <div style={{marginTop:16,display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
          {scores.map((ms,i)=><span key={i} style={{background:"#111",borderRadius:6,padding:"4px 8px",fontSize:11,color:sc(ms<700?85:ms<1000?70:45)}}>{ms}ms</span>)}
        </div>
        <div style={{marginTop:16,fontSize:13,color:sc(s),fontWeight:700}}>Score: {s} / 99</div>
      </div>
    );
  }
  if(!cmd) return (
    <div style={{textAlign:"center",padding:20}}>
      <p style={{color:C.ghost,fontSize:12,lineHeight:1.7,marginBottom:16}}>Place 4 cones around you — front, back, left, right. Stand in the centre. React to each direction as fast as you can.</p>
      <Btn full onClick={next}>▶ Start Drill</Btn>
    </div>
  );
  return (
    <div style={{textAlign:"center",padding:20}}>
      <div style={{fontSize:10,color:C.ghost,marginBottom:12}}>{count}/10</div>
      <div style={{fontSize:52,fontWeight:900,color:cmdColor,letterSpacing:2,fontFamily:"'Arial Black',sans-serif",animation:"cmdpop 0.15s ease",marginBottom:24}}>{cmd}</div>
      <Btn full onClick={react} v="blue" style={{fontSize:16,padding:"16px 22px"}}>✓ Done it!</Btn>
      <style>{`@keyframes cmdpop{from{transform:scale(0.6);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════════════════════════

// ── Landing ────────────────────────────────────────────────────
function Landing({onNav}) {
  const demo={name:"STRIKER",position:"ST",photo_url:null,nationality:"Nigeria",badges:["explosive","silky","tested"],
    stats:{pace:82,shooting:86,passing:74,dribbling:88,defending:42,physical:79,jumping:77,agility:85}};
  const [tick,setTick]=useState(0);
  useEffect(()=>{const iv=setInterval(()=>setTick(t=>t+1),3000);return()=>clearInterval(iv);},[]);
  const words=["YOUR GAME.","YOUR CARD.","YOUR LEGACY."];
  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"}}>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.06}}>
        <ellipse cx="50%" cy="50%" rx="42%" ry="28%" fill="none" stroke={C.lime} strokeWidth="1"/>
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke={C.lime} strokeWidth="0.8"/>
        <circle cx="50%" cy="50%" r="7%" fill="none" stroke={C.lime} strokeWidth="0.8"/>
        <rect x="2%" y="28%" width="10%" height="44%" fill="none" stroke={C.lime} strokeWidth="0.8"/>
        <rect x="88%" y="28%" width="10%" height="44%" fill="none" stroke={C.lime} strokeWidth="0.8"/>
      </svg>
      <div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:`radial-gradient(circle,${C.lime}0a,transparent 70%)`,top:"10%",left:"50%",transform:"translateX(-50%)",pointerEvents:"none"}}/>
      <div style={{zIndex:1,maxWidth:400,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:10,color:C.lime,letterSpacing:8,fontWeight:700,textTransform:"uppercase",marginBottom:6}}>⚽ Street</div>
        <div style={{fontSize:84,fontWeight:900,lineHeight:0.85,color:C.white,fontFamily:"'Arial Black',sans-serif",textTransform:"uppercase",letterSpacing:-4,marginBottom:8,textShadow:`0 0 60px ${C.lime}22`,animation:"logopulse 3s ease-in-out infinite"}}>TWICE</div>
        <div style={{fontSize:12,color:C.lime,letterSpacing:4,marginBottom:48,fontWeight:700,minHeight:20,transition:"opacity 0.4s"}}>{words[tick%words.length]}</div>
        <div style={{display:"flex",justifyContent:"center",marginBottom:48,filter:`drop-shadow(0 0 40px ${C.gold}44)`}}>
          <Card player={demo} size="md" glow/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:28}}>
          <Btn full onClick={()=>onNav("signup")}>Create Your Card →</Btn>
          <Btn full v="ghost" onClick={()=>onNav("login")}>Sign In</Btn>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:16}}>
          {["Bronze","Silver","Gold","Elite","✦ Rare"].map((t,i)=>(
            <div key={t} style={{fontSize:9,color:[C.tiers.bronze.t,C.tiers.silver.t,C.tiers.gold.t,C.tiers.elite.t,C.tiers.rare.t][i],fontWeight:700,letterSpacing:1}}>{t}</div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes cardfloat{0%,100%{transform:perspective(700px) translateY(0)}50%{transform:perspective(700px) translateY(-8px)}}
        @keyframes logopulse{0%,100%{text-shadow:0 0 40px ${C.lime}44,0 0 80px ${C.lime}18}50%{text-shadow:0 0 60px ${C.lime}88,0 0 120px ${C.lime}33}}
        @keyframes slideup{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
      `}</style>
    </div>
  );
}

// ── Signup ─────────────────────────────────────────────────────
function Signup({onNav,onLogin}) {
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({name:"",email:"",password:"",position:"ST",nationality:"",foot:"Right",date_of_birth:"",bio:""});
  const [photo,setPhoto]=useState(null);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const fileRef=useRef();
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  const previewAge=form.date_of_birth?calcAge(form.date_of_birth):null;

  async function submit(){
    if(!form.name||!form.email||!form.password){setErr("Please fill all fields.");return;}
    if(!form.date_of_birth){setErr("Please enter your date of birth.");return;}
    if(!form.nationality){setErr("Please select your nationality.");return;}
    setLoading(true);setErr("");
    try{
      const auth=await sbAuth(form.email,form.password,"signup");
      const uid=auth.user?.id;
      const player={
        id:uid,email:form.email,name:form.name,
        position:form.position,nationality:form.nationality,foot:form.foot,
        date_of_birth:form.date_of_birth,bio:form.bio,
        photo_url:photo||null,
        stats:{pace:0,shooting:0,passing:0,dribbling:0,defending:0,physical:0,jumping:0,agility:0},
        peer_stats:{aggression:0,awareness:0,tackling:0,leadership:0,soccer_iq:0},
        gk_stats:{diving:0,handling:0,kicking:0,reflexes:0,positioning:0},
        badges:[],team_id:null,motm_votes:0,games_played:0,
        challenge_code:randCode(),
        last_benchmark:new Date().toISOString(),
      };
      await sbFetch("players",{method:"POST",body:JSON.stringify(player)});
      onLogin(player);onNav("dashboard");
    }catch(e){setErr(e.message);}
    setLoading(false);
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,padding:"24px 20px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:380}}>
        <Btn v="ghost" sm onClick={()=>onNav("landing")} style={{marginBottom:24}}>← Back</Btn>
        <div style={{fontSize:9,color:C.lime,letterSpacing:3,marginBottom:6,textTransform:"uppercase"}}>Step {step} of 2</div>
        <div style={{height:3,background:"#111",borderRadius:2,marginBottom:24,overflow:"hidden"}}>
          <div style={{height:"100%",width:step===1?"50%":"100%",background:C.lime,transition:"width 0.4s ease"}}/>
        </div>
        <h1 style={{color:C.white,fontSize:28,fontWeight:900,margin:"0 0 24px",letterSpacing:-1}}>
          {step===1?"Create Account":"Your Profile"}
        </h1>
        {err&&<div style={{background:`${C.red}18`,border:`1px solid ${C.red}44`,borderRadius:8,padding:"12px 14px",color:C.red,fontSize:12,marginBottom:16}}>{err}</div>}

        {step===1&&(<>
          <Input label="Full Name" value={form.name} onChange={v=>set("name",v)} placeholder="Your name"/>
          <Input label="Email" type="email" value={form.email} onChange={v=>set("email",v)} placeholder="you@email.com"/>
          <Input label="Password" type="password" value={form.password} onChange={v=>set("password",v)} placeholder="Min 6 characters"/>

          {/* Date of birth */}
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:2,marginBottom:5,textTransform:"uppercase"}}>Date of Birth</label>
            <input type="date" value={form.date_of_birth} onChange={e=>set("date_of_birth",e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              style={{width:"100%",background:"#111",border:"1.5px solid #222",borderRadius:8,padding:"13px 14px",color:C.white,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            {previewAge!==null&&(
              <div style={{marginTop:6,display:"flex",alignItems:"center",gap:8}}>
                <AgeBadge age={previewAge}/>
                <span style={{fontSize:11,color:C.ghost}}>Your stats will be benchmarked against this age group</span>
              </div>
            )}
          </div>

          <Btn full onClick={()=>{if(!form.name||!form.email||!form.password||!form.date_of_birth){setErr("Fill all fields including date of birth");return;}setErr("");setStep(2);}}>Continue →</Btn>
          <p style={{textAlign:"center",marginTop:18,color:C.ghost,fontSize:12}}>Have an account? <span onClick={()=>onNav("login")} style={{color:C.lime,cursor:"pointer",fontWeight:700}}>Sign in</span></p>
        </>)}

        {step===2&&(<>
          {/* Photo */}
          <div style={{textAlign:"center",marginBottom:22}}>
            <div onClick={()=>fileRef.current.click()} style={{width:90,height:90,borderRadius:"50%",margin:"0 auto 10px",background:"#111",border:`2px dashed ${C.lime}44`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden"}}>
              {photo?<img src={photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:30}}>📸</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const r=new FileReader();r.onload=ev=>setPhoto(ev.target.result);r.readAsDataURL(e.target.files[0]);}}/>
            <span style={{fontSize:11,color:C.ghost,cursor:"pointer"}} onClick={()=>fileRef.current.click()}>Tap to add photo</span>
          </div>

          {/* Country dropdown */}
          <Select label="Nationality / Country" value={form.nationality} onChange={v=>set("nationality",v)}
            options={COUNTRIES} placeholder="Select your country"/>

          {/* Position */}
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:2,marginBottom:5,textTransform:"uppercase"}}>Position</label>
            <select value={form.position} onChange={e=>set("position",e.target.value)}
              style={{width:"100%",background:"#111",border:"1.5px solid #222",borderRadius:8,padding:"13px 14px",color:C.white,fontSize:14,outline:"none"}}>
              {POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Foot */}
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>Preferred Foot</label>
            <div style={{display:"flex",gap:8}}>
              {["Left","Right","Both"].map(f=>(
                <button key={f} onClick={()=>set("foot",f)} style={{flex:1,padding:12,borderRadius:8,border:`1.5px solid ${form.foot===f?C.lime:"#222"}`,background:form.foot===f?`${C.lime}14`:"transparent",color:form.foot===f?C.lime:C.ghost,cursor:"pointer",fontSize:13,fontWeight:700,transition:"all 0.2s"}}>{f}</button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <Textarea label="Player Bio (optional)" value={form.bio} onChange={v=>set("bio",v)} placeholder="Tell people about your game — position, style, achievements..." maxLength={160}/>

          <Btn full onClick={submit} disabled={loading}>{loading?"Creating your card...":"Create My Card ⚽"}</Btn>
        </>)}
      </div>
    </div>
  );
}

// ── Login ──────────────────────────────────────────────────────
function Login({onNav,onLogin}) {
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  async function submit(){
    if(!email||!pw){setErr("Enter your email and password.");return;}
    setLoading(true);setErr("");
    try{
      await sbAuth(email,pw,"login");
      const user=await sbGetUser();
      const rows=await sbFetch(`players?id=eq.${user.id}&limit=1`);
      if(!rows?.[0]) throw new Error("Profile not found. Please sign up first.");
      onLogin(rows[0]);onNav("dashboard");
    }catch(e){setErr(e.message);}
    setLoading(false);
  }
  return (
    <div style={{minHeight:"100vh",background:C.bg,padding:"24px 20px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:360}}>
        <Btn v="ghost" sm onClick={()=>onNav("landing")} style={{marginBottom:24}}>← Back</Btn>
        <h1 style={{color:C.white,fontSize:28,fontWeight:900,margin:"0 0 8px",letterSpacing:-1}}>Welcome back</h1>
        <p style={{color:C.ghost,fontSize:13,marginBottom:28}}>Sign in to access your card and stats.</p>
        {err&&<div style={{background:`${C.red}18`,border:`1px solid ${C.red}44`,borderRadius:8,padding:"12px 14px",color:C.red,fontSize:12,marginBottom:16}}>{err}</div>}
        <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com"/>
        <Input label="Password" type="password" value={pw} onChange={setPw} placeholder="Your password"/>
        <Btn full onClick={submit} disabled={loading} style={{marginTop:8}}>{loading?"Signing in...":"Sign In"}</Btn>
        <p style={{textAlign:"center",marginTop:18,color:C.ghost,fontSize:12}}>No account? <span onClick={()=>onNav("signup")} style={{color:C.lime,cursor:"pointer",fontWeight:700}}>Create one</span></p>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────
function Dashboard({player,onNav,onSignOut}) {
  const overall=ov(player?.stats);
  const t=tier(overall,player?.badges||[]);
  const ts=C.tiers[t];
  const assessed=Object.values(player?.stats||{}).filter(v=>v>0).length;
  const age=calcAge(player?.date_of_birth);
  const group=ageGroup(age);
  const benchmarkDue=(Date.now()-new Date(player?.last_benchmark||0).getTime())>1000*60*60*24*180;

  const navItems=[
    {label:"Skills Tests",icon:"🧪",nav:"selftests",desc:"Solo camera assessments",color:C.lime},
    {label:"Challenges",icon:"⚔️",nav:"challenges",desc:"Link up & test vs players",color:C.red},
    {label:"Matches",icon:"⚽",nav:"matches",desc:"Set up & play games",color:C.gold},
    {label:"Leagues",icon:"🏆",nav:"leagues",desc:"Compete in a league",color:C.purple},
    {label:"My Team",icon:"👥",nav:"team",desc:"Squad & captain tools",color:C.blue},
    {label:"Compare",icon:"📊",nav:"compare",desc:"vs Mbappé & street avg",color:C.cyan},
    {label:"Badges",icon:"🏅",nav:"badges",desc:"Your achievements",color:C.gold},
    {label:"Leaderboard",icon:"📈",nav:"leaderboard",desc:"Global rankings",color:C.lime},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,paddingBottom:40}}>
      <div style={{background:"linear-gradient(180deg,#0d140d,#080808)",borderBottom:`1px solid #0f1f0f`,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:9,color:C.lime,letterSpacing:4,textTransform:"uppercase",marginBottom:2}}>Street Twice</div>
          <div style={{fontSize:18,fontWeight:900,letterSpacing:-0.5}}>{player?.name}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
            <Pill color={ts.t}>{t.toUpperCase()}</Pill>
            {age&&<AgeBadge age={age}/>}
          </div>
          <button onClick={onSignOut} style={{background:"none",border:"none",color:C.ghost,cursor:"pointer",fontSize:12}}>Sign out</button>
        </div>
      </div>

      <div style={{padding:"18px 18px 0",maxWidth:460,margin:"0 auto"}}>
        {benchmarkDue&&(
          <div style={{background:`${C.red}14`,border:`1px solid ${C.red}33`,borderRadius:12,padding:14,marginBottom:18,display:"flex",gap:12,alignItems:"center"}}>
            <span style={{fontSize:24}}>⏰</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.red}}>6-Month Benchmark Due</div>
              <div style={{fontSize:11,color:C.ghost,marginTop:2}}>Your solo tests have expired. Redo them to keep stats valid.</div>
            </div>
            <Btn sm v="red" onClick={()=>onNav("selftests")}>Go</Btn>
          </div>
        )}

        {/* Bio */}
        {player?.bio&&(
          <div style={{background:"#0d0d0d",borderRadius:12,padding:14,marginBottom:16,border:`1px solid #1a1a1a`}}>
            <div style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Bio</div>
            <div style={{fontSize:13,color:C.white,lineHeight:1.6,fontStyle:"italic"}}>"{player.bio}"</div>
          </div>
        )}

        {/* Card */}
        <div style={{display:"flex",justifyContent:"center",marginBottom:24,position:"relative"}}>
          <div style={{position:"absolute",width:200,height:200,borderRadius:"50%",background:`radial-gradient(circle,${ts.g},transparent 70%)`,top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:0}}/>
          <div style={{zIndex:1}}><Card player={player} size="full"/></div>
        </div>

        {/* Age group benchmarks */}
        {age&&(
          <div style={{background:"#0d0d0d",borderRadius:12,padding:14,marginBottom:16,border:`1px solid ${C.blue}18`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:10,color:C.blue,letterSpacing:2,textTransform:"uppercase"}}>Your Age Group Benchmarks</div>
              <AgeBadge age={age}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[
                {label:"Sprint avg",val:SPRINT_BENCH[group].avg+"s",sub:"20m"},
                {label:"Jump avg",val:JUMP_BENCH[group].avg+"cm",sub:"vertical"},
                {label:"Push-ups avg",val:PUSHUP_BENCH[group].avg+" reps",sub:"max"},
              ].map(b=>(
                <div key={b.label} style={{textAlign:"center",background:"#181818",borderRadius:8,padding:"8px 6px"}}>
                  <div style={{fontSize:14,fontWeight:900,color:C.white}}>{b.val}</div>
                  <div style={{fontSize:9,color:C.ghost,marginTop:2}}>{b.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Challenge code */}
        <div style={{background:"#0d0d0d",border:`1px solid ${C.lime}22`,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:9,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>Challenge Code</div>
            <div style={{fontSize:20,fontWeight:900,color:C.lime,letterSpacing:4}}>{player?.challenge_code||"——"}</div>
          </div>
          <div style={{fontSize:10,color:C.ghost,textAlign:"right"}}>Share with<br/>opponents</div>
        </div>

        {/* Progress */}
        <div style={{background:"#0d0d0d",borderRadius:12,padding:14,marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase"}}>Tests Complete</span>
            <span style={{fontSize:13,fontWeight:900,color:C.lime}}>{assessed} / {Object.keys(STATS_META).length}</span>
          </div>
          <div style={{height:5,background:"#181818",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(assessed/Object.keys(STATS_META).length)*100}%`,background:`linear-gradient(90deg,${C.limeD},${C.lime})`,borderRadius:3,transition:"width 1.2s cubic-bezier(.4,0,.2,1)"}}/>
          </div>
        </div>

        {/* Nav */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {navItems.map(it=>(
            <button key={it.nav} onClick={()=>onNav(it.nav)}
              style={{background:"#0d0d0d",border:`1px solid ${it.color}18`,borderRadius:12,padding:14,textAlign:"left",cursor:"pointer",color:C.white,transition:"border-color 0.2s,transform 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=it.color+"44";e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=it.color+"18";e.currentTarget.style.transform="translateY(0)";}}>
              <div style={{fontSize:22,marginBottom:6}}>{it.icon}</div>
              <div style={{fontSize:13,fontWeight:700}}>{it.label}</div>
              <div style={{fontSize:10,color:C.ghost,marginTop:2}}>{it.desc}</div>
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{background:"#0d0d0d",borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Your Stats</div>
          {Object.entries(STATS_META).map(([k,m])=><StatBar key={k} label={m.l} value={player?.stats?.[k]} color={m.color}/>)}
        </div>

        <div style={{display:"flex",gap:10}}>
          {[{val:player?.games_played||0,label:"Games",col:C.lime},{val:player?.motm_votes||0,label:"MOTM",col:C.gold},{val:(player?.badges||[]).length,label:"Badges",col:C.purple}].map(s=>(
            <div key={s.label} style={{flex:1,background:"#0d0d0d",borderRadius:12,padding:14,textAlign:"center",border:`1px solid ${s.col}18`}}>
              <div style={{fontSize:28,fontWeight:900,color:s.col}}>{s.val}</div>
              <div style={{fontSize:9,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Self Tests ─────────────────────────────────────────────────
const TESTS=[
  {id:"pace",stat:"pace",icon:"⚡",label:"Sprint",color:C.lime,camMode:"sprint",
    what:"Sprint 20m while your phone records from the side. Motion detection auto-times your run and scores it against your age group average.",
    instructions:["Measure exactly 20m — place a cone or object at each end","Prop your phone sideways so BOTH ends are visible in frame","Stand at the start line. Press 'Start Sprint'","The app detects when you move and when you stop — your time is captured automatically"],
    tiers:["10m dash","20m acceleration","30m top speed"]},
  {id:"jumping",stat:"jumping",icon:"⬆️",label:"Jump Height",color:"#00ddff",camMode:"jump",
    what:"Camera detects hang time when you jump and converts it to centimetres, scored against your age group.",
    instructions:["Stand sideways to camera — full body head to feet visible","Jump straight up as high as you can","Camera detects when feet leave ground and land","Do 5 jumps — highest is recorded"],
    tiers:["Standing vertical","Approach jump","Running jump"]},
  {id:"physical",stat:"physical",icon:"💪",label:"Push-ups",color:C.red,camMode:"pushups",
    what:"Camera counts your push-up reps automatically via motion detection, scored against your age group.",
    instructions:["Phone sideways on ground 2m away — full body visible","Do as many full push-ups as you can","Chest must touch floor each rep — half reps don't count","Camera counts automatically"],
    tiers:["Max push-ups","Sit-ups 60s","Plank hold"]},
  {id:"agility",stat:"agility",icon:"🏃",label:"Agility",color:C.gold,camMode:"agility",
    what:"Random direction commands flash on screen. Your reaction time is measured and scored.",
    instructions:["4 cones around you — front, back, left, right — 2m each","Stand in the centre facing your phone","Commands flash — move to that cone and tap Done","10 commands. Average reaction time = your score"],
    tiers:["4-cone basic","T-drill","Diamond + commands"]},
  {id:"shooting",stat:"shooting",icon:"🎯",label:"Shooting",color:"#ff8844",camMode:"record",
    what:"Shoot at a marked target. Count your hits and enter your score.",
    instructions:["Mark a 60×60cm target on a wall or goal with tape","Stand 10m back — film from the side","Take 10 shots at the target","Count hits and enter your score below"],
    tiers:["10m accuracy","15m power","20m corners"]},
  {id:"passing",stat:"passing",icon:"🔄",label:"Passing",color:C.blue,camMode:"record",
    what:"Pass at targets from set distances. Accuracy and weight both scored.",
    instructions:["Mark a 50cm target on a wall","10 passes from 10m — count hits","Move to 15m for tier 2, 20m for tier 3"],
    tiers:["5m ground","15m driven","20m lofted"]},
  {id:"dribbling",stat:"dribbling",icon:"🌀",label:"Dribbling",color:C.purple,camMode:"record",
    what:"Weave through a cone course as fast as possible. Cone touches reduce your score.",
    instructions:["6 cones in a line, 1m apart","Film from the side — all cones visible","Dribble through and back","3 attempts, best counts. Cone touch = -2 each"],
    tiers:["6 cones 1m","8 cones 0.75m","10 cones 0.5m + juggle"]},
  {id:"defending",stat:"defending",icon:"🛡️",label:"Defending",color:C.blue,camMode:null,
    what:"Defending is measured through 1v1 Challenges against registered opponents. Head to Challenges.",
    instructions:[],tiers:[]},
];

function SelfTests({player,onNav,onStat}) {
  const [sel,setSel]=useState(null);
  const [tierIdx,setTierIdx]=useState(0);
  const [phase,setPhase]=useState("list");
  const [score,setScore]=useState("");
  const [toast,setToast]=useState("");
  const age=calcAge(player?.date_of_birth);
  const group=ageGroup(age);

  function showToast(m,t="ok"){setToast(m);setTimeout(()=>setToast(""),2500);}
  function pick(t){if(!t.camMode&&t.id==="defending"){onNav("challenges");return;}setSel(t);setTierIdx(0);setPhase("intro");setScore("");}

  function submitScore(raw){
    const s=Math.min(99,Math.max(15,Math.round(raw)));
    onStat(sel.stat,s);showToast("Score saved! ✓");setPhase("done");
  }

  function handleCamResult(res){
    if(res.score!=null){submitScore(res.score);}
    else{setPhase("score");}
  }

  const bench=SPRINT_BENCH[group];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white}}>
      <Hdr title="Skills Tests" sub="Solo Camera" back={()=>{if(sel){if(phase==="list")setSel(null);else setPhase(phase==="intro"?"list":"intro");}else onNav("dashboard");}}/>
      <Toast msg={toast}/>

      {!sel&&(
        <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
          {age&&(
            <div style={{background:`${C.blue}0a`,border:`1px solid ${C.blue}1a`,borderRadius:12,padding:14,marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.white}}>All scores benchmarked for your age group</div>
                <div style={{fontSize:11,color:C.ghost,marginTop:2}}>Sprint avg: {bench.avg}s · Jump avg: {JUMP_BENCH[group].avg}cm · Push-ups avg: {PUSHUP_BENCH[group].avg}</div>
              </div>
              <AgeBadge age={age}/>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {TESTS.map(t=>{
              const v=player?.stats?.[t.stat]||0;
              const isAuto=["sprint","jump","pushups","agility"].includes(t.camMode);
              return (
                <button key={t.id} onClick={()=>pick(t)} style={{background:"#0d0d0d",border:`1px solid ${v>0?t.color+"44":"#1a1a1a"}`,borderRadius:12,padding:14,textAlign:"left",cursor:"pointer",color:C.white,display:"flex",alignItems:"center",gap:14,transition:"border-color 0.2s"}}>
                  <span style={{fontSize:26,filter:v>0?"none":"grayscale(1)"}}>{t.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700}}>{t.label}</div>
                    <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                      {isAuto&&<span style={{background:`${C.lime}14`,border:`1px solid ${C.lime}33`,borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700,color:C.lime,letterSpacing:1}}>AUTO-MEASURE</span>}
                      {!isAuto&&t.camMode&&<span style={{background:`${C.blue}14`,border:`1px solid ${C.blue}33`,borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700,color:C.blue,letterSpacing:1}}>CAMERA + MANUAL</span>}
                      {!t.camMode&&<span style={{background:`${C.purple}14`,border:`1px solid ${C.purple}33`,borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700,color:C.purple,letterSpacing:1}}>CHALLENGES</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    {v>0?<div style={{fontSize:24,fontWeight:900,color:sc(v)}}>{v}</div>
                      :<div style={{width:36,height:36,borderRadius:"50%",border:`2px solid #2a2a2a`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <div style={{width:10,height:10,borderRadius:"50%",background:"#222"}}/>
                      </div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sel&&phase==="intro"&&(
        <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:52,marginBottom:10,filter:`drop-shadow(0 0 20px ${sel.color}88)`}}>{sel.icon}</div>
            <h2 style={{fontSize:24,fontWeight:900,margin:"0 0 8px",letterSpacing:-0.5}}>{sel.label}</h2>
            <p style={{color:C.ghost,fontSize:13,lineHeight:1.7}}>{sel.what}</p>
          </div>
          {age&&sel.camMode!=="record"&&sel.camMode&&(
            <div style={{background:`${C.blue}0f`,border:`1px solid ${C.blue}22`,borderRadius:10,padding:14,marginBottom:16}}>
              <div style={{fontSize:10,color:C.blue,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Age Group Benchmark</div>
              {sel.id==="pace"&&<div style={{fontSize:12,color:C.white}}>Your group ({AGE_GROUP_LABELS[group]}) average: <strong style={{color:C.lime}}>{bench.avg}s</strong> · Elite: <strong style={{color:C.gold}}>{bench.elite}s</strong></div>}
              {sel.id==="jumping"&&<div style={{fontSize:12,color:C.white}}>Average: <strong style={{color:C.lime}}>{JUMP_BENCH[group].avg}cm</strong> · Elite: <strong style={{color:C.gold}}>{JUMP_BENCH[group].elite}cm</strong></div>}
              {sel.id==="physical"&&<div style={{fontSize:12,color:C.white}}>Average: <strong style={{color:C.lime}}>{PUSHUP_BENCH[group].avg} reps</strong> · Elite: <strong style={{color:C.gold}}>{PUSHUP_BENCH[group].elite} reps</strong></div>}
            </div>
          )}
          {sel.tiers.length>0&&(
            <div style={{marginBottom:18}}>
              <div style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Difficulty</div>
              {sel.tiers.map((tl,i)=>(
                <button key={i} onClick={()=>setTierIdx(i)} style={{width:"100%",background:tierIdx===i?`${sel.color}14`:"#0d0d0d",border:`1.5px solid ${tierIdx===i?sel.color:"#1a1a1a"}`,borderRadius:10,padding:12,textAlign:"left",cursor:"pointer",color:tierIdx===i?sel.color:C.ghost,marginBottom:6,display:"flex",alignItems:"center",gap:10,transition:"all 0.2s"}}>
                  <span style={{fontSize:18}}>{"🥉🥈🥇"[i]}</span>
                  <span style={{fontSize:13,fontWeight:700}}>{tl}</span>
                </button>
              ))}
            </div>
          )}
          <Btn full onClick={()=>setPhase("camera")} style={{background:`linear-gradient(135deg,${sel.color},${sel.color}99)`,color:sel.color===C.lime||sel.color===C.gold?"#000":C.white,border:"none",boxShadow:`0 4px 20px ${sel.color}44`}}>
            {sel.camMode==="agility"?"▶ Start Agility Drill":sel.camMode?"📷 Open Camera":"View Instructions"}
          </Btn>
        </div>
      )}

      {sel&&phase==="camera"&&(
        <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
          <h3 style={{fontSize:17,fontWeight:900,marginBottom:14,color:sel.color}}>{sel.icon} {sel.label} — {sel.tiers[tierIdx]||"Test"}</h3>
          {sel.camMode==="agility"
            ?<div style={{background:"#0d0d0d",borderRadius:14,padding:4,border:`1px solid ${sel.color}22`}}>
              <AgilityDrill playerAge={age||22} onScore={scores=>{
                const avg=scores.reduce((a,b)=>a+b,0)/scores.length;
                const s=avg<500?92:avg<700?82:avg<900?70:avg<1200?55:38;
                submitScore(s);
              }}/>
            </div>
            :<>
              <SmartCamera mode={sel.camMode} onResult={handleCamResult} instructions={sel.instructions} timerSecs={180} playerAge={age||22}/>
              {sel.camMode==="record"&&(
                <div style={{marginTop:16}}>
                  <Input label="Your Score (0–99)" type="number" value={score} onChange={setScore} placeholder="Enter your honest score"/>
                  <p style={{fontSize:10,color:C.muted,marginTop:-8,marginBottom:14,lineHeight:1.6}}>Watch your clip back and enter your score. Clip is uploaded for community verification.</p>
                  <Btn full onClick={()=>submitScore(parseInt(score)||0)} disabled={!score}>✓ Submit Score</Btn>
                </div>
              )}
            </>}
        </div>
      )}

      {sel&&phase==="done"&&(
        <div style={{padding:18,maxWidth:460,margin:"0 auto",textAlign:"center"}}>
          <div style={{fontSize:64,marginBottom:16,filter:`drop-shadow(0 0 20px ${sel.color}88)`}}>✅</div>
          <h3 style={{fontSize:22,fontWeight:900,margin:"0 0 8px"}}>Score Saved!</h3>
          <p style={{color:C.ghost,fontSize:13,lineHeight:1.7,marginBottom:28}}>Your result has been recorded and benchmarked against your age group.</p>
          <div style={{display:"flex",gap:10}}>
            <Btn v="dark" full onClick={()=>{setSel(null);setPhase("list");}}>← More Tests</Btn>
            <Btn full onClick={()=>onNav("dashboard")}>Dashboard</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Challenges with age-weighted XP ───────────────────────────
function Challenges({player,onNav,onStat}) {
  const [mode,setMode]=useState(null);
  const [linkCode,setLinkCode]=useState("");
  const [linked,setLinked]=useState(null);
  const [roundIdx,setRoundIdx]=useState(0);
  const [phase,setPhase]=useState("briefing");
  const [defScore,setDefScore]=useState("");
  const [atkScore,setAtkScore]=useState("");
  const [bonuses,setBonuses]=useState([]);
  const [resolution,setResolution]=useState(null);
  const [xpResult,setXpResult]=useState(null);
  const [toast,setToast]=useState("");
  const timer=useTimer(DEFEND_ROUNDS[roundIdx]?.timer||180,()=>setPhase("scoring"));

  const myAge=calcAge(player?.date_of_birth);
  const linkedAge=calcAge(linked?.date_of_birth);

  async function linkPlayer(){
    if(!linkCode.trim()) return;
    try{
      const rows=await sbFetch(`players?challenge_code=eq.${linkCode.trim().toUpperCase()}&limit=1`);
      if(!rows?.[0]){setToast("Code not found — check and try again");return;}
      setLinked(rows[0]);
    }catch{setToast("Could not find player");}
  }

  function submitRound(){
    const res=resolveGap(parseFloat(defScore),parseFloat(atkScore));
    setResolution(res);
    if(res.score!=null){
      // Age-weighted XP
      const xp=calcAgeWeightedXP(myAge||22,linkedAge||22,res.score,10);
      setXpResult(xp);
      const base=Math.min(99,Math.max(20,Math.round(100-res.score*7)));
      const adjusted=Math.min(99,Math.max(20,base+xp.defGain));
      onStat("defending",adjusted);
    }
    setPhase("result");
    const msgs={accepted:"Score accepted ✓",pending:"Pending review 🟡",flagged:"Flagged 🔴"};
    setToast(msgs[res.status]||"");setTimeout(()=>setToast(""),2500);
  }

  const cur=DEFEND_ROUNDS[roundIdx];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white}}>
      <Hdr title="Challenges" sub="Verified 1v1" back={()=>{if(mode)setMode(null);else onNav("dashboard");}}/>
      <Toast msg={toast} type={resolution?.status==="accepted"?"ok":"warn"}/>

      {!mode&&(
        <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
          {/* Link player */}
          <div style={{background:"#0d0d0d",border:`1px solid ${C.cyan}22`,borderRadius:14,padding:16,marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.cyan,marginBottom:4}}>🔗 Link an Opponent</div>
            <p style={{color:C.ghost,fontSize:11,lineHeight:1.6,marginBottom:14}}>Your opponent shares their Challenge Code. Enter it here to link up.</p>
            {linked?(
              <div style={{background:`${C.lime}0f`,border:`1px solid ${C.lime}33`,borderRadius:8,padding:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.lime}}>✓ Linked: {linked.name}</div>
                    <div style={{fontSize:10,color:C.ghost,marginTop:2}}>{linked.position} · OVR {ov(linked.stats)}</div>
                    {linkedAge&&<div style={{marginTop:4}}><AgeBadge age={linkedAge}/></div>}
                  </div>
                  <Btn sm v="ghost" onClick={()=>setLinked(null)}>Unlink</Btn>
                </div>
                {/* Age gap warning/bonus preview */}
                {myAge&&linkedAge&&Math.abs(myAge-linkedAge)>=3&&(
                  <div style={{background:`${C.gold}0f`,border:`1px solid ${C.gold}22`,borderRadius:6,padding:10,marginTop:10}}>
                    <div style={{fontSize:10,color:C.gold,fontWeight:700,marginBottom:3}}>⚡ Age Gap Detected — {Math.abs(myAge-linkedAge)} years</div>
                    <div style={{fontSize:11,color:C.ghost,lineHeight:1.5}}>
                      {myAge<linkedAge
                        ?"You're younger — beating this player gives you a bigger XP bonus"
                        :"You're older — holding this player gives standard XP. If they beat you, they earn extra."}
                    </div>
                  </div>
                )}
              </div>
            ):(
              <div style={{display:"flex",gap:8}}>
                <input value={linkCode} onChange={e=>setLinkCode(e.target.value.toUpperCase())} placeholder="e.g. AB12XY"
                  style={{flex:1,background:"#181818",border:"1.5px solid #222",borderRadius:8,padding:"11px 14px",color:C.white,fontSize:16,fontWeight:800,outline:"none",letterSpacing:4}}/>
                <Btn onClick={linkPlayer} v="cyan">Link</Btn>
              </div>
            )}
          </div>

          {/* Anti-cheat */}
          <div style={{background:`${C.red}0f`,border:`1px solid ${C.red}22`,borderRadius:12,padding:14,marginBottom:18}}>
            <div style={{fontSize:11,fontWeight:700,color:C.red,marginBottom:6}}>🔒 Anti-Cheat + Age-Weighted XP</div>
            <p style={{color:C.ghost,fontSize:11,margin:0,lineHeight:1.7}}>Both players film simultaneously. Score gap ≤2 = auto-averaged. XP is weighted by age gap — younger players earn more for beating older ones.</p>
          </div>

          {[
            {id:"defend",icon:"🛡️",label:"Test Defending",desc:"9 progressive rounds — different rules each phase",col:C.blue},
            {id:"attack",icon:"⚡",label:"Test Attacking",desc:"Earn DRI, AGI and skill bonuses vs a defender",col:C.lime},
            {id:"trio",icon:"👥",label:"3-Player Challenge",desc:"ST + CB + GK — earn Stone Wall, Poacher & Brick Hands",col:C.purple},
          ].map(m=>(
            <button key={m.id} onClick={()=>{setMode(m.id);setRoundIdx(0);setPhase("briefing");setDefScore("");setAtkScore("");setBonuses([]);setResolution(null);setXpResult(null);}}
              style={{width:"100%",background:"#0d0d0d",border:`1px solid ${m.col}22`,borderRadius:12,padding:16,textAlign:"left",cursor:"pointer",color:C.white,marginBottom:10,display:"flex",alignItems:"center",gap:14,transition:"border-color 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=m.col+"55"}
              onMouseLeave={e=>e.currentTarget.style.borderColor=m.col+"22"}>
              <span style={{fontSize:30}}>{m.icon}</span>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:m.col}}>{m.label}</div>
                <div style={{fontSize:11,color:C.ghost,marginTop:4}}>{m.desc}</div>
                {!linked&&<div style={{fontSize:10,color:"#444",marginTop:4}}>Link an opponent above first</div>}
              </div>
            </button>
          ))}
        </div>
      )}

      {mode==="defend"&&(
        <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
          {phase==="briefing"&&(<>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16}}>
              <h3 style={{fontSize:18,fontWeight:900,margin:0}}>Defending Rounds</h3>
              {linked&&<span style={{background:`${C.cyan}18`,border:`1px solid ${C.cyan}44`,borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700,color:C.cyan}}>vs {linked.name}</span>}
            </div>
            {xpResult&&(
              <div style={{background:`${C.lime}0a`,border:`1px solid ${C.lime}22`,borderRadius:10,padding:12,marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:C.lime,marginBottom:4}}>⚡ Age-Weighted XP</div>
                <div style={{fontSize:11,color:C.ghost}}>{xpResult.desc}</div>
                <div style={{fontSize:11,color:C.white,marginTop:4}}>Your stat gain: +{xpResult.defGain} · Opponent gain: +{xpResult.atkGain}</div>
              </div>
            )}
            {DEFEND_ROUNDS.map((r,i)=>(
              <div key={r.id} style={{background:i===roundIdx?`${C.blue}0f`:"#0d0d0d",border:`1px solid ${i===roundIdx?C.blue+"44":"#1a1a1a"}`,borderRadius:10,padding:12,marginBottom:8,display:"flex",gap:12,alignItems:"center"}}>
                <span style={{fontSize:20}}>{r.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:i===roundIdx?C.white:C.ghost}}>{r.label}</div>
                  <div style={{fontSize:11,color:C.ghost}}>{r.rule} · ⏱ {r.timer>=120?Math.floor(r.timer/60)+"min":r.timer+"s"}</div>
                </div>
              </div>
            ))}
            <Btn full onClick={()=>setPhase("camera")} style={{marginTop:8}}>Start — {cur.label}</Btn>
          </>)}

          {phase==="camera"&&(<>
            <div style={{background:`${C.red}0f`,border:`1px solid ${C.red}22`,borderRadius:10,padding:12,marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:C.red}}>{cur.icon} {cur.label}</div>
              <div style={{fontSize:13,color:C.white,marginTop:4}}>{cur.rule}</div>
            </div>
            <SmartCamera mode="record" timerSecs={cur.timer} playerAge={myAge||22}
              onResult={()=>setPhase("scoring")}
              instructions={["Both players press record at the same time","Defender: focus on stance and cutting off angles","Attacker: try to beat the defender using the round rules",`Rule: ${cur.rule}`]}/>
            <div style={{marginTop:14}}>
              <div style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Nuance Buttons</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["Ball contested","Foul","Out of play","Skill move used"].map(b=>(
                  <button key={b} onClick={()=>setBonuses(p=>[...p,b])} style={{background:bonuses.includes(b)?`${C.lime}18`:"#181818",border:`1px solid ${bonuses.includes(b)?C.lime+"44":"#2a2a2a"}`,borderRadius:6,padding:"7px 12px",fontSize:11,color:bonuses.includes(b)?C.lime:C.ghost,cursor:"pointer",transition:"all 0.15s"}}>{b}</button>
                ))}
              </div>
            </div>
          </>)}

          {phase==="scoring"&&(<>
            <h3 style={{fontSize:18,fontWeight:900,marginBottom:8}}>{cur.label} — Scoring</h3>
            <p style={{color:C.ghost,fontSize:12,lineHeight:1.7,marginBottom:18}}>How many times did the attacker get past you? Both players enter independently.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[["Your count\n(times beaten)",defScore,setDefScore],["Attacker's\nclaim",atkScore,setAtkScore]].map(([l,v,setter])=>(
                <div key={l}>
                  <label style={{display:"block",fontSize:9,color:C.ghost,letterSpacing:1,marginBottom:6,textTransform:"uppercase",whiteSpace:"pre-line"}}>{l}</label>
                  <input type="number" min="0" max="10" value={v} onChange={e=>setter(e.target.value)}
                    style={{width:"100%",background:"#111",border:"1.5px solid #222",borderRadius:8,padding:"14px 10px",color:C.white,fontSize:28,fontWeight:900,outline:"none",boxSizing:"border-box",textAlign:"center"}}/>
                </div>
              ))}
            </div>

            {/* Age-weighted XP preview */}
            {defScore&&atkScore&&myAge&&linkedAge&&(()=>{
              const res=resolveGap(parseFloat(defScore),parseFloat(atkScore));
              const xp=calcAgeWeightedXP(myAge,linkedAge,res.score||0,10);
              const col=res.status==="accepted"?C.lime:res.status==="pending"?C.gold:C.red;
              return (
                <div>
                  <div style={{background:`${col}0f`,border:`1px solid ${col}33`,borderRadius:10,padding:12,marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:700,color:col,marginBottom:4}}>
                      {res.status==="accepted"?"✅ Auto-accepted":res.status==="pending"?"🟡 Pending review":"🔴 Flagged"}
                    </div>
                    {res.score!=null&&<div style={{fontSize:11,color:C.ghost}}>Agreed: {res.score}/10 times beaten</div>}
                  </div>
                  <div style={{background:`${C.gold}0f`,border:`1px solid ${C.gold}22`,borderRadius:10,padding:12,marginBottom:14}}>
                    <div style={{fontSize:10,color:C.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>⚡ Age-Weighted XP</div>
                    <div style={{fontSize:11,color:C.ghost,marginBottom:4}}>{xp.desc}</div>
                    <div style={{display:"flex",gap:14}}>
                      <div><div style={{fontSize:18,fontWeight:900,color:C.lime}}>+{xp.defGain}</div><div style={{fontSize:9,color:C.ghost}}>Your DEF gain</div></div>
                      <div><div style={{fontSize:18,fontWeight:900,color:C.red}}>+{xp.atkGain}</div><div style={{fontSize:9,color:C.ghost}}>Their ATK gain</div></div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{background:"#0d0d0d",borderRadius:10,padding:14,marginBottom:14}}>
              <div style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Bonus Ratings</div>
              {[["Attacker used a skill move?","ATK DRI +2"],["Defender pushed wide cleanly?","DEF AGG +2"],["Defender won ball cleanly?","DEF TAC +3"],["Attacker nutmegged defender?","ATK DRI +5"]].map(([q,result])=>(
                <div key={q} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:11,color:C.ghost,flex:1}}>{q}</span>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>setBonuses(p=>[...p,result])} style={{background:`${C.lime}14`,border:`1px solid ${C.lime}33`,borderRadius:6,padding:"4px 12px",fontSize:11,color:C.lime,cursor:"pointer",fontWeight:700}}>Yes</button>
                    <button style={{background:"#181818",border:"1px solid #2a2a2a",borderRadius:6,padding:"4px 12px",fontSize:11,color:C.ghost,cursor:"pointer"}}>No</button>
                  </div>
                </div>
              ))}
            </div>
            <Btn full onClick={submitRound} disabled={!defScore||!atkScore}>Submit Round</Btn>
          </>)}

          {phase==="result"&&(
            <div style={{textAlign:"center",padding:20}}>
              <div style={{fontSize:52,marginBottom:12}}>{roundIdx>=DEFEND_ROUNDS.length-1?"🏆":"✅"}</div>
              <h3 style={{fontSize:20,fontWeight:900,margin:"0 0 8px"}}>{roundIdx>=DEFEND_ROUNDS.length-1?"All Rounds Complete!":cur.label+" Done"}</h3>
              {xpResult&&(
                <div style={{background:`${C.gold}0f`,border:`1px solid ${C.gold}22`,borderRadius:10,padding:14,marginBottom:16,textAlign:"left"}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:4}}>⚡ XP Earned</div>
                  <div style={{fontSize:11,color:C.ghost}}>{xpResult.desc}</div>
                  <div style={{fontSize:13,color:C.lime,marginTop:6,fontWeight:700}}>+{xpResult.defGain} to your Defending stat</div>
                </div>
              )}
              {bonuses.length>0&&(
                <div style={{background:`${C.lime}0a`,border:`1px solid ${C.lime}22`,borderRadius:8,padding:12,marginBottom:16,textAlign:"left"}}>
                  {bonuses.map((b,i)=><div key={i} style={{fontSize:11,color:C.ghost}}>+ {b}</div>)}
                </div>
              )}
              {roundIdx<DEFEND_ROUNDS.length-1
                ?<Btn full onClick={()=>{setRoundIdx(r=>r+1);setPhase("camera");setDefScore("");setAtkScore("");setBonuses([]);setResolution(null);setXpResult(null);}}>Next Round →</Btn>
                :<div style={{display:"flex",gap:10}}><Btn v="dark" full onClick={()=>setMode(null)}>Challenges</Btn><Btn full onClick={()=>onNav("dashboard")}>Dashboard</Btn></div>}
            </div>
          )}
        </div>
      )}

      {mode==="trio"&&(
        <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
          <h3 style={{fontSize:18,fontWeight:900,marginBottom:14}}>3-Player Challenge</h3>
          {[
            {name:"Classic ST vs CB+GK",roles:["ST","CB","GK"],desc:"10 attempts. 0 shots = Stone Wall badge. 9 goals = Poacher. 0 goals conceded = Brick Hands.",badges:["stone_wall","poacher","brick_hands"]},
            {name:"2v1 Pressure",roles:["ST","ST","CB"],desc:"Two strikers take turns against one defender.",badges:["tested"]},
          ].map((ch,i)=>(
            <div key={i} style={{background:"#0d0d0d",border:`1px solid ${C.purple}22`,borderRadius:12,padding:16,marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:C.purple,marginBottom:6}}>{ch.name}</div>
              <div style={{display:"flex",gap:6,marginBottom:10}}>{ch.roles.map((r,j)=><span key={j} style={{background:`${C.purple}14`,border:`1px solid ${C.purple}33`,borderRadius:20,padding:"3px 8px",fontSize:10,color:C.purple,fontWeight:700}}>{r}</span>)}</div>
              <p style={{color:C.ghost,fontSize:11,lineHeight:1.6,marginBottom:12}}>{ch.desc}</p>
              <Btn v="purple" full sm>Set Up Challenge</Btn>
            </div>
          ))}
        </div>
      )}

      {mode==="attack"&&(
        <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
          <h3 style={{fontSize:18,fontWeight:900,marginBottom:8}}>Attacking Rounds</h3>
          <p style={{color:C.ghost,fontSize:12,lineHeight:1.7,marginBottom:18}}>Same anti-cheat + age-weighted XP system. Bonuses logged by the defender.</p>
          {DEFEND_ROUNDS.map((r,i)=>(
            <div key={r.id} style={{background:"#0d0d0d",border:`1px solid ${C.lime}18`,borderRadius:10,padding:12,marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:700,color:C.lime}}>{r.label}</span>
                <span style={{fontSize:10,color:C.ghost}}>⏱ {r.timer>=120?Math.floor(r.timer/60)+"min":r.timer+"s"}</span>
              </div>
              <div style={{fontSize:12,color:C.white}}>{r.rule}</div>
            </div>
          ))}
          <Btn full style={{marginTop:10}} onClick={()=>setPhase("camera")}>Start Attacking Rounds</Btn>
        </div>
      )}
    </div>
  );
}

// ── Badges ─────────────────────────────────────────────────────
function BadgesScreen({player,onNav}) {
  const earned=player?.badges||[];
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white}}>
      <Hdr title="Badges" sub="Achievements" back={()=>onNav("dashboard")}/>
      <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
        <div style={{background:`${C.purple}0f`,border:`1px solid ${C.purple}22`,borderRadius:12,padding:14,marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:700,color:C.purple,marginBottom:4}}>✦ Rare Card Trigger</div>
          <p style={{color:C.ghost,fontSize:11,margin:0,lineHeight:1.6}}>Earn any 3 badges and your card upgrades to Rare holographic, regardless of overall rating.</p>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{fontSize:12,fontWeight:700}}>{earned.length} / {BADGES.length} earned</span>
          {earned.length>=3&&<span style={{fontSize:11,color:C.purple,fontWeight:700}}>✦ RARE ACTIVE</span>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {BADGES.map(b=>{
            const e=earned.includes(b.id);
            return (
              <div key={b.id} style={{background:e?(b.rare?`${C.purple}14`:`${C.lime}0a`):"#0d0d0d",border:`1px solid ${e?(b.rare?C.purple:C.lime+"44"):"#1a1a1a"}`,borderRadius:12,padding:14,opacity:e?1:0.38,filter:e&&b.rare?`drop-shadow(0 0 12px ${C.purple}66)`:"none",transition:"all 0.2s"}}>
                <div style={{fontSize:26,marginBottom:6}}>{b.icon}</div>
                <div style={{fontSize:12,fontWeight:700,color:e?(b.rare?C.purple:C.lime):C.ghost,marginBottom:4}}>{b.name}</div>
                {e&&<div style={{fontSize:9,color:e?(b.rare?C.purple:C.lime):C.muted,letterSpacing:1,textTransform:"uppercase",fontWeight:700}}>✓ EARNED</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Compare ────────────────────────────────────────────────────
function Compare({player,onNav}) {
  const age=calcAge(player?.date_of_birth);
  const group=ageGroup(age);
  const BENCH_DATA={
    pace:     {street:SPRINT_BENCH[group]?.avg?Math.round(100-SPRINT_BENCH[group].avg*8):45,semi:62,mbappe:97,neymar:91},
    shooting: {street:38,semi:55,mbappe:89,neymar:87},
    passing:  {street:42,semi:60,mbappe:80,neymar:86},
    dribbling:{street:40,semi:58,mbappe:92,neymar:95},
    defending:{street:35,semi:52,mbappe:36,neymar:27},
    physical: {street:rawToScore(PUSHUP_BENCH[group]?.avg||24,PUSHUP_BENCH[group]||PUSHUP_BENCH.open),semi:61,mbappe:77,neymar:68},
    jumping:  {street:rawToScore(JUMP_BENCH[group]?.avg||42,JUMP_BENCH[group]||JUMP_BENCH.open),semi:58,mbappe:78,neymar:61},
    agility:  {street:43,semi:60,mbappe:91,neymar:93},
  };
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white}}>
      <Hdr title="Benchmark" sub="How Do You Compare?" back={()=>onNav("dashboard")}/>
      <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
        {age&&(
          <div style={{background:`${C.blue}0a`,border:`1px solid ${C.blue}1a`,borderRadius:10,padding:12,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:11,color:C.ghost}}>Benchmarks calibrated for your age group</span>
            <AgeBadge age={age}/>
          </div>
        )}
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:18}}>
          {[{l:"You",c:C.lime},{l:"Street",c:C.ghost},{l:"Semi-Pro",c:C.blue},{l:"Mbappé",c:C.gold},{l:"Neymar",c:C.red}].map(x=>(
            <div key={x.l} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:10,height:10,borderRadius:2,background:x.c}}/>
              <span style={{fontSize:10,color:C.ghost}}>{x.l}</span>
            </div>
          ))}
        </div>
        {Object.entries(BENCH_DATA).map(([k,b])=>{
          const you=player?.stats?.[k]||0;
          const m=STATS_META[k];
          return (
            <div key={k} style={{background:"#0d0d0d",borderRadius:12,padding:14,marginBottom:10,border:`1px solid ${m.color}14`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{m.icon}</span>
                  <span style={{fontSize:13,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:m.color}}>{m.l}</span>
                </div>
                <span style={{fontSize:22,fontWeight:900,color:you?sc(you):C.ghost}}>{you||"?"}</span>
              </div>
              {[{l:"You",v:you,c:C.lime},{l:"Street avg",v:b.street,c:C.ghost},{l:"Semi-Pro",v:b.semi,c:C.blue},{l:"Mbappé",v:b.mbappe,c:C.gold},{l:"Neymar",v:b.neymar,c:C.red}].map(row=>(
                <div key={row.l} style={{marginBottom:5}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span style={{fontSize:9,color:C.ghost}}>{row.l}</span>
                    <span style={{fontSize:10,fontWeight:700,color:row.c}}>{row.v||"—"}</span>
                  </div>
                  <div style={{height:4,background:"#181818",borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(row.v/99)*100}%`,background:row.c,borderRadius:2,opacity:row.l==="You"&&!you?0.15:1,transition:"width 1s ease"}}/>
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

// ── Leaderboard ────────────────────────────────────────────────
function Leaderboard({player,onNav}) {
  const [data,setData]=useState(null);
  const [filter,setFilter]=useState("all");
  useEffect(()=>{
    sbFetch("players?select=name,position,stats,badges,motm_votes,date_of_birth&order=motm_votes.desc&limit=30")
      .then(setData).catch(()=>setData(null));
  },[]);
  const myAge=calcAge(player?.date_of_birth);
  const myGroup=ageGroup(myAge);

  const fallback=[
    {name:"Jaden S.",position:"ST",stats:{pace:84,shooting:87,passing:74,dribbling:82,defending:38,physical:76,jumping:72,agility:85},badges:["poacher","explosive"],motm_votes:8,date_of_birth:"1999-03-15"},
    {name:"Marcus T.",position:"CM",stats:{pace:72,shooting:65,passing:80,dribbling:76,defending:60,physical:74,jumping:66,agility:78},badges:["tested"],motm_votes:5,date_of_birth:"2001-07-22"},
    {name:player?.name||"You",position:player?.position||"ST",stats:player?.stats||{},badges:player?.badges||[],motm_votes:player?.motm_votes||0,date_of_birth:player?.date_of_birth,you:true},
    {name:"Olu F.",position:"CB",stats:{pace:61,shooting:44,passing:62,dribbling:60,defending:79,physical:77,jumping:74,agility:65},badges:["stone_wall"],motm_votes:2,date_of_birth:"1998-11-04"},
    {name:"Kwame D.",position:"ST",stats:{pace:78,shooting:72,passing:65,dribbling:74,defending:32,physical:68,jumping:70,agility:76},badges:[],motm_votes:1,date_of_birth:"2009-05-18"},
  ];

  let rows=((data&&data.length>0)?data:fallback).map(p=>({...p,overall:ov(p.stats),t:tier(ov(p.stats),p.badges||[]),age:calcAge(p.date_of_birth),group:ageGroup(calcAge(p.date_of_birth))})).sort((a,b)=>b.overall-a.overall);

  if(filter!=="all") rows=rows.filter(r=>r.group===filter);

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white}}>
      <Hdr title="Leaderboard" sub="Global Rankings" back={()=>onNav("dashboard")}/>
      <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
        {/* Age group filter */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Filter by Age Group</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["all","All"],["u12","U12"],["u16","13–16"],["u20","17–20"],["adult","21–29"],["vet","30–39"],["senior","40+"]].map(([k,l])=>(
              <button key={k} onClick={()=>setFilter(k)} style={{background:filter===k?`${C.lime}18`:"#0d0d0d",border:`1px solid ${filter===k?C.lime+"55":"#1a1a1a"}`,borderRadius:6,padding:"6px 12px",fontSize:11,color:filter===k?C.lime:C.ghost,cursor:"pointer",fontWeight:700}}>{l}</button>
            ))}
          </div>
        </div>

        {rows.length===0&&<div style={{textAlign:"center",padding:40,color:C.ghost}}>No players in this age group yet.</div>}
        {rows.map((p,i)=>{
          const ts=C.tiers[p.t];
          return (
            <div key={i} style={{background:p.you?`${C.lime}0a`:"#0d0d0d",border:`1px solid ${p.you?C.lime+"33":"#1a1a1a"}`,borderRadius:12,padding:14,marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,background:i<3?[C.gold,"#888","#8B4513"][i]:"#181818",display:"flex",alignItems:"center",justifyContent:"center",fontSize:i<3?16:11,fontWeight:900,color:i<3?"#000":C.ghost}}>
                {i<3?["🥇","🥈","🥉"][i]:i+1}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700}}>{p.name}{p.you?" (You)":""}</div>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginTop:2}}>
                  <span style={{fontSize:10,color:C.ghost}}>{p.position}</span>
                  {p.age&&<span style={{fontSize:9,color:C.ghost,background:"#181818",borderRadius:4,padding:"1px 6px"}}>{AGE_GROUP_LABELS[p.group]}</span>}
                  <span style={{fontSize:10}}>{(p.badges||[]).slice(0,3).map(b=>BADGES.find(x=>x.id===b)?.icon).join("")}</span>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:24,fontWeight:900,color:ts.t,textShadow:`0 0 10px ${ts.b}66`}}>{p.overall||"—"}</div>
                <div style={{fontSize:9,color:ts.t,letterSpacing:1,textTransform:"uppercase"}}>{p.t}</div>
                {p.motm_votes>0&&<div style={{fontSize:9,color:C.gold}}>🏅 {p.motm_votes}x</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Team (simplified, same as before) ─────────────────────────
function Team({player,onNav}) {
  const [tab,setTab]=useState("squad");
  const [votes,setVotes]=useState({});
  const [toast,setToast]=useState("");
  const squad=[
    {name:"Marcus T.",position:"CM",stats:{pace:68,shooting:62,passing:75,dribbling:70,defending:60,physical:72},badges:["tested"],date_of_birth:"2001-07-22"},
    {name:"Jaden S.",position:"ST",stats:{pace:79,shooting:82,passing:68,dribbling:78,defending:38,physical:74},badges:["poacher","explosive"],date_of_birth:"1999-03-15"},
  ];
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white}}>
      <Hdr title="My Team" sub="Street Kings FC" back={()=>onNav("dashboard")}/>
      <Toast msg={toast}/>
      <div style={{display:"flex",borderBottom:`1px solid #111`}}>
        {["squad","join","motm"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:13,background:"none",border:"none",cursor:"pointer",color:tab===t?C.lime:C.ghost,fontWeight:700,fontSize:12,borderBottom:`2px solid ${tab===t?C.lime:"transparent"}`,textTransform:"uppercase",letterSpacing:1}}>
            {t==="squad"?"Squad":t==="join"?"Join":"MOTM"}
          </button>
        ))}
      </div>
      <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
        {tab==="squad"&&(<>
          {[{name:player?.name||"You",position:player?.position||"ST",stats:player?.stats||{},badges:player?.badges||[],isYou:true,date_of_birth:player?.date_of_birth},...squad].map((p,i)=>{
            const age=calcAge(p.date_of_birth);
            return (
              <div key={i} style={{background:"#0d0d0d",borderRadius:12,padding:14,marginBottom:8,display:"flex",alignItems:"center",gap:12,border:`1px solid ${p.isYou?C.lime+"22":"#1a1a1a"}`}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"#181818",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,border:`1px solid #2a2a2a`}}>👤</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700}}>{p.name}{p.isYou?" (You)":""}{i===0?" 👑":""}</div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginTop:3}}>
                    <span style={{fontSize:10,color:C.ghost}}>{p.position}</span>
                    {age&&<AgeBadge age={age}/>}
                    <span style={{fontSize:12}}>{(p.badges||[]).map(b=>BADGES.find(x=>x.id===b)?.icon).join("")}</span>
                  </div>
                </div>
                <div style={{fontSize:24,fontWeight:900,color:sc(ov(p.stats))}}>{ov(p.stats)||"—"}</div>
              </div>
            );
          })}
          <div style={{background:`${C.red}0f`,border:`1px solid ${C.red}22`,borderRadius:12,padding:14,marginTop:10}}>
            <div style={{fontSize:11,fontWeight:700,color:C.red,marginBottom:10}}>Join Requests</div>
            {[{name:"Diego M.",pos:"GK"},{name:"Sam P.",pos:"RB"}].map((r,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <span style={{fontSize:20}}>👤</span>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{r.name}</div><div style={{fontSize:10,color:C.ghost}}>{r.pos}</div></div>
                <Btn sm onClick={()=>setToast(r.name+" accepted ✓")}>✓</Btn>
                <Btn sm v="red">✕</Btn>
              </div>
            ))}
          </div>
        </>)}
        {tab==="join"&&(<>
          <p style={{color:C.ghost,fontSize:13,lineHeight:1.7,marginBottom:16}}>Search by team name. Captain approves requests.</p>
          <Input label="Team name or code" value="" onChange={()=>{}} placeholder="e.g. Street Kings FC"/>
          <Btn full style={{marginBottom:24}}>Search</Btn>
          <div style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Or Start a New Team</div>
          <Input label="Team name" value="" onChange={()=>{}} placeholder="e.g. Hackney Hoopers"/>
          <Btn full v="ghost">Create & Become Captain</Btn>
        </>)}
        {tab==="motm"&&(<>
          <div style={{background:`${C.gold}0f`,border:`1px solid ${C.gold}22`,borderRadius:12,padding:14,marginBottom:18}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:4}}>🏅 MOTM Rules</div>
            <p style={{color:C.ghost,fontSize:11,margin:0,lineHeight:1.7}}>All players who played vote. Winner gets +2 to lowest stat. Outlier votes excluded automatically.</p>
          </div>
          {[{name:"Jaden S.",pos:"ST"},{name:"Marcus T.",pos:"CM"},{name:player?.name||"You",pos:player?.position||"ST"}].map((p,i)=>(
            <div key={i} style={{background:votes[i]?`${C.lime}0a`:"#0d0d0d",border:`1px solid ${votes[i]?C.lime+"33":"#1a1a1a"}`,borderRadius:12,padding:14,marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:22}}>👤</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{p.name}</div><div style={{fontSize:10,color:C.ghost}}>{p.pos}</div></div>
              <button onClick={()=>setVotes({[i]:true})} style={{background:votes[i]?`${C.lime}18`:`${C.ghost}14`,border:`1px solid ${votes[i]?C.lime+"55":"#333"}`,color:votes[i]?C.lime:C.ghost,borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:12,fontWeight:700,transition:"all 0.2s"}}>
                {votes[i]?"✓ Voted":"Vote"}
              </button>
            </div>
          ))}
        </>)}
      </div>
    </div>
  );
}

// ── Matches ────────────────────────────────────────────────────
function Matches({player,onNav}) {
  const [tab,setTab]=useState("upcoming");
  const [creating,setCreating]=useState(false);
  const [form,setForm]=useState({title:"",date:"",time:"",location:"",format:"5v5"});
  const [toast,setToast]=useState("");
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const mockMatches=[
    {id:1,title:"Street Kings vs Brick FC",date:"2026-07-05",time:"15:00",location:"Hackney Astro",format:"7v7",status:"upcoming",home:"Street Kings FC",away:"Brick FC"},
    {id:2,title:"Street Kings vs Eastside XI",date:"2026-06-20",time:"18:00",location:"Victoria Park",format:"5v5",status:"completed",home:"Street Kings FC",away:"Eastside XI",homeScore:3,awayScore:1},
  ];
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white}}>
      <Hdr title="Matches" sub="Set Up & Play" back={()=>onNav("dashboard")} right={<Btn sm onClick={()=>setCreating(true)}>+ Create</Btn>}/>
      <Toast msg={toast}/>
      {creating&&(
        <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
          <h3 style={{fontSize:18,fontWeight:900,marginBottom:18}}>Create a Match</h3>
          <Input label="Match Title" value={form.title} onChange={v=>set("title",v)} placeholder="e.g. Street Kings vs Brick FC"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <Input label="Date" type="date" value={form.date} onChange={v=>set("date",v)}/>
            <Input label="Time" type="time" value={form.time} onChange={v=>set("time",v)}/>
          </div>
          <Input label="Location" value={form.location} onChange={v=>set("location",v)} placeholder="e.g. Hackney Astro"/>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>Format</label>
            <div style={{display:"flex",gap:8}}>
              {["5v5","7v7","11v11"].map(f=><button key={f} onClick={()=>set("format",f)} style={{flex:1,padding:10,borderRadius:8,border:`1.5px solid ${form.format===f?C.lime:"#222"}`,background:form.format===f?`${C.lime}14`:"transparent",color:form.format===f?C.lime:C.ghost,cursor:"pointer",fontSize:13,fontWeight:700}}>{f}</button>)}
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn v="ghost" full onClick={()=>setCreating(false)}>Cancel</Btn>
            <Btn full onClick={()=>{setCreating(false);setToast("Match created! ✓");}}>Create Match</Btn>
          </div>
        </div>
      )}
      {!creating&&(<>
        <div style={{display:"flex",borderBottom:`1px solid #111`}}>
          {["upcoming","completed","requests"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:13,background:"none",border:"none",cursor:"pointer",color:tab===t?C.lime:C.ghost,fontWeight:700,fontSize:12,borderBottom:`2px solid ${tab===t?C.lime:"transparent"}`,textTransform:"uppercase",letterSpacing:1}}>{t}</button>
          ))}
        </div>
        <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
          {tab==="upcoming"&&mockMatches.filter(m=>m.status==="upcoming").map(m=>(
            <div key={m.id} style={{background:"#0d0d0d",border:`1px solid ${C.lime}22`,borderRadius:14,padding:16,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <span style={{background:`${C.lime}18`,border:`1px solid ${C.lime}33`,borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700,color:C.lime}}>UPCOMING</span>
                <span style={{fontSize:11,color:C.ghost}}>{m.format}</span>
              </div>
              <div style={{fontSize:16,fontWeight:900,marginBottom:6}}>{m.title}</div>
              <div style={{fontSize:12,color:C.ghost,marginBottom:12}}>📅 {m.date} at {m.time} · 📍 {m.location}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,alignItems:"center",marginBottom:14}}>
                <div style={{textAlign:"center",background:"#181818",borderRadius:8,padding:10}}><div style={{fontSize:12,fontWeight:700}}>{m.home}</div></div>
                <div style={{fontSize:18,fontWeight:900,color:C.ghost}}>vs</div>
                <div style={{textAlign:"center",background:"#181818",borderRadius:8,padding:10}}><div style={{fontSize:12,fontWeight:700}}>{m.away}</div></div>
              </div>
              <Btn full sm>MOTM Vote After Match</Btn>
            </div>
          ))}
          {tab==="completed"&&mockMatches.filter(m=>m.status==="completed").map(m=>(
            <div key={m.id} style={{background:"#0d0d0d",border:`1px solid #1a1a1a`,borderRadius:14,padding:16,marginBottom:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,alignItems:"center",marginBottom:12}}>
                <div style={{textAlign:"center"}}><div style={{fontSize:12,fontWeight:700,marginBottom:4}}>{m.home}</div><div style={{fontSize:36,fontWeight:900,color:m.homeScore>m.awayScore?C.lime:C.ghost}}>{m.homeScore}</div></div>
                <div style={{fontSize:14,fontWeight:900,color:C.ghost}}>—</div>
                <div style={{textAlign:"center"}}><div style={{fontSize:12,fontWeight:700,marginBottom:4}}>{m.away}</div><div style={{fontSize:36,fontWeight:900,color:m.awayScore>m.homeScore?C.lime:C.ghost}}>{m.awayScore}</div></div>
              </div>
              <div style={{fontSize:11,color:C.ghost,marginBottom:12}}>📅 {m.date} · 📍 {m.location}</div>
              <Btn full sm v="gold">🏅 Vote for MOTM</Btn>
            </div>
          ))}
          {tab==="requests"&&(
            <div style={{background:"#0d0d0d",border:`1px solid ${C.gold}22`,borderRadius:12,padding:16}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>Eastside XI want to play</div>
              <div style={{fontSize:11,color:C.ghost,marginBottom:12}}>5v5 · Saturday 5th July · Victoria Park</div>
              <div style={{display:"flex",gap:8}}><Btn full sm>✓ Accept</Btn><Btn full sm v="red">✕ Decline</Btn></div>
            </div>
          )}
        </div>
      </>)}
    </div>
  );
}

// ── Leagues ────────────────────────────────────────────────────
function Leagues({player,onNav}) {
  const [tab,setTab]=useState("table");
  const table=[
    {team:"Street Kings FC",p:6,w:4,d:1,l:1,gd:8,pts:13,you:true},
    {team:"Brick FC",p:6,w:4,d:0,l:2,gd:5,pts:12},
    {team:"Eastside XI",p:6,w:2,d:2,l:2,gd:-1,pts:8},
    {team:"Northside",p:6,w:1,d:1,l:4,gd:-12,pts:4},
  ];
  const fixtures=[
    {home:"Street Kings FC",away:"Brick FC",date:"05 Jul",status:"upcoming"},
    {home:"Street Kings FC",away:"Eastside XI",date:"28 Jun",homeScore:3,awayScore:1,status:"done"},
  ];
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white}}>
      <Hdr title="Leagues" sub="Compete" back={()=>onNav("dashboard")}/>
      <div style={{display:"flex",borderBottom:`1px solid #111`}}>
        {["table","fixtures","stats"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:13,background:"none",border:"none",cursor:"pointer",color:tab===t?C.lime:C.ghost,fontWeight:700,fontSize:12,borderBottom:`2px solid ${tab===t?C.lime:"transparent"}`,textTransform:"uppercase",letterSpacing:1}}>{t}</button>
        ))}
      </div>
      <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
        <div style={{background:`${C.gold}0a`,border:`1px solid ${C.gold}22`,borderRadius:10,padding:"8px 14px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:700,color:C.gold}}>East London Summer League</span>
          <span style={{background:`${C.lime}18`,border:`1px solid ${C.lime}33`,borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700,color:C.lime}}>ACTIVE</span>
        </div>
        {tab==="table"&&(
          <div style={{background:"#0d0d0d",borderRadius:12,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"auto 1fr repeat(5,32px)",padding:"10px 14px",borderBottom:`1px solid #1a1a1a`}}>
              {["#","Team","P","W","L","GD","PTS"].map(h=><div key={h} style={{fontSize:9,color:C.ghost,letterSpacing:2,fontWeight:700,textAlign:"center"}}>{h}</div>)}
            </div>
            {table.map((row,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"auto 1fr repeat(5,32px)",padding:"12px 14px",borderBottom:`1px solid #111`,background:row.you?`${C.lime}08`:"transparent",alignItems:"center"}}>
                <div style={{width:24,fontSize:13,fontWeight:900,color:i===0?C.gold:i===1?"#888":C.ghost,marginRight:8}}>{i+1}</div>
                <div style={{fontSize:13,fontWeight:700,color:row.you?C.lime:C.white}}>{row.team}{row.you?" ★":""}</div>
                {[row.p,row.w,row.l,row.gd,row.pts].map((v,j)=>(
                  <div key={j} style={{textAlign:"center",fontSize:12,fontWeight:j===4?900:400,color:j===4?C.white:C.ghost}}>{v}</div>
                ))}
              </div>
            ))}
          </div>
        )}
        {tab==="fixtures"&&fixtures.map((f,i)=>(
          <div key={i} style={{background:"#0d0d0d",border:`1px solid ${f.status==="upcoming"?C.lime+"22":"#1a1a1a"}`,borderRadius:12,padding:14,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:10,color:C.ghost}}>{f.date}</span>
              {f.status==="upcoming"?<span style={{background:`${C.lime}18`,border:`1px solid ${C.lime}33`,borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700,color:C.lime}}>UPCOMING</span>:<span style={{background:"#181818",borderRadius:20,padding:"2px 8px",fontSize:9,color:C.ghost}}>DONE</span>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center"}}>
              <div style={{fontSize:13,fontWeight:700,textAlign:"right"}}>{f.home}</div>
              <div style={{fontSize:f.status==="done"?22:16,fontWeight:900,color:C.ghost,textAlign:"center"}}>{f.status==="done"?`${f.homeScore}–${f.awayScore}`:"vs"}</div>
              <div style={{fontSize:13,fontWeight:700}}>{f.away}</div>
            </div>
          </div>
        ))}
        {tab==="stats"&&[{label:"Top Scorer",name:"Jaden S.",val:"8 goals",icon:"⚽"},{label:"Top Rated",name:"Marcus T.",val:"OVR 83",icon:"⭐"},{label:"Most MOTM",name:"Street Kings FC",val:"4 awards",icon:"🏅"}].map(s=>(
          <div key={s.label} style={{background:"#0d0d0d",borderRadius:12,padding:14,marginBottom:10,display:"flex",gap:14,alignItems:"center"}}>
            <span style={{fontSize:28}}>{s.icon}</span>
            <div>
              <div style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>{s.label}</div>
              <div style={{fontSize:14,fontWeight:700}}>{s.name}</div>
              <div style={{fontSize:12,color:C.lime}}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── App Root ───────────────────────────────────────────────────
export default function App() {
  const [screen,setScreen]=useState("landing");
  const [player,setPlayer]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    sbGetUser().then(async user=>{
      if(user){
        try{
          const rows=await sbFetch(`players?id=eq.${user.id}&limit=1`);
          if(rows?.[0]){setPlayer(rows[0]);setScreen("dashboard");}
        }catch(_){}
      }
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  async function handleStat(key,value){
    const ns={...(player?.stats||{}),[key]:value};
    setPlayer(p=>({...p,stats:ns}));
    if(player?.id){
      await sbFetch(`players?id=eq.${player.id}`,{method:"PATCH",body:JSON.stringify({stats:ns}),prefer:"return=minimal"}).catch(()=>{});
    }
  }

  async function signOut(){await sbSignOut();setPlayer(null);setScreen("landing");}

  if(loading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      {/* Mini animated loading */}
      <div style={{position:"relative",width:80,height:80}}>
        <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`2px solid ${C.lime}22`,animation:"spin 3s linear infinite"}}/>
        <div style={{position:"absolute",inset:8,borderRadius:"50%",border:`2px dashed ${C.gold}22`,animation:"spin 2s linear infinite reverse"}}/>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,animation:"cardfloat 2s ease-in-out infinite"}}>⚽</div>
      </div>
      <div style={{fontSize:10,color:C.ghost,letterSpacing:4,textTransform:"uppercase"}}>Street Twice</div>
      <style>{`@keyframes cardfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{fontFamily:"Inter,system-ui,sans-serif",background:C.bg,minHeight:"100vh",color:C.white}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        input::placeholder{color:#2a2a2a;}
        select option{background:#111;}
        textarea::placeholder{color:#2a2a2a;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:2px;}
        @keyframes cardfloat{0%,100%{transform:perspective(700px) translateY(0)}50%{transform:perspective(700px) translateY(-8px)}}
        @keyframes logopulse{0%,100%{text-shadow:0 0 40px ${C.lime}44}50%{text-shadow:0 0 60px ${C.lime}88}}
        @keyframes slideup{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
      {screen==="landing"    &&<Landing onNav={setScreen}/>}
      {screen==="signup"     &&<Signup onNav={setScreen} onLogin={setPlayer}/>}
      {screen==="login"      &&<Login onNav={setScreen} onLogin={setPlayer}/>}
      {screen==="dashboard"  &&<Dashboard player={player} onNav={setScreen} onSignOut={signOut}/>}
      {screen==="selftests"  &&<SelfTests player={player} onNav={setScreen} onStat={handleStat}/>}
      {screen==="challenges" &&<Challenges player={player} onNav={setScreen} onStat={handleStat}/>}
      {screen==="matches"    &&<Matches player={player} onNav={setScreen}/>}
      {screen==="leagues"    &&<Leagues player={player} onNav={setScreen}/>}
      {screen==="badges"     &&<BadgesScreen player={player} onNav={setScreen}/>}
      {screen==="compare"    &&<Compare player={player} onNav={setScreen}/>}
      {screen==="team"       &&<Team player={player} onNav={setScreen}/>}
      {screen==="leaderboard"&&<Leaderboard player={player} onNav={setScreen}/>}
    </div>
  );
}
