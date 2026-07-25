/* ═══════════════════════════════════════════════════════════════
   db.js · Supabase 저장/조회 계층
   ───────────────────────────────────────────────────────────────
   역할 분담:
     - 심박 실시간 표시 = MQTT (live_mqtt.js)
     - 기록 영구 저장    = Supabase (이 파일)

   저장 시점:
     1) 선수 등록/수정 → target_athletes upsert
     2) 실시간 심박    → live_samples 에 주기적(기본 5초) 배치 insert
     3) 경기 종료(FINISH) → results + splits insert, analysis_cache 저장
     4) 리포트 페이지  → 위 데이터를 읽어 렌더

   설정: index.html 상단에서 SUPABASE_URL / SUPABASE_KEY 를 지정하거나
         브로커 패널에서 입력. 키가 없으면 저장은 조용히 건너뜁니다
         (실시간 표시는 MQTT라 영향 없음).
   ═══════════════════════════════════════════════════════════════ */

const DB = (() => {
  let client = null;
  let cfg = { url:"", key:"", ready:false, lastError:"" };
  // 대시보드 athlete.id(숫자) → DB target_athletes.id(bigint) 캐시
  const dbIdCache = {};
  // 선수별 진행 중 세션의 live_samples 버퍼 (배치 전송)
  const sampleBuffer = {};   // { [athleteId]: [ {elapsed_sec, bpm, ...} ] }
  let sessionId = null;

  function loadConfig(){
    try{
      const raw = localStorage.getItem("xon_supabase_cfg");
      if(raw) return JSON.parse(raw);
    }catch(e){}
    return { url:(window.SUPABASE_URL||""), key:(window.SUPABASE_KEY||"") };
  }
  function saveConfig(c){
    try{ localStorage.setItem("xon_supabase_cfg", JSON.stringify(c)); }catch(e){}
  }

  function init(c){
    c = c || loadConfig();
    saveConfig(c);
    cfg.url = c.url; cfg.key = c.key;
    if(!c.url || !c.key){ cfg.ready=false; cfg.lastError="URL/KEY 미설정"; return; }
    if(typeof window.supabase==="undefined" || !window.supabase.createClient){
      cfg.ready=false; cfg.lastError="supabase-js 미로드"; return;
    }
    try{
      client = window.supabase.createClient(c.url, c.key);
      cfg.ready = true; cfg.lastError="";
      sessionId = new Date().toISOString().slice(0,10) + "_" + Math.random().toString(16).slice(2,6);
    }catch(e){
      cfg.ready=false; cfg.lastError=String(e);
    }
  }

  function isReady(){ return cfg.ready && client; }
  function getStatus(){ return {...cfg}; }

  /* ── 1) 선수 upsert (sensor 기준) ── */
  async function upsertAthlete(a){
    if(!isReady()) return null;
    try{
      const row = {
        name: a.name, en_name: a.en||null, gender: a.sex||null,
        age_group: a.age||null, division: a.div||null,
        device_model: a.device||null, sensor: a.sensor||null,
        target_sec: a.targetSec||null, max_hr: a.maxHr||null,
      };
      // sensor 가 있으면 그것으로 충돌 해소, 없으면 name+age_group
      const onConflict = a.sensor ? "sensor" : "name,age_group";
      const { data, error } = await client
        .from("target_athletes")
        .upsert(row, { onConflict })
        .select("id")
        .limit(1);
      if(error){ cfg.lastError=error.message; return null; }
      if(data && data[0]){ dbIdCache[a.id]=data[0].id; return data[0].id; }
    }catch(e){ cfg.lastError=String(e); }
    return null;
  }

  async function resolveDbId(athlete){
    if(dbIdCache[athlete.id]) return dbIdCache[athlete.id];
    return await upsertAthlete(athlete);
  }

  /* ── 2) 실시간 심박 버퍼링 & 배치 flush ── */
  function bufferSample(athlete, metrics){
    if(!isReady() || !athlete.started) return;
    const buf = sampleBuffer[athlete.id] || (sampleBuffer[athlete.id]=[]);
    buf.push({
      elapsed_sec: metrics.elapsed,
      station_key: metrics.curSeq ? metrics.curSeq.k : null,
      bpm: athlete.bpm||null,
      rmssd_ms: athlete.rmssd??null,
      gct_ms: athlete.gct??null,
      cadence_spm: athlete.cadence??null,
      respiration: athlete.respiration??null,
    });
  }

  async function flushSamples(athletesById){
    if(!isReady()) return;
    for(const [aid, buf] of Object.entries(sampleBuffer)){
      if(!buf.length) continue;
      const athlete = athletesById[aid];
      if(!athlete) { sampleBuffer[aid]=[]; continue; }
      const dbId = await resolveDbId(athlete);
      if(!dbId){ continue; }              // 아직 매핑 안 됨 → 다음 기회에
      const rows = buf.splice(0, buf.length).map(s => ({
        session_id: sessionId, athlete_id: dbId, ...s
      }));
      try{
        const { error } = await client.from("live_samples").insert(rows);
        if(error){ cfg.lastError=error.message; /* 실패분 되돌림 */ sampleBuffer[aid].unshift(...rows.map(stripIds)); }
      }catch(e){ cfg.lastError=String(e); }
    }
  }
  function stripIds(r){ const {session_id,athlete_id,...rest}=r; return rest; }

  /* ── 3) 경기 종료 시 결과+스플릿 저장 ── */
  async function saveResult(athlete, splits, analysis){
    if(!isReady()) return null;
    const dbId = await resolveDbId(athlete);
    if(!dbId) return null;
    try{
      const totalMs = splits.reduce((a,s)=>a+s.sec,0)*1000;
      const { data: res, error: e1 } = await client
        .from("results")
        .insert({
          athlete_id: dbId,
          total_ms: totalMs,
          target_total_sec: athlete.targetSec||null,
          coaching_report: analysis?.gemini || null,
          coaching_summary: analysis?.gemini?.summary || null,
        })
        .select("id").limit(1);
      if(e1 || !res || !res[0]){ cfg.lastError=e1?.message||"result insert 실패"; return null; }
      const resultId = res[0].id;

      // splits
      let cum=0;
      const splitRows = splits.map((s,i)=>{
        cum += s.sec*1000;
        return { result_id: resultId, step_key: s.k, label: s.label||s.k,
                 split_ms: s.sec*1000, cumulative_ms: cum, target_sec: s.target||null };
      });
      const { error: e2 } = await client.from("splits").insert(splitRows);
      if(e2){ cfg.lastError=e2.message; }

      // analysis_cache
      if(analysis){
        await client.from("analysis_cache").insert({
          athlete_id: dbId, result_id: resultId,
          profile: analysis.profile,
          baseline_mean: analysis.baseline?.mean??null,
          strength_drop: analysis.strengthDrop??null,
          bodyweight_drop: analysis.bodyweightDrop??null,
          radar_json: analysis.radar||null,
          taxes_json: analysis.taxes||null,
          gemini_json: analysis.gemini||null,
        });
      }
      return resultId;
    }catch(e){ cfg.lastError=String(e); return null; }
  }

  /* ── 4) 리포트용 조회 ── */
  async function loadLatestResult(dbAthleteId){
    if(!isReady()) return null;
    try{
      const { data: results } = await client
        .from("results").select("*")
        .eq("athlete_id", dbAthleteId)
        .order("created_at",{ascending:false}).limit(1);
      if(!results || !results[0]) return null;
      const result = results[0];
      const { data: splits } = await client
        .from("splits").select("*")
        .eq("result_id", result.id).order("id",{ascending:true});
      const { data: samples } = await client
        .from("live_samples").select("elapsed_sec,bpm")
        .eq("athlete_id", dbAthleteId).eq("session_id", sessionId)
        .order("elapsed_sec",{ascending:true});
      const { data: analysis } = await client
        .from("analysis_cache").select("*")
        .eq("result_id", result.id).limit(1);
      return { result, splits:splits||[], samples:samples||[], analysis:(analysis&&analysis[0])||null };
    }catch(e){ cfg.lastError=String(e); return null; }
  }

  async function listAthletes(){
    if(!isReady()) return [];
    try{
      const { data } = await client.from("target_athletes").select("*").order("id");
      return data||[];
    }catch(e){ return []; }
  }

  return { init, isReady, getStatus, loadConfig, saveConfig,
           upsertAthlete, bufferSample, flushSamples, saveResult,
           loadLatestResult, listAthletes,
           get sessionId(){ return sessionId; },
           get dbIdCache(){ return dbIdCache; } };
})();
