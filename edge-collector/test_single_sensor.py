# test_single_sensor.py
# ═══════════════════════════════════════════════════════════════════
#  [테스트 1단계] MQTT 없이 BLE 1대만 연결해 BPM/RR/RMSSD 확인.
#  GATT Protocol Error (Insufficient Authentication) 자동 페어링 보강판
# ═══════════════════════════════════════════════════════════════════

import asyncio
import sys
from bleak import BleakClient, BleakScanner
from bleak.exc import BleakGATTProtocolError, BleakError

import config
from sensors.hr_decode import parse_hr_measurement
from sensors.ble_hr_client import HR_MEASUREMENT_UUID
from rmssd import RMSSDCalculator

# 명령행 인자로 주소를 받거나, 없으면 TARGET_ADDRESS 또는 config.SENSOR_MAP 사용
TARGET_ADDRESS = sys.argv[1] if len(sys.argv) > 1 else ""

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
        print("주소 없음. 주변 심박계를 스캔합니다...\n")
        for d in await BleakScanner.discover(timeout=5.0):
            name = d.name or ""
            if any(k in name.upper() for k in ["HRM", "GARMIN", "AMAZFIT", "HELIO"]):
                print(f"★ {d.address} | {name}")
        print("\n위 주소를 TARGET_ADDRESS에 넣거나 명령어로 실행하세요:")
        print("예) python test_single_sensor.py C9:F6:A9:D5:2B:9D")
        return

    print(f"[TEST] {address} 연결 시도...")
    async with BleakClient(address, timeout=20.0) as client:
        print(f"[TEST] 연결 성공! (Pairing 점검 중...)")

        # 1. Windows 보안 페어링(Bonding) 자동 시도
        try:
            paired = await client.pair()
            print(f"[TEST] 페어링 상태: {paired}")
        except Exception as e:
            print(f"[TEST] 페어링 요청 생략 또는 이미 처리됨: {e}")

        # 2. 심박 측정 알림 구독
        try:
            await client.start_notify(HR_MEASUREMENT_UUID, handler)
            print("[TEST] 심박 수신 시작! (Ctrl+C 종료) ※ RMSSD는 RR 3~4개 후 등장\n")
            while client.is_connected:
                await asyncio.sleep(1)
        except BleakGATTProtocolError as e:
            print(f"\n[오류] GATT 인증 실패: {e}")
            print("Windows 설정 -> Bluetooth 및 디바이스에서 해당 기기를 [장치 추가]로 정식 페어링해주세요.")
        except BleakError as e:
            print(f"\n[오류] BLE 통신 실패: {e}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[TEST] 종료")