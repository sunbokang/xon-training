/* ═══════════════════════════════════════════════════════════════
   PART 5 · 룰 기반 프로파일링 엔진
   ───────────────────────────────────────────────────────────────
   원칙: 고정 임계값("10% 넘으면 나쁨")을 쓰지 않는다.
         선수 '자신의' 깨끗한 러닝 페이스를 기준선으로 삼아
         상대적·통계적으로 강약점을 판정한다.
   ═══════════════════════════════════════════════════════════════ */

// 페널티 분석 쌍: 스테이션 → 직후 러닝
const TAX_PAIRS = [
  {station:"sled_push", run:"run_3", group:"strength",   label:"Sled Push"},
  {station:"sled_pull", run:"run_4", group:"strength",   label:"Sled Pull"},
  {station:"burpee",    run:"run_5", group:"bodyweight", label:"Burpee"},
  {station:"lunges",    run:"run_8", group:"bodyweight", label:"Sandbag Lunges"},
];
// 깨끗한 러닝 = 페널티 직후가 아닌 러닝 (기준선 산출용)
const CLEAN_RUNS = ["run_1","run_2","run_6","run_7"];

/* 표준편차 */
function stdev(arr, mean){
  if(arr.length<2) return 0;
  return Math.sqrt(arr.reduce((a,b)=>a+(b-mean)**2,0)/arr.length);
}

/**
 * 종합 분석
 * @param splits [{k, sec, target}]
 * @param hrByStep { [stepKey]: {end, mid} }  // 스테이션 종료심박 / 러닝 중간심박
 * @param guidance [{k, target}]
 */
