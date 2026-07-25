/* ═══════════════════════════════════════════════════════════════
   공식 16구간 — 영문 + 한글 병기 + 혼합 아이콘
   ═══════════════════════════════════════════════════════════════ */
const SEQ = [
  {k:"run_1",     icon:"run",       en:"Run",                ko:"런",          short:"RUN",   type:"run"},
  {k:"ski_erg",   icon:"ski_erg",   en:"Ski Erg",            ko:"스키",        short:"SKI",   type:"station"},
  {k:"run_2",     icon:"run",       en:"Run",                ko:"런",          short:"RUN",   type:"run"},
  {k:"sled_push", icon:"sled_push", en:"Sled Push",          ko:"슬레드 푸시", short:"PUSH",  type:"station"},
  {k:"run_3",     icon:"run",       en:"Run",                ko:"런",          short:"RUN",   type:"run"},
  {k:"sled_pull", icon:"sled_pull", en:"Sled Pull",          ko:"슬레드 풀",   short:"PULL",  type:"station"},
  {k:"run_4",     icon:"run",       en:"Run",                ko:"런",          short:"RUN",   type:"run"},
  {k:"burpee",    icon:"burpee",    en:"Burpee Broad Jumps", ko:"버피",        short:"BURP",  type:"station"},
  {k:"run_5",     icon:"run",       en:"Run",                ko:"런",          short:"RUN",   type:"run"},
  {k:"rowing",    icon:"rowing",    en:"Rowing",             ko:"로잉",        short:"ROW",   type:"station"},
  {k:"run_6",     icon:"run",       en:"Run",                ko:"런",          short:"RUN",   type:"run"},
  {k:"farmers",   icon:"farmers",   en:"Farmers Carry",      ko:"파머스 캐리", short:"FARM",  type:"station"},
  {k:"run_7",     icon:"run",       en:"Run",                ko:"런",          short:"RUN",   type:"run"},
  {k:"lunges",    icon:"lunges",    en:"Sandbag Lunges",     ko:"런지",        short:"LUNGE", type:"station"},
  {k:"run_8",     icon:"run",       en:"Run",                ko:"런",          short:"RUN",   type:"run"},
  {k:"wall_balls",icon:"wall_balls",en:"Wall Balls",         ko:"월볼",        short:"WALL",  type:"station"},
];

/* ═══════════════════════════════════════════════════════════════
   PART 4 · Z1~Z5 개인화 로직
   ═══════════════════════════════════════════════════════════════ */
const ZONE_DEF = [
  {z:1, lo:0.50, hi:0.60, name:"Recovery",  ko:"회복",   color:"#60A5FA", tw:"text-blue-400"},
  {z:2, lo:0.60, hi:0.70, name:"Aerobic",   ko:"유산소", color:"#34D399", tw:"text-emerald-400"},
  {z:3, lo:0.70, hi:0.80, name:"Tempo",     ko:"템포",   color:"#FBBF24", tw:"text-amber-400"},
  {z:4, lo:0.80, hi:0.90, name:"Threshold", ko:"역치",   color:"#E05D29", tw:"text-hyrox"},
  {z:5, lo:0.90, hi:1.10, name:"Maximum",   ko:"최대",   color:"#EF4444", tw:"text-red-500"},
];

/* 나이 → 최대심박 추정 (220 - 나이) */
function estimateMaxHr(age){
  const a = Number(age);
  return (!a || a<=0) ? 190 : 220 - a;
}

/* 최대심박 → 개인 Z1~Z5 구간 재정의 */
function buildZones(maxHr){
  return ZONE_DEF.map(z=>({
    ...z,
    minBpm: Math.round(maxHr * z.lo),
    maxBpm: Math.round(maxHr * z.hi),
  }));
}

/* 현재 BPM이 속한 존 */
function zoneOf(bpm, zones){
  if(!bpm || bpm<=0) return null;
  for(let i=zones.length-1;i>=0;i--){
    if(bpm >= zones[i].minBpm) return zones[i];
  }
  return zones[0];
}

/* 존 내부에서의 진행률(게이지용, 0~100) */
function zoneProgress(bpm, zone){
  if(!zone) return 0;
  const span = zone.maxBpm - zone.minBpm;
  if(span<=0) return 0;
  return Math.max(0, Math.min(100, ((bpm - zone.minBpm)/span)*100));
}

/* ═══ 페이싱 엔진 ═══ */
const RUN_SHARE=.55, STATION_SHARE=.45, ROXZONE_RATIO=.10;
const RUN_FATIGUE=[.92,.95,.97,.99,1.01,1.03,1.06,1.07];
const STATION_W={ski_erg:.115,sled_push:.105,sled_pull:.135,burpee:.155,rowing:.115,farmers:.075,lunges:.135,wall_balls:.165};

