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

// ble_scanner.py --serve 의 주소 (기본 로컬)
let SCAN_ENDPOINT = (function(){
  try{ return localStorage.getItem("xon_scan_url") || "http://localhost:8765/scan"; }
  catch(e){ return "http://localhost:8765/scan"; }
})();

function openScan(athleteId){
  scanState = { open:true, scanning:true, results:[], targetAthlete:athleteId, source:"" };
  renderScanModal();
  // 실제 스캐너 서비스 호출 (python ble_scanner.py --serve)
  fetch(SCAN_ENDPOINT, {cache:"no-store"})
    .then(r=>r.json())
    .then(list=>{
      scanState.scanning=false;
      scanState.results=Array.isArray(list)?list:[];
      scanState.source="live";
      renderScanModal();
    })
    .catch(err=>{
      // 스캐너 미실행 시: 목 데이터로 UX만 시연 (실사용 아님을 명시)
      scanState.scanning=false;
      scanState.results=MOCK_SCAN_RESULTS;
      scanState.source="mock";
      renderScanModal();
    });
}
function closeScan(){ scanState.open=false; renderScanModal(); }
function pairDevice(addr, name){
  const id=scanState.targetAthlete;
  if(id && S[id]){
    // 스캔한 기기 주소를 그대로 sensor(=파이썬 athlete_id)로 쓰지 않고,
    // 표시용 이름/주소만 저장. 실제 라우팅 키(sensor)는 config.py와 맞춘 값 유지.
    S[id].sensorAddr=addr;
    S[id].sensorName=name;
    S[id].device=name;
    const a=ATHLETES.find(x=>x.id===id); if(a){ a.device=name; }
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
  // 마지막 구간까지 기록되면 완주 → DB 저장
  if(st.splits.length>=SEQ.length){ persistFinish(st); }
  renderAll();
}

/* 경기 종료 시 결과+스플릿+분석을 Supabase에 저장 */
async function persistFinish(st){
  if(st._saved) return;             // 중복 저장 방지
  st._saved = true;
  // 스플릿에 라벨 부여
  const splits = st.splits.map((s,i)=>({...s, label:(SEQ[i]?SEQ[i].en:s.k)}));
  // 룰 엔진 분석 (심박 회복은 이력에서 근사)
  let analysis=null;
  try{
    const hrByStep = buildHrByStep(st);
    analysis = runRuleAnalysis(splits, hrByStep, st.guidance);
    analysis.gemini = mockGeminiResponse(analysis);   // 실제 배포 시 Gemini API로 교체
  }catch(e){}
  const rid = await DB.saveResult(st, splits, analysis);
  const el=document.getElementById("save-toast");
  if(el){
    el.textContent = rid ? `✅ ${st.name} 기록 저장됨 (result #${rid})`
                         : `⚠ ${st.name} 기록 — DB 미연결(로컬만)`;
    el.classList.remove("hidden");
    setTimeout(()=>el.classList.add("hidden"), 4000);
  }
}

/* 심박 이력에서 스테이션 종료/러닝 중간 심박 근사 (룰엔진 입력용) */
function buildHrByStep(st){
  const out={};
  if(!st.hrHistory || !st.hrHistory.length) return out;
  // 각 구간의 경과 구간(누적초)을 계산해 해당 시점 심박을 추출
  let cum=0;
  st.splits.forEach((sp,i)=>{
    const startT=cum, endT=cum+sp.sec; cum=endT;
    const at=(t)=>{ let best=null; for(const h of st.hrHistory){ if(h.t<=t) best=h.bpm; else break; } return best; };
    const key=sp.k;
    if(key.startsWith("run_")) out[key]={mid:at((startT+endT)/2)};
    else out[key]={end:at(endT-1)};
  });
  return out;
}
function handleUndo(){
  const st=S[refSelected]; if(!st.splits.length) return;
  st.splits.pop(); st.current=st.splits.length; renderAll();
}
function selectRef(id){ refSelected=id; renderAll(); }
function doStart(id){ startAthlete(id); S[id]._saved=false; DB.upsertAthlete(S[id]); renderAll(); }
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
   MQTT 브로커 설정 패널 (로컬 ws / 클라우드 wss 전환)
   ═══════════════════════════════════════════════════════════════ */
let brokerPanel={open:false};
function openBroker(){ brokerPanel.open=true; renderBroker(); }
function closeBroker(){ brokerPanel.open=false; renderBroker(); }
function applyBroker(){
  const g=id=>document.getElementById(id);
  const c={
    host:g("bk-host").value.trim(),
    port:parseInt(g("bk-port").value,10)||9001,
    path:g("bk-path").value.trim()||"/mqtt",
    useTls:g("bk-tls").value==="wss",
    username:g("bk-user").value.trim(),
    password:g("bk-pass").value,
  };
  LiveMqtt.connect(c);
  try{ localStorage.setItem("xon_scan_url", g("bk-scan").value.trim()||"http://localhost:8765/scan"); }catch(e){}
  SCAN_ENDPOINT = g("bk-scan").value.trim()||"http://localhost:8765/scan";
  // Supabase 재설정
  const suburl=g("bk-suburl").value.trim(), subkey=g("bk-subkey").value.trim();
  if(suburl && subkey){ DB.init({url:suburl, key:subkey}); }
  closeBroker();
}
function renderBroker(){
  const el=document.getElementById("broker-panel");
  if(!el) return;
  if(!brokerPanel.open){ el.classList.remove("active"); el.innerHTML=""; return; }
  el.classList.add("active");
  const c=LiveMqtt.loadConfig();
  let scanUrl="http://localhost:8765/scan";
  try{ scanUrl=localStorage.getItem("xon_scan_url")||scanUrl; }catch(e){}
  el.innerHTML=`
    <div class="absolute inset-0 bg-black/70" onclick="closeBroker()"></div>
    <div class="relative bg-neutral-950 border border-neutral-800 rounded-2xl p-5 w-[94%] max-w-lg z-10 max-h-[88vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-1">
        <h3 class="text-lg font-black">MQTT 브로커 연결</h3>
        <button onclick="closeBroker()" class="text-neutral-500 text-sm btn-press">✕</button>
      </div>
      <p class="text-[11px] text-neutral-500 mb-4">로컬(ws://localhost:9001) 또는 클라우드(wss) 브로커로 전환합니다.</p>
      <div class="space-y-3">
        <div class="grid grid-cols-4 gap-2">
          <div class="col-span-1">
            <label class="text-[11px] text-neutral-500">프로토콜</label>
            <select id="bk-tls" class="w-full bg-black border border-neutral-700 rounded-lg px-2 py-2.5 text-sm mt-0.5 focus:border-hyrox outline-none">
              <option value="ws" ${!c.useTls?"selected":""}>ws</option>
              <option value="wss" ${c.useTls?"selected":""}>wss</option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="text-[11px] text-neutral-500">호스트</label>
            <input id="bk-host" value="${c.host}" class="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-sm mt-0.5 font-mono focus:border-hyrox outline-none" />
          </div>
          <div class="col-span-1">
            <label class="text-[11px] text-neutral-500">포트</label>
            <input id="bk-port" type="number" value="${c.port}" class="w-full bg-black border border-neutral-700 rounded-lg px-2 py-2.5 text-sm mt-0.5 tabular focus:border-hyrox outline-none" />
          </div>
        </div>
        <div>
          <label class="text-[11px] text-neutral-500">경로(path)</label>
          <input id="bk-path" value="${c.path}" class="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-sm mt-0.5 font-mono focus:border-hyrox outline-none" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-[11px] text-neutral-500">사용자(선택)</label>
            <input id="bk-user" value="${c.username||""}" class="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-sm mt-0.5 focus:border-hyrox outline-none" />
          </div>
          <div>
            <label class="text-[11px] text-neutral-500">비밀번호(선택)</label>
            <input id="bk-pass" type="password" value="${c.password||""}" class="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-sm mt-0.5 focus:border-hyrox outline-none" />
          </div>
        </div>
        <div>
          <label class="text-[11px] text-neutral-500">BLE 스캐너 주소 (ble_scanner.py --serve)</label>
          <input id="bk-scan" value="${scanUrl}" class="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-sm mt-0.5 font-mono focus:border-hyrox outline-none" />
        </div>
        <div class="border-t border-neutral-800 pt-3 mt-1">
          <p class="text-[11px] uppercase tracking-widest text-neutral-500 mb-2">Supabase (기록 저장 · 선택)</p>
          <label class="text-[11px] text-neutral-500">Project URL</label>
          <input id="bk-suburl" value="${(DB.loadConfig().url||"")}" placeholder="https://xxxx.supabase.co"
            class="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-sm mt-0.5 mb-2 font-mono focus:border-hyrox outline-none" />
          <label class="text-[11px] text-neutral-500">anon key</label>
          <input id="bk-subkey" value="${(DB.loadConfig().key||"")}" type="password" placeholder="eyJ..."
            class="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-sm mt-0.5 font-mono focus:border-hyrox outline-none" />
          <p class="text-[10px] text-neutral-600 mt-1">비워두면 실시간 표시는 정상 동작하고 기록 저장만 건너뜁니다.</p>
        </div>
        <div class="rounded-lg bg-neutral-900 border border-neutral-800 p-3">
          <p class="text-[11px] text-neutral-500">현재 연결 대상</p>
          <p class="text-sm font-mono text-hyrox">${LiveMqtt.buildUrl(c)}</p>
        </div>
      </div>
      <div class="flex gap-2 mt-5">
        <button onclick="closeBroker()" class="btn-press flex-1 py-3 rounded-xl border border-neutral-700 text-neutral-400 font-bold">취소</button>
        <button onclick="applyBroker()" class="btn-press flex-1 py-3 rounded-xl bg-hyrox text-white font-black">연결</button>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   선수 등록/수정 폼 (이름·영문·성별·디비전·에이지그룹·목표·센서ID)
   ═══════════════════════════════════════════════════════════════ */
let athleteForm = { open:false, editId:null };

const DIVISIONS=["MEN PRO","WOMEN PRO","MEN OPEN","WOMEN OPEN","DOUBLES","RELAY"];
const AGE_GROUPS=["16-24","25-29","30-34","35-39","40-44","45-49","50-54","55-59","60+"];

function openAthleteForm(editId){
  athleteForm={open:true, editId:editId??null};
  renderAthleteForm();
}
function closeAthleteForm(){ athleteForm.open=false; renderAthleteForm(); }

function submitAthleteForm(){
  const g=id=>document.getElementById(id);
  const info={
    name:g("af-name").value.trim(),
    en:g("af-en").value.trim(),
    sex:g("af-sex").value,
    div:g("af-div").value,
    age:g("af-age").value,
    ageNum:parseInt(g("af-agenum").value,10)||30,
    targetSec:(parseInt(g("af-tmin").value,10)||60)*60,
    sensor:g("af-sensor").value.trim(),
    maxHrManual:g("af-maxhr").value.trim()===""?null:parseInt(g("af-maxhr").value,10),
  };
  if(!info.name){ alert("이름을 입력하세요"); return; }
  let targetId;
  if(athleteForm.editId){ updateAthlete(athleteForm.editId, info); targetId=athleteForm.editId; }
  else { targetId=addAthlete(info); }
  // DB에 선수 저장 (연결돼 있으면)
  if(S[targetId]) DB.upsertAthlete(S[targetId]);
  closeAthleteForm();
  renderAll();
}

function renderAthleteForm(){
  const el=document.getElementById("athlete-form");
  if(!el) return;
  if(!athleteForm.open){ el.classList.remove("active"); el.innerHTML=""; return; }
  el.classList.add("active");
  const editing=athleteForm.editId!=null;
  const st=editing?S[athleteForm.editId]:null;
  const v=(x,d="")=>st?(st[x]??d):d;
  const tmin=st?Math.round(st.targetSec/60):60;
  el.innerHTML=`
    <div class="absolute inset-0 bg-black/70" onclick="closeAthleteForm()"></div>
    <div class="relative bg-neutral-950 border border-neutral-800 rounded-2xl p-5 w-[94%] max-w-lg z-10 max-h-[88vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-black">${editing?"선수 정보 수정":"새 선수 등록"}</h3>
        <button onclick="closeAthleteForm()" class="text-neutral-500 text-sm btn-press">✕</button>
      </div>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-[11px] text-neutral-500">이름 *</label>
            <input id="af-name" value="${v("name")}" placeholder="정원준"
              class="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-sm mt-0.5 focus:border-hyrox outline-none" />
          </div>
          <div>
            <label class="text-[11px] text-neutral-500">영문명</label>
            <input id="af-en" value="${v("en")}" placeholder="Wonjoon Jung"
              class="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-sm mt-0.5 focus:border-hyrox outline-none" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="text-[11px] text-neutral-500">성별</label>
            <select id="af-sex" class="w-full bg-black border border-neutral-700 rounded-lg px-2 py-2.5 text-sm mt-0.5 focus:border-hyrox outline-none">
              <option value="M" ${v("sex","M")==="M"?"selected":""}>남 (M)</option>
              <option value="F" ${v("sex")==="F"?"selected":""}>여 (F)</option>
            </select>
          </div>
          <div>
            <label class="text-[11px] text-neutral-500">디비전</label>
            <select id="af-div" class="w-full bg-black border border-neutral-700 rounded-lg px-2 py-2.5 text-sm mt-0.5 focus:border-hyrox outline-none">
              ${DIVISIONS.map(d=>`<option ${v("div","MEN PRO")===d?"selected":""}>${d}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="text-[11px] text-neutral-500">에이지 그룹</label>
            <select id="af-age" class="w-full bg-black border border-neutral-700 rounded-lg px-2 py-2.5 text-sm mt-0.5 focus:border-hyrox outline-none">
              ${AGE_GROUPS.map(g=>`<option ${v("age","30-34")===g?"selected":""}>${g}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="text-[11px] text-neutral-500">나이(존 계산)</label>
            <input id="af-agenum" type="number" value="${v("ageNum",32)}" min="10" max="90"
              class="w-full bg-black border border-neutral-700 rounded-lg px-2 py-2.5 text-sm mt-0.5 tabular focus:border-hyrox outline-none" />
          </div>
          <div>
            <label class="text-[11px] text-neutral-500">Max HR(선택)</label>
            <input id="af-maxhr" type="number" value="${st&&st.maxHrManual!=null?st.maxHrManual:''}" placeholder="220−나이" min="120" max="220"
              class="w-full bg-black border border-neutral-700 rounded-lg px-2 py-2.5 text-sm mt-0.5 tabular focus:border-hyrox outline-none" />
          </div>
          <div>
            <label class="text-[11px] text-neutral-500">목표(분)</label>
            <input id="af-tmin" type="number" value="${tmin}" min="30" max="120"
              class="w-full bg-black border border-neutral-700 rounded-lg px-2 py-2.5 text-sm mt-0.5 tabular focus:border-hyrox outline-none" />
          </div>
        </div>
        <div>
          <label class="text-[11px] text-neutral-500">센서 ID (★ 파이썬 config.py의 athlete_id 와 정확히 일치)</label>
          <input id="af-sensor" value="${v("sensor")}" placeholder="athlete_1"
            class="w-full bg-black border border-hyrox/50 rounded-lg px-3 py-2.5 text-sm mt-0.5 font-mono focus:border-hyrox outline-none" />
          <p class="text-[10px] text-neutral-600 mt-1">이 값이 일치해야 해당 선수 칸으로 실시간 심박이 들어옵니다.</p>
        </div>
      </div>
      <div class="flex gap-2 mt-5">
        <button onclick="closeAthleteForm()" class="btn-press flex-1 py-3 rounded-xl border border-neutral-700 text-neutral-400 font-bold">취소</button>
        <button onclick="submitAthleteForm()" class="btn-press flex-1 py-3 rounded-xl bg-hyrox text-white font-black">${editing?"저장":"등록"}</button>
      </div>
    </div>`;
}

function confirmRemoveAthlete(id){
  if(confirm(`${S[id].name} 선수를 삭제할까요?`)){ removeAthlete(id); renderAll(); }
}

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

    const sensorOk = st.sensor && st.sensor.trim()!=="";
    return `
    <section class="rounded-2xl border ${st.started?'border-hyrox':'border-neutral-800'} bg-neutral-950 p-4">
      <div class="flex items-start justify-between mb-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-lg font-black">${a.name}</span>
            <span class="text-xs text-neutral-500 truncate">${a.en||""}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">${a.sex==="F"?"여":"남"}</span>
          </div>
          <p class="text-[11px] text-neutral-500">${a.div} · ${a.age} · Target ${mmss(a.targetSec)}</p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="openAthleteForm(${a.id})" title="수정"
            class="btn-press text-[11px] text-neutral-400 px-2 py-1 rounded-lg border border-neutral-700 hover:border-neutral-500">✎</button>
          <button onclick="confirmRemoveAthlete(${a.id})" title="삭제"
            class="btn-press text-[11px] text-red-400 px-2 py-1 rounded-lg border border-red-900 hover:bg-red-950/40">🗑</button>
        </div>
      </div>

      <!-- ★ Part 2: 센서 매칭 + BLE 스캔 + 디바이스 상태 매트릭스 -->
      <div class="mb-3">
        <div class="flex items-center justify-between mb-2">
          <div class="min-w-0">
            <p class="text-[10px] uppercase tracking-[0.15em] text-neutral-500">Sensor ID (config.py 일치 필요)</p>
            <p class="text-xs font-mono ${sensorOk?'text-green-400':'text-red-400'} truncate">
              ${sensorOk?st.sensor:"⚠ 미지정"} ${st.sensorName?`· ${st.sensorName}`:""}
            </p>
          </div>
          <button onclick="openScan(${a.id})" class="btn-press text-[11px] text-hyrox font-bold px-2 py-1 rounded-lg border border-hyrox/40 shrink-0">
            🔍 심박계 찾기
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
  ["admin","referee","tv","report"].forEach(x=>{
    const vw=document.getElementById("view-"+x); if(vw) vw.classList.toggle("active",x===v);
    const nv=document.getElementById("nav-"+x);
    if(nv) nv.className="py-2.5 rounded-xl font-bold text-sm btn-press "+(x===v?"bg-hyrox text-white":"bg-neutral-800 text-neutral-400");
  });
  if(v==="report") renderReportList();
  renderAll();
}

/* 저장된 경기 기록 목록 (Supabase) */
async function renderReportList(){
  const el=document.getElementById("report-list");
  if(!el) return;
  if(!DB.isReady()){
    el.innerHTML=`<p class="text-neutral-400 text-sm mb-2">Supabase가 연결되지 않았습니다.</p>
      <p class="text-sm text-neutral-600">상단 <span class="text-hyrox">📡</span> 패널에서 Supabase URL/Key를 입력하면 저장된 기록이 여기 나타납니다.
      지금은 예시 리포트를 <span class="text-hyrox font-mono">report-preview.html</span> 로 확인할 수 있습니다.</p>`;
    return;
  }
  el.innerHTML=`<p class="text-neutral-500 text-sm">기록을 불러오는 중...</p>`;
  const list=await DB.listAthletes();
  if(!list.length){
    el.innerHTML=`<p class="text-neutral-500 text-sm">아직 저장된 선수가 없습니다. 경기를 완주하면 자동 저장됩니다.</p>`;
    return;
  }
  el.innerHTML=`
    <p class="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-3">저장된 선수 · 클릭 시 상세 리포트</p>
    <div class="space-y-2">
      ${list.map(a=>`
        <a href="report-preview.html?athlete=${a.id}" target="_blank"
          class="btn-press flex items-center justify-between px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-hyrox">
          <div class="min-w-0">
            <p class="text-sm font-black truncate">${a.name} <span class="font-light text-neutral-500">${a.en_name||""}</span></p>
            <p class="text-[11px] text-neutral-600">${a.division||""} · ${a.age_group||""} ${a.sensor?"· "+a.sensor:""}</p>
          </div>
          <span class="text-hyrox text-sm shrink-0">리포트 →</span>
        </a>`).join("")}
    </div>`;
}

let _flushTick=0;
function renderAll(){
  const now=Date.now();
  tickConnection(now);
  // 실시간 심박 → live_samples 버퍼링 (출발한 선수만)
  Object.values(S).forEach(st=>{
    if(st.started && st.connected){
      DB.bufferSample(st, computeMetrics(st, now));
    }
  });
  // 5초마다 배치 flush
  if(++_flushTick % 5 === 0){ DB.flushSamples(S); }
  if(activeView==="admin") renderAdmin();
  if(activeView==="referee") renderReferee();
  if(activeView==="tv") renderTvView();
  if(fsTv) renderTvInto("fs-content", fsTv, now, "fs");
  renderScanModal();
  renderAthleteForm();
  renderBroker();
  const d=new Date();
  document.getElementById("wallclock").textContent=
    `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

/* ═══ 초기화 ═══ */
// 실시간 MQTT 수신 배선: 메시지가 올 때마다 해당 선수에 반영
LiveMqtt.onMessage((sensorId, payload) => {
  applyLiveReading(sensorId, payload);
});
LiveMqtt.onStatus((st) => {
  const el=document.getElementById("mqtt-status");
  if(!el) return;
  const map={connected:["🟢 연결됨","text-green-400"],connecting:["🟡 연결 중","text-yellow-400"],
             disconnected:["⚪ 끊김","text-neutral-500"],error:["🔴 오류","text-red-400"]};
  const [txt,cls]=map[st.status]||["-",""];
  el.className="text-xs font-bold "+cls;
  el.textContent=txt + (st.lastError?` · ${st.lastError}`:"");
});
// 저장된 설정으로 자동 연결 시도 (localhost:9001 기본)
LiveMqtt.connect();

// Supabase 저장 계층 초기화 (키 없으면 저장만 건너뜀)
DB.init();

showView("admin");
setInterval(renderAll,1000);
