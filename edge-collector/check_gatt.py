import asyncio
from bleak import BleakClient

ADDRESS = "C9:F6:A9:D5:2B:9D"  # HRM 600

async def main():
    print(f"[{ADDRESS}] 연결 및 GATT 서비스 전체 조회 중...")
    async with BleakClient(ADDRESS, timeout=10.0) as client:
        print("=== 발견된 서비스 및 특성 목록 ===")
        for s in client.services:
            print(f"\n[Service] {s.uuid} ({s.description})")
            for c in s.characteristics:
                print(f"  └─ [Char] {c.uuid} | Props: {c.properties}")
        print("=================================")

asyncio.run(main())