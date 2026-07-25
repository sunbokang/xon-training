# simulator.py
# ═══════════════════════════════════════════════════════════════════
#  [테스트용] 가상 심박계 시뮬레이터
#
#  실제 심박계 없이도 대시보드 전체(상태등, 모니터, 리포트)를
#  테스트할 수 있도록 가짜 심박 데이터를 MQTT로 쏴줍니다.
#
#  심박계를 아직 못 구했거나, 화면 동작만 먼저 확인하고 싶을 때 사용하세요.
#
#  [실행]
#    python simulator.py            → 4명 전부 시뮬레이션
#    python simulator.py 2          → 2명만 시뮬레이션
#
#  실행하면 athlete_1 ~ athlete_N 으로 데이터가 흘러갑니다.
#  대시보드 /admin 에서 센서 ID를 athlete_1 등으로 넣으면
#  상태등이 초록으로 바뀌는 걸 볼 수 있습니다.
# ═══════════════════════════════════════════════════════════════════

import sys
import json
import time
import math
import random

import paho.mqtt.client as mqtt

import config

# 시뮬레이션할 선수 수 (인자로 조절)
NUM_ATHLETES = int(sys.argv[1]) if len(sys.argv) > 1 else 4


class FakeAthlete:
    """가상 선수 1명: 시간이 지날수록 심박이 오르고 RMSSD가 떨어짐."""

    def __init__(self, athlete_id, base_hr):
        self.athlete_id = athlete_id
        self.base_hr = base_hr
        self.t0 = time.time()

    def sample(self):
        elapsed = time.time() - self.t0
        # 30분에 걸쳐 서서히 상승 + 사인파 변동 + 노이즈
        drift = min(elapsed / 1800, 1.0) * 35
        wave = math.sin(elapsed / 25) * 6
        bpm = int(self.base_hr + drift + wave + random.uniform(-3, 3))
        bpm = max(60, min(200, bpm))

        # RMSSD: 심박이 높을수록 낮아짐 (피로 반영)
        rmssd = max(4.0, 60 - (bpm - 90) * 0.45 + random.uniform(-4, 4))

        return {
            "timestamp": time.time(),
            "athlete_id": self.athlete_id,
            "BPM": bpm,
            "RMSSD": round(rmssd, 2),
            # Phase 2 필드 (시뮬레이터에서는 null)
            "GCT": None,
            "CADENCE": None,
            "VERTICAL_OSC": None,
            "STANCE_BALANCE": None,
            "RESPIRATION": None,
        }


def main():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="hyrox-simulator")

    print(f"[SIM] 브로커 연결 시도: {config.MQTT_BROKER}:{config.MQTT_PORT}")
    while True:
        try:
            client.connect(config.MQTT_BROKER, config.MQTT_PORT, keepalive=60)
            break
        except Exception as e:
            print(f"[SIM] 연결 실패: {e} → 3초 후 재시도 (Mosquitto가 켜져 있나요?)")
            time.sleep(3)

    client.loop_start()
    print(f"[SIM] 연결 성공! {NUM_ATHLETES}명 시뮬레이션 시작 (Ctrl+C 종료)\n")

    athletes = [
        FakeAthlete(f"athlete_{i+1}", base_hr=95 + i * 6)
        for i in range(NUM_ATHLETES)
    ]

    try:
        while True:
            for a in athletes:
                payload = a.sample()
                topic = f"{config.MQTT_TOPIC_BASE}/{a.athlete_id}"
                client.publish(topic, json.dumps(payload), qos=1)
                print(
                    f"[SIM] {a.athlete_id} | BPM={payload['BPM']:>3} "
                    f"| RMSSD={payload['RMSSD']:>5}"
                )
            print("-" * 40)
            time.sleep(1)  # 1초 간격
    except KeyboardInterrupt:
        print("\n[SIM] 종료")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
