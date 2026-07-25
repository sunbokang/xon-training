/* ═══════════════════════════════════════════════════════════════
   HYROX 종목 아이콘 라이브러리
   ───────────────────────────────────────────────────────────────
   react-icons(Fa/Gi/Bi)와 lucide-react의 아이콘 형태를 인라인 SVG로
   구현했습니다. CDN 아이콘 폰트로는 '겹침(overlay)'과 '나란히 배치'를
   픽셀 단위로 제어하기 어렵기 때문입니다.

   React 이관 시:
     - 단일 아이콘 → 해당 라이브러리 컴포넌트로 그대로 교체 가능
     - 합성/오버레이 → 아래 wrapper 구조(relative + absolute)를 유지하고
       내부만 <FaWalking/>, <FaWeightHanging/> 등으로 교체
   ═══════════════════════════════════════════════════════════════ */

/* 공통: viewBox 24 기준 stroke 아이콘 */
function svg(inner, opts = {}) {
  const { vb = "0 0 24 24", fill = "none", stroke = "currentColor", sw = 2 } = opts;
  return `<svg viewBox="${vb}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"
    stroke-linecap="round" stroke-linejoin="round" class="w-full h-full">${inner}</svg>`;
}

/* 공통: fill 방식(Fa 계열) 아이콘 */
function svgFill(inner, vb = "0 0 24 24") {
  return `<svg viewBox="${vb}" fill="currentColor" class="w-full h-full">${inner}</svg>`;
}

/* ── FaRunning : 달리는 사람 ── */
const IcRunning = () => svgFill(`
  <circle cx="15.5" cy="4" r="2.2"/>
  <path d="M13.9 7.2 10.6 9.1c-.6.35-.95.99-.9 1.68l.28 3.4 -1.1 3.9c-.16.6.2 1.2.8 1.35.6.16 1.2-.2 1.35-.8l1.15-4.1c.05-.2.06-.4.04-.6l-.17-2.1 2.0-1.05 1.3 2.6c.14.28.38.5.68.6l3.1 1.05c.58.2 1.2-.12 1.4-.7.2-.58-.12-1.2-.7-1.4l-2.65-.9-1.85-3.7c-.45-.9-1.5-1.3-2.44-.83z"/>
  <path d="M8.6 12.1 6.2 13.5c-.3.17-.52.46-.6.8l-.7 3.0c-.14.6.23 1.2.83 1.34.6.14 1.2-.23 1.34-.83l.6-2.55 1.5-.87z"/>
`);

/* ── FaSkiing : 스키 타는 사람 ── */
const IcSkiing = () => svgFill(`
  <circle cx="16.2" cy="3.8" r="2.1"/>
  <path d="M14.4 7.0c-.9-.35-1.9.05-2.3.92l-1.5 3.2c-.28.6-.14 1.3.35 1.75l2.05 1.85-.95 3.0c-.2.62.15 1.28.77 1.47.62.2 1.28-.15 1.47-.77l1.15-3.65c.14-.45 0-.94-.35-1.26l-1.85-1.67 1.0-2.1 1.1 1.9c.2.35.56.57.96.6l2.6.2c.63.05 1.18-.42 1.23-1.05.05-.63-.42-1.18-1.05-1.23l-2.05-.16-1.45-2.5c-.28-.48-.72-.83-1.25-1.0z"/>
  <path d="M3.4 17.5c-.2-.6.13-1.25.73-1.44l14.6-4.6c.6-.2 1.25.13 1.44.73.2.6-.13 1.25-.73 1.44l-14.6 4.6c-.6.2-1.25-.13-1.44-.73z"/>
`);

/* ── FaRowing : 로잉 ── */
const IcRowing = () => svgFill(`
  <circle cx="8.2" cy="4.2" r="2.1"/>
  <path d="M10.1 7.4c-.7-.5-1.65-.4-2.25.2L5.3 10.2c-.45.45-.55 1.15-.25 1.7l1.5 2.75c.3.55.98.78 1.55.52.6-.28.85-.98.57-1.58l-1.2-2.2 1.5-1.5 1.4 1.9c.2.28.5.46.85.5l2.5.3 2.6 3.4c.38.5 1.1.6 1.6.22.5-.38.6-1.1.22-1.6l-2.85-3.75c-.2-.26-.5-.43-.82-.47l-2.5-.3z"/>
  <path d="M2.6 19.4c-.35-.52-.2-1.23.33-1.57l16.4-10.6c.52-.34 1.22-.19 1.56.33.34.52.19 1.22-.33 1.56L4.16 19.73c-.52.34-1.22.19-1.56-.33z"/>
`);

