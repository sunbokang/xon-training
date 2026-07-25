/* ═══════════════════════════════════════════════════════════════
   PART 2 · BLE 오토스캔 (코치 친화적 원클릭 페어링)
   실제로는 ble_scanner.py의 http://localhost:8765/scan 을 호출.
   프리뷰에서는 목 데이터로 UX를 시연.
   ═══════════════════════════════════════════════════════════════ */
let scanState = { open:false, scanning:false, results:[], targetAthlete:null };

const MOCK_SCAN_RESULTS = [
  {address:"D1:A2:33:44:55:66", name:"HRM-Pro:0451234", rssi:-52, is_hr:true},
  {address:"E7:B8:99:AA:BB:CC", name:"HRM-Pro:0459876", rssi:-61, is_hr:true},
  {address:"F2:C3:44:55:66:77", name:"Polar H10 8B2C", rssi:-68, is_hr:true},
  {address:"A9:D4:55:66:77:88", name:"Garmin HRM-Dual", rssi:-74, is_hr:true},
  {address:"11:22:33:44:55:66", name:"Unknown Device", rssi:-88, is_hr:false},
];

function openScan(athleteId){
  scanState = { open:true, scanning:true, results:[], targetAthlete:athleteId };
  renderScanModal();
  // 실제: fetch('http://localhost:8765/scan').then(...)
  // 프리뷰: 1.2초 후 목 결과
  setTimeout(()=>{
    scanState.scanning=false;
    scanState.results=MOCK_SCAN_RESULTS;
    renderScanModal();
  }, 1200);
}
function closeScan(){ scanState.open=false; renderScanModal(); }
function pairDevice(addr, name){
  const id=scanState.targetAthlete;
  if(id && S[id]){
    S[id].sensorAddr=addr;
    S[id].sensorName=name;
    S[id].connected=true;
  }
  closeScan();
  renderAll();
}

function renderScanModal(){
  const el=document.getElementById("scan-modal");
  if(!el) return;
  if(!scanState.open){ el.classList.remove("active"); el.innerHTML=""; return; }
  el.classList.add("active");
  const st=S[scanState.targetAthlete];
  el.innerHTML=`
    <div class="absolute inset-0 bg-black/70" onclick="closeScan()"></div>
    <div class="relative bg-neutral-950 border border-neutral-800 rounded-2xl p-5 w-[92%] max-w-md z-10">
      <div class="flex items-center justify-between mb-1">
        <h3 class="text-lg font-black">주변 심박계 찾기</h3>
        <button onclick="closeScan()" class="text-neutral-500 text-sm btn-press">✕</button>
      </div>
      <p class="text-[11px] text-neutral-500 mb-4">${st?st.name+" ("+st.en+") 에 연결":""} · 심박계를 착용하세요</p>
      ${scanState.scanning ? `
        <div class="py-10 text-center">
          <div class="inline-block w-10 h-10 border-3 border-hyrox border-t-transparent rounded-full animate-spin mb-3" style="border-width:3px"></div>
          <p class="text-sm text-neutral-400">주변 BLE 기기 검색 중...</p>
          <p class="text-[11px] text-neutral-600 mt-1">ble_scanner.py 서비스 호출</p>
        </div>
      ` : `
        <div class="space-y-2 max-h-[50vh] overflow-y-auto">
          ${scanState.results.map(d=>`
            <button onclick="pairDevice('${d.address}','${d.name}')"
              class="btn-press w-full flex items-center justify-between px-3 py-3 rounded-xl border ${d.is_hr?'border-neutral-700 bg-neutral-900 hover:border-hyrox':'border-neutral-800 bg-neutral-950 opacity-60'}">
              <div class="text-left min-w-0">
                <p class="text-sm font-bold ${d.is_hr?'text-neutral-100':'text-neutral-500'} truncate flex items-center gap-1.5">
                  ${d.is_hr?'<span class="text-hyrox">♥</span>':''}${d.name}
                </p>
                <p class="text-[10px] text-neutral-600 font-mono">${d.address}</p>
              </div>
              <div class="text-right shrink-0 ml-2">
                <div class="flex items-center gap-0.5 justify-end">
                  ${[1,2,3,4].map(bar=>{
                    const strength = d.rssi>-55?4:d.rssi>-65?3:d.rssi>-75?2:1;
                    return `<span class="inline-block w-1 rounded-sm ${bar<=strength?'bg-green-500':'bg-neutral-700'}" style="height:${bar*3+2}px"></span>`;
                  }).join("")}
                </div>
                <p class="text-[9px] text-neutral-600 mt-0.5">${d.rssi} dBm</p>
              </div>
            </button>
          `).join("")}
        </div>
        <button onclick="openScan(${scanState.targetAthlete})" class="btn-press w-full mt-3 py-2.5 rounded-xl border border-neutral-700 text-neutral-400 text-sm font-bold">🔄 다시 스캔</button>
      `}
    </div>`;
}

