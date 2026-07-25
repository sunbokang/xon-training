# sensors/ble_hr_client.py
# ═══════════════════════════════════════════════════════════════════
#  [Phase 1] BLE 심박계 어댑터
#   - 가민 HRM-Pro 등 표준 BLE HR 기기와 통신
#   - 0x2A37 구독 → BPM/RR 추출 → SensorReading 방출
#   - GCT/호흡수 등 Phase 2 필드는 None (스키마 호환 유지)
#   - 지하 환경 대비: 연결 끊김/무응답 시 무한 재연결
# ═══════════════════════════════════════════════════════════════════

import time
import asyncio

from bleak import BleakClient

from .base import SensorAdapter, SensorReading
from .hr_decode import parse_hr_measurement

HR_MEASUREMENT_UUID = "00002a37-0000-1000-8000-00805f9b34fb"  # 0x2A37


class BleHrAdapter(SensorAdapter):
    """Phase 1: BLE 심박계 1대 담당."""

    def __init__(self, athlete_id, address, on_reading):
        super().__init__(athlete_id, address, on_reading)
        self._last_data_time = 0

    def _notification_handler(self, _sender, data: bytearray):
        bpm, rr_list = parse_hr_measurement(data)
        self._last_data_time = time.time()

        reading = SensorReading(
            athlete_id=self.athlete_id,
            bpm=bpm,
            rr_intervals=rr_list,
            # Phase 2 필드는 BLE에서 얻을 수 없으므로 None 유지
        )

        rr_str = f"RR={rr_list}" if rr_list else "RR=없음"
        print(f"[BLE] {self.athlete_id} | BPM={bpm} | {rr_str}")
        self.on_reading(reading)

    async def run(self):
        while self._running:
            try:
                async with BleakClient(
                    self.address,
                    timeout=20.0,
                    disconnected_callback=lambda c: print(
                        f"[BLE] {self.athlete_id} 연결 끊김 감지"
                    ),
                ) as client:
                    print(f"[BLE] {self.athlete_id} 연결됨 ({self.address})")
                    self._last_data_time = time.time()
                    await client.start_notify(
                        HR_MEASUREMENT_UUID, self._notification_handler
                    )
                    # 무응답 감시 (지하 환경 대비)
                    while client.is_connected and self._running:
                        await asyncio.sleep(1)
                        if time.time() - self._last_data_time > 15:
                            print(f"[BLE] {self.athlete_id} 15초 무응답 → 재연결")
                            break
            except Exception as e:
                print(f"[BLE] {self.athlete_id} 오류: {e} → 3초 후 재연결")
                await asyncio.sleep(3)
