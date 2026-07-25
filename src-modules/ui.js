/* ═══════════════════════════════════════════════════════════════
   TV 반응형 그리드
   ═══════════════════════════════════════════════════════════════ */
function tvGridClass(n){
  // ★ 좌우 분할 (세로형 직사각형): 상하가 아닌 grid-cols
  if(n<=1) return "grid-cols-1 grid-rows-1";
  if(n===2) return "grid-cols-2 grid-rows-1";   // 좌우 2분할
  if(n===3) return "grid-cols-3 grid-rows-1";   // 좌우 3분할
  return "grid-cols-2 grid-rows-2";             // 4명은 2x2
}
function cellSpan(n,i){ return ""; }

/* ═══ 16구간 프로그레스 (영/한 병기 + 혼합 아이콘) ═══ */
function stepperHTML(st, opt={}){
  const {compact=false, showTime=true, now} = opt;
  const m=computeMetrics(st,now);
  const ic = compact?10:13;
  const cells=SEQ.map((s,i)=>{
    const done=i<m.done, active=i===m.done && st.started && !m.finished;
    const bar=done?"bg-hyrox":active?"bg-hyrox step-active":"bg-neutral-800";
    const sp=st.splits[i], over=sp&&sp.sec>sp.target;
    const timeTxt=done?mmss(sp.sec):(active?"●":"");
    const timeCls=done?(over?"text-red-400":"text-green-400"):(active?"text-hyrox":"text-transparent");
    const lc=active?"text-hyrox":done?"text-neutral-400":"text-neutral-700";
    return `
      <div class="flex flex-col items-center flex-1 min-w-0">
        <div class="w-full rounded-full ${bar}" style="height:${compact?3:5}px"></div>
        <div class="flex items-center justify-center mt-0.5 ${lc}" style="height:${ic}px">
          ${stationIcon(s.icon, ic)}
        </div>
        <p class="${lc} font-bold truncate w-full text-center leading-none"
           style="font-size:${compact?7:8}px">${s.short}</p>
        <p class="${lc} truncate w-full text-center leading-none opacity-70"
           style="font-size:${compact?6:7}px">${s.ko}</p>
        ${showTime?`<p class="${timeCls} tabular leading-none mt-0.5" style="font-size:${compact?7:8}px">${timeTxt}</p>`:""}
      </div>`;
  }).join("");
  return `<div class="flex items-start gap-[2px] w-full">${cells}</div>`;
}

/* ═══ 존 게이지 (5칸 세그먼트 + 현재 존 내 위치) ═══ */
function zoneGaugeHTML(st, size){
  const z=zoneOf(st.bpm, st.zones);
  const prog=zoneProgress(st.bpm, z);
  const segH = size==="full" ? "1.1vh" : "0.7vh";
  const segs=st.zones.map(x=>{
    const isCur = z && x.z===z.z;
    const passed = z && x.z < z.z;
    const bg = isCur ? x.color : passed ? x.color : "#262626";
    const op = isCur ? "1" : passed ? "0.42" : "1";
    return `<div class="flex-1 rounded-sm relative overflow-hidden" style="height:${segH};background:${bg};opacity:${op}">
      ${isCur?`<div class="absolute inset-y-0 left-0 bg-white/35" style="width:${prog}%"></div>`:""}
    </div>`;
  }).join("");
  return `<div class="flex gap-[2px] w-full">${segs}</div>`;
}

/* ═══════════════════════════════════════════════════════════════
   TV 선수 카드
   레이아웃: [좌: BPM 초대형 + Zone] | [우: RMSSD/RESP/GCT 세로]
             ↓ 스파크라인 ↓ 프로그레스 바
   ═══════════════════════════════════════════════════════════════ */
