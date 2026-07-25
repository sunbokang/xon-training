/* ═══════════════════════════════════════════════════════════════
   live_mqtt.js · 실시간 심박 데이터 수신 (MQTT over WebSocket)
   ───────────────────────────────────────────────────────────────
   파이썬 수집기(main.py)가 발행하는 토픽을 브라우저에서 직접 구독합니다.

     [BLE 센서] → [main.py] → [Mosquitto :9001(WS)] → 이 클라이언트 → 대시보드

   ★ 중요: 더 이상 Supabase 테이블을 폴링하지 않습니다.
      심박 데이터는 MQTT로 실시간 수신하고, Supabase는 '기록 저장'에만 씁니다.

   토픽:     hyrox/live/<athlete_id>       (예: hyrox/live/athlete_1)
   페이로드: { timestamp, athlete_id, BPM, RMSSD, GCT, CADENCE, RESPIRATION, ... }
             ↑ 파이썬 sensors/base.py의 to_mqtt_payload() 와 정확히 일치
   ═══════════════════════════════════════════════════════════════ */

const LiveMqtt = (() => {
  let client = null;
  let cfg = { url: "", status: "disconnected", lastError: "" };
  const listeners = [];          // (athlete_id, payload) => void
  const statusListeners = [];    // (statusObj) => void

  function emitStatus(){
    statusListeners.forEach(fn => { try{ fn({...cfg}); }catch(e){} });
  }

  /* 저장된 브로커 설정 읽기 (localStorage) */
  function loadConfig(){
    try{
      const raw = localStorage.getItem("xon_mqtt_cfg");
      if(raw) return JSON.parse(raw);
    }catch(e){}
    // 기본값: 로컬 개발용. 운영은 설정 UI에서 WSS 주소로 교체.
    return { host:"localhost", port:9001, path:"/mqtt", useTls:false,
             username:"", password:"" };
  }
  function saveConfig(c){
    try{ localStorage.setItem("xon_mqtt_cfg", JSON.stringify(c)); }catch(e){}
  }

  function buildUrl(c){
    const scheme = c.useTls ? "wss" : "ws";
    const path = c.path && c.path.startsWith("/") ? c.path : "/"+(c.path||"mqtt");
    return `${scheme}://${c.host}:${c.port}${path}`;
  }

  /* 연결 (mqtt.js UMD 전역 사용) */
  function connect(c){
    c = c || loadConfig();
    saveConfig(c);
    cfg.url = buildUrl(c);

    if(typeof mqtt === "undefined"){
      cfg.status="error"; cfg.lastError="mqtt.js 라이브러리 미로드";
      emitStatus(); return;
    }
    // 기존 연결 정리
    try{ if(client){ client.end(true); } }catch(e){}

    cfg.status="connecting"; cfg.lastError=""; emitStatus();

    const opts = {
      keepalive: 30,
      reconnectPeriod: 3000,      // 3초마다 자동 재연결
      connectTimeout: 8000,
      clean: true,
      clientId: "xon-dash-" + Math.random().toString(16).slice(2,8),
    };
    if(c.username) opts.username = c.username;
    if(c.password) opts.password = c.password;

    try{
      client = mqtt.connect(cfg.url, opts);
    }catch(e){
      cfg.status="error"; cfg.lastError=String(e); emitStatus(); return;
    }

    client.on("connect", () => {
      cfg.status="connected"; cfg.lastError=""; emitStatus();
      client.subscribe("hyrox/live/#", { qos:1 });
    });
    client.on("reconnect", () => { cfg.status="connecting"; emitStatus(); });
    client.on("close",     () => { cfg.status="disconnected"; emitStatus(); });
    client.on("error", (err) => {
      cfg.status="error"; cfg.lastError=(err&&err.message)||String(err); emitStatus();
    });
    client.on("message", (topic, buf) => {
      // topic: hyrox/live/athlete_1
      const id = topic.split("/").pop();
      let payload;
      try{ payload = JSON.parse(buf.toString()); }catch(e){ return; }
      listeners.forEach(fn => { try{ fn(id, payload); }catch(e){} });
    });
  }

  function disconnect(){
    try{ if(client) client.end(true); }catch(e){}
    cfg.status="disconnected"; emitStatus();
  }

  return {
    connect, disconnect, loadConfig, saveConfig, buildUrl,
    onMessage: (fn) => listeners.push(fn),
    onStatus:  (fn) => { statusListeners.push(fn); emitStatus(); },
    getStatus: () => ({...cfg}),
  };
})();
