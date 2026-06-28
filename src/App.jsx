// ================================================================
// STREET TWICE V8
// Styled icons · Real team sync · 35+ challenges · No fake players
// ================================================================
import { useState, useEffect, useRef, useCallback } from "react";

const SUPABASE_URL = "https://rfwfprrzbnjptwsdalyh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_SlsPL-ZkUzqFJIfPR8awBw_5-PzcVQe";

// ── Supabase ──────────────────────────────────────────────────
async function sbFetch(path, opts={}) {
  const token=localStorage.getItem("sb_token");
  const res=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{
    headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${token||SUPABASE_ANON_KEY}`,"Content-Type":"application/json",Prefer:opts.prefer||"return=representation",...opts.headers},
    ...opts,
  });
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.message||"Request failed");}
  return res.status===204?null:res.json();
}
async function sbAuth(email,password,mode="login"){
  const ep=mode==="signup"?"signup":"token?grant_type=password";
  const res=await fetch(`${SUPABASE_URL}/auth/v1/${ep}`,{method:"POST",headers:{apikey:SUPABASE_ANON_KEY,"Content-Type":"application/json"},body:JSON.stringify({email,password})});
  const data=await res.json();
  if(data.error||data.error_description)throw new Error(data.error_description||data.error||"Auth failed");
  if(data.access_token)localStorage.setItem("sb_token",data.access_token);
  return data;
}
async function sbGetUser(){
  const token=localStorage.getItem("sb_token");
  if(!token)return null;
  try{
    const res=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`}});
    if(!res.ok){localStorage.removeItem("sb_token");return null;}
    const data=await res.json();
    return(data&&data.id)?data:null;
  }catch{return null;}
}
async function sbSignOut(){
  await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:"POST",headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${localStorage.getItem("sb_token")}`}}).catch(()=>{});
  localStorage.removeItem("sb_token");
}

// ── Constants ─────────────────────────────────────────────────
const COUNTRIES=["Afghanistan","Albania","Algeria","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Bulgaria","Burkina Faso","Cameroon","Canada","Chile","China","Colombia","Congo","Costa Rica","Croatia","Cuba","Czech Republic","Denmark","Dominican Republic","DR Congo","Ecuador","Egypt","El Salvador","England","Estonia","Ethiopia","Finland","France","Gabon","Georgia","Germany","Ghana","Greece","Guatemala","Guinea","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Ivory Coast","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kosovo","Kuwait","Latvia","Lebanon","Libya","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Mali","Malta","Mexico","Moldova","Montenegro","Morocco","Mozambique","Namibia","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palestine","Panama","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Scotland","Senegal","Serbia","Sierra Leone","Slovakia","Slovenia","Somalia","South Africa","South Korea","Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria","Tanzania","Thailand","Togo","Trinidad and Tobago","Tunisia","Turkey","Uganda","Ukraine","United Arab Emirates","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Wales","Zambia","Zimbabwe"].sort();
const POSITIONS=["ST","CF","LW","RW","CAM","CM","CDM","LM","RM","LB","RB","CB","GK"];
const STATS_META={
  pace:     {l:"PAC",icon:"⚡",color:"#b8ff00"},
  shooting: {l:"SHO",icon:"🎯",color:"#ff8844"},
  passing:  {l:"PAS",icon:"🔄",color:"#44bbff"},
  dribbling:{l:"DRI",icon:"🌀",color:"#aa44ff"},
  defending:{l:"DEF",icon:"🛡️",color:"#4488ff"},
  physical: {l:"PHY",icon:"💪",color:"#ff4466"},
  jumping:  {l:"JMP",icon:"⬆️",color:"#00ddff"},
  agility:  {l:"AGI",icon:"🏃",color:"#ffdd00"},
};
const BADGES=[
  {id:"stone_wall",icon:"🧱",name:"Stone Wall",desc:"Attacker gets 0 shots in 3-player challenge",rare:false},
  {id:"poacher",icon:"⚽",name:"Poacher",desc:"Score 9/10 in 3-player challenge",rare:false},
  {id:"tested",icon:"🔁",name:"Battle Tested",desc:"10 different opponent matchups",rare:false},
  {id:"verified",icon:"🏅",name:"Verified",desc:"5+ community verifications",rare:false},
  {id:"explosive",icon:"⚡",name:"Explosive",desc:"Sprint top 10% for your age group",rare:false},
  {id:"silky",icon:"🌀",name:"Silky",desc:"Dribbling test — zero cone touches",rare:false},
  {id:"brick_hands",icon:"🧤",name:"Brick Hands",desc:"3 consecutive GK clean sheets",rare:false},
  {id:"sniper",icon:"🎯",name:"Sniper",desc:"9/10 passing at 20m",rare:false},
  {id:"cannonball",icon:"💥",name:"Cannonball",desc:"Shot power top 15%",rare:false},
  {id:"motm_king",icon:"👑",name:"MOTM King",desc:"10+ Man of the Match awards",rare:false},
  {id:"young_gun",icon:"🌟",name:"Young Gun",desc:"Under 16 beating older opponent",rare:false},
  {id:"penalty_king",icon:"🥅",name:"Penalty King",desc:"Score all 5 in penalty shootout",rare:false},
  {id:"nutmeg_lord",icon:"🍪",name:"Nutmeg Lord",desc:"5 successful nutmegs in one session",rare:false},
  {id:"rondo_king",icon:"🔵",name:"Rondo King",desc:"Keep possession for 3 mins straight",rare:false},
  {id:"league_champ",icon:"🏆",name:"League Champ",desc:"Win a full league season",rare:true},
  {id:"rare_card",icon:"🔥",name:"Rare",desc:"3+ badges unlocked",rare:true},
];

// ── Challenge Library — 35+ challenges ───────────────────────
const CHALLENGE_CATEGORIES = [
  {
    id:"duel",
    label:"1v1 Skill Duels",
    icon:"⚔️",
    color:"#ff3344",
    grad:"linear-gradient(135deg,#ff334422,#ff334408)",
    desc:"Head-to-head contests between two registered players",
    challenges:[
      {id:"sprint_race",name:"Sprint Race",icon:"⚡",stat:"pace",players:2,timer:30,desc:"Both players sprint the same measured distance. Fastest time wins. Phone films from the side.",setup:["Measure 20m","Both players line up","Start simultaneously","Film from the side — both in frame"],scoring:"Enter your time in seconds. Both players submit. Fastest wins +6 PAC, loser gets +2.",badge:null},
      {id:"shooting_duel",name:"Shooting Duel",icon:"🎯",stat:"shooting",players:2,timer:300,desc:"10 shots each at the same target from the same distance. Most accurate wins.",setup:["Mark a 60×60cm target on a wall","Both shoot from 12m","10 shots each","Film each player separately"],scoring:"Count your hits out of 10. Most hits wins +6 SHO. Tie = both get +3.",badge:"cannonball"},
      {id:"passing_gauntlet",name:"Passing Gauntlet",icon:"🔄",stat:"passing",players:2,timer:240,desc:"Shrinking targets. Start at 50cm wide, shrink to 20cm. Most accurate across all distances wins.",setup:["3 targets: 50cm, 35cm, 20cm wide on wall","5 passes at each target from 10m","Film from behind each player","Count hits per target"],scoring:"Points: 1pt per hit on big, 2pts on medium, 3pts on small. Highest score wins +6 PAS.",badge:"sniper"},
      {id:"juggling_contest",name:"Juggling Contest",icon:"🌀",stat:"dribbling",players:2,timer:120,desc:"Max juggles without the ball touching the ground. Film from the side.",setup:["Stand 3m apart","Both juggle simultaneously","Film both in frame if possible","Drop = count stops"],scoring:"Most juggles wins +5 DRI. If winner gets 50+ juggles they get Silky badge.",badge:"silky"},
      {id:"penalty_shootout",name:"Penalty Shootout",icon:"🥅",stat:"shooting",players:2,timer:600,desc:"5 penalties each. One player shoots, one plays GK. Then swap.",setup:["One player in goal, one shooting","Film from behind the goal","5 penalties each","Swap roles after 5"],scoring:"Most goals wins +6 SHO for striker. GK gets +4 DEF per save above average.",badge:"penalty_king"},
      {id:"long_shot",name:"Long Shot Challenge",icon:"💥",stat:"shooting",players:2,timer:300,desc:"Score from the furthest distance. Each player gets 5 attempts from increasing distances.",setup:["Start at 20m","Film from the side","5 shots each per distance","Move back 5m if you score"],scoring:"Score from the furthest distance wins. Bonus +3 if you beat your opponent's furthest by 10m+.",badge:"cannonball"},
      {id:"nutmeg_challenge",name:"Nutmeg Challenge",icon:"🍪",stat:"dribbling",players:2,timer:180,desc:"Attacker tries to nutmeg the defender 10 times. Defender tries to stop every one.",setup:["Defender stands legs slightly apart","Attacker gets 10 attempts","3m run-up only","Film from the front"],scoring:"Each nutmeg = +2 DRI for attacker. Each block = +2 DEF for defender. 5+ nutmegs = Nutmeg Lord badge.",badge:"nutmeg_lord"},
      {id:"dribbling_race",name:"Dribbling Race",icon:"🏃",stat:"dribbling",players:2,timer:120,desc:"Same 6-cone course, timed separately. Fastest clean run wins.",setup:["6 cones in line, 1m apart","One player goes at a time","Film from the side","3 attempts each"],scoring:"Fastest time with 0 cone touches wins +6 DRI. Each cone touch adds 0.5s penalty.",badge:"silky"},
      {id:"crossing_finishing",name:"Crossing & Finishing",icon:"⭐",stat:"shooting",players:2,timer:300,desc:"One player crosses, one finishes. 10 crosses. Swap roles.",setup:["Crosser on the wing","Finisher in the box","Film from behind the goal","10 crosses each role"],scoring:"Most goals from crosses wins +4 SHO. Best crosser gets +4 PAS.",badge:null},
      {id:"first_touch",name:"First Touch Challenge",icon:"🎱",stat:"dribbling",players:2,timer:180,desc:"Player 1 throws ball in the air. Player 2 must control it cleanly in one touch. 10 attempts each.",setup:["Stand 5m apart","Thrower lofts the ball","Controller must kill it in one touch","Film from the side"],scoring:"Clean touches out of 10. Most wins +5 DRI.",badge:null},
      {id:"header_duel",name:"Header Duel",icon:"💫",stat:"jumping",players:2,timer:120,desc:"Both players jump for the same ball thrown between them. 10 duels. Who wins the most?",setup:["Stand 1m apart","Third person throws ball between you","Both jump — whoever heads it wins the duel","Film from front"],scoring:"Most headers won out of 10. Winner gets +5 JMP. Loser +2.",badge:null},
      {id:"shadow_defend",name:"Shadow Defending",icon:"🛡️",stat:"defending",players:2,timer:60,desc:"Defender must mirror attacker's movements for 60 seconds without getting turned. No tackling.",setup:["Attacker dribbles freely in 5×5m box","Defender mirrors without touching","Film from above or wide angle","60 seconds"],scoring:"Did attacker get past defender? Enter yes/no count. Age-weighted XP applied.",badge:null},
    ]
  },
  {
    id:"gk",
    label:"Goalkeeper Challenges",
    icon:"🧤",
    color:"#00ddff",
    grad:"linear-gradient(135deg,#00ddff22,#00ddff08)",
    desc:"Special tests for goalkeepers — reflexes, distribution, shot stopping",
    challenges:[
      {id:"reaction_saves",name:"Reaction Saves",icon:"⚡",stat:"defending",players:2,timer:60,desc:"Shooter fires 10 rapid shots from close range. GK must react. No run-up for shooter.",setup:["GK in goal","Shooter 8m away","10 shots as fast as possible","Film from behind the goal"],scoring:"Saves out of 10. 7+ = Brick Hands progress. Each save = +3 GK reflex.",badge:"brick_hands"},
      {id:"penalty_save",name:"Penalty Save Blitz",icon:"🥅",stat:"defending",players:2,timer:300,desc:"10 penalties faced. GK must save as many as possible.",setup:["Full penalty spot distance","Film from behind the goal","10 penalties taken","GK cannot move until ball is kicked"],scoring:"Saves out of 10. 5+ saves = exceptional. +4 DEF per save above average.",badge:"brick_hands"},
      {id:"distribution",name:"GK Distribution",icon:"🎯",stat:"passing",players:2,timer:180,desc:"GK throws or kicks to targets marked at different distances. Accuracy scored.",setup:["Mark targets at 20m, 30m, 40m","5 attempts per distance","Film from the side","Outfield player stands at target to confirm"],scoring:"Hits out of 15. Best GK distribution gets +5 PAS.",badge:null},
      {id:"cross_claim",name:"Cross Claiming",icon:"✈️",stat:"jumping",players:2,timer:180,desc:"One player crosses, GK must claim it cleanly. 10 crosses.",setup:["Crosser on the wing","GK in goal","Film from behind the goal","GK must catch cleanly — no punching"],scoring:"Clean claims out of 10. 7+ = excellent. +4 JMP per clean claim above average.",badge:null},
      {id:"shot_blitz",name:"Shot Stopping Blitz",icon:"💥",stat:"defending",players:2,timer:60,desc:"60-second barrage. Shooter fires as many shots as possible. GK must stop them all.",setup:["Shooter has 20+ balls ready","Film from behind goal","60 second timer","Both give honest count of saves"],scoring:"Save percentage. 70%+ = elite. Age-weighted scoring applied.",badge:"brick_hands"},
    ]
  },
  {
    id:"defending",
    label:"Defending Challenges",
    icon:"🛡️",
    color:"#4488ff",
    grad:"linear-gradient(135deg,#4488ff22,#4488ff08)",
    desc:"Progressive defensive challenges — test your positioning, timing and awareness",
    challenges:[
      {id:"defend_r1",name:"Round 1–3: No Tackles",icon:"🦶",stat:"defending",players:2,timer:180,desc:"Defender cannot slide or stand tackle. Pure positioning and body shape only.",setup:["Open space 10×10m","Defender gets NO tackles","Attacker can use any move","Both film simultaneously"],scoring:"Times attacker beats defender / 10 attempts. Age-weighted XP.",badge:null},
      {id:"defend_r2",name:"Round 4–6: Slides Only",icon:"⚡",stat:"defending",players:2,timer:180,desc:"Defender can ONLY use slide tackles. Tests timing and commitment.",setup:["Same 10×10m space","Defender must slide every challenge","Attacker knows this — must time moves","Film from wide angle"],scoring:"Clean slide tackles as % of attempts. +4 DEF per successful slide.",badge:null},
      {id:"defend_r3",name:"Round 7–9: 2v1",icon:"👥",stat:"defending",players:3,timer:180,desc:"Two attackers against one defender. Tests awareness and recovery.",setup:["Two attackers, one defender","10×10m space","Attackers must combine — no solo runs in first 5 seconds","Film from above if possible"],scoring:"Times defender holds out / 10. Huge XP if defender holds 2v1.",badge:"stone_wall"},
      {id:"defend_blitz",name:"60s Blitz",icon:"💨",stat:"defending",players:2,timer:60,desc:"Attacker must beat defender within 60 seconds. Defender must hold out.",setup:["Defender starts between attacker and a line 5m behind","60 second timer","Attacker must cross the line","Film from the side"],scoring:"Did attacker get past? When? Earlier = higher score for attacker. Holding out = max DEF XP.",badge:null},
      {id:"box_defend",name:"Box Defence",icon:"⬜",stat:"defending",players:2,timer:120,desc:"Defender protects a 3×3m box. Attacker tries to enter it with the ball.",setup:["Mark a 3×3m box with cones","Defender stands in box","Attacker approaches from outside","Film from above"],scoring:"Times attacker enters box / 10 attempts. +5 DEF if attacker enters fewer than 3 times.",badge:null},
      {id:"recovery_run",name:"Recovery Run",icon:"🏃",stat:"defending",players:2,timer:120,desc:"Attacker starts 3m ahead. Defender must catch and dispossess before they reach the line.",setup:["10m course","Attacker starts 3m ahead","Defender chases","Film from the side"],scoring:"Times defender recovers / 5 attempts. +6 PAC+DEF if defender recovers more than 3.",badge:null},
    ]
  },
  {
    id:"team",
    label:"Team Games",
    icon:"👥",
    color:"#aa44ff",
    grad:"linear-gradient(135deg,#aa44ff22,#aa44ff08)",
    desc:"Needs 3+ registered players — earn team badges and squad XP",
    challenges:[
      {id:"rondo",name:"Rondo",icon:"🔵",stat:"passing",players:4,timer:180,desc:"3 players keep ball from 1 defender in a circle. Count how long you keep it.",setup:["Mark a 6m diameter circle","3 passers, 1 defender in centre","Film from above","Count passes before defender touches"],scoring:"Most consecutive passes = rondo king. 20+ passes = Rondo King badge.",badge:"rondo_king"},
      {id:"shooting_comp",name:"Shooting Competition",icon:"🎯",stat:"shooting",players:3,timer:300,desc:"All players take 10 shots from the same spot. Ranked by accuracy.",setup:["Mark target on goal or wall","All shoot from same spot","Film each player","Rank by hits out of 10"],scoring:"1st place +6 SHO, 2nd +4, 3rd +2. Highest scorer in group earns Poacher badge progress.",badge:"poacher"},
      {id:"passing_triangle",name:"Passing Triangle",icon:"🔺",stat:"passing",players:3,timer:120,desc:"3 players in a triangle, count completed passes in 2 minutes.",setup:["3 players 10m apart in triangle","Pass and move","Film from above or wide angle","Count every completed pass"],scoring:"Group total passes. 60+ = excellent. Each player gets equal PAS boost.",badge:null},
      {id:"mini_match",name:"Mini Match",icon:"⚽",stat:null,players:4,timer:600,desc:"3v3 scored challenge. 10 minute game. All players rated by teammates after.",setup:["Any small pitch","3v3 format","10 minutes","Both teams film for reference"],scoring:"All players get post-match peer ratings. Goals = +3 SHO. Assists = +3 PAS. Clean sheet = +3 DEF.",badge:null},
      {id:"last_man",name:"Last Man Standing",icon:"🔥",stat:"defending",players:4,timer:300,desc:"Waves of attackers vs one defender. How many can the defender hold off?",setup:["Attackers take turns — one at a time","Defender must hold all off","60 seconds per attacker","Film from wide angle"],scoring:"Defenders beats = DEF XP. Attacker who beats defender = ATK XP.",badge:"stone_wall"},
    ]
  },
  {
    id:"fitness",
    label:"Fitness Challenges",
    icon:"💪",
    color:"#ff4466",
    grad:"linear-gradient(135deg,#ff446622,#ff446608)",
    desc:"Physical tests — solo or vs another player",
    challenges:[
      {id:"fitness_race",name:"Fitness Race",icon:"🏃",stat:"physical",players:2,timer:300,desc:"Combined fitness test: max push-ups, then sprint 20m, then 20 juggles. Fastest combined total wins.",setup:["Both players do push-ups first — film from side","Sprint 20m immediately after","20 juggles at the end","Film all three stages"],scoring:"Total time for all three stages. Fastest wins +6 PHY.",badge:null},
      {id:"endurance_dribble",name:"Endurance Dribble",icon:"⏱️",stat:"physical",players:2,timer:600,desc:"Both players dribble around a cone course continuously. Last one to stop wins.",setup:["6 cone course","Both dribble simultaneously","Film from wide angle","Stop when ball goes more than 1m away"],scoring:"Whoever lasts longer wins +6 PHY. 5+ minutes = exceptional.",badge:null},
      {id:"speed_ladder",name:"Speed Ladder",icon:"📏",stat:"agility",players:2,timer:60,desc:"Agility ladder drill timed. Fastest clean run wins.",setup:["Use real ladder or mark squares with tape","Stand 2m apart — go one at a time","Film from front","3 attempts each"],scoring:"Fastest time with no misses wins +6 AGI.",badge:null},
      {id:"header_height",name:"Header Height",icon:"💫",stat:"jumping",players:2,timer:120,desc:"Both players jump and head the ball as high as possible. 5 jumps each. Best height wins.",setup:["Both stand side by side","Film from the side","One player throws, other headers","5 headers each"],scoring:"Highest header estimated from video. Winner +5 JMP.",badge:null},
    ]
  },
  {
    id:"solo",
    label:"Solo Tests",
    icon:"🧪",
    color:"#b8ff00",
    grad:"linear-gradient(135deg,#b8ff0022,#b8ff0008)",
    desc:"Camera-measured individual assessments — benchmarked against your age group",
    challenges:[
      {id:"sprint",name:"Sprint Test",icon:"⚡",stat:"pace",players:1,timer:30,desc:"20m sprint timed by motion detection. Compared against your age group average.",setup:["Measure 20m","Phone sideways — both ends visible","Sprint at full pace","3 attempts"],scoring:"Auto-timed by motion detection. Score vs your age group.",badge:"explosive"},
      {id:"jump",name:"Jump Height",icon:"⬆️",stat:"jumping",players:1,timer:60,desc:"Hang time measured by camera. Converted to centimetres.",setup:["Stand sideways to camera","Full body visible","5 jumps","Camera detects liftoff and landing"],scoring:"Auto-measured. Compared to age group average.",badge:null},
      {id:"pushups",name:"Push-up Counter",icon:"💪",stat:"physical",players:1,timer:180,desc:"Camera counts your reps automatically.",setup:["Phone sideways 2m away","Chest to ground each rep","Max reps without stopping","Camera counts automatically"],scoring:"Auto-counted. Score vs age group.",badge:null},
      {id:"agility_drill",name:"Agility Drill",icon:"🏃",stat:"agility",players:1,timer:60,desc:"React to random direction commands. Reaction time measured.",setup:["4 cones around you 2m each","Face your phone","Commands flash on screen","React and tap Done"],scoring:"Average reaction time. Score vs age group.",badge:null},
    ]
  },
];

const ALL_CHALLENGES = CHALLENGE_CATEGORIES.flatMap(c=>c.challenges.map(ch=>({...ch,categoryId:c.id,categoryLabel:c.label,categoryColor:c.color})));

// ── Sprint/Age benchmarks ─────────────────────────────────────
const SPRINT_BENCH={u12:{avg:4.2,good:3.6,elite:3.0},u16:{avg:3.8,good:3.2,elite:2.8},u20:{avg:3.4,good:2.9,elite:2.55},adult:{avg:3.2,good:2.75,elite:2.45},vet:{avg:3.7,good:3.1,elite:2.7},senior:{avg:4.4,good:3.6,elite:3.0},open:{avg:3.4,good:2.9,elite:2.5}};
const JUMP_BENCH={u12:{avg:28,good:38,elite:50},u16:{avg:35,good:46,elite:58},u20:{avg:42,good:54,elite:66},adult:{avg:45,good:57,elite:70},vet:{avg:38,good:50,elite:62},senior:{avg:30,good:42,elite:54},open:{avg:42,good:54,elite:66}};
const PUSHUP_BENCH={u12:{avg:12,good:22,elite:35},u16:{avg:18,good:30,elite:45},u20:{avg:24,good:38,elite:55},adult:{avg:28,good:42,elite:60},vet:{avg:22,good:35,elite:50},senior:{avg:15,good:26,elite:40},open:{avg:24,good:38,elite:55}};

// ── Design ────────────────────────────────────────────────────
const C={
  bg:"#060608",pitch:"#080f08",
  lime:"#b8ff00",limeD:"#8fd400",
  gold:"#f0c040",goldD:"#c49a20",
  red:"#ff3344",blue:"#2288ff",
  purple:"#aa44ff",cyan:"#00ddff",
  orange:"#ff8844",pink:"#ff44aa",
  white:"#f4f4f4",ghost:"#555",muted:"#2a2a2a",
  tiers:{
    bronze:{bg:"#1c0e00",b:"#cd7f32",t:"#f0b080",g:"#cd7f3266"},
    silver:{bg:"#101010",b:"#b0b8c0",t:"#d8dde2",g:"#b0b8c066"},
    gold:  {bg:"#160e00",b:"#f0c040",t:"#ffe880",g:"#f0c04066"},
    elite: {bg:"#140800",b:"#ffdd00",t:"#fff066",g:"#ffdd0088"},
    rare:  {bg:"#0c0618",b:"#cc44ff",t:"#eeb8ff",g:"#cc44ff88"},
  },
};

// ── Utils ─────────────────────────────────────────────────────
function ov(stats){const v=Object.values(stats||{}).filter(x=>x>0);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):0;}
function tier(overall,badges=[]){if(badges.length>=3||overall>=90)return"rare";if(overall>=85)return"elite";if(overall>=75)return"gold";if(overall>=65)return"silver";return"bronze";}
function sc(v){if(!v)return C.ghost;if(v>=85)return C.gold;if(v>=75)return C.lime;if(v>=65)return"#88cc44";if(v>=55)return"#ccaa22";return"#cc4433";}
function calcAge(dob){if(!dob)return null;const b=new Date(dob),n=new Date();let a=n.getFullYear()-b.getFullYear();const m=n.getMonth()-b.getMonth();if(m<0||(m===0&&n.getDate()<b.getDate()))a--;return a;}
function ageGroup(age){if(!age)return"open";if(age<=12)return"u12";if(age<=16)return"u16";if(age<=20)return"u20";if(age<=29)return"adult";if(age<=39)return"vet";return"senior";}
const AGE_LABELS={u12:"U12",u16:"13–16",u20:"17–20",adult:"21–29",vet:"30–39",senior:"40+",open:"Open"};
function rawToScore(raw,bench){const{avg,good,elite}=bench;if(raw>=elite)return Math.min(99,Math.round(88+((raw-elite)/elite)*11));if(raw>=good)return Math.round(72+((raw-good)/(elite-good))*16);if(raw>=avg)return Math.round(50+((raw-avg)/(good-avg))*22);return Math.max(15,Math.round(50*(raw/avg)));}
function sprintToScore(t,group){const b=SPRINT_BENCH[group]||SPRINT_BENCH.open;if(t<=b.elite)return Math.min(99,Math.round(88+((b.elite-t)/b.elite)*11));if(t<=b.good)return Math.round(72+((b.good-t)/(b.good-b.elite))*16);if(t<=b.avg)return Math.round(50+((b.avg-t)/(b.avg-b.good))*22);return Math.max(15,Math.round(50*(b.avg/t)));}
function calcAgeXP(defAge,atkAge,beaten,total){const diff=Math.abs((defAge||22)-(atkAge||22)),rate=beaten/total;let dBase=Math.round((1-rate)*8),aBase=Math.round(rate*8),dMul=1,aMul=1;if(diff>=3){if((defAge||22)>(atkAge||22)){aMul=1+diff*0.15;dMul=0.8;}else{dMul=1+diff*0.18;aMul=0.7;}}return{defGain:Math.round(dBase*dMul),atkGain:Math.round(aBase*aMul),desc:diff>=8?`⚡ Huge age gap (${diff}y)`:`Age gap ${diff}y — XP adjusted`};}
function resolveGap(a,b){const g=Math.abs(a-b);if(g<=2)return{score:(a+b)/2,status:"accepted"};if(g<=5)return{score:(a+b)/2,status:"pending"};return{score:null,status:"flagged"};}
function randCode(){return Math.random().toString(36).slice(2,8).toUpperCase();}
function fmtTime(s){return`${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;}

// ── Hooks ─────────────────────────────────────────────────────
function useTimer(secs,onEnd){
  const[t,setT]=useState(secs),[on,setOn]=useState(false);const iv=useRef();
  const start=()=>{setT(secs);setOn(true);};const stop=()=>{setOn(false);clearInterval(iv.current);};const reset=()=>{stop();setT(secs);};
  useEffect(()=>{if(on){iv.current=setInterval(()=>setT(p=>{if(p<=1){clearInterval(iv.current);setOn(false);onEnd?.();return 0;}return p-1;}),1000);}return()=>clearInterval(iv.current);},[on]);
  return{t,on,start,stop,reset,display:fmtTime(t)};
}
function useCamera(){
  const videoRef=useRef(null),canvasRef=useRef(null),streamRef=useRef(null),recorderRef=useRef(null),chunksRef=useRef([]);
  const[active,setActive]=useState(false),[recording,setRecording]=useState(false),[blob,setBlob]=useState(null),[err,setErr]=useState(null);
  const startCam=useCallback(async(facing="environment")=>{
    setErr(null);setBlob(null);
    try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1280},height:{ideal:720}},audio:false});streamRef.current=stream;if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.setAttribute("autoplay","");videoRef.current.setAttribute("muted","");videoRef.current.setAttribute("playsinline","");await videoRef.current.play().catch(()=>{});}setActive(true);}
    catch(e){setErr(e.name==="NotAllowedError"?"Camera access denied — allow in browser settings.":"Camera error: "+e.message);}
  },[]);
  const stopCam=useCallback(()=>{streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setActive(false);setRecording(false);},[]);
  const recStart=useCallback(()=>{if(!streamRef.current)return;chunksRef.current=[];const mr=new MediaRecorder(streamRef.current);mr.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};mr.onstop=()=>setBlob(new Blob(chunksRef.current,{type:"video/webm"}));mr.start(100);recorderRef.current=mr;setRecording(true);},[]);
  const recStop=useCallback(()=>{if(recorderRef.current?.state!=="inactive")recorderRef.current?.stop();setRecording(false);},[]);
  return{videoRef,canvasRef,active,recording,blob,err,startCam,stopCam,recStart,recStop};
}
function useMotion(videoRef,canvasRef,enabled,onMotion){
  const prev=useRef(null),raf=useRef(null);
  useEffect(()=>{
    if(!enabled){cancelAnimationFrame(raf.current);return;}
    function detect(){const vid=videoRef.current,can=canvasRef.current;if(!vid||!can||vid.readyState<2){raf.current=requestAnimationFrame(detect);return;}const ctx=can.getContext("2d");can.width=vid.videoWidth/4;can.height=vid.videoHeight/4;ctx.drawImage(vid,0,0,can.width,can.height);const cur=ctx.getImageData(0,0,can.width,can.height).data;if(prev.current){let diff=0;for(let i=0;i<cur.length;i+=4)diff+=Math.abs(cur[i]-prev.current[i])+Math.abs(cur[i+1]-prev.current[i+1])+Math.abs(cur[i+2]-prev.current[i+2]);onMotion(diff/(can.width*can.height));}prev.current=new Uint8ClampedArray(cur);raf.current=requestAnimationFrame(detect);}
    raf.current=requestAnimationFrame(detect);return()=>cancelAnimationFrame(raf.current);
  },[enabled]);
}

