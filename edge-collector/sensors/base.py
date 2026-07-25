# sensors/base.py
# ═══════════════════════════════════════════════════════════════════
#  센서 추상화 계층 (Phase 1 / Phase 2 확장성의 핵심)
#
#  모든 센서(BLE, ANT+)는 SensorAdapter를 상속하고,
#  표준화된 SensorReading을 방출한다.
#  → 상위 로직(RMSSD 연산, MQTT 발행)은 어떤 센서인지 몰라도 된다.
#
#  Phase 1 (BLE): BPM, RR 만 채우고 나머지는 None
#  Phase 2 (ANT+): GCT, 케이던스, 호흡수까지 채움
# ═══════════════════════════════════════════════════════════════════

import time
from dataclasses import dataclass, asdict, field
from typing import Optional, List, Callable, Awaitable


@dataclass
class SensorReading:
    """
    모든 센서가 방출하는 표준 데이터 단위.
    Phase 2 필드는 Phase 1에서 None으로 남는다 (스키마 호환 유지).
    """
    athlete_id: str
    timestamp: float = field(default_factory=time.time)

    # ── Phase 1 (BLE / ANT+ 공통) ──
    bpm: Optional[int] = None
    rr_intervals: List[float] = field(default_factory=list)  # ms 리스트

    # ── Phase 2 (ANT+ 러닝 다이내믹스 / 호흡) ──
    gct: Optional[float] = None            # Ground Contact Time (ms)
    cadence: Optional[float] = None        # 분당 스텝 (spm)
    vertical_osc: Optional[float] = None   # 수직 진폭 (cm)
    stance_balance: Optional[float] = None # 좌우 균형 (%)
    respiration: Optional[float] = None    # 호흡수 (brpm)

    def to_mqtt_payload(self, rmssd: Optional[float]) -> dict:
        """MQTT로 발행할 JSON 딕셔너리 생성 (RMSSD는 상위에서 계산해 주입)."""
        return {
            "timestamp": self.timestamp,
            "athlete_id": self.athlete_id,
            "BPM": self.bpm,
            "RMSSD": rmssd,
            # Phase 2 지표 — Phase 1에서는 null로 전송되어 스키마가 유지됨
            "GCT": self.gct,
            "CADENCE": self.cadence,
            "VERTICAL_OSC": self.vertical_osc,
            "STANCE_BALANCE": self.stance_balance,
            "RESPIRATION": self.respiration,
        }


# 데이터 수신 콜백 타입: SensorReading 하나를 받는 함수
OnReadingCallback = Callable[[SensorReading], None]


class SensorAdapter:
    """
    센서 어댑터 공통 인터페이스.
    Phase 1의 BleHrAdapter, Phase 2의 AntAdapter가 이걸 상속한다.
    """

    def __init__(self, athlete_id: str, address: str, on_reading: OnReadingCallback):
        self.athlete_id = athlete_id
        self.address = address          # BLE MAC 또는 ANT+ device_id
        self.on_reading = on_reading
        self._running = True

    async def run(self):
        """연결 → 구독 → 콜백 → 재연결 루프. 서브클래스가 구현."""
        raise NotImplementedError

    def stop(self):
        self._running = False
