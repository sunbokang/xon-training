# sensors/hr_decode.py
# ═══════════════════════════════════════════════════════════════════
#  BLE 표준 Heart Rate Measurement (0x2A37) 페이로드 디코더
#  BLE/ANT+ 어느 쪽이든 표준 HR 페이로드 파싱에 재사용 가능하도록 분리.
# ═══════════════════════════════════════════════════════════════════

from typing import Tuple, List


def parse_hr_measurement(data: bytearray) -> Tuple[int, List[float]]:
    """
    바이트 0 = Flags:
      bit 0 : HR 값 포맷 (0=UINT8, 1=UINT16)
      bit 3 : Energy Expended 존재 여부
      bit 4 : RR-Interval 존재 여부
    이후: [HR][(Energy 2B)][RR 2B...]

    RR Interval은 1/1024초 단위 → ms 변환 시 *1000/1024.
    반환: (bpm, [rr_ms, ...])
    """
    flags = data[0]
    hr_format_uint16 = flags & 0x01
    energy_present = (flags >> 3) & 0x01
    rr_present = (flags >> 4) & 0x01

    index = 1
    if hr_format_uint16:
        bpm = int.from_bytes(data[index:index + 2], "little")
        index += 2
    else:
        bpm = data[index]
        index += 1

    if energy_present:
        index += 2  # Energy Expended 건너뜀

    rr_intervals: List[float] = []
    if rr_present:
        while index + 2 <= len(data):
            raw = int.from_bytes(data[index:index + 2], "little")
            rr_intervals.append(round(raw * 1000.0 / 1024.0, 1))
            index += 2

    return bpm, rr_intervals