// ── Styled Icon Component ─────────────────────────────────────
// Every icon in the app uses this — gradient bg, glow, animated press
function Icon({emoji,color,size=44,glow=true,pulse=false,style:sx={}}){
  const[pressed,setPressed]=useState(false);
  const dim=size;
  return <div
    onMouseDown={()=>setPressed(true)} onMouseUp={()=>setPressed(false)}
    onTouchStart={()=>setPressed(true)} onTouchEnd={()=>setPressed(false)}
    style={{
      width:dim,height:dim,borderRadius:dim*0.28,
      background:`linear-gradient(135deg,${color}28,${color}10)`,
      border:`1.5px solid ${color}44`,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:dim*0.48,flexShrink:0,
      boxShadow:glow?`0 4px 16px ${color}33,inset 0 1px 0 ${color}22`:"none",
      transform:pressed?"scale(0.9)":"scale(1)",
      transition:"transform 0.1s,box-shadow 0.2s",
      animation:pulse?`iconpulse 2s ease-in-out infinite`:"none",
      ...sx,
    }}>{emoji}</div>;
}

// ── Nav Icon with glow ring ───────────────────────────────────
function NavIcon({emoji,color,active,size=28}){
  return <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:size+12,height:size+12}}>
    {active&&<div style={{position:"absolute",inset:-2,borderRadius:"50%",background:`radial-gradient(circle,${color}44,transparent 70%)`,animation:"navglow 2s ease-in-out infinite"}}/>}
    <div style={{fontSize:size,filter:active?`drop-shadow(0 0 8px ${color})`:`drop-shadow(0 0 0px transparent)`,transition:"filter 0.3s",transform:active?"scale(1.1)":"scale(1)",transition:"transform 0.2s"}}>{emoji}</div>
  </div>;
}

