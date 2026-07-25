# sensors/__init__.py
# ═══════════════════════════════════════════════════════════════════
#  센서 팩토리: config의 PHASE 값에 따라 올바른 어댑터를 생성.
#  → main.py는 Phase를 신경 쓰지 않고 이 팩토리만 호출한다.
# ═══════════════════════════════════════════════════════════════════

from .base import SensorAdapter, SensorReading


def make_adapter(phase: int, athlete_id: str, address: str, on_reading) -> SensorAdapter:
    """
    phase=1 → BLE 어댑터
    phase=2 → ANT+ 어댑터
    """
    if phase == 1:
        from .ble_hr_client import BleHrAdapter
        return BleHrAdapter(athlete_id, address, on_reading)
    elif phase == 2:
        from .ant_reader import AntAdapter
        return AntAdapter(athlete_id, address, on_reading)
    else:
        raise ValueError(f"알 수 없는 PHASE: {phase} (1 또는 2)")