/* 디바이스 상태 매트릭스 (Connected/Latency/Tx·Rx) */
function deviceMatrixHTML(st){
  const conn = st.started && st.connected;
  const latColor = st.latencyMs<80?"text-green-400":st.latencyMs<150?"text-yellow-400":"text-red-400";
  return `
    <div class="grid grid-cols-4 gap-1.5">
      <div class="rounded-lg bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-center">
        <p class="text-[9px] uppercase tracking-wider text-neutral-600">Status</p>
        <p class="text-xs font-black flex items-center justify-center gap-1 mt-0.5 ${conn?'text-green-400':'text-neutral-600'}">
          <span class="w-1.5 h-1.5 rounded-full ${conn?'bg-green-500 dot-live':'bg-neutral-700'}"></span>${conn?'ON':'OFF'}
        </p>
      </div>
      <div class="rounded-lg bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-center">
        <p class="text-[9px] uppercase tracking-wider text-neutral-600">Latency</p>
        <p class="text-xs font-black tabular mt-0.5 ${conn?latColor:'text-neutral-700'}">${conn?st.latencyMs+'ms':'--'}</p>
      </div>
      <div class="rounded-lg bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-center">
        <p class="text-[9px] uppercase tracking-wider text-neutral-600">Tx</p>
        <p class="text-xs font-black tabular mt-0.5 ${conn&&st.txCount%2?'text-hyrox':'text-neutral-500'}">▲ ${conn?st.txCount:'--'}</p>
      </div>
      <div class="rounded-lg bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-center">
        <p class="text-[9px] uppercase tracking-wider text-neutral-600">Rx</p>
        <p class="text-xs font-black tabular mt-0.5 ${conn&&st.rxCount%2?'text-green-400':'text-neutral-500'}">▼ ${conn?st.rxCount:'--'}</p>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   측정관 통제 (탭 + 초대형 버튼 + 500ms 디바운스)
   ═══════════════════════════════════════════════════════════════ */
let refSelected=1, lastPress=-Infinity;
const DEBOUNCE_MS=500;

function handleNext(){
  const now=Date.now();
  if(now-lastPress<DEBOUNCE_MS){ console.log(`[debounce] blocked (${now-lastPress}ms)`); return; }
  lastPress=now;
  const st=S[refSelected]; if(!st.started) return;
  const m=computeMetrics(st); if(m.finished) return;
  st.splits.push({k:SEQ[m.done].k, sec:m.segElapsed, target:m.curTarget});
  st.current=st.splits.length;
  renderAll();
}
function handleUndo(){
  const st=S[refSelected]; if(!st.splits.length) return;
  st.splits.pop(); st.current=st.splits.length; renderAll();
}
function selectRef(id){ refSelected=id; renderAll(); }
function doStart(id){ startAthlete(id); renderAll(); }
function doStop(id){
  if(!confirm(`${S[id].name} 선수의 타이머를 정지하고 기록을 초기화할까요?`)) return;
  stopAthlete(id); S[id].splits=[]; S[id].current=0; S[id].hrHistory=[]; renderAll();
}
function onAssign(id,tv){ assignAthlete(id, tv==="none"?null:tv); renderAll(); }

/* ★ PART 4 · 나이 / 최대심박 변경 → 존 재정의 */
function onAgeChange(id, val){
  const n=parseInt(val,10);
  updateAthleteHr(id, {ageNum: isNaN(n)?null:n});
  renderAll();
}
function onMaxHrChange(id, val){
  const n=parseInt(val,10);
  updateAthleteHr(id, {maxHrManual: isNaN(n)||n<=0 ? null : n});
  renderAll();
}
function onMaxHrReset(id){
  updateAthleteHr(id, {maxHrManual:null});
  renderAll();
}

let previewTv="tv1";
function setPreviewTv(k){ previewTv=k; renderAll(); }

/* ═══════════════════════════════════════════════════════════════
   VIEW A · ADMIN
   ═══════════════════════════════════════════════════════════════ */
function renderAdmin(){
  const now=Date.now();

  document.getElementById("tv-control").innerHTML = Object.entries(TVS).map(([k,tv])=>{
    const n=tv.athletes.length;
    const layout=n===0?"미할당":n===1?"1×1 단독":n===2?"1×2 분할":n===3?"상2·하1":"2×2 분할";
    return `<button onclick="setPreviewTv('${k}')"
      class="btn-press rounded-xl border p-3 text-left ${previewTv===k?'border-hyrox bg-hyrox/10':'border-neutral-800 bg-neutral-950'}">
      <div class="flex items-center justify-between">
        <p class="text-sm font-black ${previewTv===k?'text-hyrox':'text-neutral-300'}">${tv.label}</p>
        <span class="text-[10px] px-1.5 py-0.5 rounded ${n?'bg-hyrox/20 text-hyrox':'bg-neutral-800 text-neutral-600'}">${layout}</span>
      </div>
      <p class="text-[11px] ${n?'text-neutral-400':'text-neutral-700'} truncate mt-0.5">
        ${n?tv.athletes.map(i=>S[i].name).join(", "):"선수를 할당하세요"}
      </p>
    </button>`;
  }).join("");

  document.getElementById("admin-rows").innerHTML = ATHLETES.map(a=>{
    const st=S[a.id], m=computeMetrics(st,now);
    const cur=tvOfAthlete(a.id)??"none";
    const z=zoneOf(st.bpm, st.zones);
    const isManual = st.maxHrManual!=null;

    // 존 테이블
    const zoneRows=st.zones.map(x=>{
      const isCur=z&&x.z===z.z;
      return `<div class="flex items-center gap-2 py-[3px] ${isCur?'bg-white/5 rounded':''}">
        <span class="w-1.5 h-4 rounded-sm shrink-0" style="background:${x.color}"></span>
        <span class="text-[11px] font-black w-5" style="color:${x.color}">Z${x.z}</span>
        <span class="text-[11px] text-neutral-400 flex-1 truncate">${x.name} <span class="text-neutral-600">${x.ko}</span></span>
        <span class="text-[11px] tabular text-neutral-300 shrink-0">${x.minBpm}–${x.maxBpm}</span>
        ${isCur?`<span class="text-[9px] font-black px-1 rounded shrink-0" style="background:${x.color}22;color:${x.color}">NOW</span>`:'<span class="w-8 shrink-0"></span>'}
      </div>`;
    }).join("");

    return `
    <section class="rounded-2xl border ${st.started?'border-hyrox':'border-neutral-800'} bg-neutral-950 p-4">
      <div class="flex items-start justify-between mb-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-lg font-black">${a.name}</span>
            <span class="text-xs text-neutral-500 truncate">${a.en}</span>
          </div>
          <p class="text-[11px] text-neutral-500">${a.div} · ${a.age} · Target ${mmss(a.targetSec)}</p>
        </div>
        <span class="text-2xl font-black text-neutral-700 shrink-0">${a.id}</span>
      </div>

      <!-- ★ Part 2: BLE 스캔 + 디바이스 상태 매트릭스 -->
      <div class="mb-3">
        <div class="flex items-center justify-between mb-2">
          <p class="text-[10px] uppercase tracking-[0.15em] text-neutral-500">Device · ${st.sensorName||st.device}</p>
          <button onclick="openScan(${a.id})" class="btn-press text-[11px] text-hyrox font-bold px-2 py-1 rounded-lg border border-hyrox/40">
            🔍 주변 심박계 찾기
          </button>
        </div>
        ${deviceMatrixHTML(st)}
      </div>

      <!-- 라이브 요약 -->
      <div class="grid grid-cols-4 gap-1.5 mb-3">
        <div class="rounded-lg bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-center">
          <p class="text-[9px] uppercase tracking-wider text-neutral-600">BPM</p>
          <p class="text-base font-black tabular" style="color:${z?z.color:'#a3a3a3'}">${st.bpm||'--'}</p>
        </div>
        <div class="rounded-lg bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-center">
          <p class="text-[9px] uppercase tracking-wider text-neutral-600">RMSSD</p>
          <p class="text-base font-black tabular text-yellow-400">${st.rmssd??'--'}</p>
        </div>
        <div class="rounded-lg bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-center">
          <p class="text-[9px] uppercase tracking-wider text-neutral-600">RESP</p>
          <p class="text-base font-black tabular text-sky-300">${st.respiration??'--'}</p>
        </div>
        <div class="rounded-lg bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-center">
          <p class="text-[9px] uppercase tracking-wider text-neutral-600">GCT</p>
          <p class="text-base font-black tabular ${st.gct!=null?'text-neutral-200':'text-neutral-700'}">${st.gct??'—'}</p>
        </div>
      </div>

      <!-- ★ PART 4: Z1~Z5 개인화 -->
      <div class="rounded-xl border border-neutral-800 bg-neutral-900 p-3 mb-3">
        <p class="text-[10px] uppercase tracking-[0.15em] text-neutral-500 mb-2">Heart Rate Zones · 개인화</p>
        <div class="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label class="text-[10px] text-neutral-500">나이 (Age)</label>
            <input type="number" value="${st.ageNum??''}" min="10" max="90"
              onchange="onAgeChange(${a.id}, this.value)"
              class="w-full bg-black border border-neutral-700 rounded-lg px-2 py-1.5 text-sm mt-0.5 tabular focus:border-hyrox outline-none" />
          </div>
          <div>
            <label class="text-[10px] text-neutral-500">Max HR ${isManual?'<span class="text-hyrox">(직접)</span>':'<span class="text-neutral-600">(220−나이)</span>'}</label>
            <div class="flex gap-1 mt-0.5">
              <input type="number" value="${st.maxHr}" min="120" max="220"
                onchange="onMaxHrChange(${a.id}, this.value)"
                class="flex-1 min-w-0 bg-black border rounded-lg px-2 py-1.5 text-sm tabular focus:border-hyrox outline-none ${isManual?'border-hyrox text-hyrox':'border-neutral-700'}" />
              ${isManual?`<button onclick="onMaxHrReset(${a.id})" title="자동(220−나이)으로 되돌리기"
                class="btn-press px-2 rounded-lg border border-neutral-700 text-neutral-500 text-xs shrink-0">↺</button>`:''}
            </div>
          </div>
        </div>
        <div class="border-t border-neutral-800 pt-1.5">${zoneRows}</div>
        <p class="text-[10px] text-neutral-600 mt-1.5">
          나이나 Max HR을 바꾸면 Z1~Z5 구간과 화면 색상이 즉시 재정의됩니다.
        </p>
      </div>

      <!-- TV 할당 -->
      <label class="text-[10px] uppercase tracking-[0.15em] text-neutral-500">Display Assignment</label>
      <select onchange="onAssign(${a.id}, this.value)"
        class="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-sm mt-1 mb-3 focus:border-hyrox outline-none">
        <option value="tv1"  ${cur==="tv1"?"selected":""}>TV 1</option>
        <option value="tv2"  ${cur==="tv2"?"selected":""}>TV 2</option>
        <option value="tv3"  ${cur==="tv3"?"selected":""}>TV 3</option>
        <option value="none" ${cur==="none"?"selected":""}>표시 안 함</option>
      </select>

      <!-- Wave Start -->
      ${st.started?`
        <div class="rounded-xl bg-neutral-900 border border-neutral-800 p-3">
          <div class="flex items-center justify-between mb-2">
            <div>
              <p class="text-[10px] uppercase tracking-[0.15em] text-neutral-500">Running</p>
              <p class="text-2xl font-black tabular text-hyrox">${mmss(m.elapsed)}</p>
            </div>
            <div class="text-right">
              <p class="text-[10px] uppercase tracking-[0.15em] text-neutral-500">EFT / VAR</p>
              <p class="text-sm font-black tabular ${m.eft>st.targetSec?'text-red-400':'text-green-400'}">${mmss(m.eft)}</p>
              <p class="text-xs font-bold tabular ${m.variance>0?'text-red-400':'text-green-400'}">${signed(m.variance)}</p>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <p class="text-xs text-neutral-500">${m.done} / 16 segments</p>
            <button onclick="doStop(${a.id})" class="btn-press px-3 py-1.5 rounded-lg border border-red-900 text-red-400 text-xs font-bold hover:bg-red-950/40">■ STOP</button>
          </div>
        </div>
      `:`
        <button onclick="doStart(${a.id})" class="btn-press w-full bg-green-600 hover:bg-green-500 text-white font-black py-3.5 rounded-xl text-base shadow-[0_0_20px_rgba(22,163,74,0.28)]">▶ START</button>
        <p class="text-[10px] text-neutral-600 text-center mt-1.5">누른 시점부터 독립 타이머가 시작됩니다</p>
      `}
    </section>`;
  }).join("");

  renderTvInto("tv-preview", previewTv, now, "pv");
  const n=TVS[previewTv].athletes.length;
  document.getElementById("preview-label").textContent =
    `${TVS[previewTv].label} · ${n}명 · ${n===0?"미할당":n===1?"1×1":n===2?"1×2":n===3?"상2·하1":"2×2"}`;
}

/* ═══════════════════════════════════════════════════════════════
   VIEW B · REFEREE
   ═══════════════════════════════════════════════════════════════ */
function renderReferee(){
  const now=Date.now();
  document.getElementById("ref-tabs").innerHTML = ATHLETES.map(a=>{
    const st=S[a.id], sel=refSelected===a.id, m=computeMetrics(st,now);
    const z=zoneOf(st.bpm, st.zones);
    return `<button onclick="selectRef(${a.id})"
      class="btn-press py-2.5 px-1 rounded-xl border ${sel?'bg-hyrox border-hyrox text-white':'bg-neutral-900 border-neutral-800 text-neutral-400'}">
      <p class="text-sm font-black leading-tight truncate">${a.name}</p>
      <p class="text-[10px] tabular ${sel?'text-white/80':'text-neutral-600'}">
        ${st.started?`${m.done}/16 · ${mmss(m.elapsed)}`:"STANDBY"}
      </p>
      ${st.started&&z?`<p class="text-[9px] font-black" style="color:${sel?'#fff':z.color}">Z${z.z} · ${st.bpm}</p>`:''}
    </button>`;
  }).join("");

  const st=S[refSelected], m=computeMetrics(st,now);
  const body=document.getElementById("ref-body");

  if(!st.started){
    body.innerHTML=`<div class="rounded-2xl border border-neutral-800 bg-neutral-950 p-8 text-center">
      <p class="text-2xl font-black text-neutral-600 mb-1">STANDBY</p>
      <p class="text-sm text-neutral-500 mb-5">${st.name} (${st.en}) 선수는 아직 출발하지 않았습니다.</p>
      <button onclick="doStart(${st.id})" class="btn-press w-[85%] bg-green-600 hover:bg-green-500 text-white font-black py-6 rounded-2xl text-2xl shadow-[0_0_30px_rgba(22,163,74,0.35)]">▶ START</button>
    </div>`;
    return;
  }

  const z=zoneOf(st.bpm, st.zones);
  const zc=z?z.color:"#E05D29";

  body.innerHTML=`
    <section class="rounded-2xl border-2 border-hyrox bg-gradient-to-br from-neutral-900 to-neutral-950 p-4 md:p-5 mb-3">
      <!-- BPM + Zone 우선 -->
      <div class="flex items-center justify-between gap-4 mb-3">
        <div class="min-w-0">
          <p class="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Heart Rate</p>
          <div class="flex items-baseline gap-2 heartbeat">
            <span class="text-6xl md:text-7xl font-black tabular leading-none" style="color:${zc}">${st.bpm||'--'}</span>
            <span class="text-lg font-bold opacity-60" style="color:${zc}">BPM</span>
          </div>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-xl font-black" style="color:${zc}">Z${z?z.z:'-'}</span>
            <span class="text-sm font-bold uppercase" style="color:${zc};opacity:.85">${z?z.name:'—'}</span>
            <span class="text-xs text-neutral-600">${z?`${z.minBpm}–${z.maxBpm}`:''}</span>
          </div>
        </div>
        <div class="shrink-0 flex flex-col gap-2 text-right border-l border-neutral-800 pl-4">
          <div><p class="text-[9px] uppercase tracking-wider text-neutral-600">RMSSD</p>
            <p class="text-lg font-black tabular text-yellow-400">${st.rmssd??'--'}<span class="text-[10px] text-neutral-600"> ms</span></p></div>
          <div><p class="text-[9px] uppercase tracking-wider text-neutral-600">RESP</p>
            <p class="text-lg font-black tabular text-sky-300">${st.respiration??'--'}<span class="text-[10px] text-neutral-600"> brpm</span></p></div>
          <div><p class="text-[9px] uppercase tracking-wider text-neutral-600">GCT</p>
            <p class="text-lg font-black tabular ${st.gct!=null?'text-neutral-100':'text-neutral-700'}">${st.gct??'—'}<span class="text-[10px] text-neutral-600"> ms</span></p></div>
        </div>
      </div>

      <div class="mb-3">${zoneGaugeHTML(st,"split")}</div>

      <!-- 현재 구간 -->
      <div class="flex items-start justify-between gap-3 pt-3 border-t border-neutral-800">
        <div class="min-w-0">
          <p class="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Current Station</p>
          ${m.finished?`<p class="text-2xl font-black text-hyrox">FINISHED</p>`:`
            <div class="flex items-center gap-2 text-hyrox min-w-0">
              ${stationIcon(m.curSeq.icon,26)}
              <p class="text-2xl md:text-3xl font-black truncate">${m.curSeq.en}</p>
            </div>
            <p class="text-sm text-neutral-400">${m.curSeq.ko} · <span class="text-neutral-300 font-bold">${m.done+1}</span>/16</p>`}
        </div>
        <div class="text-right shrink-0">
          <p class="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Split</p>
          <p class="text-3xl md:text-4xl font-black tabular ${m.segElapsed>(m.curTarget??1e9)?'text-red-400':'text-green-400'}">${m.finished?'--:--':mmss(m.segElapsed)}</p>
          <p class="text-[11px] text-neutral-600 tabular">Target ${m.finished?'--:--':mmss(m.curTarget)}</p>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-1.5 mt-3">
        ${[["ELAPSED",mmss(m.elapsed),"text-neutral-200"],
           ["EFT",mmss(m.eft),m.eft>st.targetSec?"text-red-400":"text-green-400"],
           ["VARIANCE",signed(m.variance),m.variance>0?"text-red-400":"text-green-400"]]
          .map(([l,v,c])=>`<div class="rounded-xl bg-black/50 border border-neutral-800 px-2 py-2 text-center">
            <p class="text-[9px] uppercase tracking-wider text-neutral-600">${l}</p>
            <p class="text-base font-black tabular ${c}">${v}</p></div>`).join("")}
      </div>

      <!-- 스파크라인 -->
      <div class="mt-3">
        <p class="text-[9px] uppercase tracking-[0.15em] text-neutral-700 mb-0.5">HR Trend · Start → Now</p>
        <div id="spark-ref" style="height:52px"></div>
      </div>

      <div class="mt-2">${stepperHTML(st,{compact:true,showTime:false,now})}</div>
    </section>

    <div class="flex justify-center mb-2">
      <button onclick="handleNext()" ${m.finished?"disabled":""}
        class="btn-press w-[92%] md:w-[85%] rounded-3xl py-9 md:py-11 flex flex-col items-center justify-center
        ${m.finished?'bg-neutral-800 text-neutral-600':'bg-hyrox hover:bg-[#c94e20] text-white shadow-[0_0_40px_rgba(224,93,41,0.35)]'}">
        <span class="text-4xl md:text-5xl font-black tracking-tight leading-none">${m.finished?"FINISHED":"▶ NEXT"}</span>
        <span class="text-lg md:text-2xl font-bold tracking-[0.15em] mt-1.5 opacity-90">${m.finished?"COMPLETE":"STATION"}</span>
      </button>
    </div>
    <div class="flex justify-center mb-4">
      <button onclick="handleUndo()" class="btn-press px-6 py-2.5 rounded-xl border border-neutral-700 text-neutral-400 text-sm font-bold hover:border-neutral-500">↶ UNDO</button>
    </div>

    <section class="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Split Records</p>
        <span class="text-[10px] text-neutral-600">${st.splits.length} records</span>
      </div>
      <div class="max-h-[30vh] overflow-y-auto space-y-1.5">
        ${st.splits.length===0?'<p class="text-xs text-neutral-700 text-center py-5">No records yet</p>'
          :st.splits.map((s,i)=>({s,i})).reverse().map(({s,i})=>{
            const q=SEQ[i],over=s.sec>s.target,d=s.sec-s.target;
            return `<div class="flex items-center justify-between px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 ${i===st.splits.length-1?'split-new':''}">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-[10px] font-black text-neutral-700 tabular w-5 shrink-0">${String(i+1).padStart(2,"0")}</span>
                <span class="text-neutral-500 shrink-0">${stationIcon(q.icon,16)}</span>
                <div class="min-w-0">
                  <p class="text-sm text-neutral-300 truncate leading-tight">${q.en}</p>
                  <p class="text-[10px] text-neutral-600 leading-tight">${q.ko}</p>
                </div>
              </div>
              <div class="text-right shrink-0 ml-2">
                <p class="text-sm font-black tabular ${over?'text-red-400':'text-green-400'}">${mmss(s.sec)}</p>
                <p class="text-[10px] tabular ${over?'text-red-500/70':'text-green-500/70'}">${d>0?'+':''}${d}s</p>
              </div>
            </div>`;
          }).join("")}
      </div>
    </section>`;

  mountSparkline("spark-ref", st, 52, z);
}

/* ═══════════════════════════════════════════════════════════════
   VIEW C · TV OUTPUT
   ═══════════════════════════════════════════════════════════════ */
let fsTv=null;
function openTv(k){
  fsTv=k;
  document.getElementById("fs-label").textContent=TVS[k].label;
  document.getElementById("fs-overlay").classList.add("active");
  renderTvInto("fs-content", k, Date.now(), "fs");
}
function closeTv(){
  fsTv=null;
  document.getElementById("fs-overlay").classList.remove("active");
}
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeTv(); });

function renderTvView(){
  const now=Date.now();
  document.getElementById("tv-grid").innerHTML = Object.entries(TVS).map(([k,tv])=>{
    const n=tv.athletes.length;
    return `<div class="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
      <div class="flex items-center justify-between mb-2">
        <div><p class="text-sm font-black text-neutral-200">${tv.label}</p>
        <p class="text-[11px] text-neutral-600">${n?tv.athletes.map(i=>S[i].name).join(", "):"미할당"}</p></div>
        <button onclick="openTv('${k}')" class="btn-press text-xs text-hyrox font-bold px-2 py-1 rounded-lg border border-hyrox/40">⛶ 전체화면</button>
      </div>
      <div class="w-full rounded-xl overflow-hidden border border-neutral-800 bg-black" style="aspect-ratio:16/9">
        <div id="tvbox-${k}" class="w-full h-full"></div>
      </div>
    </div>`;
  }).join("");
  Object.keys(TVS).forEach(k=>renderTvInto(`tvbox-${k}`, k, now, `tv-${k}`));
}

/* ═══ 뷰 전환 & 루프 ═══ */
let activeView="admin";
function showView(v){
  activeView=v;
  ["admin","referee","tv"].forEach(x=>{
    document.getElementById("view-"+x).classList.toggle("active",x===v);
    document.getElementById("nav-"+x).className=
      "py-2.5 rounded-xl font-bold text-sm btn-press "+(x===v?"bg-hyrox text-white":"bg-neutral-800 text-neutral-400");
  });
  renderAll();
}

function renderAll(){
  const now=Date.now();
  tickHR(now);
  if(activeView==="admin") renderAdmin();
  if(activeView==="referee") renderReferee();
  if(activeView==="tv") renderTvView();
  if(fsTv) renderTvInto("fs-content", fsTv, now, "fs");
  renderScanModal();
  const d=new Date();
  document.getElementById("wallclock").textContent=
    `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

/* ═══ 초기화 ═══ */
//seed(1,4,0.05,45);
//seed(2,3,-0.02,80);
//seed(3,1,0.09,120);
tickHR(Date.now());
showView("admin");
setInterval(renderAll,1000);
