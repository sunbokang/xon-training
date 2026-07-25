/* ═══════════════════════════════════════════════════════════════
   PART 3 · 심박 변동 추이 스파크라인 (Recharts AreaChart)
   ───────────────────────────────────────────────────────────────
   - 출발 시점부터 현재까지의 BPM 추이
   - 배경 투명, 존 컬러 그라데이션
   - 프로그레스 바 바로 위에 얇고 와이드하게 배치
   ═══════════════════════════════════════════════════════════════ */
const { createElement: h, useState, useEffect } = React;
const { AreaChart, Area, YAxis, ReferenceLine, ResponsiveContainer, defs } = Recharts;

/**
 * HR 스파크라인
 * @param data    [{t, bpm}]
 * @param zones   개인 Z1~Z5
 * @param maxHr   개인 최대심박
 * @param height  px
 * @param gradId  그라데이션 고유 id (선수별로 달라야 함)
 */
function HrSparkline({ data, zones, maxHr, height, gradId, currentZone }){
  if(!data || data.length<2){
    return h("div",{
      className:"w-full flex items-center justify-center text-neutral-700",
      style:{height:height+"px", fontSize:"10px"}
    },"WAITING FOR HEART RATE DATA");
  }

  // Y축 범위: 데이터 실제 범위에 여유를 주되 존 경계가 보이도록
  const bpms=data.map(d=>d.bpm);
  const lo=Math.min(...bpms), hi=Math.max(...bpms);
  const yMin=Math.max(60, Math.floor(lo-8));
  const yMax=Math.min(210, Math.ceil(hi+8));

  const zColor = currentZone ? currentZone.color : "#E05D29";

  // 존 경계선 (Y축 범위 안에 들어오는 것만)
  const zoneLines = zones
    .filter(z=>z.minBpm>yMin && z.minBpm<yMax)
    .map(z=>h(ReferenceLine,{
      key:"zl"+z.z, y:z.minBpm, stroke:z.color, strokeOpacity:0.28,
      strokeDasharray:"3 3", strokeWidth:1
    }));

  return h(ResponsiveContainer,{width:"100%",height:height},
    h(AreaChart,{data, margin:{top:2,right:0,left:0,bottom:0}},
      h("defs",null,
        h("linearGradient",{id:gradId, x1:"0", y1:"0", x2:"0", y2:"1"},
          h("stop",{offset:"0%",  stopColor:zColor, stopOpacity:0.55}),
          h("stop",{offset:"60%", stopColor:zColor, stopOpacity:0.14}),
          h("stop",{offset:"100%",stopColor:zColor, stopOpacity:0})
        )
      ),
      ...zoneLines,
      h(YAxis,{domain:[yMin,yMax], hide:true}),
      h(Area,{
        type:"monotone", dataKey:"bpm",
        stroke:zColor, strokeWidth:1.8,
        fill:`url(#${gradId})`,
        isAnimationActive:false, dot:false, activeDot:false
      })
    )
  );
}

/* 카드 안의 스파크라인 컨테이너에 React 마운트 (재사용) */
const _sparkRoots = {};
function mountSparkline(containerId, st, height, currentZone){
  const el=document.getElementById(containerId);
  if(!el) return;
  if(!_sparkRoots[containerId]){
    _sparkRoots[containerId]=ReactDOM.createRoot(el);
  }
  _sparkRoots[containerId].render(
    h(HrSparkline,{
      data:st.hrHistory, zones:st.zones, maxHr:st.maxHr,
      height, gradId:"hrgrad-"+containerId, currentZone
    })
  );
}
function unmountSparkline(containerId){
  if(_sparkRoots[containerId]){
    _sparkRoots[containerId].unmount();
    delete _sparkRoots[containerId];
  }
}