function runRuleAnalysis(splits, hrByStep, guidance){
  const byKey=Object.fromEntries(splits.map(s=>[s.k,s]));
  const gByKey=Object.fromEntries((guidance||[]).map(g=>[g.k,g.target]));

  // ── 1) 기준선: 깨끗한 러닝 평균 ± 표준편차 ──
  const cleanTimes=CLEAN_RUNS.map(k=>byKey[k]?.sec).filter(Boolean);
  const mean=cleanTimes.length?cleanTimes.reduce((a,b)=>a+b,0)/cleanTimes.length:0;
  const sd=stdev(cleanTimes, mean);
  const cv=mean?sd/mean:0;

  // ── 2) Stationary Tax: 각 페널티 러닝의 드롭률 + z-score + 심박회복 ──
  const taxes=TAX_PAIRS.map(p=>{
    const runSec=byKey[p.run]?.sec;
    if(!runSec||!mean) return null;
    const dropPct=((runSec-mean)/mean)*100;
    const z=sd>0?(runSec-mean)/sd:0;
    const hrEnd=hrByStep?.[p.station]?.end;
    const hrMid=hrByStep?.[p.run]?.mid;
    const hrRecovery=(hrEnd!=null&&hrMid!=null)?hrEnd-hrMid:null; // 양수=회복됨
    return {
      station:p.station, run:p.run, group:p.group, label:p.label,
      runSec, baselineSec:Math.round(mean),
      dropPct:+dropPct.toFixed(1), z:+z.toFixed(2),
      hrRecovery,
      // 등급: 고정 임계가 아니라 '이 선수 러닝 편차의 몇 배인가'
      severity: z<=1?"minimal" : z<=2?"mild" : z<=3.5?"moderate":"severe",
    };
  }).filter(Boolean);

  // ── 3) 그룹별 평균 드롭 ──
  const groupDrop=(g)=>{
    const arr=taxes.filter(t=>t.group===g);
    return arr.length?+(arr.reduce((a,t)=>a+t.dropPct,0)/arr.length).toFixed(1):null;
  };
  const strengthDrop=groupDrop("strength");     // Sled 계열
  const bodyweightDrop=groupDrop("bodyweight"); // Burpee+Lunge 계열
  const avgDrop=(strengthDrop!=null&&bodyweightDrop!=null)
    ? +((strengthDrop+bodyweightDrop)/2).toFixed(1) : null;

  // ── 4) 프로파일: 스테이션 저항력 기준 (선수 자신 러닝 대비 상대) ──
  let profile, tendency, profileDesc;
  if(avgDrop==null){ profile="Unknown"; tendency="분석중"; profileDesc=""; }
  else if(avgDrop>=12){
    profile="Runner"; tendency="러닝형";
    profileDesc="러닝 자체는 안정적이지만 근력·체중 종목 직후 러닝에서 큰 손실이 발생합니다. 스테이션 저항력 훈련이 최우선입니다.";
  } else if(avgDrop<=6){
    profile="Strength"; tendency="스트렝스형";
    profileDesc="스테이션 직후에도 러닝 페이스가 잘 유지됩니다. 순수 러닝 속도를 끌어올리면 기록이 크게 단축될 수 있습니다.";
  } else {
    profile="Balanced"; tendency="밸런스형";
    profileDesc="러닝과 스테이션이 고르게 균형 잡혀 있습니다. 가장 약한 단일 종목을 찾아 집중 보완하는 전략이 유효합니다.";
  }

  // ── 5) 종목별 실행 효율 (목표 대비, 러닝 제외 스테이션) ──
  const stationEff=splits
    .filter(s=>!s.k.startsWith("run_"))
    .map(s=>{
      const tgt=gByKey[s.k];
      const diffPct=tgt?+(((s.sec-tgt)/tgt)*100).toFixed(1):null;
      return {k:s.k, sec:s.sec, target:tgt, diffPct};
    });

  // ── 6) 방사형 5축 (0~100, 클수록 우수) ──
  const clamp=v=>Math.max(0,Math.min(100,Math.round(v)));
  const runConsistency=clamp(100-cv*100*5);              // 러닝 일관성
  const sledResist=clamp(100-(strengthDrop??0)*3);       // 슬레드 저항
  const bodyweightResist=clamp(100-(bodyweightDrop??0)*3);// 체중종목 저항
  // 스테이션 파워: 스테이션 목표 대비
  const stDiffs=stationEff.map(s=>Math.abs(s.diffPct||0));
  const stationPower=clamp(100-(stDiffs.reduce((a,b)=>a+b,0)/(stDiffs.length||1))*2);
  // 심박 회복력
  const recos=taxes.map(t=>t.hrRecovery).filter(v=>v!=null);
  const hrRecoveryScore=clamp(50+(recos.reduce((a,b)=>a+b,0)/(recos.length||1))*6);

  const radar=[
    {axis:"러닝 일관성", score:runConsistency},
    {axis:"슬레드 저항", score:sledResist},
    {axis:"체중종목 저항", score:bodyweightResist},
    {axis:"스테이션 파워", score:stationPower},
    {axis:"심박 회복력", score:hrRecoveryScore},
  ];

  // ── 7) 강약점 Top/Bottom ──
  const ranked=[...radar].sort((a,b)=>b.score-a.score);
  const strengths=ranked.slice(0,2);
  const weaknesses=ranked.slice(-2).reverse();

  return {
    baseline:{mean:Math.round(mean), sd:+sd.toFixed(1), cv:+cv.toFixed(3)},
    taxes, strengthDrop, bodyweightDrop, avgDrop,
    profile, tendency, profileDesc,
    stationEff, radar, strengths, weaknesses,
  };
}