/* ── GiSled : 썰매 (본체) ── */
const IcSledBody = () => svgFill(`
  <path d="M4.2 6.5h11.2c.5 0 .9.4.9.9v1.3c0 .5-.4.9-.9.9H4.2c-.5 0-.9-.4-.9-.9V7.4c0-.5.4-.9.9-.9z"/>
  <path d="M5.0 10.2h1.7v4.6H5.0zM12.9 10.2h1.7v4.6h-1.7z"/>
  <path d="M2.8 15.4h14.0c.55 0 1.0.45 1.0 1.0s-.45 1.0-1.0 1.0H2.8c-.55 0-1.0-.45-1.0-1.0s.45-1.0 1.0-1.0z"/>
  <path d="M17.0 15.4c1.6 0 2.9 1.0 2.9 2.3h-2.0c0-.3-.4-.6-.9-.6z"/>
`);

/* ── FaArrowRight / FaArrowLeft ── */
const IcArrowRight = () => svgFill(`<path d="M13.3 4.6 21 12l-7.7 7.4-1.6-1.65 4.7-4.5H3v-2.5h13.4l-4.7-4.5z"/>`);
const IcArrowLeft  = () => svgFill(`<path d="M10.7 4.6 3 12l7.7 7.4 1.6-1.65-4.7-4.5H21v-2.5H7.6l4.7-4.5z"/>`);

/* ── lucide ArrowUpRight ── */
const IcArrowUpRight = () => svg(`<line x1="6" y1="18" x2="18" y2="6"/><polyline points="9 6 18 6 18 15"/>`, { sw: 2.4 });

/* ── GiKettlebell : 케틀벨 1개 ── */
const IcKettlebellOne = () => svgFill(`
  <path d="M12 2.2c-2.5 0-4.5 2-4.5 4.5 0 1.1.4 2.1 1.05 2.9C6.9 10.9 5.6 13.2 5.6 15.8c0 1.9.7 3.6 1.8 4.8h9.2c1.1-1.2 1.8-2.9 1.8-4.8 0-2.6-1.3-4.9-2.95-6.2.65-.8 1.05-1.8 1.05-2.9 0-2.5-2-4.5-4.5-4.5zm0 2.2c1.27 0 2.3 1.03 2.3 2.3S13.27 9 12 9 9.7 7.97 9.7 6.7 10.73 4.4 12 4.4z"/>
`);

/* ── FaWalking : 걷는 사람 (런지 베이스) ── */
const IcWalking = () => svgFill(`
  <circle cx="13.2" cy="3.9" r="2.1"/>
  <path d="M11.6 7.1c-.85-.2-1.72.25-2.03 1.07L8.2 11.6c-.18.48-.1 1.02.2 1.43l1.7 2.28-1.6 3.6c-.27.6 0 1.3.6 1.57.6.27 1.3 0 1.57-.6l1.85-4.15c.18-.4.13-.87-.13-1.22l-1.5-2.0.9-2.35.75 2.1c.13.37.44.65.83.73l2.9.6-.55 4.5c-.08.65.38 1.24 1.03 1.32.65.08 1.24-.38 1.32-1.03l.65-5.35c.07-.6-.32-1.16-.9-1.28l-3.3-.68-1.15-3.2c-.25-.7-.85-1.2-1.6-1.36z"/>
`);

/* ── FaWeightHanging : 무게추 (런지 오버레이) ── */
const IcWeightHanging = () => svgFill(`
  <path d="M12 1.8c-1.9 0-3.4 1.5-3.4 3.4 0 .5.1 1 .3 1.4H6.3c-.6 0-1.1.4-1.2 1L3.3 20.4c-.1.7.4 1.3 1.2 1.3h15c.8 0 1.3-.6 1.2-1.3L18.9 7.6c-.1-.6-.6-1-1.2-1h-2.6c.2-.4.3-.9.3-1.4 0-1.9-1.5-3.4-3.4-3.4zm0 2c.8 0 1.4.6 1.4 1.4S12.8 6.6 12 6.6 10.6 6 10.6 5.2 11.2 3.8 12 3.8z"/>
`);

