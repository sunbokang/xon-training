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
import os
# 로컬: localhost / 클라우드(HiveMQ 등): 환경변수로 덮어쓰기 가능
#   set MQTT_BROKER=xxxxx.hivemq.cloud  &  set MQTT_PORT=8883  (윈도우)
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT   = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")
MQTT_USE_TLS  = os.getenv("MQTT_USE_TLS", "0") == "1"
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
# ★★★ 여기 오른쪽 값("athlete_1" 등)은 대시보드에서 각 선수에게 입력하는
#     "센서 ID"와 글자 하나까지 똑같아야 데이터가 그 선수 칸으로 들어갑니다. ★★★
#
# 왼쪽은 ble_scanner.py로 찾은 심박계 MAC 주소를 넣으세요.
SENSOR_MAP = {
    "C6:33:B5:9D:8F:B4": "athlete_1",   # 예: 정원준 HRMPro+:599846
    "C9:F6:A9:D5:2B:9D": "athlete_2",   # 예: 강지웅 HRM600:182158
    #"AA:BB:CC:77:88:99": "athlete_3",   # 예: 강지웅
    #"AA:BB:CC:AA:BB:CC": "athlete_4",   # 예: 강선보
}

SCAN_MODE = False  # True: 스캔 후 종료 / False: 실제 수집(운영)
