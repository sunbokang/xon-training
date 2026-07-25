#!/usr/bin/env python3
# ble_scanner.py
# ═══════════════════════════════════════════════════════════════════
#  코치 친화적 BLE 오토스캔 서비스 (Part 2)
#
#  코치가 MAC 주소를 손으로 치지 않도록, 주변 심박계를 자동으로
#  찾아 목록으로 돌려줍니다. 웹 대시보드의 [주변 심박계 찾기] 버튼이
#  이 서비스의 /scan 을 호출합니다.
#
#  [단독 실행 — 목록만 보기]
#     python ble_scanner.py
#
#  [HTTP 서비스로 실행 — 대시보드 연동]
#     python ble_scanner.py --serve
#     → http://localhost:8765/scan  (GET) 호출 시 JSON 목록 반환
#
#  반환 예:
#     [{"address":"D1:A2:..","name":"HRM-Pro:12345","rssi":-58,"is_hr":true}, ...]
# ═══════════════════════════════════════════════════════════════════

import sys
import json
import asyncio

from bleak import BleakScanner

# 표준 심박 서비스 UUID (0x180D) — 심박계 판별용
HR_SERVICE_UUID = "0000180d-0000-1000-8000-00805f9b34fb"

# 가민/일반 심박계 이름 힌트
HR_NAME_HINTS = ("hrm", "garmin", "polar", "wahoo", "heart", "hr")

SCAN_SECONDS = 6.0


def _looks_like_hr(name: str, adv) -> bool:
    """이름 또는 광고 서비스 UUID로 심박계 여부 추정."""
    n = (name or "").lower()
    if any(h in n for h in HR_NAME_HINTS):
        return True
    try:
        uuids = [u.lower() for u in (adv.service_uuids or [])]
        if HR_SERVICE_UUID in uuids:
            return True
    except Exception:
        pass
    return False


async def scan_devices(seconds: float = SCAN_SECONDS):
    """주변 BLE 기기를 스캔해 심박계 우선으로 정렬한 목록 반환."""
    found = {}
    # detection_callback 으로 RSSI(신호세기)까지 수집
    def cb(device, adv):
        found[device.address] = {
            "address": device.address,
            "name": device.name or adv.local_name or "Unknown",
            "rssi": adv.rssi,
            "is_hr": _looks_like_hr(device.name or adv.local_name, adv),
        }

    scanner = BleakScanner(detection_callback=cb)
    await scanner.start()
    await asyncio.sleep(seconds)
    await scanner.stop()

    devices = list(found.values())
    # 심박계 우선, 그다음 신호 강한 순
    devices.sort(key=lambda d: (not d["is_hr"], -(d["rssi"] or -999)))
    return devices


# ─────────────────────────────────────────────────────────────────
#  HTTP 서비스 모드 (대시보드 연동)
# ─────────────────────────────────────────────────────────────────
def serve(port: int = 8765):
    from http.server import BaseHTTPRequestHandler, HTTPServer

    class Handler(BaseHTTPRequestHandler):
        def _cors(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Type", "application/json; charset=utf-8")

        def do_OPTIONS(self):
            self.send_response(204)
            self._cors()
            self.end_headers()

        def do_GET(self):
            if self.path.startswith("/scan"):
                try:
                    devices = asyncio.run(scan_devices())
                    body = json.dumps(devices, ensure_ascii=False).encode("utf-8")
                    self.send_response(200)
                    self._cors()
                    self.end_headers()
                    self.wfile.write(body)
                except Exception as ex:
                    err = json.dumps({"error": str(ex)}).encode("utf-8")
                    self.send_response(500)
                    self._cors()
                    self.end_headers()
                    self.wfile.write(err)
            else:
                self.send_response(404)
                self._cors()
                self.end_headers()
                self.wfile.write(b'{"error":"use /scan"}')

        def log_message(self, *args):
            pass  # 콘솔 조용히

    srv = HTTPServer(("0.0.0.0", port), Handler)
    print(f"[SCAN] BLE 스캔 서비스 시작: http://localhost:{port}/scan")
    print("[SCAN] 대시보드의 [주변 심박계 찾기] 버튼과 연동됩니다. Ctrl+C 종료")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n[SCAN] 종료")


def main():
    if "--serve" in sys.argv:
        serve()
        return
    # 단독 실행: 목록 출력
    print(f"[SCAN] {SCAN_SECONDS}초간 주변 BLE 기기 검색 중... (심박계를 착용하세요)")
    devices = asyncio.run(scan_devices())
    if not devices:
        print("[SCAN] 발견된 기기가 없습니다. 심박계 착용 여부와 블루투스를 확인하세요.")
        return
    print(f"\n발견된 기기 {len(devices)}개 (심박계 우선):\n")
    for d in devices:
        star = "★ 심박계" if d["is_hr"] else "  기타  "
        print(f"  {star}  {d['address']}  RSSI {d['rssi']:>4}  {d['name']}")
    print("\n이 중 심박계의 address를 config.py의 SENSOR_MAP에 넣으세요.")


if __name__ == "__main__":
    main()