function tvCard(st, size, now, idx){
  const m=computeMetrics(st,now);
  const full = size==="full";

  if(!st.started){
    return `<div class="rounded-2xl border border-neutral-800 bg-neutral-950 h-full flex flex-col items-center justify-center idle-pulse">
      <p class="font-black text-neutral-800" style="font-size:${full?"7vh":"4vh"}">${st.id}</p>
      <p class="text-neutral-700 font-bold tracking-[0.3em]" style="font-size:${full?"2.4vh":"1.6vh"}">STANDBY</p>
      <p class="text-neutral-800 mt-1" style="font-size:${full?"1.5vh":"1.05vh"}">${st.name} ${st.en} · Target ${mmss(st.targetSec)}</p>
    </div>`;
  }

  const z=zoneOf(st.bpm, st.zones);
  const zColor=z?z.color:"#E05D29";

  /* 폰트 스케일 — BPM이 압도적으로 크고, 우측 지표는 작게 */
  const F = full
    ? {name:"3.6vh", bpm:"19vh", bpmUnit:"3.0vh", zone:"2.6vh", zoneSub:"1.3vh",
       sideVal:"2.5vh", sideLbl:"1.0vh", station:"2.9vh", metric:"2.1vh", label:"1.05vh",
       lane:"3.4vh", ic:26, spark:56}
    : {name:"2.2vh", bpm:"10.5vh", bpmUnit:"1.8vh", zone:"1.6vh", zoneSub:"0.95vh",
       sideVal:"1.6vh", sideLbl:"0.8vh", station:"1.9vh", metric:"1.4vh", label:"0.8vh",
       lane:"2.4vh", ic:17, spark:34};

  const sideItem=(label,val,unit,cls="text-neutral-100")=>`
    <div class="text-right leading-none">
      <p class="uppercase text-neutral-600 font-bold" style="font-size:${F.sideLbl};letter-spacing:.1em">${label}</p>
      <p class="font-black tabular ${cls}" style="font-size:${F.sideVal};margin-top:0.2vh">
        ${val}<span class="text-neutral-600 font-bold" style="font-size:${F.sideLbl}"> ${unit}</span>
      </p>
    </div>`;

  return `
  <div class="relative rounded-2xl border-2 border-hyrox bg-gradient-to-br from-neutral-900 to-[#0A0A0A] p-[1.1vh] flex flex-col h-full min-h-0 overflow-hidden">
    <div class="absolute left-0 top-0 bottom-0 w-[0.35vh]" style="background:${zColor}"></div>

    <!-- 헤더 -->
    <div class="flex items-start justify-between shrink-0 pl-[0.7vh] gap-2">
      <div class="min-w-0">
        <h2 class="font-black text-white truncate leading-none" style="font-size:${F.name}">
          ${st.name} <span class="font-light text-neutral-400" style="font-size:${F.zoneSub}">${st.en}</span>
        </h2>
        <p class="text-neutral-500 font-medium truncate" style="font-size:${F.label}">
          ${st.div} · ${st.age} · Target ${mmss(st.targetSec)} · MaxHR ${st.maxHr}
        </p>
      </div>
      <div class="text-right shrink-0">
        <p class="font-black text-neutral-700 leading-none" style="font-size:${F.lane}">${st.id}</p>
        <p class="text-green-400 font-bold flex items-center justify-end gap-1" style="font-size:${F.label}">
          <span class="inline-block rounded-full bg-green-500 heartbeat" style="width:0.7vh;height:0.7vh"></span>LIVE
        </p>
      </div>
    </div>

    <!-- ★ PART 1+2: 좌 BPM/Zone(초대형) | 우 고급지표(세로 소형) -->
    <div class="flex items-stretch gap-[1.2vh] flex-1 min-h-0 pl-[0.7vh] py-[0.4vh]">

      <!-- 좌: BPM + Zone -->
      <div class="flex-1 min-w-0 flex flex-col justify-center">
        <p class="uppercase text-neutral-600 font-bold leading-none" style="font-size:${F.label};letter-spacing:.18em">HEART RATE</p>
        <div class="flex items-baseline gap-1.5 heartbeat" style="margin-top:0.2vh">
          <span class="font-black tabular leading-[0.8]" style="font-size:${F.bpm};color:${zColor}">${st.bpm||"--"}</span>
          <span class="font-bold opacity-60" style="font-size:${F.bpmUnit};color:${zColor}">BPM</span>
        </div>

        <!-- Zone 텍스트 -->
        <div class="flex items-baseline gap-1.5 mt-[0.4vh]">
          <span class="font-black leading-none" style="font-size:${F.zone};color:${zColor}">
            Z${z?z.z:"-"}
          </span>
          <span class="font-bold uppercase leading-none" style="font-size:${F.zoneSub};color:${zColor};opacity:.85">
            ${z?z.name:"—"}
          </span>
          <span class="text-neutral-600 leading-none" style="font-size:${F.zoneSub}">
            ${z?`${z.minBpm}–${z.maxBpm}`:""}
          </span>
        </div>

        <!-- Zone 게이지 -->
        <div class="mt-[0.5vh]">${zoneGaugeHTML(st,size)}</div>
        <div class="flex justify-between mt-[0.2vh]">
          ${st.zones.map(x=>`<span class="text-neutral-700 font-bold" style="font-size:${F.sideLbl}">Z${x.z}</span>`).join("")}
        </div>
      </div>

      <!-- 우: 고급 지표 세로 정렬 -->
      <div class="shrink-0 flex flex-col justify-center gap-[0.9vh] pl-[1vh] border-l border-neutral-800">
        ${sideItem("RMSSD", st.rmssd??"--", "ms", "text-yellow-400")}
        ${sideItem("RESP", st.respiration??"--", "brpm", "text-sky-300")}
        ${sideItem("GCT", st.gct??"—", "ms", st.gct!=null?"text-neutral-100":"text-neutral-700")}
      </div>
    </div>

    <!-- EFT / Variance / 현재구간 -->
    <div class="shrink-0 pl-[0.7vh] flex items-end justify-between gap-2 mb-[0.4vh]">
      <div class="min-w-0">
        <p class="uppercase text-neutral-600 font-bold leading-none" style="font-size:${F.label};letter-spacing:.15em">CURRENT</p>
        ${m.finished
          ? `<p class="font-black text-hyrox" style="font-size:${F.station}">FINISHED</p>`
          : `<div class="flex items-center gap-1.5 text-hyrox min-w-0" style="margin-top:0.2vh">
               ${stationIcon(m.curSeq.icon, F.ic)}
               <p class="font-black truncate leading-none" style="font-size:${F.station}">${m.curSeq.en}</p>
             </div>
             <p class="text-neutral-500 leading-none" style="font-size:${F.label};margin-top:0.15vh">
               ${m.curSeq.ko} · ${m.done+1}/16 · ${mmss(m.segElapsed)} / ${mmss(m.curTarget)}
             </p>`}
      </div>
      <div class="flex gap-[0.6vh] shrink-0">
        <div class="rounded-lg bg-black/50 border border-neutral-800 px-2 py-[0.35vh] text-center">
          <p class="uppercase text-neutral-600 font-bold leading-none" style="font-size:${F.sideLbl}">ELAPSED</p>
          <p class="font-black tabular text-neutral-200 leading-none" style="font-size:${F.metric};margin-top:0.2vh">${mmss(m.elapsed)}</p>
        </div>
        <div class="rounded-lg bg-black/50 border border-neutral-800 px-2 py-[0.35vh] text-center">
          <p class="uppercase text-neutral-600 font-bold leading-none" style="font-size:${F.sideLbl}">EFT</p>
          <p class="font-black tabular leading-none ${m.eft>st.targetSec?'text-red-400':'text-green-400'}" style="font-size:${F.metric};margin-top:0.2vh">${mmss(m.eft)}</p>
        </div>
        <div class="rounded-lg bg-black/50 border border-neutral-800 px-2 py-[0.35vh] text-center">
          <p class="uppercase text-neutral-600 font-bold leading-none" style="font-size:${F.sideLbl}">VAR</p>
          <p class="font-black tabular leading-none ${m.variance>0?'text-red-400':'text-green-400'}" style="font-size:${F.metric};margin-top:0.2vh">${signed(m.variance)}</p>
        </div>
      </div>
    </div>

    <!-- ★ PART 3: 심박 스파크라인 (프로그레스 바 바로 위) -->
    <div class="shrink-0 pl-[0.7vh] mb-[0.3vh]">
      <div class="flex items-center justify-between" style="margin-bottom:0.1vh">
        <span class="uppercase text-neutral-700 font-bold" style="font-size:${F.sideLbl};letter-spacing:.15em">HR TREND · START → NOW</span>
        <span class="text-neutral-700 tabular" style="font-size:${F.sideLbl}">${st.hrHistory.length?`${st.hrHistory.length} pts`:""}</span>
      </div>
      <div id="spark-${idx}" style="height:${F.spark}px"></div>
    </div>

    <!-- 16구간 프로그레스 -->
    <div class="shrink-0 pl-[0.7vh]">${stepperHTML(st,{compact:!full,now})}</div>
  </div>`;
}

