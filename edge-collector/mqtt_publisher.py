# mqtt_publisher.py
# ═══════════════════════════════════════════════════════════════════
#  초강건성(Robust) MQTT 발행 모듈 — 지하 Wi-Fi 끊김 대비
#
#  전략:
#   1) 무한 재연결: paho 자동 재연결(백오프 1→30초) + 최초 연결 재시도
#   2) 로컬 버퍼링: 브로커가 끊긴 동안 데이터를 파일(buffer.jsonl)에 append.
#      연결이 복구되면 버퍼를 순서대로 재전송(flush)하고 파일을 비운다.
#   3) 버퍼 상한: 파일이 너무 커지면 오래된 줄부터 폐기(메모리/디스크 보호).
#
#  이렇게 하면 지하에서 Wi-Fi가 수십 초~수 분 끊겨도
#  심박 데이터가 유실되지 않고 복구 즉시 InfluxDB로 몰려 들어간다.
# ═══════════════════════════════════════════════════════════════════

import os
import json
import time
import threading

import paho.mqtt.client as mqtt

import config


class RobustMqttPublisher:
    def __init__(self):
        self.client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id=f"hyrox-edge-{int(time.time())}",
        )
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.reconnect_delay_set(min_delay=1, max_delay=30)

        self._connected = False
        self._buffer_lock = threading.Lock()   # 파일 동시 접근 보호

    # ── 연결 콜백 ──────────────────────────────────────────────────
    def _on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            self._connected = True
            print("[MQTT] 연결 성공")
            # 연결되자마자 그동안 쌓인 버퍼를 재전송
            self._flush_buffer()
        else:
            print(f"[MQTT] 연결 거부: {reason_code}")

    def _on_disconnect(self, client, userdata, flags, reason_code, properties):
        self._connected = False
        print(f"[MQTT] 끊김(code={reason_code}) → 자동 재연결 + 로컬 버퍼링 시작")

    # ── 시작 ───────────────────────────────────────────────────────
    def start(self):
        # 최초 연결 시도 (실패해도 계속 재시도, 그 사이 데이터는 버퍼로)
        def _try_connect():
            while True:
                try:
                    # 클라우드 브로커: 인증/TLS 적용
                    if getattr(config, "MQTT_USERNAME", ""):
                        self.client.username_pw_set(config.MQTT_USERNAME, config.MQTT_PASSWORD)
                    if getattr(config, "MQTT_USE_TLS", False):
                        import ssl
                        self.client.tls_set(cert_reqs=ssl.CERT_REQUIRED)
                    self.client.connect(config.MQTT_BROKER, config.MQTT_PORT, keepalive=60)
                    return
                except Exception as e:
                    print(f"[MQTT] 최초 연결 실패: {e} → 3초 후 재시도 (데이터는 버퍼링)")
                    time.sleep(3)

        # 연결을 백그라운드에서 시도 → 메인 수집이 막히지 않음
        threading.Thread(target=_try_connect, daemon=True).start()
        self.client.loop_start()

    # ── 발행 ───────────────────────────────────────────────────────
    def publish(self, payload: dict):
        topic = f"{config.MQTT_TOPIC_BASE}/{payload['athlete_id']}"
        line = json.dumps({"topic": topic, "payload": payload})

        if self._connected:
            try:
                info = self.client.publish(topic, json.dumps(payload), qos=1)
                if info.rc != mqtt.MQTT_ERR_SUCCESS:
                    self._buffer_write(line)   # 발행 실패 → 버퍼로
            except Exception as e:
                print(f"[MQTT] publish 예외: {e} → 버퍼링")
                self._buffer_write(line)
        else:
            # 연결 안 됨 → 로컬 버퍼에 저장
            self._buffer_write(line)

    # ── 로컬 버퍼 쓰기 ─────────────────────────────────────────────
    def _buffer_write(self, line: str):
        with self._buffer_lock:
            with open(config.LOCAL_BUFFER_PATH, "a", encoding="utf-8") as f:
                f.write(line + "\n")
            self._trim_buffer_if_needed()

    def _trim_buffer_if_needed(self):
        """버퍼가 상한을 넘으면 오래된 줄부터 잘라낸다."""
        try:
            with open(config.LOCAL_BUFFER_PATH, "r", encoding="utf-8") as f:
                lines = f.readlines()
            if len(lines) > config.MAX_BUFFER_LINES:
                lines = lines[-config.MAX_BUFFER_LINES:]
                with open(config.LOCAL_BUFFER_PATH, "w", encoding="utf-8") as f:
                    f.writelines(lines)
                print(f"[BUFFER] 상한 초과 → 최근 {config.MAX_BUFFER_LINES}건만 유지")
        except FileNotFoundError:
            pass

    # ── 버퍼 재전송(flush) ─────────────────────────────────────────
    def _flush_buffer(self):
        """연결 복구 시 호출. 버퍼의 모든 줄을 순서대로 재발행 후 파일 삭제."""
        with self._buffer_lock:
            if not os.path.exists(config.LOCAL_BUFFER_PATH):
                return
            try:
                with open(config.LOCAL_BUFFER_PATH, "r", encoding="utf-8") as f:
                    lines = f.readlines()
            except FileNotFoundError:
                return

            if not lines:
                return

            print(f"[BUFFER] 복구 감지 → {len(lines)}건 재전송 시작")
            sent = 0
            for line in lines:
                try:
                    obj = json.loads(line)
                    self.client.publish(obj["topic"], json.dumps(obj["payload"]), qos=1)
                    sent += 1
                except Exception as e:
                    print(f"[BUFFER] 재전송 실패(건너뜀): {e}")
            # 재전송 완료 → 버퍼 비우기
            os.remove(config.LOCAL_BUFFER_PATH)
            print(f"[BUFFER] {sent}건 재전송 완료, 버퍼 초기화")

    def stop(self):
        self.client.loop_stop()
        self.client.disconnect()