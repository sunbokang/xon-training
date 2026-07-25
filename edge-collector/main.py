# main.py
# ═══════════════════════════════════════════════════════════════════
#  엣지 수집 진입점 (Phase 무관)
#   - config.PHASE 에 따라 팩토리가 BLE/ANT+ 어댑터를 생성
#   - 각 어댑터는 표준 SensorReading을 방출 → RMSSD 주입 → MQTT 발행
#
#  [실행] python main.py
# ═══════════════════════════════════════════════════════════════════

import asyncio

import config
from sensors import make_adapter
from sensors.base import SensorReading
from rmssd import RMSSDCalculator
from mqtt_publisher import RobustMqttPublisher


async def scan_and_exit():
    """Phase 1(BLE) 스캔: 심박계 주소 찾기."""
    from bleak import BleakScanner
    print("[SCAN] 5초간 BLE 스캔 (스트랩 착용/활성화 필요)...")
    devices = await BleakScanner.discover(timeout=5.0)

    print("\n── 심박계로 추정 (HRM/Garmin) ──")
    found = False
    for d in devices:
        name = d.name or ""
        if "HRM" in name.upper() or "GARMIN" in name.upper():
            print(f"  ★ {d.address}  |  {name}")
            found = True
    if not found:
        print("  (없음) 스트랩 착용 후 재시도.")

    print("\n── 전체 ──")
    for d in devices:
        print(f"  {d.address}  |  {d.name}")
    print("\n[SCAN] ★ 주소를 config.SENSOR_MAP에 넣고 SCAN_MODE=False 로.")


async def main():
    if config.PHASE == 1 and config.SCAN_MODE:
        await scan_and_exit()
        return

    publisher = RobustMqttPublisher()
    publisher.start()

    # 선수별 RMSSD 계산기 (상태 유지)
    rmssd_calcs = {aid: RMSSDCalculator(config.RMSSD_WINDOW_SEC)
                   for aid in config.SENSOR_MAP.values()}

    # ── 표준 Reading 수신 시 처리 (Phase 무관 공통 로직) ──
    def on_reading(reading: SensorReading):
        calc = rmssd_calcs[reading.athlete_id]
        for rr in reading.rr_intervals:
            calc.add_rr(rr)
        rmssd = calc.compute() if reading.rr_intervals else None

        payload = reading.to_mqtt_payload(rmssd)
        publisher.publish(payload)

    # 팩토리로 어댑터 생성 (Phase에 맞는 구현이 자동 선택됨)
    adapters = [
        make_adapter(config.PHASE, aid, addr, on_reading)
        for addr, aid in config.SENSOR_MAP.items()
    ]

    if not adapters:
        print("[ERROR] SENSOR_MAP이 비어 있습니다.")
        return

    print(f"[SYSTEM] Phase {config.PHASE} · {len(adapters)}대 수집 시작 (Ctrl+C 종료)")

    try:
        await asyncio.gather(*(a.run() for a in adapters))
    finally:
        for a in adapters:
            a.stop()
        publisher.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[SYSTEM] 종료")
