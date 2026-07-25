-- supabase_schema.sql
-- ═══════════════════════════════════════════════════════════════════
--  Supabase 대시보드 → SQL Editor 에 이 내용을 통째로 붙여넣고 [Run]
-- ═══════════════════════════════════════════════════════════════════

-- 1) 선수 프로필
create table if not exists target_athletes (
  id           bigint generated always as identity primary key,
  name         text not null,
  gender       text,
  age_group    text,
  division     text,
  weight_class text,
  device_model text,
  created_at   timestamptz default now(),
  unique (name, age_group)
);

-- 2) 세션 결과 (+ Gemini 코칭 리포트)
create table if not exists results (
  id               bigint generated always as identity primary key,
  athlete_id       bigint not null references target_athletes(id) on delete cascade,
  total_ms         bigint not null default 0,
  target_total_sec integer,
  coaching_report  jsonb,     -- Gemini 코칭 전체(JSON)
  coaching_summary text,      -- 총평만 따로 (검색용)
  created_at       timestamptz default now()
);

-- 3) 구간별 스플릿 (목표 포함)
create table if not exists splits (
  id            bigint generated always as identity primary key,
  result_id     bigint not null references results(id) on delete cascade,
  step_key      text not null,
  label         text,
  split_ms      bigint not null,
  cumulative_ms bigint not null,
  target_sec    integer
);

create index if not exists idx_results_athlete on results(athlete_id);
create index if not exists idx_splits_result   on splits(result_id);

-- ── 기존 테이블이 이미 있다면 새 컬럼만 추가 (안전) ──
alter table target_athletes add column if not exists weight_class text;
alter table target_athletes add column if not exists device_model text;
alter table results         add column if not exists target_total_sec integer;
alter table results         add column if not exists coaching_report jsonb;
alter table results         add column if not exists coaching_summary text;
alter table splits          add column if not exists target_sec integer;

-- ── [테스트 전용] RLS 정책 ─────────────────────────────────────────
-- Supabase는 기본적으로 RLS가 켜져 anon 키 INSERT가 막힙니다.
-- 훈련장 내부용 도구이므로 테스트 편의를 위해 열어둡니다.
-- ⚠ 외부 공개 배포 시에는 반드시 제한하세요.
alter table target_athletes enable row level security;
alter table results         enable row level security;
alter table splits          enable row level security;

drop policy if exists "test_all_athletes" on target_athletes;
drop policy if exists "test_all_results"  on results;
drop policy if exists "test_all_splits"   on splits;

create policy "test_all_athletes" on target_athletes for all using (true) with check (true);
create policy "test_all_results"  on results         for all using (true) with check (true);
create policy "test_all_splits"   on splits          for all using (true) with check (true);

-- ═══════════════════════════════════════════════════════════════
--  Part 5 · 실시간 가민 데이터 적재 (BPM/RMSSD/GCT/호흡)
--  엣지 수집기가 MQTT로 보낸 라이브 지표를 Relational하게 저장.
-- ═══════════════════════════════════════════════════════════════
create table if not exists live_samples (
  id            bigserial primary key,
  session_id    text   not null,               -- 훈련 세션 (날짜+레인)
  athlete_id    bigint references target_athletes(id) on delete cascade,
  ts            timestamptz not null default now(),
  elapsed_sec   integer not null,              -- 출발 후 경과초 (Wave Start 기준)
  station_key   text,                          -- 현재 구간 (run_1, sled_push, ...)
  bpm           integer,
  rmssd_ms      real,
  gct_ms        integer,                       -- 러닝 구간에서만
  cadence_spm   integer,                       -- 러닝 구간에서만
  respiration   real                           -- Phase 2
);
create index if not exists idx_live_session on live_samples(session_id, athlete_id, elapsed_sec);

-- 룰 엔진 분석 결과 캐시 (리포트 재생성 최소화)
create table if not exists analysis_cache (
  id            bigserial primary key,
  athlete_id    bigint references target_athletes(id) on delete cascade,
  result_id     bigint references results(id) on delete cascade,
  profile       text,                          -- Runner / Strength / Balanced
  baseline_mean integer,
  strength_drop real,
  bodyweight_drop real,
  radar_json    jsonb,                         -- 방사형 5축
  taxes_json    jsonb,                         -- Stationary Tax 상세
  gemini_json   jsonb,                         -- AI 처방 (생성 시)
  created_at    timestamptz not null default now()
);
create index if not exists idx_analysis_athlete on analysis_cache(athlete_id);

alter table live_samples   enable row level security;
alter table analysis_cache enable row level security;
drop policy if exists "test_all_live"     on live_samples;
drop policy if exists "test_all_analysis" on analysis_cache;
create policy "test_all_live"     on live_samples   for all using (true) with check (true);
create policy "test_all_analysis" on analysis_cache for all using (true) with check (true);