/* ── BiTarget : 과녁 (월볼 베이스) ── */
const IcTarget = () => svg(`
  <circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="5.4"/><circle cx="12" cy="12" r="1.8"/>
`, { sw: 1.9 });

/* ── FaCircle : 공 (월볼 오버레이) ── */
const IcBall = () => svgFill(`<circle cx="12" cy="12" r="10"/>`);

/* ═══════════════════════════════════════════════════════════════
   합성 아이콘 빌더
   size: px 단위 정수
   ═══════════════════════════════════════════════════════════════ */

/* 단일 */
function iconSingle(render, size, cls = "") {
  return `<span class="inline-block shrink-0 ${cls}" style="width:${size}px;height:${size}px">${render()}</span>`;
}

/* GiSled + 방향 화살표 (나란히) — Sled Push / Pull */
function iconSled(dir, size, cls = "") {
  const arrow = dir === "right" ? IcArrowRight : IcArrowLeft;
  const aSize = Math.round(size * 0.62);
  const order = dir === "right"
    ? `${IcSledBody()}</span><span class="inline-block shrink-0" style="width:${aSize}px;height:${aSize}px">${arrow()}`
    : `${arrow()}</span><span class="inline-block shrink-0" style="width:${size}px;height:${size}px">${IcSledBody()}`;
  const firstW = dir === "right" ? size : aSize;
  return `<span class="inline-flex items-center gap-[1px] shrink-0 ${cls}">
    <span class="inline-block shrink-0" style="width:${firstW}px;height:${firstW}px">${order}</span>
  </span>`;
}

/* GiKettlebell ×2 나란히 — Farmers Carry */
function iconFarmers(size, cls = "") {
  const s = Math.round(size * 0.82);
  return `<span class="inline-flex items-center gap-[1px] shrink-0 ${cls}">
    <span class="inline-block shrink-0" style="width:${s}px;height:${s}px">${IcKettlebellOne()}</span>
    <span class="inline-block shrink-0" style="width:${s}px;height:${s}px">${IcKettlebellOne()}</span>
  </span>`;
}

/* FaWalking + FaWeightHanging 겹침 — Sandbag Lunges
   걷는 사람 위(어깨 부근)에 무게추를 absolute로 올려 런지 동작 연출 */
function iconLunges(size, cls = "") {
  const wSize = Math.round(size * 0.52);
  return `<span class="relative inline-block shrink-0 ${cls}" style="width:${size}px;height:${size}px">
    <span class="absolute inset-0">${IcWalking()}</span>
    <span class="absolute opacity-95" style="width:${wSize}px;height:${wSize}px;left:-14%;top:-6%">${IcWeightHanging()}</span>
  </span>`;
}

/* BiTarget + FaCircle 겹침 — Wall Balls
   과녁 상단에 공을 absolute로 올림 */
function iconWallBalls(size, cls = "") {
  const bSize = Math.round(size * 0.42);
  return `<span class="relative inline-block shrink-0 ${cls}" style="width:${size}px;height:${size}px">
    <span class="absolute inset-0">${IcTarget()}</span>
    <span class="absolute" style="width:${bSize}px;height:${bSize}px;left:50%;top:-10%;transform:translateX(-50%)">${IcBall()}</span>
  </span>`;
}

/* ═══════════════════════════════════════════════════════════════
   구간 키 → 아이콘 HTML
   ═══════════════════════════════════════════════════════════════ */
function stationIcon(key, size = 16, cls = "") {
  switch (key) {
    case "run":        return iconSingle(IcRunning, size, cls);
    case "ski_erg":    return iconSingle(IcSkiing, size, cls);
    case "sled_push":  return iconSled("right", size, cls);
    case "sled_pull":  return iconSled("left", size, cls);
    case "burpee":     return iconSingle(IcArrowUpRight, size, cls);
    case "rowing":     return iconSingle(IcRowing, size, cls);
    case "farmers":    return iconFarmers(size, cls);
    case "lunges":     return iconLunges(size, cls);
    case "wall_balls": return iconWallBalls(size, cls);
    default:           return iconSingle(IcRunning, size, cls);
  }
}
