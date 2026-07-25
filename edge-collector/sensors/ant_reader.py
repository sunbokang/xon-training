# sensors/ant_reader.py
# ═══════════════════════════════════════════════════════════════════
#  [Phase 2] ANT+ 어댑터 (향후 고도화용 스텁 + 구현 가이드)
#
#  이 파일은 아직 실행하지 않습니다. Phase 2 전환 시 아래를 수행:
#    1) pip install openant
#    2) Zadig로 ANT+ 동글 드라이버를 libusb-win32로 교체
#       (https://zadig.akeo.ie/ → Options > List All Devices
#        → ANT USBStick 선택 → libusb-win32 → Replace Driver)
#    3) 가민 익스프레스 등 동글 선점 프로세스 종료
#    4) config.py 의 PHASE = 2 로 변경
#
#  ▶ 핵심: 이 어댑터도 SensorAdapter를 상속하고 동일한 SensorReading을
#     방출하므로, main.py / mqtt_publisher / RMSSD 연산 등 상위 코드는
#     단 한 줄도 바뀌지 않습니다. 어댑터만 갈아끼우면 됩니다.
#
#  ANT+가 추가로 주는 데이터:
#    - Heart Rate 프로파일: BPM, RR
#    - Running Dynamics 프로파일: GCT, 케이던스, 수직진폭, 좌우균형
#    - (일부 기기) 호흡수
#  이 값들을 SensorReading의 Phase 2 필드에 채우면
#  프론트/DB가 자동으로 인식합니다.
# ═══════════════════════════════════════════════════════════════════

import asyncio

from .base import SensorAdapter, SensorReading


class AntAdapter(SensorAdapter):
    """
    Phase 2: ANT+ 동글로 HR + Running Dynamics + 호흡 수집.

    아래는 openant 연동 골격입니다. 실제 Phase 2 착수 시
    HeartRate / RunningDynamics 디바이스 콜백을 연결하세요.
    """

    def __init__(self, athlete_id, address, on_reading):
        # address 자리에는 ANT+ device_number(int)를 문자열로 전달
        super().__init__(athlete_id, address, on_reading)
        self._device_number = int(address) if address.isdigit() else 0

        # 러닝 다이내믹스는 HR과 별도 페이지로 오므로,
        # 최신값을 잠시 보관했다가 하나의 SensorReading으로 합친다.
        self._latest = {
            "bpm": None, "rr": [],
            "gct": None, "cadence": None,
            "vertical_osc": None, "stance_balance": None,
            "respiration": None,
        }

    # ── openant HeartRate 프로파일 콜백 (Phase 2에서 연결) ──
    def _on_hr_data(self, page, page_name, data):
        # from openant.devices.heart_rate import HeartRateData
        # self._latest["bpm"] = data.heart_rate
        # self._latest["rr"] = [data.rr_interval] if data.rr_interval else []
        self._emit()

    # ── openant RunningDynamics 프로파일 콜백 (Phase 2에서 연결) ──
    def _on_running_dynamics(self, page, page_name, data):
        # self._latest["gct"] = data.ground_contact_time
        # self._latest["cadence"] = data.cadence
        # self._latest["vertical_osc"] = data.vertical_oscillation
        # self._latest["stance_balance"] = data.gct_balance
        self._emit()

    def _emit(self):
        """보관된 최신값들을 하나의 표준 Reading으로 합쳐 방출."""
        reading = SensorReading(
            athlete_id=self.athlete_id,
            bpm=self._latest["bpm"],
            rr_intervals=self._latest["rr"],
            gct=self._latest["gct"],
            cadence=self._latest["cadence"],
            vertical_osc=self._latest["vertical_osc"],
            stance_balance=self._latest["stance_balance"],
            respiration=self._latest["respiration"],
        )
        self.on_reading(reading)

    async def run(self):
        # ── Phase 2 구현 골격 (현재는 미동작 안내만) ──
        # from openant.easy.node import Node
        # from openant.devices import ANTPLUS_NETWORK_KEY
        # from openant.devices.heart_rate import HeartRate
        # from openant.devices.running_dynamics import RunningDynamics
        #
        # node = Node()
        # node.set_network_key(0x00, ANTPLUS_NETWORK_KEY)
        # hr = HeartRate(node, device_id=self._device_number)
        # hr.on_device_data = self._on_hr_data
        # rd = RunningDynamics(node, device_id=self._device_number)
        # rd.on_device_data = self._on_running_dynamics
        # node.start()  # blocking → 별도 스레드/재시작 루프로 감쌀 것
        raise NotImplementedError(
            "Phase 2 미구현. requirements.txt의 openant 주석 해제 + "
            "Zadig 드라이버 교체 후 위 골격을 채우세요."
        )
