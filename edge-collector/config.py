# config.py
# ═══════════════════════════════════════════════════════════════════
#  전역 설정
# ═══════════════════════════════════════════════════════════════════

# ── Phase 전환 스위치 (이것 하나로 BLE↔ANT+ 전환) ──────────────────
# 1 = Phase 1 (BLE, 이번 주 테스트)
# 2 = Phase 2 (ANT+, 향후 고도화 — 드라이버 교체 후)
PHASE = 1

# ── MQTT 브로커 ────────────────────────────────────────────────────
# 테스트: "localhost" / 운영: EC2 퍼블릭 IP
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC_BASE = "hyrox/live"

# 지하 환경 대비 로컬 버퍼: 브로커 끊김 시 여기에 쌓았다가 복구 시 일괄 전송
LOCAL_BUFFER_PATH = "buffer.jsonl"
MAX_BUFFER_LINES = 50000   # 버퍼 상한 (초과 시 오래된 것부터 폐기)

RMSSD_WINDOW_SEC = 30

# ── 센서 매핑 ──────────────────────────────────────────────────────
# Phase 1: BLE MAC 주소 → athlete_id
# Phase 2: ANT+ device_number(문자열) → athlete_id
#
# [사용법] SCAN_MODE=True 로 실행 → 주소 확인 → 여기 채우기 → False
SENSOR_MAP = {
    "C6:33:B5:9D:8F:B4": "athlete_1",  # HRMPro+:599846 (가민)
    "C9:F6:A9:D5:2B:9D": "athlete_2",  # HRM 600
    # "AA:BB:CC:77:88:99": "athlete_3",
    # "FC:31:BF:32:3E:E7": "athlete_4",
}

SCAN_MODE = False   # True: 스캔 후 종료 / False: 수집

SUPABASE_URL = "https://vurxqetjfzliemazmmft.supabase.co"
SUPABASE_KEY = "sb_publishable_uZoU1DcLeqvkRfwCwSUIRQ_-IocyBuL"