function buildGuidance(totalSec){
  const pure=(totalSec*RUN_SHARE)/(1+ROXZONE_RATIO);
  const basePerKm=pure/RUN_FATIGUE.reduce((a,b)=>a+b,0);
  const stTotal=totalSec*STATION_SHARE;
  let ri=0;
  return SEQ.map(s=>{
    if(s.type==="run"){
      const b=basePerKm*RUN_FATIGUE[ri++];
      return {k:s.k,target:Math.round(b*(1+ROXZONE_RATIO)),base:Math.round(b),rox:Math.round(b*ROXZONE_RATIO)};
    }
    return {k:s.k,target:Math.round(stTotal*(STATION_W[s.k]??.125))};
  });
}

function mmss(sec){
  if(sec==null||isNaN(sec)) return "--:--";
  const n=Math.abs(Math.round(sec));
  return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
}
function signed(sec){
  if(sec==null||isNaN(sec)) return "--:--";
  return (sec>=0?"+":"-")+mmss(sec);
}

/* ═══════════════════════════════════════════════════════════════
   더미 데이터 (실력 순) — age / maxHrManual 포함
   ═══════════════════════════════════════════════════════════════ */
const ATHLETES = [
  {id:1,name:"정원준",en:"Wonjoon Jung",div:"MEN PRO",age:"30-34",ageNum:32,maxHrManual:null,targetSec:3600,sensor:"athlete_1",device:"Garmin HRM-Pro"},
  {id:2,name:"동주봉",en:"Bong Bong",   div:"MEN PRO",age:"30-34",ageNum:33,maxHrManual:null,targetSec:3600,sensor:"athlete_2",device:"Garmin HRM-Pro"},
  {id:3,name:"강지웅",en:"Jiwoong Kang",div:"MEN PRO",age:"30-34",ageNum:31,maxHrManual:186, targetSec:4200,sensor:"athlete_3",device:"Garmin HRM-Pro"},
  {id:4,name:"강선보",en:"Sunbo Kang",  div:"MEN PRO",age:"35-39",ageNum:37,maxHrManual:null,targetSec:4500,sensor:"athlete_4",device:"Garmin HRM-Pro"},
];

/* ═══ TV 매핑 ═══ */
const TVS = {
  tv1:{label:"TV 1", athletes:[1]},
  tv2:{label:"TV 2", athletes:[2,3]},
  tv3:{label:"TV 3", athletes:[4]},
};
function tvOfAthlete(id){
  for(const [k,v] of Object.entries(TVS)) if(v.athletes.includes(id)) return k;
  return null;
}
function assignAthlete(id, tv){
  Object.values(TVS).forEach(t=>{ t.athletes=t.athletes.filter(x=>x!==id); });
  if(tv && TVS[tv]) TVS[tv].athletes.push(id);
  Object.values(TVS).forEach(t=>t.athletes.sort((a,b)=>a-b));
}

/* ═══ 런타임 상태 ═══ */
const MAX_HR_HISTORY = 900;   // 15분치(1초 간격) — 스파크라인용
const S={};
ATHLETES.forEach(a=>{
  const maxHr = a.maxHrManual ?? estimateMaxHr(a.ageNum);
  S[a.id]={...a,
    maxHr,
    zones: buildZones(maxHr),
    guidance: buildGuidance(a.targetSec),
    started:false, startAt:null, current:0, splits:[],
    bpm:0, rmssd:null, respiration:null, gct:null, cadence:null,
    hrHistory:[],           // [{t: 경과초, bpm}]
    connected:true,
    // Part 2: 디바이스 통신 상태 매트릭스
    latencyMs: 0,           // 최근 수신 지연(ms)
    txCount: 0, rxCount: 0, // 송/수신 카운터 (깜빡임용)
    lastRxAt: null,
  };
});

/* 나이/최대심박 변경 → 존 재정의 */
function updateAthleteHr(id, {ageNum, maxHrManual}){
  const st=S[id], a=ATHLETES.find(x=>x.id===id);
  if(ageNum!==undefined){ st.ageNum=ageNum; a.ageNum=ageNum; }
  if(maxHrManual!==undefined){ st.maxHrManual=maxHrManual; a.maxHrManual=maxHrManual; }
  st.maxHr = st.maxHrManual ?? estimateMaxHr(st.ageNum);
  st.zones = buildZones(st.maxHr);   // ★ 존 동적 재정의
}

