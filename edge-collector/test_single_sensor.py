# test_single_sensor.py
# ═══════════════════════════════════════════════════════════════════
#  [테스트 1단계] MQTT 없이 BLE 1대만 연결해 BPM/RR/RMSSD 확인.
#  파이프라인 전체를 켜기 전에 이걸로 먼저 검증하세요.
#
#  [실행] python test_single_sensor.py
# ═══════════════════════════════════════════════════════════════════

import asyncio

from bleak import BleakClient, BleakScanner

import config
from sensors.hr_decode import parse_hr_measurement
from sensors.ble_hr_client import HR_MEASUREMENT_UUID
from rmssd import RMSSDCalculator

TARGET_ADDRESS = ""  # 비우면 SENSOR_MAP 첫 번째 사용

calc = RMSSDCalculator(config.RMSSD_WINDOW_SEC)


def handler(_sender, data):
    bpm, rr_list = parse_hr_measurement(data)
    for rr in rr_list:
        calc.add_rr(rr)
    rmssd = calc.compute() if rr_list else None
    rr_str = f"{rr_list}" if rr_list else "없음(접촉 확인)"
    print(f"BPM={bpm:>3} | RMSSD={rmssd} | RR={rr_str}")


async def main():
    address = TARGET_ADDRESS or (
        next(iter(config.SENSOR_MAP.keys())) if config.SENSOR_MAP else ""
    )
    if not address:
        print("주소 없음. 스캔합니다...\n")
        for d in await BleakScanner.discover(timeout=5.0):
            name = d.name or ""
            if "HRM" in name.upper() or "GARMIN" in name.upper():
                print(f"★ {d.address} | {name}")
        print("\n위 주소를 TARGET_ADDRESS에 넣고 다시 실행하세요.")
        return

    print(f"[TEST] {address} 연결 시도...")
    async with BleakClient(address, timeout=20.0) as client:
        print("[TEST] 연결됨! (Ctrl+C 종료)  ※ RMSSD는 RR 3~4개 후 등장\n")
        await client.start_notify(HR_MEASUREMENT_UUID, handler)
        while client.is_connected:
            await asyncio.sleep(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[TEST] 종료")