// ── UI Primitives ─────────────────────────────────────────────
function Btn({children,onClick,v="lime",full,sm,disabled,style:sx={}}){
  const[p,setP]=useState(false);
  const vars={
    lime:{background:`linear-gradient(135deg,${C.lime},${C.limeD})`,color:"#000",border:"none",boxShadow:`0 4px 20px ${C.lime}44`},
    gold:{background:`linear-gradient(135deg,${C.gold},${C.goldD})`,color:"#000",border:"none",boxShadow:`0 4px 20px ${C.gold}44`},
    ghost:{background:"transparent",color:C.white,border:"1.5px solid #2a2a2a",boxShadow:"none"},
    red:{background:`${C.red}18`,color:C.red,border:`1.5px solid ${C.red}44`,boxShadow:"none"},
    blue:{background:`${C.blue}18`,color:C.blue,border:`1.5px solid ${C.blue}44`,boxShadow:"none"},
    purple:{background:`${C.purple}18`,color:C.purple,border:`1.5px solid ${C.purple}44`,boxShadow:"none"},
    dark:{background:"#1a1a1a",color:C.white,border:"1px solid #2a2a2a",boxShadow:"none"},
    cyan:{background:`${C.cyan}18`,color:C.cyan,border:`1.5px solid ${C.cyan}44`,boxShadow:"none"},
    orange:{background:`${C.orange}18`,color:C.orange,border:`1.5px solid ${C.orange}44`,boxShadow:"none"},
  };
  return <button onClick={onClick} disabled={disabled} onMouseDown={()=>setP(true)} onMouseUp={()=>setP(false)} onTouchStart={()=>setP(true)} onTouchEnd={()=>setP(false)}
    style={{...vars[v],borderRadius:10,cursor:disabled?"not-allowed":"pointer",padding:sm?"9px 16px":"14px 22px",fontSize:sm?12:14,fontWeight:800,width:full?"100%":"auto",letterSpacing:0.8,fontFamily:"inherit",opacity:disabled?0.4:1,transform:p?"scale(0.96)":"scale(1)",transition:"transform 0.1s,opacity 0.15s",...sx}}>{children}</button>;
}
function Input({label,type="text",value,onChange,placeholder,style:sx={}}){
  const[f,setF]=useState(false);
  return <div style={{marginBottom:14}}>{label&&<label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:2,marginBottom:5,textTransform:"uppercase"}}>{label}</label>}<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{width:"100%",background:"#111",border:`1.5px solid ${f?C.lime+"88":"#222"}`,borderRadius:8,padding:"13px 14px",color:C.white,fontSize:14,outline:"none",boxSizing:"border-box",transition:"border-color 0.2s",...sx}}/></div>;
}
function Select({label,value,onChange,options,placeholder}){
  const[f,setF]=useState(false);
  return <div style={{marginBottom:14}}>{label&&<label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:2,marginBottom:5,textTransform:"uppercase"}}>{label}</label>}<select value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{width:"100%",background:"#111",border:`1.5px solid ${f?C.lime+"88":"#222"}`,borderRadius:8,padding:"13px 14px",color:value?C.white:C.ghost,fontSize:14,outline:"none",appearance:"none",boxSizing:"border-box",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 14px center"}}>{placeholder&&<option value="" disabled>{placeholder}</option>}{options.map(o=><option key={o} value={o}>{o}</option>)}</select></div>;
}
function Textarea({label,value,onChange,placeholder,maxLength=160}){
  const[f,setF]=useState(false);
  return <div style={{marginBottom:14}}>{label&&<label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:2,marginBottom:5,textTransform:"uppercase"}}>{label}</label>}<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} onFocus={()=>setF(true)} onBlur={()=>setF(false)} rows={3} style={{width:"100%",background:"#111",border:`1.5px solid ${f?C.lime+"88":"#222"}`,borderRadius:8,padding:"13px 14px",color:C.white,fontSize:14,outline:"none",resize:"none",boxSizing:"border-box",fontFamily:"inherit"}}/><div style={{textAlign:"right",fontSize:10,color:C.ghost,marginTop:3}}>{value.length}/{maxLength}</div></div>;
}
function StatBar({label,value,color,change}){
  const col=color||sc(value);
  return <div style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:10,color:C.ghost,letterSpacing:2,fontWeight:700}}>{label}</span><div style={{display:"flex",alignItems:"center",gap:6}}>{change&&<span style={{fontSize:10,color:C.lime,fontWeight:700,animation:"statup 0.5s ease"}}>+{change}</span>}<span style={{fontSize:13,fontWeight:900,color:col}}>{value||"—"}</span></div></div><div style={{height:4,background:"#181818",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${((value||0)/99)*100}%`,background:`linear-gradient(90deg,${col}88,${col})`,borderRadius:2,transition:"width 1.4s cubic-bezier(.4,0,.2,1)"}}/></div></div>;
}
function Toast({msg,type="ok"}){
  if(!msg)return null;
  const cols={ok:C.lime,err:C.red,warn:C.gold,info:C.blue};
  return <div style={{position:"fixed",bottom:92,left:"50%",transform:"translateX(-50%)",background:cols[type]||C.lime,color:type==="ok"?"#000":C.white,borderRadius:10,padding:"12px 22px",fontSize:13,fontWeight:800,zIndex:999,boxShadow:`0 4px 24px ${cols[type]}66`,whiteSpace:"nowrap",animation:"slideup 0.3s ease"}}>{msg}</div>;
}
function Hdr({title,sub,back,right}){
  return <div style={{background:"linear-gradient(180deg,#0d140d,#080808)",borderBottom:`1px solid #0f1f0f`,padding:"14px 18px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:50}}>{back&&<button onClick={back} style={{background:"#111",border:"1px solid #222",color:C.white,cursor:"pointer",fontSize:16,lineHeight:1,padding:"8px 12px",borderRadius:8}}>←</button>}<div style={{flex:1}}>{sub&&<div style={{fontSize:9,color:C.lime,letterSpacing:3,textTransform:"uppercase",marginBottom:1}}>{sub}</div>}<div style={{fontSize:18,fontWeight:900,color:C.white,letterSpacing:-0.5}}>{title}</div></div>{right}</div>;
}
function Pill({children,color=C.lime}){return <span style={{background:`${color}18`,border:`1px solid ${color}44`,borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700,color,letterSpacing:1}}>{children}</span>;}
function AgePill({age}){if(!age)return null;const g=ageGroup(age);const cols={u12:C.cyan,u16:C.lime,u20:C.gold,adult:C.white,vet:C.orange,senior:C.ghost};return <Pill color={cols[g]||C.white}>{AGE_LABELS[g]}</Pill>;}
function RolePill({role}){if(!role||role==="player")return null;const cfg={captain:{label:"👑 Captain",color:C.gold},vice:{label:"⚡ Vice",color:C.cyan}};const c=cfg[role];if(!c)return null;return <Pill color={c.color}>{c.label}</Pill>;}

// ── Player Card ───────────────────────────────────────────────
function Card({player,size="full",glow=true,onClick}){
  const[tilt,setTilt]=useState({x:0,y:0}),[hov,setHov]=useState(false);
  const ref=useRef();
  const overall=ov(player?.stats);const t=tier(overall,player?.badges||[]);const ts=C.tiers[t];
  const isGK=player?.position==="GK";
  const W=size==="mini"?110:size==="sm"?150:size==="md"?190:260;const H=W*1.46;const s=W/260;
  const ms=isGK?[["DIV",player?.gk_stats?.diving||0],["HAN",player?.gk_stats?.handling||0],["KIC",player?.gk_stats?.kicking||0],["REF",player?.gk_stats?.reflexes||0],["SPD",player?.stats?.pace||0],["POS",player?.gk_stats?.positioning||0]]:[["PAC",player?.stats?.pace||0],["SHO",player?.stats?.shooting||0],["PAS",player?.stats?.passing||0],["DRI",player?.stats?.dribbling||0],["DEF",player?.stats?.defending||0],["PHY",player?.stats?.physical||0]];
  const bgs={bronze:"linear-gradient(145deg,#1c0e00,#2a1800,#100a00,#cd7f3218)",silver:"linear-gradient(145deg,#101010,#1c1c1c,#0c0c0c,#b0b8c018)",gold:"linear-gradient(145deg,#160e00,#241800,#0e0a00,#f0c04028)",elite:"linear-gradient(145deg,#140a00,#201400,#0a0600,#ffdd0044)",rare:"linear-gradient(145deg,#0c0618,#180a2c,#060410,#cc44ff44)"};
  function onMove(e){const r=ref.current?.getBoundingClientRect();if(!r)return;setTilt({x:((e.clientX-r.left)/r.width-0.5)*18,y:((e.clientY-r.top)/r.height-0.5)*-18});}
  const age=calcAge(player?.date_of_birth);
  return <div ref={ref} onClick={onClick} onMouseMove={onMove} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{setHov(false);setTilt({x:0,y:0});}}
    style={{width:W,height:H,flexShrink:0,position:"relative",transform:hov?`perspective(700px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale(1.05)`:"perspective(700px) scale(1)",transition:hov?"transform 0.06s":"transform 0.5s cubic-bezier(.2,.8,.2,1)",borderRadius:16*s,border:`1.5px solid ${ts.b}66`,boxShadow:glow?(hov?`0 28px 70px ${ts.g},0 0 50px ${ts.g}`:`0 8px 30px ${ts.g}66`):"none",animation:size==="full"&&glow?"cardfloat 4s ease-in-out infinite":"none",cursor:onClick?"pointer":"default"}}>
    <div style={{width:"100%",height:"100%",borderRadius:16*s,overflow:"hidden",background:bgs[t],position:"relative"}}>
      {hov&&<div style={{position:"absolute",inset:0,borderRadius:16*s,pointerEvents:"none",zIndex:10,background:t==="rare"?`linear-gradient(${110+tilt.x*3}deg,transparent 10%,${C.purple}28 35%,${C.cyan}18 55%,transparent 75%)`:`linear-gradient(${105+tilt.x*2}deg,transparent 20%,${ts.b}18 45%,transparent 65%)`}}/>}
      <div style={{padding:`${14*s}px ${14*s}px ${4*s}px`,position:"relative"}}>
        <div style={{fontSize:44*s,fontWeight:900,lineHeight:1,color:ts.t,fontFamily:"'Arial Black',sans-serif",textShadow:`0 0 20px ${ts.b}88`}}>{overall||"—"}</div>
        <div style={{fontSize:13*s,fontWeight:800,color:ts.t,letterSpacing:2,marginTop:1*s}}>{player?.position||"ST"}</div>
        <div style={{fontSize:20*s,marginTop:3*s}}>⚽</div>
        <div style={{position:"absolute",top:10*s,right:10*s,background:`${ts.b}1a`,border:`1px solid ${ts.b}55`,borderRadius:5*s,padding:`${2*s}px ${7*s}px`,fontSize:8*s,fontWeight:900,color:ts.t,letterSpacing:1.5}}>{t==="rare"?"✦ RARE":t==="elite"?"★ ELITE":t.toUpperCase()}</div>
        {age&&<div style={{position:"absolute",bottom:4*s,right:10*s,fontSize:7*s,color:`${ts.t}88`,fontWeight:700}}>{AGE_LABELS[ageGroup(age)]}</div>}
      </div>
      <div style={{width:W*0.68,height:W*0.68,margin:"0 auto",borderRadius:"50% 50% 0 0",overflow:"hidden",border:`2px solid ${ts.b}33`,background:"#0a0a0a"}}>
        {player?.photo_url?<img src={player.photo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:50*s,opacity:0.12}}>👤</div></div>}
      </div>
      <div style={{textAlign:"center",padding:`${6*s}px ${10*s}px ${3*s}px`}}>
        <div style={{fontSize:14*s,fontWeight:900,color:C.white,letterSpacing:2.5,fontFamily:"'Arial Black',sans-serif",textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{player?.name||"PLAYER"}</div>
        {player?.nationality&&<div style={{fontSize:8*s,color:C.ghost,letterSpacing:1,marginTop:1*s}}>{player.nationality}</div>}
      </div>
      <div style={{height:1,background:`linear-gradient(90deg,transparent,${ts.b}66,transparent)`,margin:`0 ${14*s}px ${5*s}px`}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:`0 ${14*s}px`}}>
        {ms.map(([l,v])=><div key={l} style={{textAlign:"center",paddingBottom:4*s}}><div style={{fontSize:15*s,fontWeight:900,color:sc(v),fontFamily:"'Arial Black',sans-serif",textShadow:`0 0 8px ${sc(v)}66`}}>{v||"—"}</div><div style={{fontSize:7*s,color:C.ghost,letterSpacing:1,fontWeight:700}}>{l}</div></div>)}
      </div>
      {(player?.badges||[]).length>0&&<div style={{display:"flex",justifyContent:"center",gap:3*s,padding:`${4*s}px`}}>{(player.badges||[]).slice(0,5).map(bid=>{const b=BADGES.find(x=>x.id===bid);return b?<span key={bid} style={{fontSize:11*s}}>{b.icon}</span>:null;})}</div>}
    </div>
  </div>;
}

// ── Camera ────────────────────────────────────────────────────
function SmartCamera({mode="record",onResult,instructions=[],timerSecs=60,playerAge=22}){
  const cam=useCamera();
  const[phase,setPhase]=useState("setup");
  const[ss,setSs]=useState("idle"); // sprint state
  const[stime,setStime]=useState(null);
  const[sms,setSms]=useState(null);
  const[pushCount,setPushCount]=useState(0);
  const[jumpHang,setJumpHang]=useState(null);
  const[airborne,setAirborne]=useState(false);
  const sprintStart=useRef(null),jumpStart=useRef(null),motionBuf=useRef([]);
  const timer=useTimer(timerSecs,()=>{cam.recStop();setPhase("done");});
  const group=ageGroup(playerAge);

  useMotion(cam.videoRef,cam.canvasRef,phase==="live",(score)=>{
    const now=Date.now();
    if(mode==="sprint"){if(ss==="waiting"&&score>55){sprintStart.current=now;setSs("running");}else if(ss==="running"&&score<15&&sprintStart.current){const el=(now-sprintStart.current)/1000;if(el>0.4&&el<8){setStime(el.toFixed(2));setSms(el);setSs("done");}}}
    if(mode==="pushups"){motionBuf.current.push({score,time:now});if(motionBuf.current.length>30)motionBuf.current.shift();const r=motionBuf.current.slice(-8),p=motionBuf.current.slice(-16,-8);const ar=r.reduce((a,b)=>a+b.score,0)/r.length,ap=p.length?p.reduce((a,b)=>a+b.score,0)/p.length:0;if(ap>40&&ar<12)setPushCount(c=>c+1);}
    if(mode==="jump"){if(!airborne&&score>90){setAirborne(true);jumpStart.current=now;}if(airborne&&score<20&&jumpStart.current){const h=(now-jumpStart.current)/1000;if(h>0.15&&h<2.5){setJumpHang(h.toFixed(3));setAirborne(false);}}}
  });

  async function open(){await cam.startCam("environment");setPhase("live");if(mode!=="sprint"){cam.recStart();timer.start();}}
  function startSprint(){setSs("waiting");cam.recStart();timer.start();}
  function finish(){
    cam.recStop();timer.stop();setPhase("done");
    if(mode==="sprint"&&sms){onResult({score:sprintToScore(sms,group),raw:stime+"s",label:`${stime}s vs avg ${SPRINT_BENCH[group].avg}s`});}
    else if(mode==="pushups"){const s=rawToScore(pushCount,PUSHUP_BENCH[group]);onResult({score:s,raw:pushCount,label:`${pushCount} reps`});}
    else if(mode==="jump"&&jumpHang){const h=parseFloat(jumpHang),cm=Math.round(1.22*h*h*9.81*100),s=rawToScore(cm,JUMP_BENCH[group]);onResult({score:s,raw:jumpHang+"s",label:`${cm}cm`});}
    else onResult({score:null,blob:cam.blob});
  }
  const oc=mode==="sprint"?C.lime:mode==="pushups"?C.red:C.cyan;
  return <div style={{background:"#060606",borderRadius:14,overflow:"hidden",border:`1px solid ${oc}22`}}>
    {phase==="setup"&&<div style={{padding:16}}>
      <div style={{background:`${C.blue}0f`,border:`1px solid ${C.blue}22`,borderRadius:8,padding:10,marginBottom:12}}><div style={{fontSize:9,color:C.blue,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>Age Group: {AGE_LABELS[group]}</div>{mode==="sprint"&&<div style={{fontSize:11,color:C.ghost}}>Avg: {SPRINT_BENCH[group].avg}s · Elite: {SPRINT_BENCH[group].elite}s</div>}{mode==="pushups"&&<div style={{fontSize:11,color:C.ghost}}>Avg: {PUSHUP_BENCH[group].avg} reps · Elite: {PUSHUP_BENCH[group].elite}</div>}{mode==="jump"&&<div style={{fontSize:11,color:C.ghost}}>Avg: {JUMP_BENCH[group].avg}cm · Elite: {JUMP_BENCH[group].elite}cm</div>}</div>
      {instructions.map((s,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:10}}><div style={{width:22,height:22,borderRadius:"50%",background:`${oc}18`,border:`1px solid ${oc}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:oc,flexShrink:0}}>{i+1}</div><p style={{margin:0,color:C.ghost,fontSize:12,lineHeight:1.6}}>{s}</p></div>)}
      {cam.err&&<div style={{color:C.red,fontSize:12,marginBottom:10}}>{cam.err}</div>}
      <Btn full onClick={open} style={{marginTop:8}}>📷 Open Camera</Btn>
    </div>}
    {phase==="live"&&<div><div style={{position:"relative",background:"#000"}}>
      <video ref={cam.videoRef} muted playsInline autoPlay style={{width:"100%",maxHeight:300,objectFit:"cover",display:"block"}}/>
      <canvas ref={cam.canvasRef} style={{display:"none"}}/>
      <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
        {mode==="sprint"&&<><div style={{position:"absolute",left:"8%",top:0,bottom:0,width:3,background:C.lime,boxShadow:`0 0 10px ${C.lime}`}}/><div style={{position:"absolute",right:"8%",top:0,bottom:0,width:3,background:C.red,boxShadow:`0 0 10px ${C.red}`}}/><div style={{position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",background:"#000000cc",borderRadius:8,padding:"8px 16px",textAlign:"center"}}>{ss==="idle"&&<div style={{fontSize:11,color:C.lime}}>Press START below</div>}{ss==="waiting"&&<div style={{fontSize:14,fontWeight:900,color:C.lime,animation:"blink 0.5s infinite"}}>⚡ SPRINT NOW!</div>}{ss==="running"&&<div style={{fontSize:13,fontWeight:900,color:C.gold}}>🏃 RUNNING...</div>}{ss==="done"&&<div><div style={{fontSize:22,fontWeight:900,color:C.lime}}>{stime}s ✓</div></div>}</div></>}
        {mode==="pushups"&&<div style={{position:"absolute",top:10,right:10,background:"#000000cc",borderRadius:10,padding:"10px 16px",textAlign:"center"}}><div style={{fontSize:32,fontWeight:900,color:C.lime}}>{pushCount}</div><div style={{fontSize:10,color:C.ghost}}>REPS</div></div>}
        {mode==="jump"&&<div style={{position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",background:"#000000cc",borderRadius:8,padding:"8px 14px",textAlign:"center"}}>{jumpHang?<div style={{fontSize:18,fontWeight:900,color:C.lime}}>{Math.round(1.22*parseFloat(jumpHang)*parseFloat(jumpHang)*9.81*100)}cm ✓</div>:<div style={{fontSize:12,color:airborne?C.gold:C.ghost}}>{airborne?"⬆️ AIRBORNE...":"Jump!"}</div>}</div>}
        {cam.recording&&<div style={{position:"absolute",top:10,left:10,display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:C.red,animation:"blink 1s infinite"}}/><span style={{fontSize:11,color:C.white,fontWeight:700,background:"#000000aa",padding:"2px 8px",borderRadius:4}}>{mode!=="sprint"?timer.display:"REC"}</span></div>}
      </div></div>
      <div style={{padding:12,display:"flex",gap:8}}>
        {mode==="sprint"&&ss==="idle"&&<Btn full onClick={startSprint}>⚡ Start Sprint</Btn>}
        {mode==="sprint"&&ss==="done"&&<Btn full onClick={finish}>✓ Save Time</Btn>}
        {mode==="sprint"&&(ss==="waiting"||ss==="running")&&<Btn full onClick={()=>setSs("idle")} v="ghost">↩ Reset</Btn>}
        {mode!=="sprint"&&<Btn full onClick={finish} v="red">⏹ Stop & Save</Btn>}
      </div></div>}
    {phase==="done"&&<div style={{padding:20,textAlign:"center"}}><div style={{fontSize:44}}>✅</div></div>}
    <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
  </div>;
}

function AgilityDrill({onScore,playerAge=22}){
  const CMDS=["← LEFT","RIGHT →","↑ FORWARD","↓ BACK","✋ HOLD"],COLS=[C.blue,C.lime,C.gold,C.red,C.purple];
  const[cmd,setCmd]=useState(null),[cc,setCc]=useState(C.lime),[scores,setScores]=useState([]),[count,setCount]=useState(0),[done,setDone]=useState(false);
  const sr=useRef(null);
  function next(){if(count>=10){setDone(true);onScore(scores);return;}const i=Math.floor(Math.random()*CMDS.length);setCmd(CMDS[i]);setCc(COLS[i]);sr.current=Date.now();setCount(n=>n+1);}
  function react(){if(!sr.current)return;const ms=Date.now()-sr.current;const ns=[...scores,ms];setScores(ns);sr.current=null;if(ns.length>=10){setDone(true);onScore(ns);return;}setTimeout(next,500);}
  if(done){const avg=scores.reduce((a,b)=>a+b,0)/scores.length,s=avg<500?92:avg<700?82:avg<900?70:avg<1200?55:38;return <div style={{textAlign:"center",padding:20}}><div style={{fontSize:32,fontWeight:900,color:C.lime}}>{Math.round(avg)}ms</div><div style={{fontSize:12,color:C.ghost}}>Avg reaction · Score: {s}/99</div></div>;}
  if(!cmd)return <div style={{textAlign:"center",padding:20}}><p style={{color:C.ghost,fontSize:12,lineHeight:1.7,marginBottom:16}}>4 cones around you, 2m each direction. React as fast as possible.</p><Btn full onClick={next}>▶ Start</Btn></div>;
  return <div style={{textAlign:"center",padding:20}}><div style={{fontSize:10,color:C.ghost,marginBottom:12}}>{count}/10</div><div style={{fontSize:52,fontWeight:900,color:cc,letterSpacing:2,fontFamily:"'Arial Black',sans-serif",animation:"cmdpop 0.15s ease",marginBottom:24}}>{cmd}</div><Btn full onClick={react} v="blue" style={{fontSize:16,padding:"16px 22px"}}>✓ Done it!</Btn><style>{`@keyframes cmdpop{from{transform:scale(0.6);opacity:0}to{transform:scale(1);opacity:1}}`}</style></div>;
}

// ── Loading Screen ────────────────────────────────────────────
function LoadingScreen({onDone}){
  const canvasRef=useRef(null),[progress,setProgress]=useState(0),[showTag,setShowTag]=useState(false);const animRef=useRef(null);
  useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext("2d");function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;}resize();window.addEventListener("resize",resize);const particles=Array.from({length:80},()=>({x:Math.random()*window.innerWidth,y:Math.random()*window.innerHeight,vx:(Math.random()-0.5)*0.6,vy:(Math.random()-0.5)*0.6,r:Math.random()*2+0.5,color:[C.lime,C.gold,C.blue,C.purple,"#fff"][Math.floor(Math.random()*5)],alpha:Math.random()*0.6+0.1,pulse:Math.random()*Math.PI*2}));const ball={x:window.innerWidth/2,y:window.innerHeight/2,vx:2.2,vy:1.4,r:18,angle:0};const trail=[];let frame=0;
  function draw(){frame++;ctx.clearRect(0,0,canvas.width,canvas.height);const grad=ctx.createRadialGradient(canvas.width/2,canvas.height/2,0,canvas.width/2,canvas.height/2,canvas.width*0.7);grad.addColorStop(0,"#0d140d");grad.addColorStop(1,"#060608");ctx.fillStyle=grad;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.strokeStyle=C.lime;ctx.globalAlpha=0.06;ctx.lineWidth=1;ctx.beginPath();ctx.arc(canvas.width/2,canvas.height/2,canvas.height*0.22,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(canvas.width/2,0);ctx.lineTo(canvas.width/2,canvas.height);ctx.stroke();ctx.beginPath();ctx.arc(canvas.width/2,canvas.height/2,5,0,Math.PI*2);ctx.fillStyle=C.lime;ctx.fill();const bw=canvas.width*0.18,bh=canvas.height*0.38;ctx.strokeRect(0,canvas.height/2-bh/2,bw,bh);ctx.strokeRect(canvas.width-bw,canvas.height/2-bh/2,bw,bh);ctx.restore();
  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.pulse+=0.04;if(p.x<0||p.x>canvas.width)p.vx*=-1;if(p.y<0||p.y>canvas.height)p.vy*=-1;ctx.save();ctx.globalAlpha=p.alpha*(0.7+0.3*Math.sin(p.pulse));ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=6;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.restore();});
  trail.push({x:ball.x,y:ball.y});if(trail.length>24)trail.shift();trail.forEach((t,i)=>{ctx.save();ctx.globalAlpha=(i/trail.length)*0.4;ctx.fillStyle=C.lime;ctx.shadowColor=C.lime;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(t.x,t.y,(i/trail.length)*12,0,Math.PI*2);ctx.fill();ctx.restore();});
  ball.x+=ball.vx;ball.y+=ball.vy;ball.angle+=0.08;if(ball.x-ball.r<0||ball.x+ball.r>canvas.width)ball.vx*=-1;if(ball.y-ball.r<0||ball.y+ball.r>canvas.height)ball.vy*=-1;
  ctx.save();ctx.translate(ball.x,ball.y);ctx.rotate(ball.angle);const bg=ctx.createRadialGradient(0,0,0,0,0,ball.r*2.5);bg.addColorStop(0,C.lime+"44");bg.addColorStop(1,"transparent");ctx.fillStyle=bg;ctx.beginPath();ctx.arc(0,0,ball.r*2.5,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.shadowColor=C.lime;ctx.shadowBlur=20;ctx.beginPath();ctx.arc(0,0,ball.r,0,Math.PI*2);ctx.fill();ctx.fillStyle="#111";ctx.shadowBlur=0;for(let i=0;i<5;i++){const a=(i/5)*Math.PI*2;ctx.beginPath();ctx.arc(Math.cos(a)*ball.r*0.5,Math.sin(a)*ball.r*0.5,ball.r*0.22,0,Math.PI*2);ctx.fill();}ctx.beginPath();ctx.arc(0,0,ball.r*0.22,0,Math.PI*2);ctx.fill();ctx.restore();
  const sweep=(frame*3)%(canvas.height+100)-50;const sg=ctx.createLinearGradient(0,sweep-30,0,sweep+30);sg.addColorStop(0,"transparent");sg.addColorStop(0.5,C.lime+"08");sg.addColorStop(1,"transparent");ctx.fillStyle=sg;ctx.fillRect(0,sweep-30,canvas.width,60);
  animRef.current=requestAnimationFrame(draw);}draw();return()=>{cancelAnimationFrame(animRef.current);window.removeEventListener("resize",resize);};},[]);
  useEffect(()=>{const iv=setInterval(()=>setProgress(p=>{if(p>=100){clearInterval(iv);return 100;}return Math.min(100,p+(p<60?1.8:p<85?1.2:0.6));}),40);return()=>clearInterval(iv);},[]);
  useEffect(()=>{if(progress>30)setShowTag(true);if(progress>=100)setTimeout(()=>onDone?.(),600);},[progress]);
  const texts=["Initialising database...","Loading card engine...","Calibrating benchmarks...","Syncing challenges...","Building your card...","Almost ready..."];const ti=Math.min(Math.floor(progress/17),texts.length-1);
  const statCols=[C.lime,C.orange,C.blue,C.purple,C.blue,C.red];const statLabels=["PAC","SHO","PAS","DRI","DEF","PHY"];
  return <div style={{position:"fixed",inset:0,background:C.bg,overflow:"hidden",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:9999}}>
    <canvas ref={canvasRef} style={{position:"absolute",inset:0}}/>
    <div style={{position:"relative",zIndex:1,textAlign:"center",maxWidth:360,width:"100%",padding:"0 24px"}}>
      <div style={{marginBottom:8}}><div style={{fontSize:10,color:C.lime,letterSpacing:8,fontWeight:700,textTransform:"uppercase",marginBottom:4,opacity:0.8}}>⚽ Street</div><div style={{fontSize:88,fontWeight:900,lineHeight:0.85,color:C.white,fontFamily:"'Arial Black',sans-serif",textTransform:"uppercase",letterSpacing:-5,animation:"logopulse 3s ease-in-out infinite"}}>TWICE</div></div>
      <div style={{fontSize:11,color:C.lime,letterSpacing:4,fontWeight:700,textTransform:"uppercase",marginBottom:44,height:16,opacity:showTag?1:0,transition:"opacity 0.8s ease"}}>Your Game. Your Card. Your Legacy.</div>
      <div style={{display:"flex",justifyContent:"center",marginBottom:44,position:"relative"}}>
        <div style={{position:"absolute",width:200,height:200,borderRadius:"50%",background:`radial-gradient(circle,${C.lime}14,transparent 70%)`,top:"50%",left:"50%",transform:"translate(-50%,-50%)",animation:"orb 3s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:160,height:160,borderRadius:"50%",border:`1px solid ${C.lime}22`,top:"50%",left:"50%",transform:"translate(-50%,-50%)",animation:"lspin 8s linear infinite"}}/>
        <div style={{position:"absolute",width:120,height:120,borderRadius:"50%",border:`1px dashed ${C.gold}22`,top:"50%",left:"50%",transform:"translate(-50%,-50%)",animation:"lspin 5s linear infinite reverse"}}/>
        <div style={{width:110,height:160,borderRadius:12,background:`linear-gradient(145deg,#1a1400,#2a2000,${C.gold}18)`,border:`1.5px solid ${C.gold}55`,boxShadow:`0 0 30px ${C.gold}33,0 0 60px ${C.gold}18`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",animation:"cardpulse 2s ease-in-out infinite"}}>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,transparent 30%,rgba(255,255,255,0.06) 50%,transparent 70%)",animation:"shimmer 2.5s ease-in-out infinite"}}/>
          <div style={{fontSize:36,fontWeight:900,color:C.gold,fontFamily:"'Arial Black',sans-serif",textShadow:`0 0 20px ${C.gold}88`}}>{Math.min(99,Math.round(progress*0.85))}</div>
          <div style={{fontSize:9,color:C.gold,letterSpacing:2,fontWeight:700}}>ST</div><div style={{fontSize:22,marginTop:4}}>⚽</div>
          <div style={{width:60,height:60,borderRadius:"50% 50% 0 0",background:"#00000033",marginTop:4,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:28,opacity:0.3}}>👤</div></div>
          <div style={{position:"absolute",top:8,right:8,fontSize:8,color:C.gold,fontWeight:800,letterSpacing:1}}>{progress<65?"BRONZE":progress<75?"SILVER":progress<88?"GOLD":"★ ELITE"}</div>
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{height:3,background:"#111",borderRadius:2,overflow:"hidden",marginBottom:10,position:"relative"}}><div style={{height:"100%",width:`${progress}%`,background:`linear-gradient(90deg,${C.limeD},${C.lime})`,borderRadius:2,transition:"width 0.08s linear",boxShadow:`0 0 10px ${C.lime}88`}}/><div style={{position:"absolute",top:"50%",left:`${progress}%`,transform:"translate(-50%,-50%)",width:8,height:8,borderRadius:"50%",background:C.lime,boxShadow:`0 0 8px ${C.lime}`,transition:"left 0.08s linear"}}/></div>
        <div style={{display:"flex",justifyContent:"space-between"}}><div style={{fontSize:10,color:C.ghost}}>{texts[ti]}</div><div style={{fontSize:12,fontWeight:900,color:C.lime}}>{Math.round(progress)}%</div></div>
      </div>
      <div style={{opacity:progress>50?1:0,transition:"opacity 0.6s ease"}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{statLabels.map((l,i)=><div key={l} style={{opacity:progress>55+i*5?1:0,transition:`opacity 0.4s ease ${i*100}ms`,textAlign:"center"}}><div style={{fontSize:14,fontWeight:900,color:statCols[i],fontFamily:"'Arial Black',sans-serif"}}>{Math.round((progress/100)*(55+i*7))}</div><div style={{fontSize:8,color:C.ghost,letterSpacing:1.5,fontWeight:700}}>{l}</div></div>)}</div></div>
    </div>
    <style>{`@keyframes logopulse{0%,100%{text-shadow:0 0 40px ${C.lime}44}50%{text-shadow:0 0 60px ${C.lime}88}}@keyframes cardpulse{0%,100%{box-shadow:0 0 30px ${C.gold}33;transform:translateY(0) rotateY(0deg)}50%{box-shadow:0 0 50px ${C.gold}55;transform:translateY(-6px) rotateY(6deg)}}@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}@keyframes lspin{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}@keyframes orb{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.3)}}`}</style>
  </div>;
}

// ── Auth ──────────────────────────────────────────────────────
function Landing({onNav}){
  const demo={name:"STRIKER",position:"ST",photo_url:null,nationality:"Nigeria",badges:["explosive","silky","tested"],stats:{pace:82,shooting:86,passing:74,dribbling:88,defending:42,physical:79,jumping:77,agility:85}};
  const[tick,setTick]=useState(0);
  useEffect(()=>{const iv=setInterval(()=>setTick(t=>t+1),3000);return()=>clearInterval(iv);},[]);
  const words=["YOUR GAME.","YOUR CARD.","YOUR LEGACY."];
  return <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"}}>
    <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.06}}><ellipse cx="50%" cy="50%" rx="42%" ry="28%" fill="none" stroke={C.lime} strokeWidth="1"/><line x1="50%" y1="0" x2="50%" y2="100%" stroke={C.lime} strokeWidth="0.8"/><circle cx="50%" cy="50%" r="7%" fill="none" stroke={C.lime} strokeWidth="0.8"/><rect x="2%" y="28%" width="10%" height="44%" fill="none" stroke={C.lime} strokeWidth="0.8"/><rect x="88%" y="28%" width="10%" height="44%" fill="none" stroke={C.lime} strokeWidth="0.8"/></svg>
    <div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:`radial-gradient(circle,${C.lime}0a,transparent 70%)`,top:"10%",left:"50%",transform:"translateX(-50%)",pointerEvents:"none"}}/>
    <div style={{zIndex:1,maxWidth:400,width:"100%",textAlign:"center"}}>
      <div style={{fontSize:10,color:C.lime,letterSpacing:8,fontWeight:700,textTransform:"uppercase",marginBottom:6}}>⚽ Street</div>
      <div style={{fontSize:84,fontWeight:900,lineHeight:0.85,color:C.white,fontFamily:"'Arial Black',sans-serif",textTransform:"uppercase",letterSpacing:-4,marginBottom:8,animation:"logopulse 3s ease-in-out infinite"}}>TWICE</div>
      <div style={{fontSize:12,color:C.lime,letterSpacing:4,marginBottom:48,fontWeight:700}}>{words[tick%words.length]}</div>
      <div style={{display:"flex",justifyContent:"center",marginBottom:48,filter:`drop-shadow(0 0 40px ${C.gold}44)`}}><Card player={demo} size="md" glow/></div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:28}}>
        <Btn full onClick={()=>onNav("signup")}>Create Your Card →</Btn>
        <Btn full v="ghost" onClick={()=>onNav("login")}>Sign In</Btn>
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:16}}>{["Bronze","Silver","Gold","Elite","✦ Rare"].map((t,i)=><div key={t} style={{fontSize:9,color:[C.tiers.bronze.t,C.tiers.silver.t,C.tiers.gold.t,C.tiers.elite.t,C.tiers.rare.t][i],fontWeight:700,letterSpacing:1}}>{t}</div>)}</div>
    </div>
    <style>{`@keyframes cardfloat{0%,100%{transform:perspective(700px) translateY(0)}50%{transform:perspective(700px) translateY(-8px)}}@keyframes logopulse{0%,100%{text-shadow:0 0 40px ${C.lime}44}50%{text-shadow:0 0 60px ${C.lime}88}}@keyframes slideup{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}@keyframes iconpulse{0%,100%{box-shadow:0 4px 16px var(--ic)33}50%{box-shadow:0 4px 28px var(--ic)66}}@keyframes navglow{0%,100%{opacity:0.7}50%{opacity:1}}@keyframes statup{from{transform:translateY(4px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes cardfloat{0%,100%{transform:perspective(700px) translateY(0)}50%{transform:perspective(700px) translateY(-8px)}}`}</style>
  </div>;
}