/* ═══ EFT / Variance ═══ */
function computeMetrics(st, now){
  now = now ?? Date.now();
  const g=st.guidance, done=st.splits.length;
  const actualCum=st.splits.reduce((a,s)=>a+s.sec,0);
  const targetCum=g.slice(0,done).reduce((a,x)=>a+x.target,0);
  const variance=actualCum-targetCum;
  const elapsed=st.started?Math.floor((now-st.startAt)/1000):0;
  const segElapsed=Math.max(0,elapsed-actualCum);
  const finished=done>=g.length;
  const remainTarget=g.slice(done).reduce((a,x)=>a+x.target,0);
  const inProgTarget=finished?0:g[done].target;
  const eft=finished?actualCum:elapsed+remainTarget-Math.min(segElapsed,inProgTarget);
  return {done,elapsed,segElapsed,actualCum,targetCum,variance,eft,finished,
          curTarget:finished?null:g[done].target,
          curSeq:finished?null:SEQ[done]};
}

/* ═══ 가민 라이브 데이터 시뮬레이션 ═══ */
const HR_BASE={1:172,2:166,3:158,4:151};
function tickHR(now){
  Object.values(S).forEach(st=>{
    if(!st.started){
      st.bpm=0; st.rmssd=null; st.respiration=null; st.gct=null; st.cadence=null;
      return;
    }
    const m=computeMetrics(st,now);
    const base=HR_BASE[st.id]||150;
    const wob=Math.sin((now/3000)+st.id)*4;
    st.bpm=Math.max(90,Math.min(199,Math.round(base+wob+(Math.random()*3-1.5))));
    st.rmssd=Math.max(6,Math.round(60-(st.bpm-90)*0.42+(Math.random()*5-2.5)));
    // 호흡수: 심박에 비례 (HRM-Pro 지원)
    st.respiration=Math.max(12,Math.round(st.bpm*0.245+(Math.random()*3-1.5)));
    // GCT/Cadence는 러닝 구간에서만 유효
    const isRun=!m.finished && m.curSeq && m.curSeq.type==="run";
    if(isRun){
      st.gct=Math.round(238+(st.bpm-150)*0.55+Math.sin(now/4000+st.id)*7+(Math.random()*6-3));
      st.cadence=Math.round(174+Math.sin(now/2500+st.id)*5+(Math.random()*3-1.5));
    } else { st.gct=null; st.cadence=null; }

    // Part 2: 통신 상태 시뮬레이션 (실제로는 MQTT 수신 시각으로 계산)
    st.latencyMs = Math.round(35 + Math.random()*90 + (st.id===3?40:0));
    st.rxCount = (st.rxCount||0) + 1;
    st.txCount = (st.txCount||0) + 1;
    st.lastRxAt = now;

    // ★ 심박 이력 누적 (스파크라인용)
    const t=m.elapsed;
    const last=st.hrHistory[st.hrHistory.length-1];
    if(!last || t>last.t){
      st.hrHistory.push({t, bpm:st.bpm});
    }
    // 트림은 push 여부와 무관하게 항상 수행 → 상한 초과 상태도 자가복구
    if(st.hrHistory.length>MAX_HR_HISTORY){
      st.hrHistory.splice(0, st.hrHistory.length-MAX_HR_HISTORY);
    }
  });
}

/* ═══ Wave Start ═══ */
function startAthlete(id, now){
  const st=S[id];
  st.started=true; st.startAt=now??Date.now();
  st.current=0; st.splits=[]; st.hrHistory=[];
}
function stopAthlete(id){
  const st=S[id];
  st.started=false; st.startAt=null;
}

/* ═══ 데모 시드 ═══ */
function seed(id, doneCount, driftPct, inProgSec, now){
  const st=S[id];
  now = now ?? Date.now();
  st.started=true;
  st.splits=st.guidance.slice(0,doneCount).map(g=>({
    k:g.k, sec:Math.max(1,Math.round(g.target*(1+driftPct))), target:g.target
  }));
  st.current=doneCount;
  const cum=st.splits.reduce((a,s)=>a+s.sec,0);
  const total=cum+inProgSec;
  st.startAt=now-total*1000;

  // 심박 이력 생성 (출발~현재, 존을 넘나들도록)
  st.hrHistory=[];
  const base=HR_BASE[id]||150;
  for(let t=0;t<=total;t+=Math.max(1,Math.floor(total/240))){
    const warm = t<total*0.10 ? (t/(total*0.10)) : 1;          // 초반 상승
    const bpm = Math.round(base*0.72 + base*0.28*warm + Math.sin(t/45)*6 + Math.sin(t/13)*2);
    st.hrHistory.push({t, bpm:Math.max(85,Math.min(199,bpm))});
  }
}