/* ═══ TV 화면 ═══ */
function buildTvHTML(tvKey, now, prefix){
  const tv=TVS[tvKey];
  const list=tv.athletes.map(id=>S[id]);
  if(list.length===0){
    return {html:`<div class="w-full h-full flex flex-col items-center justify-center">
      <p class="text-neutral-700 font-black" style="font-size:3.6vh">NO ATHLETE ASSIGNED</p>
      <p class="text-neutral-800 mt-1" style="font-size:1.6vh">디스플레이 통제 센터에서 선수를 할당하세요</p>
    </div>`, mounts:[]};
  }
  const mounts=[];
  if(list.length===1){
    const id=`${prefix}-0`;
    mounts.push({containerId:`spark-${id}`, st:list[0]});
    return {html:`<div class="w-full h-full p-[0.9vh]">${tvCard(list[0],"full",now,id)}</div>`, mounts};
  }
  const n=list.length;
  const cells=list.map((st,i)=>{
    const id=`${prefix}-${i}`;
    mounts.push({containerId:`spark-${id}`, st});
    return `<div class="${cellSpan(n,i)} min-h-0">${tvCard(st,"split",now,id)}</div>`;
  }).join("");
  return {html:`<div class="w-full h-full p-[0.9vh] grid ${tvGridClass(n)} gap-[0.9vh]">${cells}</div>`, mounts};
}

/* 렌더 + 스파크라인 마운트 */
function renderTvInto(elId, tvKey, now, prefix){
  const {html, mounts}=buildTvHTML(tvKey, now, prefix);
  const el=document.getElementById(elId);
  if(!el) return;
  el.innerHTML=html;
  mounts.forEach(({containerId,st})=>{
    const z=zoneOf(st.bpm, st.zones);
    const h=st===null?0:0;
    mountSparkline(containerId, st, document.getElementById(containerId)?.clientHeight||40, z);
  });
}