/* ═══ Gemini 프롬프트 빌더 (정량 수치 → AI는 처방만) ═══ */
function buildGeminiPrompt(athlete, analysis){
  const taxLines=analysis.taxes.map(t=>
    `  - ${t.label} 직후 러닝: 기준 대비 +${t.dropPct}% (${t.severity}, 심박회복 ${t.hrRecovery??"-"}bpm)`
  ).join("\n");
  return `당신은 HYROX 전문 코치입니다. 아래는 룰 엔진이 산출한 객관적 정량 분석입니다.
이 수치를 근거로 이 선수만을 위한 구체적 훈련 처방을 한국어로 작성하세요.
(수치 판단은 이미 끝났습니다. 당신은 '무엇을 어떻게 훈련할지'만 제시하세요.)

[선수] ${athlete.name} (${athlete.en}) · ${athlete.div} · ${athlete.age} · 목표 ${Math.floor(athlete.targetSec/60)}분
[프로파일] ${analysis.tendency} (${analysis.profile})
[기준선] 깨끗한 러닝 평균 ${analysis.baseline.mean}초 (편차 ±${analysis.baseline.sd}초)
[Stationary Tax]
${taxLines}
[그룹 평균] 근력종목 +${analysis.strengthDrop}% / 체중종목 +${analysis.bodyweightDrop}%
[강점] ${analysis.strengths.map(s=>s.axis).join(", ")}
[약점] ${analysis.weaknesses.map(s=>s.axis).join(", ")}

다음 JSON만 출력:
{"summary":"3~4문장 총평","priorities":["4주 훈련 우선순위 3개"],
"station_drills":[{"station":"종목","drill":"구체적 훈련법"}],
"race_tactics":["실전 팁 3개"]}`;
}

/* 더미 Gemini 응답 (프리뷰용 — 실제로는 API 호출) */
function mockGeminiResponse(analysis){
  const isRunner=analysis.profile==="Runner";
  const isStrength=analysis.profile==="Strength";
  return {
    summary: isRunner
      ? `러닝 엔진은 PRO급으로 안정적(편차 ±${analysis.baseline.sd}초)이지만, 근력 종목 직후 러닝에서 평균 +${analysis.strengthDrop}%의 큰 손실이 발생합니다. 종목 수행력이 아니라 '슬레드 이후 러닝 전환' 능력이 병목입니다. 이 부분만 개선해도 목표 달성이 현실적입니다.`
      : isStrength
      ? `스테이션 직후에도 러닝 페이스가 거의 무너지지 않습니다(평균 +${analysis.avgDrop}%). 근력·회복 능력은 이미 충분하므로, 순수 러닝 속도(기준 ${analysis.baseline.mean}초)를 끌어올리는 것이 기록 단축의 핵심 열쇠입니다.`
      : `러닝과 스테이션이 고르게 균형 잡혀 있습니다(평균 드롭 +${analysis.avgDrop}%). 큰 약점이 없는 대신 뚜렷한 무기도 부족하니, 가장 약한 단일 축을 골라 4주간 집중 보완하세요.`,
    priorities: isRunner
      ? ["슬레드 직후 러닝 전환 훈련: Sled Push 50m → 즉시 400m, 기준 페이스 ±3% 유지 × 6세트",
         "역치 지구력: Zone 4 인터벌 (4분 ON / 2분 OFF) 주 2회",
         "슬레드 특이적 근지구력: 중량 썰매 밀기 후 즉시 러닝 접목"]
      : isStrength
      ? ["순수 러닝 스피드: 1km 반복주 (목표 페이스 −5초) 주 2회",
         "러닝 이코노미: 케이던스 180 유지 드릴 + 언덕 스프린트",
         "장거리 유산소 볼륨 확대로 러닝 기반 강화"]
      : ["가장 약한 축 집중 보완 (방사형 최저 항목)",
         "종목 간 전환 속도 훈련",
         "목표 페이스 일관성 유지 인터벌"],
    station_drills: [
      {station:"Sled Push", drill:"보폭 절반·상체 45도 낮춰 다리 힘만으로. 25m 지점 무정지 통과 훈련."},
      {station:"Sandbag Lunges", drill:"백을 앞쪽 랙 포지션으로. 엉덩이 주도 하강으로 대퇴사두 소모 최소화."},
      {station:"Wall Balls", drill:"25-25-25-25 분할, 세트 간 5초 이내. 첫 25개 오버페이스 금지."},
    ],
    race_tactics: [
      "첫 1km는 목표보다 5초 느리게 — 초반 과부하가 후반 붕괴의 원인",
      "락스존에서 4-6 호흡법으로 심박 8~12bpm 낮춘 뒤 스테이션 진입",
      "슬레드는 정지 없이 속도만 줄여 연속 진행 — 재출발이 심박을 가장 크게 올림",
    ],
  };
}