function Signup({onNav,onLogin}){
  const[step,setStep]=useState(1),[form,setForm]=useState({name:"",email:"",password:"",position:"ST",nationality:"",foot:"Right",date_of_birth:"",bio:""}),[photo,setPhoto]=useState(null),[loading,setLoading]=useState(false),[err,setErr]=useState("");
  const fileRef=useRef();const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const previewAge=form.date_of_birth?calcAge(form.date_of_birth):null;
  async function submit(){
    if(!form.name||!form.email||!form.password){setErr("Please fill all fields.");return;}
    if(!form.date_of_birth){setErr("Date of birth required.");return;}
    if(!form.nationality){setErr("Please select your country.");return;}
    setLoading(true);setErr("");
    try{
      const auth=await sbAuth(form.email,form.password,"signup");
      const uid=auth?.user?.id||auth?.id;
      if(!uid)throw new Error("Could not get user ID. Try again.");
      const player={id:uid,email:form.email,name:form.name,position:form.position,nationality:form.nationality,foot:form.foot,date_of_birth:form.date_of_birth,bio:form.bio,photo_url:photo||null,stats:{pace:0,shooting:0,passing:0,dribbling:0,defending:0,physical:0,jumping:0,agility:0},peer_stats:{aggression:0,awareness:0,tackling:0,leadership:0,soccer_iq:0},gk_stats:{diving:0,handling:0,kicking:0,reflexes:0,positioning:0},badges:[],team_id:null,team_role:"player",team_code:null,motm_votes:0,games_played:0,challenge_code:randCode(),last_benchmark:new Date().toISOString()};
      await sbFetch("players",{method:"POST",body:JSON.stringify(player)});
      onLogin(player);onNav("app");
    }catch(e){setErr(e.message);}
    setLoading(false);
  }
  return <div style={{minHeight:"100vh",background:C.bg,padding:"24px 20px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
    <div style={{width:"100%",maxWidth:380}}>
      <Btn v="ghost" sm onClick={()=>onNav("landing")} style={{marginBottom:24}}>← Back</Btn>
      <div style={{height:3,background:"#111",borderRadius:2,marginBottom:24,overflow:"hidden"}}><div style={{height:"100%",width:step===1?"50%":"100%",background:C.lime,transition:"width 0.4s ease"}}/></div>
      <h1 style={{color:C.white,fontSize:28,fontWeight:900,margin:"0 0 24px",letterSpacing:-1}}>{step===1?"Create Account":"Your Profile"}</h1>
      {err&&<div style={{background:`${C.red}18`,border:`1px solid ${C.red}44`,borderRadius:8,padding:"12px 14px",color:C.red,fontSize:12,marginBottom:16}}>{err}</div>}
      {step===1&&<>
        <Input label="Full Name" value={form.name} onChange={v=>set("name",v)} placeholder="Your name"/>
        <Input label="Email" type="email" value={form.email} onChange={v=>set("email",v)} placeholder="you@email.com"/>
        <Input label="Password" type="password" value={form.password} onChange={v=>set("password",v)} placeholder="Min 6 characters"/>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:2,marginBottom:5,textTransform:"uppercase"}}>Date of Birth</label>
          <input type="date" value={form.date_of_birth} onChange={e=>set("date_of_birth",e.target.value)} max={new Date().toISOString().split("T")[0]} style={{width:"100%",background:"#111",border:"1.5px solid #222",borderRadius:8,padding:"13px 14px",color:C.white,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
          {previewAge!==null&&<div style={{marginTop:6,display:"flex",alignItems:"center",gap:8}}><AgePill age={previewAge}/><span style={{fontSize:11,color:C.ghost}}>Stats benchmarked for this age group</span></div>}
        </div>
        <Btn full onClick={()=>{if(!form.name||!form.email||!form.password||!form.date_of_birth){setErr("Fill all fields");return;}setErr("");setStep(2);}}>Continue →</Btn>
        <p style={{textAlign:"center",marginTop:18,color:C.ghost,fontSize:12}}>Have an account? <span onClick={()=>onNav("login")} style={{color:C.lime,cursor:"pointer",fontWeight:700}}>Sign in</span></p>
      </>}
      {step===2&&<>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div onClick={()=>fileRef.current.click()} style={{width:90,height:90,borderRadius:"50%",margin:"0 auto 10px",background:"#111",border:`2px dashed ${C.lime}44`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden"}}>
            {photo?<img src={photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:30}}>📸</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const r=new FileReader();r.onload=ev=>setPhoto(ev.target.result);r.readAsDataURL(e.target.files[0]);}}/>
          <span style={{fontSize:11,color:C.ghost,cursor:"pointer"}} onClick={()=>fileRef.current.click()}>Tap to add photo</span>
        </div>
        <Select label="Nationality / Country" value={form.nationality} onChange={v=>set("nationality",v)} options={COUNTRIES} placeholder="Select your country"/>
        <div style={{marginBottom:14}}><label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:2,marginBottom:5,textTransform:"uppercase"}}>Position</label><select value={form.position} onChange={e=>set("position",e.target.value)} style={{width:"100%",background:"#111",border:"1.5px solid #222",borderRadius:8,padding:"13px 14px",color:C.white,fontSize:14,outline:"none"}}>{POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
        <div style={{marginBottom:16}}><label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>Preferred Foot</label><div style={{display:"flex",gap:8}}>{["Left","Right","Both"].map(f=><button key={f} onClick={()=>set("foot",f)} style={{flex:1,padding:12,borderRadius:8,border:`1.5px solid ${form.foot===f?C.lime:"#222"}`,background:form.foot===f?`${C.lime}14`:"transparent",color:form.foot===f?C.lime:C.ghost,cursor:"pointer",fontSize:13,fontWeight:700}}>{f}</button>)}</div></div>
        <Textarea label="Player Bio (optional)" value={form.bio} onChange={v=>set("bio",v)} placeholder="Your style, your strengths..." maxLength={160}/>
        <Btn full onClick={submit} disabled={loading}>{loading?"Creating your card...":"Create My Card ⚽"}</Btn>
      </>}
    </div>
  </div>;
}

function Login({onNav,onLogin}){
  const[email,setEmail]=useState(""),[pw,setPw]=useState(""),[loading,setLoading]=useState(false),[err,setErr]=useState("");
  async function submit(){
    if(!email||!pw){setErr("Enter email and password.");return;}
    setLoading(true);setErr("");
    try{
      const authData=await sbAuth(email,pw,"login");
      const uid=authData?.user?.id||authData?.id;
      if(!uid){
        const userObj=await sbGetUser();
        if(!userObj?.id)throw new Error("Login failed — please check your email and password.");
        const r2=await sbFetch(`players?id=eq.${userObj.id}&limit=1`);
        if(!r2?.[0])throw new Error("Profile not found. Please sign up first.");
        onLogin(r2[0]);onNav("app");return;
      }
      const rows=await sbFetch(`players?id=eq.${uid}&limit=1`);
      if(!rows?.[0])throw new Error("Profile not found. Please sign up first.");
      onLogin(rows[0]);onNav("app");
    }catch(e){setErr(e.message);}
    setLoading(false);
  }
  return <div style={{minHeight:"100vh",background:C.bg,padding:"24px 20px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
    <div style={{width:"100%",maxWidth:360}}>
      <Btn v="ghost" sm onClick={()=>onNav("landing")} style={{marginBottom:24}}>← Back</Btn>
      <h1 style={{color:C.white,fontSize:28,fontWeight:900,margin:"0 0 8px",letterSpacing:-1}}>Welcome back</h1>
      <p style={{color:C.ghost,fontSize:13,marginBottom:28}}>Sign in to access your card.</p>
      {err&&<div style={{background:`${C.red}18`,border:`1px solid ${C.red}44`,borderRadius:8,padding:"12px 14px",color:C.red,fontSize:12,marginBottom:16}}>{err}</div>}
      <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com"/>
      <Input label="Password" type="password" value={pw} onChange={setPw} placeholder="Your password"/>
      <Btn full onClick={submit} disabled={loading} style={{marginTop:8}}>{loading?"Signing in...":"Sign In"}</Btn>
      <p style={{textAlign:"center",marginTop:18,color:C.ghost,fontSize:12}}>No account? <span onClick={()=>onNav("signup")} style={{color:C.lime,cursor:"pointer",fontWeight:700}}>Create one</span></p>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// TAB SCREENS
// ═══════════════════════════════════════════════════════════════

// ── HOME TAB ──────────────────────────────────────────────────
function HomeTab({player,onUpdate}){
  const overall=ov(player?.stats);const t=tier(overall,player?.badges||[]);const ts=C.tiers[t];
  const age=calcAge(player?.date_of_birth);
  const[friendCode,setFriendCode]=useState(""),[friendSearch,setFriendSearch]=useState(null),[friends,setFriends]=useState([]),[toast,setToast]=useState("");
  const showToast=(m,ty="ok")=>{setToast({m,ty});setTimeout(()=>setToast(""),2500);};
  async function searchFriend(){
    if(!friendCode.trim())return;
    try{const r=await sbFetch(`players?challenge_code=eq.${friendCode.trim().toUpperCase()}&limit=1`);if(!r?.[0]){showToast("Player not found","err");return;}setFriendSearch(r[0]);}
    catch{showToast("Search failed","err");}
  }
  return <div style={{minHeight:"100vh",background:C.bg,color:C.white,paddingBottom:100}}>
    <Toast msg={toast?.m} type={toast?.ty}/>
    {/* Hero */}
    <div style={{background:`linear-gradient(180deg,#0d180d,${C.bg})`,padding:"20px 18px 0",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",width:250,height:250,borderRadius:"50%",background:`radial-gradient(circle,${ts.g},transparent 70%)`,top:-60,right:-60,pointerEvents:"none"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <div>
          <div style={{fontSize:9,color:C.lime,letterSpacing:4,textTransform:"uppercase",marginBottom:2}}>Street Twice</div>
          <div style={{fontSize:22,fontWeight:900,letterSpacing:-0.5}}>{player?.name}</div>
          <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
            <Pill color={ts.t}>{t.toUpperCase()}</Pill>
            {age&&<AgePill age={age}/>}
            {player?.team_role&&player.team_role!=="player"&&<RolePill role={player.team_role}/>}
          </div>
        </div>
        <div style={{textAlign:"right",marginTop:4}}>
          <div style={{fontSize:36,fontWeight:900,color:ts.t,lineHeight:1,textShadow:`0 0 20px ${ts.b}88`}}>{overall||"—"}</div>
          <div style={{fontSize:9,color:C.ghost,letterSpacing:2,textTransform:"uppercase"}}>Overall</div>
        </div>
      </div>
    </div>

    <div style={{padding:"0 18px",maxWidth:460,margin:"0 auto"}}>
      {/* Card */}
      <div style={{display:"flex",justifyContent:"center",margin:"24px 0",position:"relative"}}>
        <div style={{position:"absolute",width:220,height:220,borderRadius:"50%",background:`radial-gradient(circle,${ts.g},transparent 70%)`,top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none"}}/>
        <Card player={player} size="full"/>
      </div>

      {player?.bio&&<div style={{background:"#0d0d0d",borderRadius:12,padding:14,marginBottom:16,border:`1px solid #1a1a1a`}}><div style={{fontSize:11,color:C.ghost,fontStyle:"italic",lineHeight:1.6}}>"{player.bio}"</div></div>}

      {/* Challenge code */}
      <div style={{background:"linear-gradient(135deg,#0d0d0d,#111)",border:`1px solid ${C.lime}22`,borderRadius:12,padding:"14px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:`inset 0 1px 0 ${C.lime}11`}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <Icon emoji="🔑" color={C.lime} size={28}/>
            <div style={{fontSize:9,color:C.ghost,letterSpacing:2,textTransform:"uppercase"}}>Your Challenge Code</div>
          </div>
          <div style={{fontSize:24,fontWeight:900,color:C.lime,letterSpacing:6,fontFamily:"'Arial Black',sans-serif"}}>{player?.challenge_code||"——"}</div>
        </div>
        <div style={{fontSize:10,color:C.ghost,textAlign:"right"}}>Share with<br/>opponents &<br/>teammates</div>
      </div>

      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
        {[{val:player?.games_played||0,label:"Games",col:C.lime,emoji:"⚽"},{val:player?.motm_votes||0,label:"MOTM",col:C.gold,emoji:"🏅"},{val:(player?.badges||[]).length,label:"Badges",col:C.purple,emoji:"🔥"}].map(s=>(
          <div key={s.label} style={{background:"linear-gradient(135deg,#0d0d0d,#111)",borderRadius:12,padding:14,textAlign:"center",border:`1px solid ${s.col}18`,boxShadow:`inset 0 1px 0 ${s.col}11`}}>
            <div style={{fontSize:10,marginBottom:4}}>{s.emoji}</div>
            <div style={{fontSize:26,fontWeight:900,color:s.col,textShadow:`0 0 12px ${s.col}66`}}>{s.val}</div>
            <div style={{fontSize:9,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div style={{background:"linear-gradient(135deg,#0d0d0d,#111)",borderRadius:12,padding:14,marginBottom:20,border:`1px solid #1a1a1a`}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><Icon emoji="📊" color={C.lime} size={28}/><span style={{fontSize:12,fontWeight:700}}>Card Progress</span></div>
          <span style={{fontSize:13,fontWeight:900,color:C.lime}}>{Object.values(player?.stats||{}).filter(v=>v>0).length}/{Object.keys(STATS_META).length}</span>
        </div>
        <div style={{height:6,background:"#181818",borderRadius:3,overflow:"hidden",marginBottom:6}}>
          <div style={{height:"100%",width:`${(Object.values(player?.stats||{}).filter(v=>v>0).length/Object.keys(STATS_META).length)*100}%`,background:`linear-gradient(90deg,${C.limeD},${C.lime})`,borderRadius:3,transition:"width 1.2s",boxShadow:`0 0 8px ${C.lime}44`}}/>
        </div>
        <div style={{fontSize:10,color:C.ghost}}>Complete all tests to unlock your full card rating</div>
      </div>

      {/* Badges */}
      {(player?.badges||[]).length>0&&<div style={{background:"linear-gradient(135deg,#0d0d0d,#111)",borderRadius:12,padding:14,marginBottom:20,border:`1px solid #1a1a1a`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><Icon emoji="🏅" color={C.gold} size={28}/><span style={{fontSize:12,fontWeight:700}}>Your Badges</span></div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {(player.badges||[]).map(bid=>{const b=BADGES.find(x=>x.id===bid);return b?<div key={bid} style={{background:b.rare?`${C.purple}18`:`${C.lime}10`,border:`1.5px solid ${b.rare?C.purple:C.lime+"44"}`,borderRadius:10,padding:"10px 14px",textAlign:"center",filter:b.rare?`drop-shadow(0 0 10px ${C.purple}66)`:"none",boxShadow:b.rare?`0 0 20px ${C.purple}33`:`0 0 10px ${C.lime}22`}}><div style={{fontSize:24}}>{b.icon}</div><div style={{fontSize:9,color:b.rare?C.purple:C.lime,fontWeight:700,marginTop:4,letterSpacing:1}}>{b.name}</div></div>:null;})}
        </div>
      </div>}

      {/* Friends */}
      <div style={{background:"linear-gradient(135deg,#0d0d0d,#111)",borderRadius:12,padding:14,marginBottom:20,border:`1px solid #1a1a1a`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}><Icon emoji="👥" color={C.blue} size={28}/><span style={{fontSize:12,fontWeight:700}}>Friends</span><Pill color={C.blue}>{friends.length}</Pill></div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <input value={friendCode} onChange={e=>setFriendCode(e.target.value.toUpperCase())} placeholder="Enter challenge code" style={{flex:1,background:"#181818",border:`1.5px solid #222`,borderRadius:8,padding:"10px 12px",color:C.white,fontSize:13,outline:"none",letterSpacing:2,fontWeight:700}}/>
          <Btn sm onClick={searchFriend} v="cyan">Find</Btn>
        </div>
        {friendSearch&&<div style={{background:`${C.lime}0a`,border:`1px solid ${C.lime}22`,borderRadius:10,padding:12,marginBottom:12,display:"flex",alignItems:"center",gap:12}}>
          <Card player={friendSearch} size="mini" glow={false}/>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{friendSearch.name}</div><div style={{fontSize:11,color:C.ghost}}>{friendSearch.position} · OVR {ov(friendSearch.stats)}</div>{calcAge(friendSearch.date_of_birth)&&<div style={{marginTop:4}}><AgePill age={calcAge(friendSearch.date_of_birth)}/></div>}</div>
          <Btn sm onClick={()=>{setFriends(f=>[...f,friendSearch]);setFriendSearch(null);setFriendCode("");showToast("Friend added ✓");}}>Add</Btn>
        </div>}
        {friends.length===0&&!friendSearch&&<div style={{textAlign:"center",padding:"16px 0",color:C.ghost,fontSize:12}}>No friends yet — enter a challenge code to find someone</div>}
        {friends.map((f,i)=><div key={i} style={{background:"#111",borderRadius:10,padding:12,marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
          <Card player={f} size="mini" glow={false}/>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{f.name}</div><div style={{fontSize:10,color:C.ghost}}>{f.position} · OVR {ov(f.stats)}</div></div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {["AGG","IQ","TAC"].map(l=><button key={l} style={{background:`${C.gold}14`,border:`1px solid ${C.gold}33`,borderRadius:5,padding:"4px 8px",fontSize:9,color:C.gold,cursor:"pointer",fontWeight:700,letterSpacing:1}}>{l}</button>)}
          </div>
        </div>)}
      </div>
    </div>
  </div>;
}

// ── DEVELOP TAB ───────────────────────────────────────────────
function DevelopTab({player,onStat}){
  const[view,setView]=useState("menu");
  const[selCat,setSelCat]=useState(null);
  const[selChallenge,setSelChallenge]=useState(null);
  const[linked,setLinked]=useState(null);
  const[linkCode,setLinkCode]=useState("");
  const[phase,setPhase]=useState("setup"); // setup | active | scoring | result
  const[myScore,setMyScore]=useState("");
  const[oppScore,setOppScore]=useState("");
  const[toast,setToast]=useState("");
  const[camMode,setCamMode]=useState("record");
  const age=calcAge(player?.date_of_birth);
  const showToast=(m,t="ok")=>{setToast({m,t});setTimeout(()=>setToast(""),2500);};

  async function findOpponent(){
    if(!linkCode.trim())return;
    try{const r=await sbFetch(`players?challenge_code=eq.${linkCode.trim().toUpperCase()}&limit=1`);if(!r?.[0]){showToast("Code not found","err");return;}setLinked(r[0]);}
    catch{showToast("Search failed","err");}
  }

  function startChallenge(ch){
    setSelChallenge(ch);
    // Map challenge to camera mode
    const autoMap={sprint:"sprint",jump:"jump",pushups:"pushups",agility_drill:"agility"};
    setCamMode(autoMap[ch.id]||"record");
    setPhase("setup");setMyScore("");setOppScore("");
    setView("challenge_detail");
  }

  function submitScores(){
    const my=parseFloat(myScore)||0,opp=parseFloat(oppScore)||0;
    const res=resolveGap(my,opp);
    if(res.score!=null&&selChallenge?.stat){
      onStat(selChallenge.stat,Math.min(99,Math.max(15,Math.round(res.score))));
    }
    showToast(res.status==="accepted"?"Score saved ✓":res.status==="pending"?"Pending review":"Flagged for community");
    setPhase("result");
  }

  function handleCamResult(res){if(res.score!=null){onStat(selChallenge?.stat,res.score);showToast("Score saved ✓");setPhase("result");}else{setPhase("scoring");}}

  if(view==="menu") return <div style={{minHeight:"100vh",background:C.bg,color:C.white,paddingBottom:100}}>
    <Hdr title="Develop" sub="Level Up"/>
    <Toast msg={toast?.m} type={toast?.t}/>
    <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
      {/* Stats overview */}
      <div style={{background:"linear-gradient(135deg,#0d0d0d,#111)",borderRadius:12,padding:16,marginBottom:20,border:`1px solid #1a1a1a`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><Icon emoji="📊" color={C.lime} size={28}/><span style={{fontSize:12,fontWeight:700}}>Your Stats</span></div>
          {age&&<AgePill age={age}/>}
        </div>
        {Object.entries(STATS_META).map(([k,m])=><StatBar key={k} label={m.l} value={player?.stats?.[k]} color={m.color}/>)}
      </div>

      {/* Link opponent */}
      <div style={{background:"linear-gradient(135deg,#0d0d0d,#111)",border:`1px solid ${C.cyan}22`,borderRadius:12,padding:16,marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><Icon emoji="🔗" color={C.cyan} size={28}/><div><div style={{fontSize:12,fontWeight:700}}>Link Your Opponent</div><div style={{fontSize:10,color:C.ghost}}>Enter their challenge code to play together</div></div></div>
        {linked?<div style={{background:`${C.lime}0a`,border:`1px solid ${C.lime}22`,borderRadius:10,padding:12,display:"flex",gap:12,alignItems:"center"}}>
          <Card player={linked} size="sm" glow={false}/>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:C.lime}}>✓ Linked</div>
            <div style={{fontSize:14,fontWeight:900}}>{linked.name}</div>
            <div style={{fontSize:11,color:C.ghost}}>{linked.position} · OVR {ov(linked.stats)}</div>
            {calcAge(linked.date_of_birth)&&<div style={{marginTop:4,display:"flex",gap:6,alignItems:"center"}}><AgePill age={calcAge(linked.date_of_birth)}/>{age&&Math.abs(age-calcAge(linked.date_of_birth))>=3&&<span style={{fontSize:10,color:C.gold,fontWeight:700}}>⚡ Age gap bonus</span>}</div>}
          </div>
          <Btn sm v="ghost" onClick={()=>setLinked(null)}>✕</Btn>
        </div>:<div style={{display:"flex",gap:8}}>
          <input value={linkCode} onChange={e=>setLinkCode(e.target.value.toUpperCase())} placeholder="e.g. AB12XY" style={{flex:1,background:"#181818",border:"1.5px solid #222",borderRadius:8,padding:"11px 14px",color:C.white,fontSize:16,fontWeight:800,outline:"none",letterSpacing:4}}/>
          <Btn onClick={findOpponent} v="cyan">Link</Btn>
        </div>}
      </div>

      {/* Challenge categories */}
      <div style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Choose a Challenge</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {CHALLENGE_CATEGORIES.map(cat=><button key={cat.id} onClick={()=>{setSelCat(cat);setView("category");}}
          style={{background:`linear-gradient(135deg,${cat.color}14,${cat.color}06)`,border:`1.5px solid ${cat.color}33`,borderRadius:14,padding:16,textAlign:"left",cursor:"pointer",color:C.white,display:"flex",alignItems:"center",gap:14,transition:"border-color 0.2s,transform 0.15s",boxShadow:`0 4px 16px ${cat.color}18`}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=cat.color+"66";e.currentTarget.style.transform="translateY(-2px)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=cat.color+"33";e.currentTarget.style.transform="translateY(0)";}}>
          <Icon emoji={cat.icon} color={cat.color} size={48}/>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:800,color:cat.color,marginBottom:3}}>{cat.label}</div>
            <div style={{fontSize:11,color:C.ghost,lineHeight:1.5}}>{cat.desc}</div>
            <div style={{marginTop:6,fontSize:10,color:cat.color,fontWeight:700}}>{cat.challenges.length} challenges →</div>
          </div>
        </button>)}
      </div>
    </div>
  </div>;

  if(view==="category"&&selCat) return <div style={{minHeight:"100vh",background:C.bg,color:C.white,paddingBottom:100}}>
    <Hdr title={selCat.label} sub={`${selCat.challenges.length} Challenges`} back={()=>setView("menu")}/>
    <Toast msg={toast?.m} type={toast?.t}/>
    <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
      {/* Category hero */}
      <div style={{background:`linear-gradient(135deg,${selCat.color}18,${selCat.color}08)`,border:`1px solid ${selCat.color}33`,borderRadius:14,padding:16,marginBottom:20,display:"flex",gap:14,alignItems:"center"}}>
        <Icon emoji={selCat.icon} color={selCat.color} size={56} pulse/>
        <div><div style={{fontSize:16,fontWeight:800,color:selCat.color}}>{selCat.label}</div><div style={{fontSize:12,color:C.ghost,marginTop:3,lineHeight:1.5}}>{selCat.desc}</div></div>
      </div>

      {selCat.id!=="solo"&&!linked&&<div style={{background:`${C.gold}0f`,border:`1px solid ${C.gold}22`,borderRadius:10,padding:12,marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:3}}>💡 Link an opponent first</div>
        <div style={{fontSize:11,color:C.ghost}}>Go back to Develop and enter your opponent's challenge code to play together.</div>
      </div>}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {selCat.challenges.map(ch=><button key={ch.id} onClick={()=>startChallenge({...ch,categoryColor:selCat.color})}
          style={{background:"linear-gradient(135deg,#0d0d0d,#111)",border:`1px solid ${selCat.color}22`,borderRadius:12,padding:14,textAlign:"left",cursor:"pointer",color:C.white,display:"flex",alignItems:"center",gap:14,transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=selCat.color+"55";e.currentTarget.style.transform="translateX(4px)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=selCat.color+"22";e.currentTarget.style.transform="translateX(0)";}}>
          <Icon emoji={ch.icon} color={selCat.color} size={44}/>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:3}}>{ch.name}</div>
            <div style={{fontSize:11,color:C.ghost,lineHeight:1.5,marginBottom:5}}>{ch.desc}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {ch.players===1&&<span style={{background:`${C.lime}14`,border:`1px solid ${C.lime}33`,borderRadius:4,padding:"2px 7px",fontSize:9,color:C.lime,fontWeight:700}}>SOLO</span>}
              {ch.players===2&&<span style={{background:`${C.red}14`,border:`1px solid ${C.red}33`,borderRadius:4,padding:"2px 7px",fontSize:9,color:C.red,fontWeight:700}}>1v1</span>}
              {ch.players>=3&&<span style={{background:`${C.purple}14`,border:`1px solid ${C.purple}33`,borderRadius:4,padding:"2px 7px",fontSize:9,color:C.purple,fontWeight:700}}>{ch.players}+ PLAYERS</span>}
              {ch.stat&&<span style={{background:`${STATS_META[ch.stat]?.color||C.blue}14`,border:`1px solid ${STATS_META[ch.stat]?.color||C.blue}33`,borderRadius:4,padding:"2px 7px",fontSize:9,color:STATS_META[ch.stat]?.color||C.blue,fontWeight:700}}>+{STATS_META[ch.stat]?.l}</span>}
              {ch.timer&&<span style={{background:"#181818",border:"1px solid #2a2a2a",borderRadius:4,padding:"2px 7px",fontSize:9,color:C.ghost}}>⏱ {ch.timer>=60?Math.floor(ch.timer/60)+"min":ch.timer+"s"}</span>}
            </div>
          </div>
          <div style={{color:selCat.color,fontSize:16}}>→</div>
        </button>)}
      </div>
    </div>
  </div>;

  if(view==="challenge_detail"&&selChallenge) return <div style={{minHeight:"100vh",background:C.bg,color:C.white,paddingBottom:100}}>
    <Hdr title={selChallenge.name} sub={selChallenge.categoryLabel||"Challenge"} back={()=>{if(phase==="setup")setView("category");else setPhase("setup");}}/>
    <Toast msg={toast?.m} type={toast?.t}/>
    <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>

      {phase==="setup"&&<>
        {/* Challenge hero */}
        <div style={{background:`linear-gradient(135deg,${selChallenge.categoryColor||C.lime}18,${selChallenge.categoryColor||C.lime}06)`,border:`1px solid ${selChallenge.categoryColor||C.lime}33`,borderRadius:14,padding:20,marginBottom:20,textAlign:"center"}}>
          <Icon emoji={selChallenge.icon} color={selChallenge.categoryColor||C.lime} size={64} glow pulse style={{margin:"0 auto 14px"}}/>
          <div style={{fontSize:20,fontWeight:900,marginBottom:8}}>{selChallenge.name}</div>
          <p style={{color:C.ghost,fontSize:13,lineHeight:1.7,marginBottom:0}}>{selChallenge.desc}</p>
        </div>

        {/* Scoring info */}
        {selChallenge.scoring&&<div style={{background:`${C.gold}0a`,border:`1px solid ${C.gold}22`,borderRadius:10,padding:14,marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><Icon emoji="⭐" color={C.gold} size={24}/><div style={{fontSize:11,fontWeight:700,color:C.gold}}>How Scoring Works</div></div>
          <div style={{fontSize:11,color:C.ghost,lineHeight:1.6}}>{selChallenge.scoring}</div>
        </div>}

        {/* Badge available */}
        {selChallenge.badge&&(()=>{const b=BADGES.find(x=>x.id===selChallenge.badge);return b?<div style={{background:`${C.purple}0a`,border:`1px solid ${C.purple}22`,borderRadius:10,padding:14,marginBottom:16,display:"flex",gap:12,alignItems:"center"}}>
          <Icon emoji={b.icon} color={C.purple} size={36}/>
          <div><div style={{fontSize:10,color:C.purple,letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>Badge Available</div><div style={{fontSize:13,fontWeight:700}}>{b.name}</div><div style={{fontSize:11,color:C.ghost}}>{b.desc}</div></div>
        </div>:null;})()}

        {/* Setup steps */}
        {selChallenge.setup?.length>0&&<div style={{background:"#0d0d0d",borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><Icon emoji="📋" color={C.blue} size={28}/><div style={{fontSize:11,fontWeight:700}}>Setup</div></div>
          {selChallenge.setup.map((s,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:10}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:`${C.blue}18`,border:`1px solid ${C.blue}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.blue,flexShrink:0}}>{i+1}</div>
            <p style={{margin:0,color:C.ghost,fontSize:12,lineHeight:1.6}}>{s}</p>
          </div>)}
        </div>}

        {/* Linked opponent info */}
        {linked&&selChallenge.players>1&&<div style={{background:`${C.cyan}0a`,border:`1px solid ${C.cyan}22`,borderRadius:10,padding:12,marginBottom:16,display:"flex",gap:12,alignItems:"center"}}>
          <Card player={linked} size="sm" glow={false}/>
          <div><div style={{fontSize:12,fontWeight:700,color:C.cyan}}>Playing against</div><div style={{fontSize:15,fontWeight:900}}>{linked.name}</div>{calcAge(linked.date_of_birth)&&<AgePill age={calcAge(linked.date_of_birth)}/>}</div>
        </div>}

        {/* Camera or start */}
        {selChallenge.players===1&&["sprint","jump","pushups"].includes(selChallenge.id)?
          <SmartCamera mode={camMode} onResult={handleCamResult} instructions={selChallenge.setup||[]} timerSecs={selChallenge.timer||60} playerAge={age||22}/>:
          selChallenge.id==="agility_drill"?
          <div style={{background:"#0d0d0d",borderRadius:14,padding:4,border:`1px solid ${C.gold}22`}}><AgilityDrill playerAge={age||22} onScore={scores=>{const avg=scores.reduce((a,b)=>a+b,0)/scores.length;const s=avg<500?92:avg<700?82:avg<900?70:avg<1200?55:38;onStat("agility",s);showToast("Score saved ✓");setPhase("result");}}/></div>:
          <Btn full onClick={()=>setPhase("active")} style={{background:`linear-gradient(135deg,${selChallenge.categoryColor||C.lime},${selChallenge.categoryColor||C.lime}99)`,color:"#000",border:"none",boxShadow:`0 4px 20px ${selChallenge.categoryColor||C.lime}44`}}>
            📷 Start Challenge
          </Btn>}
      </>}

      {phase==="active"&&<>
        <div style={{background:`${selChallenge.categoryColor||C.lime}0f`,border:`1px solid ${selChallenge.categoryColor||C.lime}33`,borderRadius:12,padding:14,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:selChallenge.categoryColor||C.lime,marginBottom:4}}>{selChallenge.icon} {selChallenge.name}</div>
          <div style={{fontSize:13,color:C.white}}>{selChallenge.desc}</div>
        </div>
        <SmartCamera mode="record" timerSecs={selChallenge.timer||120} playerAge={age||22} onResult={()=>setPhase("scoring")} instructions={selChallenge.setup||[]}/>
        <div style={{marginTop:14}}>
          <div style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Nuance Buttons</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["Contested","Out of play","Foul","Great skill"].map(b=><button key={b} style={{background:"#181818",border:"1px solid #2a2a2a",borderRadius:6,padding:"7px 12px",fontSize:11,color:C.ghost,cursor:"pointer"}}>{b}</button>)}</div>
        </div>
      </>}

      {phase==="scoring"&&<>
        <h3 style={{fontSize:18,fontWeight:900,marginBottom:16}}>Enter Scores</h3>
        <p style={{color:C.ghost,fontSize:12,lineHeight:1.7,marginBottom:18}}>{selChallenge.players>1?"Both players enter their score or count independently. Discrepancy is handled automatically.":"Enter your result based on what you achieved."}</p>
        <div style={{display:selChallenge.players>1?"grid":"block",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {[selChallenge.players>1?["Your Score",myScore,setMyScore]:["Your Score",myScore,setMyScore],selChallenge.players>1?["Opponent's Score",oppScore,setOppScore]:null].filter(Boolean).map(([l,v,setter])=><div key={l}>
            <label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>{l}</label>
            <input type="number" min="0" max="99" value={v} onChange={e=>setter(e.target.value)} style={{width:"100%",background:"#111",border:"1.5px solid #222",borderRadius:8,padding:"14px 10px",color:C.white,fontSize:28,fontWeight:900,outline:"none",boxSizing:"border-box",textAlign:"center"}}/>
          </div>)}
        </div>
        {selChallenge.players>1&&myScore&&oppScore&&(()=>{const res=resolveGap(parseFloat(myScore),parseFloat(oppScore));const col=res.status==="accepted"?C.lime:res.status==="pending"?C.gold:C.red;return <div style={{background:`${col}0f`,border:`1px solid ${col}33`,borderRadius:10,padding:12,marginBottom:14}}><div style={{fontSize:12,fontWeight:700,color:col}}>{res.status==="accepted"?"✅ Auto-accepted":res.status==="pending"?"🟡 Pending":"🔴 Flagged"}</div>{res.score!=null&&<div style={{fontSize:11,color:C.ghost,marginTop:3}}>Agreed score: {res.score}</div>}</div>})()}
        <Btn full onClick={submitScores} disabled={!myScore}>Submit Scores</Btn>
      </>}

      {phase==="result"&&<div style={{textAlign:"center",padding:20}}>
        <div style={{fontSize:64,marginBottom:16,filter:`drop-shadow(0 0 20px ${selChallenge.categoryColor||C.lime}88)`}}>✅</div>
        <h3 style={{fontSize:22,fontWeight:900,margin:"0 0 8px"}}>Challenge Complete!</h3>
        <p style={{color:C.ghost,fontSize:13,lineHeight:1.7,marginBottom:28}}>Results recorded. Keep challenging different players to build a more accurate rating.</p>
        <div style={{display:"flex",gap:10}}>
          <Btn v="dark" full onClick={()=>{setView("category");setPhase("setup");}}>← More Challenges</Btn>
          <Btn full onClick={()=>setView("menu")}>Develop</Btn>
        </div>
      </div>}
    </div>
  </div>;

  return null;
}

// ── CLUB TAB ──────────────────────────────────────────────────
function ClubTab({player,onUpdate}){
  const[tab,setTab]=useState("squad");
  const[squad,setSquad]=useState([]);
  const[requests,setRequests]=useState([]);
  const[teamName,setTeamName]=useState("");
  const[joinCode,setJoinCode]=useState("");
  const[createName,setCreateName]=useState("");
  const[toast,setToast]=useState("");
  const[votes,setVotes]=useState({});
  const[ratingTarget,setRatingTarget]=useState(null);
  const[ratings,setRatings]=useState({effort:0,quality:0,communication:0});
  const[matchForm,setMatchForm]=useState({title:"",date:"",time:"",location:"",format:"5v5",opponentCode:""});
  const[loading,setLoading]=useState(false);
  const showToast=(m,t="ok")=>{setToast({m,t});setTimeout(()=>setToast(""),2500);};
  const isCapOrVice=player?.team_role==="captain"||player?.team_role==="vice";
  const mf=(k,v)=>setMatchForm(p=>({...p,[k]:v}));

  // Load real squad from Supabase
  useEffect(()=>{
    if(player?.team_code){
      sbFetch(`players?team_code=eq.${player.team_code}&id=neq.${player.id}&select=id,name,position,stats,badges,date_of_birth,team_role,photo_url`)
        .then(r=>setSquad(r||[]))
        .catch(()=>{});
      // Load join requests (players who have applied but not been accepted)
      if(isCapOrVice){
        sbFetch(`players?pending_team_code=eq.${player.team_code}&select=id,name,position,stats,date_of_birth,challenge_code`)
          .then(r=>setRequests(r||[]))
          .catch(()=>{});
      }
    }
  },[player?.team_code]);

  async function createTeam(){
    if(!createName.trim()){showToast("Enter a team name","err");return;}
    const code=randCode();
    setLoading(true);
    try{
      await sbFetch(`players?id=eq.${player.id}`,{method:"PATCH",body:JSON.stringify({team_code:code,team_role:"captain",team_name:createName.trim()}),prefer:"return=minimal"});
      onUpdate({...player,team_code:code,team_role:"captain",team_name:createName.trim()});
      showToast("Team created! Share your code: "+code);setCreateName("");
    }catch(e){showToast(e.message,"err");}
    setLoading(false);
  }

  async function joinTeam(){
    if(!joinCode.trim()){showToast("Enter a team code","err");return;}
    // Find the captain with this team code
    setLoading(true);
    try{
      const cap=await sbFetch(`players?team_code=eq.${joinCode.trim().toUpperCase()}&team_role=eq.captain&limit=1`);
      if(!cap?.[0]){showToast("Team not found","err");setLoading(false);return;}
      // Mark this player as pending
      await sbFetch(`players?id=eq.${player.id}`,{method:"PATCH",body:JSON.stringify({pending_team_code:joinCode.trim().toUpperCase()}),prefer:"return=minimal"});
      showToast("Request sent! Waiting for captain to approve.");setJoinCode("");
    }catch(e){showToast(e.message,"err");}
    setLoading(false);
  }

  async function acceptRequest(p){
    try{
      await sbFetch(`players?id=eq.${p.id}`,{method:"PATCH",body:JSON.stringify({team_code:player.team_code,pending_team_code:null,team_role:"player",team_name:player.team_name}),prefer:"return=minimal"});
      setRequests(r=>r.filter(x=>x.id!==p.id));
      setSquad(s=>[...s,{...p,team_role:"player"}]);
      showToast(p.name+" accepted ✓");
    }catch(e){showToast(e.message,"err");}
  }

  async function declineRequest(p){
    try{
      await sbFetch(`players?id=eq.${p.id}`,{method:"PATCH",body:JSON.stringify({pending_team_code:null}),prefer:"return=minimal"});
      setRequests(r=>r.filter(x=>x.id!==p.id));
      showToast(p.name+" declined");
    }catch(e){showToast(e.message,"err");}
  }

  const teamCode=player?.team_code;
  const teamDisplayName=player?.team_name||"My Team";

  return <div style={{minHeight:"100vh",background:C.bg,color:C.white,paddingBottom:100}}>
    <Hdr title={teamCode?teamDisplayName:"Club"} sub={teamCode?"Your Squad":"Join or Create a Team"}
      right={teamCode&&<div style={{background:`${C.lime}18`,border:`1px solid ${C.lime}33`,borderRadius:8,padding:"6px 12px"}}><div style={{fontSize:9,color:C.ghost,letterSpacing:1}}>TEAM CODE</div><div style={{fontSize:14,fontWeight:900,color:C.lime,letterSpacing:3}}>{teamCode}</div></div>}/>
    <Toast msg={toast?.m} type={toast?.t}/>

    {!teamCode?<div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
      {/* Join team */}
      <div style={{background:"linear-gradient(135deg,#0d0d0d,#111)",border:`1px solid ${C.cyan}22`,borderRadius:14,padding:16,marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><Icon emoji="🚪" color={C.cyan} size={40}/><div><div style={{fontSize:14,fontWeight:700}}>Join a Team</div><div style={{fontSize:11,color:C.ghost}}>Enter the team code your captain shared</div></div></div>
        <div style={{display:"flex",gap:8}}>
          <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="Team code e.g. AB12XY" style={{flex:1,background:"#181818",border:"1.5px solid #222",borderRadius:8,padding:"12px 14px",color:C.white,fontSize:16,fontWeight:800,outline:"none",letterSpacing:3}}/>
          <Btn onClick={joinTeam} v="cyan" disabled={loading}>Join</Btn>
        </div>
        <div style={{fontSize:10,color:C.ghost,marginTop:8}}>The captain will see your request and approve it.</div>
      </div>

      {/* Create team */}
      <div style={{background:"linear-gradient(135deg,#0d0d0d,#111)",border:`1px solid ${C.gold}22`,borderRadius:14,padding:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><Icon emoji="👑" color={C.gold} size={40}/><div><div style={{fontSize:14,fontWeight:700}}>Create a Team</div><div style={{fontSize:11,color:C.ghost}}>Become captain and share your team code</div></div></div>
        <Input label="Team Name" value={createName} onChange={setCreateName} placeholder="e.g. Street Kings FC"/>
        <Btn full onClick={createTeam} v="gold" disabled={loading}>{loading?"Creating...":"Create & Become Captain"}</Btn>
        <div style={{fontSize:10,color:C.ghost,marginTop:8}}>Your team code will be generated automatically. Share it with your squad.</div>
      </div>
    </div>:

    <div style={{display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",borderBottom:`1px solid #111`,overflowX:"auto"}}>
        {["squad","matches","rate","motm"].map(t=><button key={t} onClick={()=>setTab(t)} style={{flex:1,minWidth:70,padding:"12px 8px",background:"none",border:"none",cursor:"pointer",color:tab===t?C.lime:C.ghost,fontWeight:700,fontSize:11,borderBottom:`2px solid ${tab===t?C.lime:"transparent"}`,textTransform:"uppercase",letterSpacing:0.8,whiteSpace:"nowrap"}}>
          {t==="squad"?"Squad":t==="matches"?"Matches":t==="rate"?"Rate":"MOTM"}
        </button>)}
      </div>

      <div style={{padding:18,maxWidth:460,margin:"0 auto",width:"100%"}}>
        {tab==="squad"&&<>
          {/* You */}
          <div style={{background:"linear-gradient(135deg,#0d0d0d,#111)",border:`1px solid ${C.lime}22`,borderRadius:12,padding:14,marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:"#181818",border:`2px solid ${C.lime}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,overflow:"hidden",flexShrink:0}}>
              {player?.photo_url?<img src={player.photo_url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"👤"}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700}}>{player?.name} <span style={{fontSize:11,color:C.lime}}>(You)</span></div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:3}}>
                <span style={{fontSize:10,color:C.ghost}}>{player?.position}</span>
                {calcAge(player?.date_of_birth)&&<AgePill age={calcAge(player?.date_of_birth)}/>}
                <RolePill role={player?.team_role}/>
              </div>
            </div>
            <div style={{fontSize:26,fontWeight:900,color:sc(ov(player?.stats)),textShadow:`0 0 12px ${sc(ov(player?.stats))}66`}}>{ov(player?.stats)||"—"}</div>
          </div>

          {/* Real squad */}
          {squad.length===0&&<div style={{background:"#0d0d0d",borderRadius:10,padding:20,textAlign:"center",color:C.ghost,fontSize:12,marginBottom:10}}>No teammates yet — share your team code <strong style={{color:C.lime}}>{teamCode}</strong> with your squad so they can join.</div>}
          {squad.map((p,i)=>{const age2=calcAge(p.date_of_birth);return <div key={p.id||i} style={{background:"linear-gradient(135deg,#0d0d0d,#111)",borderRadius:12,padding:14,marginBottom:8,display:"flex",alignItems:"center",gap:12,border:`1px solid #1a1a1a`}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:"#181818",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,border:`1px solid #2a2a2a`,overflow:"hidden",flexShrink:0}}>
              {p.photo_url?<img src={p.photo_url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"👤"}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700}}>{p.name}</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:3}}>
                <span style={{fontSize:10,color:C.ghost}}>{p.position}</span>
                {age2&&<AgePill age={age2}/>}
                <RolePill role={p.team_role}/>
              </div>
            </div>
            <div style={{fontSize:26,fontWeight:900,color:sc(ov(p.stats)),textShadow:`0 0 12px ${sc(ov(p.stats))}66`}}>{ov(p.stats)||"—"}</div>
          </div>;})}

          {/* Join requests — captain only */}
          {isCapOrVice&&requests.length>0&&<div style={{background:`${C.red}0a`,border:`1px solid ${C.red}22`,borderRadius:12,padding:14,marginTop:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><Icon emoji="📥" color={C.red} size={28}/><div style={{fontSize:12,fontWeight:700,color:C.red}}>Join Requests ({requests.length})</div></div>
            {requests.map((r,i)=><div key={r.id||i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,background:"#111",borderRadius:8,padding:10}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:"#181818",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>👤</div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{r.name}</div><div style={{fontSize:10,color:C.ghost}}>{r.position}{calcAge(r.date_of_birth)?` · ${AGE_LABELS[ageGroup(calcAge(r.date_of_birth))]}`:""}</div></div>
              <Btn sm onClick={()=>acceptRequest(r)}>✓ Accept</Btn>
              <Btn sm v="red" onClick={()=>declineRequest(r)}>✕</Btn>
            </div>)}
          </div>}

          {!isCapOrVice&&<div style={{marginTop:10,background:`${C.blue}0a`,border:`1px solid ${C.blue}22`,borderRadius:10,padding:12}}>
            <div style={{fontSize:11,color:C.blue,fontWeight:700}}>Team Code: <span style={{color:C.lime,letterSpacing:2}}>{teamCode}</span></div>
            <div style={{fontSize:10,color:C.ghost,marginTop:3}}>Share this with friends so they can join your team</div>
          </div>}
        </>}

        {tab==="matches"&&<>
          {!isCapOrVice&&<div style={{background:`${C.gold}0a`,border:`1px solid ${C.gold}22`,borderRadius:12,padding:14,marginBottom:16,display:"flex",gap:10,alignItems:"flex-start"}}>
            <Icon emoji="👑" color={C.gold} size={36}/>
            <div><div style={{fontSize:12,fontWeight:700,color:C.gold}}>Captain / Vice-Captain Only</div><p style={{color:C.ghost,fontSize:11,margin:"4px 0 0",lineHeight:1.6}}>Only captains and vice-captains can arrange matches. Speak to your captain.</p></div>
          </div>}

          {isCapOrVice&&<div style={{background:"linear-gradient(135deg,#0d0d0d,#111)",borderRadius:12,padding:16,marginBottom:16,border:`1px solid ${C.lime}18`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}><Icon emoji="📅" color={C.lime} size={32}/><div style={{fontSize:13,fontWeight:700}}>Arrange a Match</div></div>
            <Input label="Match Title" value={matchForm.title} onChange={v=>mf("title",v)} placeholder="e.g. Street Kings vs Brick FC"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Input label="Date" type="date" value={matchForm.date} onChange={v=>mf("date",v)}/>
              <Input label="Time" type="time" value={matchForm.time} onChange={v=>mf("time",v)}/>
            </div>
            <Input label="Location" value={matchForm.location} onChange={v=>mf("location",v)} placeholder="e.g. Hackney Astro"/>
            <Input label="Opponent Team Code" value={matchForm.opponentCode} onChange={v=>mf("opponentCode",v)} placeholder="Their team code"/>
            <div style={{marginBottom:14}}><label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>Format</label><div style={{display:"flex",gap:8}}>{["5v5","7v7","11v11"].map(f=><button key={f} onClick={()=>mf("format",f)} style={{flex:1,padding:10,borderRadius:8,border:`1.5px solid ${matchForm.format===f?C.lime:"#222"}`,background:matchForm.format===f?`${C.lime}14`:"transparent",color:matchForm.format===f?C.lime:C.ghost,cursor:"pointer",fontSize:13,fontWeight:700}}>{f}</button>)}</div></div>
            <Btn full onClick={()=>showToast("Match request sent! ✓")}>Send Match Request →</Btn>
          </div>}

          {/* Recent match example */}
          <div style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Recent</div>
          <div style={{background:"linear-gradient(135deg,#0d0d0d,#111)",borderRadius:14,padding:16,border:`1px solid #1a1a1a`}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",marginBottom:12}}>
              <div style={{textAlign:"center"}}><div style={{fontSize:12,fontWeight:700,marginBottom:4}}>{teamDisplayName}</div><div style={{fontSize:38,fontWeight:900,color:C.lime,textShadow:`0 0 16px ${C.lime}66`}}>3</div></div>
              <div style={{fontSize:14,fontWeight:900,color:C.ghost}}>—</div>
              <div style={{textAlign:"center"}}><div style={{fontSize:12,fontWeight:700,marginBottom:4}}>Eastside XI</div><div style={{fontSize:38,fontWeight:900,color:C.ghost}}>1</div></div>
            </div>
            <div style={{fontSize:11,color:C.ghost,marginBottom:12,textAlign:"center"}}>📍 Victoria Park · 28 Jun</div>
            {isCapOrVice&&<div style={{background:`${C.blue}0a`,border:`1px solid ${C.blue}22`,borderRadius:8,padding:10,marginBottom:10}}>
              <div style={{fontSize:10,color:C.blue,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Log Stats</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["Goals ⚽","Assists 🎯","Clean Sheet 🧤","Yellow 🟡"].map(s=><button key={s} style={{background:`${C.blue}14`,border:`1px solid ${C.blue}33`,borderRadius:6,padding:"7px 12px",fontSize:11,color:C.blue,cursor:"pointer",fontWeight:700}}>{s}</button>)}</div>
            </div>}
            <Btn full sm v="gold" onClick={()=>setTab("rate")}>🌟 Rate Teammates</Btn>
          </div>
        </>}

        {tab==="rate"&&<>
          <div style={{background:`${C.gold}0a`,border:`1px solid ${C.gold}22`,borderRadius:12,padding:14,marginBottom:16,display:"flex",gap:10,alignItems:"flex-start"}}>
            <Icon emoji="⭐" color={C.gold} size={36}/>
            <div><div style={{fontSize:12,fontWeight:700,color:C.gold}}>Post-Game Ratings</div><p style={{color:C.ghost,fontSize:11,margin:"4px 0 0",lineHeight:1.6}}>Rate teammates on Effort, Quality and Communication out of 10. Outlier votes excluded automatically.</p></div>
          </div>
          {ratingTarget?<div>
            <div style={{background:"linear-gradient(135deg,#0d0d0d,#111)",borderRadius:12,padding:16,marginBottom:14,display:"flex",gap:12,alignItems:"center",border:`1px solid #1a1a1a`}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:"#181818",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>👤</div>
              <div><div style={{fontSize:16,fontWeight:700}}>{ratingTarget.name}</div><div style={{fontSize:11,color:C.ghost}}>{ratingTarget.position}</div></div>
            </div>
            {[["Effort","💪","How hard did they work?"],["Quality","⭐","How well did they play?"],["Communication","📢","Did they talk and organise?"]].map(([label,icon,desc])=><div key={label} style={{background:"linear-gradient(135deg,#0d0d0d,#111)",borderRadius:10,padding:14,marginBottom:10,border:`1px solid #1a1a1a`}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}><Icon emoji={icon} color={C.gold} size={28}/><div><div style={{fontSize:13,fontWeight:700}}>{label}</div><div style={{fontSize:10,color:C.ghost}}>{desc}</div></div></div>
              <div style={{display:"flex",gap:4}}>{[1,2,3,4,5,6,7,8,9,10].map(n=><button key={n} onClick={()=>setRatings(r=>({...r,[label.toLowerCase()]:n}))} style={{flex:1,padding:"8px 0",borderRadius:6,border:`1.5px solid ${ratings[label.toLowerCase()]>=n?C.gold:"#222"}`,background:ratings[label.toLowerCase()]>=n?`${C.gold}18`:"#111",color:ratings[label.toLowerCase()]>=n?C.gold:C.ghost,cursor:"pointer",fontSize:11,fontWeight:700,transition:"all 0.1s"}}>{n}</button>)}</div>
            </div>)}
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <Btn v="ghost" full onClick={()=>setRatingTarget(null)}>← Back</Btn>
              <Btn v="gold" full onClick={()=>{showToast(`${ratingTarget.name} rated ✓`);setRatingTarget(null);setRatings({effort:0,quality:0,communication:0});}}>Submit Rating</Btn>
            </div>
          </div>:<div>
            <div style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Rate from last match</div>
            {squad.length===0?<div style={{textAlign:"center",padding:"20px 0",color:C.ghost,fontSize:12}}>No teammates to rate — your squad will appear here once they join.</div>:
            squad.map((p,i)=><div key={p.id||i} style={{background:"linear-gradient(135deg,#0d0d0d,#111)",borderRadius:12,padding:14,marginBottom:8,display:"flex",alignItems:"center",gap:12,border:`1px solid #1a1a1a`}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:"#181818",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👤</div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{p.name}</div><div style={{fontSize:10,color:C.ghost}}>{p.position}</div></div>
              <Btn sm v="gold" onClick={()=>setRatingTarget(p)}>Rate</Btn>
            </div>)}
          </div>}
        </>}

        {tab==="motm"&&<>
          <div style={{background:`${C.gold}0a`,border:`1px solid ${C.gold}22`,borderRadius:12,padding:14,marginBottom:16,display:"flex",gap:10}}>
            <Icon emoji="🏅" color={C.gold} size={36}/>
            <div><div style={{fontSize:12,fontWeight:700,color:C.gold}}>MOTM Rules</div><p style={{color:C.ghost,fontSize:11,margin:"4px 0 0",lineHeight:1.6}}>All players who played vote. Winner gets +2 to their lowest stat. Outlier votes excluded automatically.</p></div>
          </div>
          <div style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Last Match</div>
          {squad.length===0?<div style={{textAlign:"center",padding:"20px 0",color:C.ghost,fontSize:12}}>No teammates yet — vote buttons will appear here once your squad joins.</div>:
          [...squad,{id:"you",name:player?.name||"You",position:player?.position||"ST",isYou:true}].map((p,i)=><div key={p.id||i} style={{background:votes[i]?`${C.lime}0a`:"linear-gradient(135deg,#0d0d0d,#111)",border:`1px solid ${votes[i]?C.lime+"33":"#1a1a1a"}`,borderRadius:12,padding:14,marginBottom:8,display:"flex",alignItems:"center",gap:12,transition:"all 0.2s"}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:votes[i]?`${C.lime}22`:"#181818",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,border:`1px solid ${votes[i]?C.lime+"44":"#2a2a2a"}`,transition:"all 0.2s"}}>👤</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{p.name}{p.isYou?" (You)":""}</div><div style={{fontSize:10,color:C.ghost}}>{p.position}</div></div>
            <button onClick={()=>setVotes({[i]:true})} style={{background:votes[i]?`${C.lime}22`:"#181818",border:`1.5px solid ${votes[i]?C.lime:"#333"}`,color:votes[i]?C.lime:C.ghost,borderRadius:8,padding:"9px 16px",cursor:"pointer",fontSize:12,fontWeight:800,transition:"all 0.2s",boxShadow:votes[i]?`0 0 12px ${C.lime}44`:"none"}}>
              {votes[i]?"✓ Voted":"Vote"}
            </button>
          </div>)}
        </>}
      </div>
    </div>}
  </div>;
}

// ── COMPETE TAB ───────────────────────────────────────────────
function CompeteTab({player}){
  const[view,setView]=useState("menu");
  const[lTab,setLTab]=useState("table");
  const[filter,setFilter]=useState("all");
  const age=calcAge(player?.date_of_birth);const group=ageGroup(age);
  const[lbData,setLbData]=useState(null);

  useEffect(()=>{
    if(view==="leaderboard"){
      sbFetch("players?select=name,position,stats,badges,motm_votes,date_of_birth&order=motm_votes.desc&limit=30")
        .then(r=>{if(r?.length>0)setLbData(r);})
        .catch(()=>{});
    }
  },[view]);

  const table=[{team:"Street Kings FC",p:6,w:4,d:1,l:1,gd:8,pts:13,you:true},{team:"Brick FC",p:6,w:4,d:0,l:2,gd:5,pts:12},{team:"Eastside XI",p:6,w:2,d:2,l:2,gd:-1,pts:8},{team:"Northside",p:6,w:1,d:1,l:4,gd:-12,pts:4}];
  const fixtures=[{home:"Street Kings FC",away:"Brick FC",date:"05 Jul",status:"upcoming"},{home:"Street Kings FC",away:"Eastside XI",date:"28 Jun",homeScore:3,awayScore:1,status:"done"}];
  const BENCH={pace:{street:45,semi:62,mbappe:97,neymar:91},shooting:{street:38,semi:55,mbappe:89,neymar:87},passing:{street:42,semi:60,mbappe:80,neymar:86},dribbling:{street:40,semi:58,mbappe:92,neymar:95},defending:{street:35,semi:52,mbappe:36,neymar:27},physical:{street:44,semi:61,mbappe:77,neymar:68},jumping:{street:40,semi:58,mbappe:78,neymar:61},agility:{street:43,semi:60,mbappe:91,neymar:93}};

  const fallbackRows=[
    {name:"Jaden S.",position:"ST",stats:{pace:84,shooting:87,passing:74,dribbling:82,defending:38,physical:76,jumping:72,agility:85},badges:["poacher","explosive"],motm_votes:8,date_of_birth:"1999-03-15"},
    {name:"Marcus T.",position:"CM",stats:{pace:72,shooting:65,passing:80,dribbling:76,defending:60,physical:74,jumping:66,agility:78},badges:["tested"],motm_votes:5,date_of_birth:"2001-07-22"},
    {name:player?.name||"You",position:player?.position||"ST",stats:player?.stats||{},badges:player?.badges||[],motm_votes:player?.motm_votes||0,date_of_birth:player?.date_of_birth,you:true},
    {name:"Olu F.",position:"CB",stats:{pace:61,shooting:44,passing:62,dribbling:60,defending:79,physical:77,jumping:74,agility:65},badges:["stone_wall"],motm_votes:2,date_of_birth:"1998-11-04"},
    {name:"Kwame D.",position:"ST",stats:{pace:78,shooting:72,passing:65,dribbling:74,defending:32,physical:68,jumping:70,agility:76},badges:[],motm_votes:1,date_of_birth:"2009-05-18"},
  ];
  let rows=((lbData&&lbData.length>0)?lbData:fallbackRows).map(p=>({...p,overall:ov(p.stats),t:tier(ov(p.stats),p.badges||[]),age:calcAge(p.date_of_birth),group:ageGroup(calcAge(p.date_of_birth))})).sort((a,b)=>b.overall-a.overall);
  if(filter!=="all")rows=rows.filter(r=>r.group===filter);

  const menuItems=[
    {icon:"🏆",label:"League",desc:"Table, fixtures & stats",col:C.purple,v:"league"},
    {icon:"📈",label:"Leaderboard",desc:"Global rankings",col:C.lime,v:"leaderboard"},
    {icon:"📊",label:"Compare",desc:"vs Mbappé & elite",col:C.cyan,v:"compare"},
    {icon:"🏅",label:"Badges",desc:"Your achievements",col:C.gold,v:"badges"},
  ];

  return <div style={{minHeight:"100vh",background:C.bg,color:C.white,paddingBottom:100}}>
    <Hdr title="Compete" sub="Leagues & Rankings" right={view!=="menu"?<button onClick={()=>setView("menu")} style={{background:"#111",border:"1px solid #222",color:C.white,cursor:"pointer",fontSize:12,padding:"8px 14px",borderRadius:8,fontWeight:700}}>← Back</button>:null}/>
    <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>

      {view==="menu"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {menuItems.map(it=><button key={it.v} onClick={()=>setView(it.v)}
          style={{background:`linear-gradient(135deg,${it.col}14,${it.col}06)`,border:`1.5px solid ${it.col}33`,borderRadius:14,padding:18,textAlign:"left",cursor:"pointer",color:C.white,transition:"all 0.2s",boxShadow:`0 4px 16px ${it.col}18`}}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 8px 24px ${it.col}33`;}}
          onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=`0 4px 16px ${it.col}18`;}}>
          <Icon emoji={it.icon} color={it.col} size={48} style={{marginBottom:12}}/>
          <div style={{fontSize:15,fontWeight:800,color:it.col,marginBottom:4}}>{it.label}</div>
          <div style={{fontSize:11,color:C.ghost}}>{it.desc}</div>
        </button>)}
      </div>}

      {view==="league"&&<>
        <div style={{background:`linear-gradient(135deg,${C.purple}14,${C.purple}06)`,border:`1px solid ${C.purple}33`,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><Icon emoji="🏆" color={C.purple} size={36}/><div style={{fontSize:14,fontWeight:700,color:C.purple}}>East London Summer League</div></div>
          <Pill color={C.lime}>ACTIVE</Pill>
        </div>
        <div style={{display:"flex",borderBottom:`1px solid #111`,marginBottom:14}}>{["table","fixtures","stats"].map(t=><button key={t} onClick={()=>setLTab(t)} style={{flex:1,padding:12,background:"none",border:"none",cursor:"pointer",color:lTab===t?C.lime:C.ghost,fontWeight:700,fontSize:11,borderBottom:`2px solid ${lTab===t?C.lime:"transparent"}`,textTransform:"uppercase"}}>{t}</button>)}</div>
        {lTab==="table"&&<div style={{background:"#0d0d0d",borderRadius:12,overflow:"hidden",border:`1px solid #1a1a1a`}}>
          <div style={{display:"grid",gridTemplateColumns:"auto 1fr repeat(5,32px)",padding:"10px 14px",borderBottom:`1px solid #1a1a1a`}}>{["#","Team","P","W","L","GD","PTS"].map(h=><div key={h} style={{fontSize:9,color:C.ghost,letterSpacing:2,fontWeight:700,textAlign:"center"}}>{h}</div>)}</div>
          {table.map((row,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"auto 1fr repeat(5,32px)",padding:"12px 14px",borderBottom:`1px solid #111`,background:row.you?`${C.lime}08`:"transparent",alignItems:"center"}}>
            <div style={{width:24,fontSize:13,fontWeight:900,color:i===0?C.gold:i===1?"#888":C.ghost,marginRight:8}}>{i+1}</div>
            <div style={{fontSize:13,fontWeight:700,color:row.you?C.lime:C.white}}>{row.team}{row.you?" ★":""}</div>
            {[row.p,row.w,row.l,row.gd,row.pts].map((v,j)=><div key={j} style={{textAlign:"center",fontSize:12,fontWeight:j===4?900:400,color:j===4?C.white:C.ghost}}>{v}</div>)}
          </div>)}
        </div>}
        {lTab==="fixtures"&&fixtures.map((f,i)=><div key={i} style={{background:"#0d0d0d",border:`1px solid ${f.status==="upcoming"?C.lime+"22":"#1a1a1a"}`,borderRadius:12,padding:14,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:10,color:C.ghost}}>{f.date}</span>{f.status==="upcoming"?<Pill color={C.lime}>UPCOMING</Pill>:<Pill color={C.ghost}>DONE</Pill>}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center"}}><div style={{fontSize:13,fontWeight:700,textAlign:"right"}}>{f.home}</div><div style={{fontSize:f.status==="done"?22:16,fontWeight:900,color:C.ghost,textAlign:"center"}}>{f.status==="done"?`${f.homeScore}–${f.awayScore}`:"vs"}</div><div style={{fontSize:13,fontWeight:700}}>{f.away}</div></div>
        </div>)}
        {lTab==="stats"&&[{label:"Top Scorer",name:"Jaden S.",val:"8 goals",icon:"⚽"},{label:"Top Rated",name:"Marcus T.",val:"OVR 83",icon:"⭐"},{label:"Most MOTM",name:"Street Kings",val:"4 awards",icon:"🏅"}].map(s=><div key={s.label} style={{background:"#0d0d0d",borderRadius:12,padding:14,marginBottom:10,display:"flex",gap:14,alignItems:"center",border:`1px solid #1a1a1a`}}><Icon emoji={s.icon} color={C.gold} size={36}/><div><div style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>{s.label}</div><div style={{fontSize:14,fontWeight:700}}>{s.name}</div><div style={{fontSize:12,color:C.lime}}>{s.val}</div></div></div>)}
        <Btn full v="ghost" style={{marginTop:8}}>+ Create New League</Btn>
      </>}

      {view==="leaderboard"&&<>
        <div style={{marginBottom:14}}><div style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Filter by Age Group</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[["all","All"],["u12","U12"],["u16","13–16"],["u20","17–20"],["adult","21–29"],["vet","30+"]].map(([k,l])=><button key={k} onClick={()=>setFilter(k)} style={{background:filter===k?`${C.lime}18`:"#0d0d0d",border:`1.5px solid ${filter===k?C.lime+"55":"#1a1a1a"}`,borderRadius:6,padding:"6px 12px",fontSize:11,color:filter===k?C.lime:C.ghost,cursor:"pointer",fontWeight:700,transition:"all 0.15s"}}>{l}</button>)}</div></div>
        {rows.map((p,i)=>{const ts=C.tiers[p.t];return <div key={i} style={{background:p.you?`${C.lime}0a`:"linear-gradient(135deg,#0d0d0d,#111)",border:`1.5px solid ${p.you?C.lime+"44":"#1a1a1a"}`,borderRadius:12,padding:14,marginBottom:8,display:"flex",alignItems:"center",gap:12,transition:"all 0.2s",boxShadow:p.you?`0 0 16px ${C.lime}22`:"none"}}>
          <div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,background:i<3?[C.gold,"#888","#8B4513"][i]:"#181818",display:"flex",alignItems:"center",justifyContent:"center",fontSize:i<3?18:11,fontWeight:900,color:i<3?"#000":C.ghost,boxShadow:i<3?`0 0 12px ${[C.gold,"#888","#8B4513"][i]}66`:"none"}}>{i<3?["🥇","🥈","🥉"][i]:i+1}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700}}>{p.name}{p.you?" (You)":""}</div>
            <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap",marginTop:2}}>
              <span style={{fontSize:10,color:C.ghost}}>{p.position}</span>
              {p.age&&<span style={{background:"#181818",borderRadius:4,padding:"1px 6px",fontSize:9,color:C.ghost}}>{AGE_LABELS[p.group]}</span>}
              <span>{(p.badges||[]).slice(0,3).map(b=>BADGES.find(x=>x.id===b)?.icon).join("")}</span>
            </div>
          </div>
          <div style={{textAlign:"right"}}><div style={{fontSize:26,fontWeight:900,color:ts.t,textShadow:`0 0 12px ${ts.b}88`}}>{p.overall||"—"}</div><div style={{fontSize:9,color:ts.t,letterSpacing:1,textTransform:"uppercase"}}>{p.t}</div>{p.motm_votes>0&&<div style={{fontSize:9,color:C.gold}}>🏅 {p.motm_votes}x</div>}</div>
        </div>;})}
      </>}

      {view==="compare"&&<>
        {age&&<div style={{background:`${C.blue}0a`,border:`1px solid ${C.blue}1a`,borderRadius:10,padding:12,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontSize:11,color:C.ghost}}>Benchmarks for your age group</div><AgePill age={age}/></div>}
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>{[{l:"You",c:C.lime},{l:"Street",c:C.ghost},{l:"Semi-Pro",c:C.blue},{l:"Mbappé",c:C.gold},{l:"Neymar",c:C.red}].map(x=><div key={x.l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:2,background:x.c}}/><span style={{fontSize:10,color:C.ghost}}>{x.l}</span></div>)}</div>
        {Object.entries(BENCH).map(([k,b])=>{const you=player?.stats?.[k]||0;const m=STATS_META[k];return <div key={k} style={{background:"linear-gradient(135deg,#0d0d0d,#111)",borderRadius:12,padding:14,marginBottom:10,border:`1px solid ${m.color}14`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:8}}><Icon emoji={m.icon} color={m.color} size={28}/><span style={{fontSize:13,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:m.color}}>{m.l}</span></div><span style={{fontSize:22,fontWeight:900,color:you?sc(you):C.ghost,textShadow:you?`0 0 10px ${sc(you)}66`:"none"}}>{you||"?"}</span></div>
          {[{l:"You",v:you,c:C.lime},{l:"Street avg",v:b.street,c:C.ghost},{l:"Semi-Pro",v:b.semi,c:C.blue},{l:"Mbappé",v:b.mbappe,c:C.gold},{l:"Neymar",v:b.neymar,c:C.red}].map(row=><div key={row.l} style={{marginBottom:5}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:9,color:C.ghost}}>{row.l}</span><span style={{fontSize:10,fontWeight:700,color:row.c}}>{row.v||"—"}</span></div><div style={{height:4,background:"#181818",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${(row.v/99)*100}%`,background:row.c,borderRadius:2,opacity:row.l==="You"&&!you?0.15:1,transition:"width 1s ease",boxShadow:row.l==="You"&&you?`0 0 6px ${row.c}88`:"none"}}/></div></div>)}
        </div>;})}
      </>}

      {view==="badges"&&<>
        <div style={{background:`linear-gradient(135deg,${C.purple}14,${C.purple}06)`,border:`1px solid ${C.purple}22`,borderRadius:12,padding:14,marginBottom:16,display:"flex",gap:10}}>
          <Icon emoji="✦" color={C.purple} size={36}/>
          <div><div style={{fontSize:11,fontWeight:700,color:C.purple}}>Rare Card Trigger</div><p style={{color:C.ghost,fontSize:11,margin:"4px 0 0",lineHeight:1.6}}>Earn any 3 badges and your card upgrades to Rare holographic, regardless of overall rating.</p></div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{fontSize:12,fontWeight:700}}>{(player?.badges||[]).length}/{BADGES.length} earned</span>
          {(player?.badges||[]).length>=3&&<Pill color={C.purple}>✦ RARE ACTIVE</Pill>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {BADGES.map(b=>{const e=(player?.badges||[]).includes(b.id);return <div key={b.id} style={{background:e?(b.rare?`linear-gradient(135deg,${C.purple}20,${C.purple}08)`:`linear-gradient(135deg,${C.lime}14,${C.lime}06)`):"linear-gradient(135deg,#0d0d0d,#111)",border:`1.5px solid ${e?(b.rare?C.purple:C.lime+"55"):"#1a1a1a"}`,borderRadius:12,padding:14,opacity:e?1:0.35,filter:e&&b.rare?`drop-shadow(0 0 14px ${C.purple}66)`:"none",transition:"all 0.2s",boxShadow:e?(b.rare?`0 4px 20px ${C.purple}33`:`0 4px 14px ${C.lime}22`):"none"}}>
            <Icon emoji={b.icon} color={e?(b.rare?C.purple:C.lime):C.ghost} size={38} glow={e} style={{marginBottom:8}}/>
            <div style={{fontSize:12,fontWeight:700,color:e?(b.rare?C.purple:C.lime):C.ghost,marginBottom:3}}>{b.name}</div>
            <div style={{fontSize:10,color:C.ghost,lineHeight:1.4}}>{b.desc}</div>
            {e&&<div style={{marginTop:8,fontSize:9,color:e?(b.rare?C.purple:C.lime):C.muted,letterSpacing:1,textTransform:"uppercase",fontWeight:700}}>✓ EARNED</div>}
          </div>;})}
        </div>
      </>}
    </div>
  </div>;
}

// ── PROFILE TAB ───────────────────────────────────────────────
function ProfileTab({player,onSignOut,onUpdate}){
  const[editing,setEditing]=useState(false);
  const[form,setForm]=useState({bio:player?.bio||"",nationality:player?.nationality||"",position:player?.position||"ST",foot:player?.foot||"Right"});
  const[toast,setToast]=useState("");
  const showToast=(m,t="ok")=>{setToast({m,t});setTimeout(()=>setToast(""),2500);};
  const age=calcAge(player?.date_of_birth);const group=ageGroup(age);
  const overall=ov(player?.stats);const t=tier(overall,player?.badges||[]);const ts=C.tiers[t];

  async function save(){
    try{await sbFetch(`players?id=eq.${player?.id}`,{method:"PATCH",body:JSON.stringify(form),prefer:"return=minimal"});onUpdate({...player,...form});showToast("Profile updated ✓");setEditing(false);}
    catch(e){showToast(e.message,"err");}
  }

  return <div style={{minHeight:"100vh",background:C.bg,color:C.white,paddingBottom:100}}>
    <Hdr title="Profile" sub="Your Player Card"
      right={<button onClick={()=>setEditing(!editing)} style={{background:editing?`${C.red}18`:`${C.lime}18`,border:`1px solid ${editing?C.red:C.lime}33`,color:editing?C.red:C.lime,borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>{editing?"Cancel":"Edit"}</button>}/>
    <Toast msg={toast?.m} type={toast?.t}/>
    <div style={{padding:18,maxWidth:460,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:24,position:"relative"}}>
        <div style={{position:"absolute",width:200,height:200,borderRadius:"50%",background:`radial-gradient(circle,${ts.g},transparent 70%)`,top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none"}}/>
        <Card player={{...player,...(editing?form:{})}} size="full"/>
      </div>

      {!editing?<>
        <div style={{background:"linear-gradient(135deg,#0d0d0d,#111)",borderRadius:12,padding:16,marginBottom:16,border:`1px solid #1a1a1a`}}>
          {[["Name",player?.name],["Email",player?.email],["Nationality",player?.nationality],["Position",player?.position],["Foot",player?.foot],["Date of Birth",player?.date_of_birth],["Age",age?`${age} years (${AGE_LABELS[group]})`:null],["Challenge Code",player?.challenge_code],["Team Code",player?.team_code],["Role",player?.team_role]].filter(([,v])=>v).map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:10,marginBottom:10,borderBottom:`1px solid #1a1a1a`}}><span style={{fontSize:11,color:C.ghost}}>{k}</span><span style={{fontSize:13,fontWeight:700}}>{v}</span></div>)}
          {player?.bio&&<div style={{paddingTop:4}}><div style={{fontSize:10,color:C.ghost,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Bio</div><div style={{fontSize:13,color:C.white,lineHeight:1.6,fontStyle:"italic"}}>"{player.bio}"</div></div>}
        </div>
      </>:<div style={{background:"linear-gradient(135deg,#0d0d0d,#111)",borderRadius:12,padding:16,marginBottom:16,border:`1px solid ${C.lime}22`}}>
        <Textarea label="Bio" value={form.bio} onChange={v=>setForm(p=>({...p,bio:v}))} placeholder="Your style, your strengths..."/>
        <Select label="Nationality" value={form.nationality} onChange={v=>setForm(p=>({...p,nationality:v}))} options={COUNTRIES}/>
        <div style={{marginBottom:14}}><label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:2,marginBottom:5,textTransform:"uppercase"}}>Position</label><select value={form.position} onChange={e=>setForm(p=>({...p,position:e.target.value}))} style={{width:"100%",background:"#111",border:"1.5px solid #222",borderRadius:8,padding:"13px 14px",color:C.white,fontSize:14,outline:"none"}}>{POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
        <div style={{marginBottom:16}}><label style={{display:"block",fontSize:10,color:C.ghost,letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>Preferred Foot</label><div style={{display:"flex",gap:8}}>{["Left","Right","Both"].map(f=><button key={f} onClick={()=>setForm(p=>({...p,foot:f}))} style={{flex:1,padding:12,borderRadius:8,border:`1.5px solid ${form.foot===f?C.lime:"#222"}`,background:form.foot===f?`${C.lime}14`:"transparent",color:form.foot===f?C.lime:C.ghost,cursor:"pointer",fontSize:13,fontWeight:700}}>{f}</button>)}</div></div>
        <Btn full onClick={save}>Save Changes</Btn>
      </div>}

      <div style={{background:"linear-gradient(135deg,#0d0d0d,#111)",borderRadius:12,padding:16,marginBottom:16,border:`1px solid #1a1a1a`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{display:"flex",alignItems:"center",gap:8}}><Icon emoji="📊" color={C.lime} size={28}/><span style={{fontSize:12,fontWeight:700}}>Full Stats</span></div>{age&&<AgePill age={age}/>}</div>
        {Object.entries(STATS_META).map(([k,m])=><StatBar key={k} label={m.l} value={player?.stats?.[k]} color={m.color}/>)}
      </div>

      {age&&<div style={{background:"linear-gradient(135deg,#0d0d0d,#111)",borderRadius:12,padding:14,marginBottom:16,border:`1px solid ${C.blue}18`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><Icon emoji="📏" color={C.blue} size={28}/><div style={{fontSize:11,fontWeight:700}}>Age Group Benchmarks</div><AgePill age={age}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[{label:"Sprint avg",val:SPRINT_BENCH[group].avg+"s"},{label:"Jump avg",val:JUMP_BENCH[group].avg+"cm"},{label:"Push-ups avg",val:PUSHUP_BENCH[group].avg+" reps"}].map(b=><div key={b.label} style={{textAlign:"center",background:"#181818",borderRadius:8,padding:"8px 6px",border:`1px solid #2a2a2a`}}><div style={{fontSize:14,fontWeight:900,color:C.white}}>{b.val}</div><div style={{fontSize:9,color:C.ghost,marginTop:2}}>{b.label}</div></div>)}</div>
      </div>}

      <div style={{display:"flex",gap:10,marginBottom:20}}>{[{val:player?.games_played||0,label:"Games",col:C.lime,emoji:"⚽"},{val:player?.motm_votes||0,label:"MOTM",col:C.gold,emoji:"🏅"},{val:(player?.badges||[]).length,label:"Badges",col:C.purple,emoji:"🔥"}].map(s=><div key={s.label} style={{flex:1,background:`linear-gradient(135deg,${s.col}14,${s.col}06)`,borderRadius:12,padding:14,textAlign:"center",border:`1.5px solid ${s.col}33`,boxShadow:`0 4px 14px ${s.col}18`}}><div style={{fontSize:10,marginBottom:4}}>{s.emoji}</div><div style={{fontSize:26,fontWeight:900,color:s.col,textShadow:`0 0 12px ${s.col}66`}}>{s.val}</div><div style={{fontSize:9,color:C.ghost,letterSpacing:1,textTransform:"uppercase",marginTop:2}}>{s.label}</div></div>)}</div>

      <Btn full v="red" onClick={onSignOut}>Sign Out</Btn>
    </div>
  </div>;
}

// ── Bottom Nav ────────────────────────────────────────────────
function BottomNav({active,onTab,player}){
  const overall=ov(player?.stats);const t=tier(overall,player?.badges||[]);const ts=C.tiers[t];
  const tabs=[
    {id:"home",emoji:"🏠",label:"Home",activeColor:ts.b},
    {id:"develop",emoji:"⚡",label:"Develop",activeColor:C.lime},
    {id:"club",emoji:"👥",label:"Club",activeColor:C.blue},
    {id:"compete",emoji:"🏆",label:"Compete",activeColor:C.purple},
    {id:"profile",emoji:"👤",label:"Profile",activeColor:C.gold},
  ];
  return <div style={{position:"fixed",bottom:0,left:0,right:0,background:"linear-gradient(180deg,#080808ee,#060608)",backdropFilter:"blur(12px)",borderTop:`1px solid #111`,display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom,0)"}}>
    {tabs.map(tab=>{
      const isA=active===tab.id;
      return <button key={tab.id} onClick={()=>onTab(tab.id)}
        style={{flex:1,padding:"10px 4px 8px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,transition:"opacity 0.15s",position:"relative"}}>
        {isA&&<div style={{position:"absolute",top:0,left:"20%",right:"20%",height:2,background:tab.activeColor,borderRadius:"0 0 2px 2px",boxShadow:`0 0 8px ${tab.activeColor}`}}/>}
        <NavIcon emoji={tab.emoji} color={tab.activeColor} active={isA}/>
        <div style={{fontSize:9,fontWeight:isA?800:500,color:isA?tab.activeColor:C.ghost,letterSpacing:0.5,transition:"color 0.2s"}}>{tab.label}</div>
      </button>;
    })}
  </div>;
}

// ── App Root ──────────────────────────────────────────────────
export default function App(){
  const[screen,setScreen]=useState("landing");
  const[tab,setTab]=useState("home");
  const[player,setPlayer]=useState(null);
  const[authReady,setAuthReady]=useState(false);
  const[showLoading,setShowLoading]=useState(true);
  const[loadingDone,setLoadingDone]=useState(false);

  useEffect(()=>{
    sbGetUser().then(async user=>{
      if(user&&user.id){
        try{const rows=await sbFetch(`players?id=eq.${user.id}&limit=1`);if(rows?.[0]){setPlayer(rows[0]);setScreen("app");}}
        catch(_){}
      }
      setAuthReady(true);
    }).catch(()=>setAuthReady(true));
  },[]);

  useEffect(()=>{if(authReady&&loadingDone)setShowLoading(false);},[authReady,loadingDone]);

  async function handleStat(key,value){
    if(!key||!value)return;
    const ns={...(player?.stats||{}),[key]:Math.min(99,Math.max(1,Math.round(value)))};
    setPlayer(p=>({...p,stats:ns}));
    if(player?.id){await sbFetch(`players?id=eq.${player.id}`,{method:"PATCH",body:JSON.stringify({stats:ns}),prefer:"return=minimal"}).catch(()=>{});}
  }

  function handleUpdate(updated){if(updated)setPlayer(updated);}
  async function signOut(){await sbSignOut();setPlayer(null);setScreen("landing");setTab("home");}

  if(showLoading)return <LoadingScreen onDone={()=>setLoadingDone(true)}/>;

  if(screen==="app"&&!player){setTimeout(()=>setScreen("landing"),0);return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:10,color:C.ghost,letterSpacing:4,textTransform:"uppercase"}}>Loading...</div></div>;}

  return <div style={{fontFamily:"Inter,system-ui,sans-serif",background:C.bg,minHeight:"100vh",color:C.white}}>
    <style>{`*{box-sizing:border-box;margin:0;padding:0;}input::placeholder{color:#2a2a2a;}select option{background:#111;}textarea::placeholder{color:#2a2a2a;}::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:2px;}@keyframes cardfloat{0%,100%{transform:perspective(700px) translateY(0)}50%{transform:perspective(700px) translateY(-8px)}}@keyframes logopulse{0%,100%{text-shadow:0 0 40px ${C.lime}44}50%{text-shadow:0 0 60px ${C.lime}88}}@keyframes slideup{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}@keyframes iconpulse{0%,100%{box-shadow:0 4px 16px inherit}50%{box-shadow:0 4px 28px inherit}}@keyframes navglow{0%,100%{opacity:0.7}50%{opacity:1}}@keyframes statup{from{transform:translateY(4px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    {screen==="landing"&&<Landing onNav={setScreen}/>}
    {screen==="signup"&&<Signup onNav={s=>{if(s==="app")setScreen("app");else setScreen(s);}} onLogin={setPlayer}/>}
    {screen==="login"&&<Login onNav={s=>{if(s==="app")setScreen("app");else setScreen(s);}} onLogin={setPlayer}/>}
    {screen==="app"&&player&&<>
      {tab==="home"   &&<HomeTab player={player} onUpdate={handleUpdate}/>}
      {tab==="develop"&&<DevelopTab player={player} onStat={handleStat}/>}
      {tab==="club"   &&<ClubTab player={player} onUpdate={handleUpdate}/>}
      {tab==="compete"&&<CompeteTab player={player}/>}
      {tab==="profile"&&<ProfileTab player={player} onSignOut={signOut} onUpdate={handleUpdate}/>}
      <BottomNav active={tab} onTab={setTab} player={player}/>
    </>}
  </div>;
}
