# XON TRAINING · HYROX 통합 모니터링 & 분석 시스템

> 지하 훈련장에서 최대 4명의 선수를 동시에 실시간 모니터링하고,
> 경기 후 종목별 강약점을 룰 엔진으로 분석해 AI 코칭 처방까지 내주는
> 엔드투엔드 시스템입니다.

이 문서는 **코딩을 처음 하는 분도** 순서대로 따라 하면 시스템을 켤 수 있도록
터미널 세팅부터 차근차근 안내합니다.

---

## 0. 전체 구조 한눈에 보기

```
 [선수 심박계]          [노트북 1대]                    [화면들]
 Garmin HRM-Pro   ──BLE──▶  ┌──────────────────┐
 (가슴 스트랩)              │ edge-collector    │        📺 TV1 (16:9)
                           │  (Python)         │        📺 TV2 (16:9)
                           │  심박·RR 수집      │        📺 TV3 (16:9)
                           │  RMSSD 계산        │        📱 아이패드(측정관)
                           └────────┬─────────┘
                                    │ MQTT
                           ┌────────▼─────────┐
                           │ Mosquitto broker │  (로컬, 노트북 안에서 실행)
                           └────────┬─────────┘
                                    │
                    ┌───────────────┼────────────────┐
                    ▼               ▼                ▼
              [프론트엔드]    [Supabase DB]     [Telegraf/모니터]
              React 대시보드   경기기록·심박     (선택) 상태수집
              /admin /referee  적재
              /display /report
```

핵심 흐름:
1. 선수가 **가민 심박 스트랩**을 착용합니다.
2. 노트북의 **edge-collector**(Python)가 블루투스(BLE)로 심박·RR간격을 받습니다.
3. 30초 창으로 **RMSSD**(피로도 지표)를 계산합니다.
4. **MQTT**(mosquitto)로 프론트엔드에 실시간 전송합니다.
5. **대시보드**가 TV/아이패드에 표시하고, 경기 기록을 **Supabase**에 쌓습니다.
6. 경기 후 **룰 엔진**이 종목별 강약점을 분석하고 **Gemini**가 처방을 만듭니다.

---

## 1. 준비물

**하드웨어**
- 윈도우 노트북 1대 (블루투스 내장 — BLE 지원)
- 가민 HRM-Pro / HRM-Dual 또는 Polar H10 심박 스트랩 (RR간격 지원 필수)
- 16:9 가로형 TV 3대 + 세로형 아이패드 1대
- 모두 같은 Wi-Fi(또는 유선)에 연결

**소프트웨어**
- Python 3.10 이상
- Mosquitto (MQTT 브로커)
- 최신 크롬 브라우저

---

## 2. 터미널 처음 여는 법

- **윈도우**: 시작 메뉴 → `cmd` 입력 → 명령 프롬프트 실행
- 아래 `>` 뒤의 명령어를 한 줄씩 복사해 붙여넣고 Enter를 칩니다.

프로젝트 폴더로 이동(압축을 푼 위치에 맞게 경로 수정):
```
> cd C:\Users\내이름\Downloads\hyrox-v7
```

---

## 3. Python 환경 세팅

가상환경(프로젝트 전용 공간)을 만들고 필요한 라이브러리를 설치합니다.
```
> cd edge-collector
> python -m venv venv
> venv\Scripts\activate        (윈도우)
   # 맥/리눅스라면:  source venv/bin/activate

> pip install -r requirements.txt
```
`bleak`(블루투스), `paho-mqtt`(통신), `numpy`(계산)가 설치됩니다.

---

## 4. 심박계 찾기 (MAC 주소를 몰라도 됩니다)

심박 스트랩을 착용한 뒤:
```
> python ble_scanner.py
```
주변 심박계가 신호 강한 순으로 나옵니다.
```
  ★ 심박계  D1:A2:33:44:55:66  RSSI  -52  HRM-Pro:0451234
  ★ 심박계  E7:B8:99:AA:BB:CC  RSSI  -61  HRM-Pro:0459876
```
여기 나온 `주소`(D1:A2:...)를 복사합니다.

> 💡 대시보드의 **[🔍 주변 심박계 찾기]** 버튼을 쓰려면 스캔을 서비스로 띄웁니다:
> ```
> > python ble_scanner.py --serve
> ```
> 그러면 `/admin` 화면의 스캔 버튼이 이 목록을 바로 불러옵니다.

---

## 5. 선수-센서 매핑 (config.py)

`edge-collector/config.py`를 메모장으로 열어 `SENSOR_MAP`에
방금 복사한 주소를 붙여넣습니다.

```python
SENSOR_MAP = {
    "D1:A2:33:44:55:66": "athlete_1",   # 정원준
    "E7:B8:99:AA:BB:CC": "athlete_2",   # 동주봉
    # ...
}
```

> ⚠️ **매우 중요**: 여기 오른쪽의 센서 ID("athlete_1" 등)는
> 대시보드 `/setup`(관리자 화면)에서 각 선수에게 지정하는 **"센서 ID"** 와
> **글자 하나까지 똑같아야** 데이터가 그 선수 칸으로 흘러갑니다.

---

## 6. MQTT 브로커(mosquitto) 켜기

MQTT는 심박 데이터를 실어 나르는 "우체국"입니다.

**설치**
- 윈도우: https://mosquitto.org/download 에서 설치
- 맥: `brew install mosquitto`

**실행** (새 터미널 창에서, 프로젝트의 설정 파일 사용)
```
> mosquitto -c server\mosquitto.conf -v
```
`Opening ipv4 listen socket on port 1883` 이 보이면 성공입니다.
이 창은 켜둔 채로 둡니다.

---

## 7. 심박 수집 시작

또 다른 새 터미널 창에서 (가상환경 활성화 상태로):
```
> cd edge-collector
> venv\Scripts\activate
> python main.py
```
심박계가 연결되면 이런 로그가 흐릅니다:
```
[BLE] athlete_1 connected  D1:A2:...
[athlete_1] bpm=142 rr=[421,418] rmssd=38.2
[MQTT] published hyrox/live/athlete_1
```

> 심박계가 없어도 테스트할 수 있습니다 (가짜 데이터 생성):
> ```
> > python simulator.py
> ```

---

## 8. 대시보드 열기

`frontend/hyrox-console-v7.html` 파일을 크롬으로 더블클릭해 엽니다.
(별도 서버 없이 바로 열립니다.)

- **⚙ ADMIN** : 심박계 스캔, TV 매핑, 존 개인화, 선수별 출발(Wave Start)
- **▶ REFEREE** : 아이패드용 — 탭으로 선수 선택 후 초대형 [NEXT STATION] 버튼
- **📺 TV** : 각 TV에 띄울 화면 미리보기 → [전체화면]으로 TV에 표시
- **📊 REPORT** : 분석 리포트 안내

리포트는 `frontend/report-preview.html`을 열면 정원준 선수의
룰 엔진 분석(방사형 차트, Stationary Tax, 목표 대비, 심박 추이) +
Gemini 처방을 볼 수 있고, 상단 **[PDF 저장/인쇄]** 로 A4 저장됩니다.

---

## 9. 실전 운영 순서 (요약)

1. mosquitto 실행 (`mosquitto -c server\mosquitto.conf`)
2. 심박 수집 실행 (`python main.py`)
3. `/admin`에서 각 선수에게 센서 ID 지정 + TV 매핑
4. 선수가 출발할 때마다 `/admin` 또는 `/referee`에서 **START** (시차 출발)
5. 측정관은 아이패드 `/referee`에서 구간이 끝날 때마다 **NEXT STATION**
6. 경기 후 `/report`에서 강약점 분석 + 처방 확인

---

## 10. Python 핵심 모듈 설명

| 파일 | 역할 |
|---|---|
| `ble_scanner.py` | 주변 심박계 자동 검색. `--serve`로 대시보드 연동 |
| `main.py` | 전체 수집 오케스트레이션 (연결·계산·발행) |
| `sensors/ble_hr_client.py` | 가민 BLE 연결 및 심박·RR 수신 |
| `sensors/hr_decode.py` | BLE 표준(0x2A37) 심박 패킷 디코딩 |
| `rmssd.py` | 30초 창 RMSSD(피로도) 계산 |
| `mqtt_publisher.py` | 지하 Wi-Fi 끊김에 대비한 버퍼링 발행 |
| `config.py` | 선수-센서 매핑, 브로커 주소 설정 |
| `simulator.py` | 심박계 없이 테스트용 가짜 데이터 |

### 확장성: Phase 1 → Phase 2
현재는 BLE로 **심박 + RR + RMSSD**를 받습니다(Phase 1).
나중에 ANT+ 동글로 **러닝 다이내믹스(GCT/케이던스) + 호흡수**까지
받으려면(Phase 2), `sensors/ant_reader.py`를 채우고 `config.py`의
`PHASE = 2`로 바꾸기만 하면 상위 코드는 그대로 동작하도록
**센서 어댑터**로 추상화되어 있습니다.

---

## 11. 데이터베이스 (Supabase)

`server/supabase_schema.sql`을 Supabase SQL 에디터에 붙여넣어 실행하면
아래 테이블이 생성됩니다:

- `target_athletes` : 선수 프로필
- `results` / `splits` : 경기 기록과 구간별 랩타임
- `live_samples` : 실시간 심박/RMSSD/GCT 적재 (Part 5)
- `analysis_cache` : 룰 엔진 분석 결과 + Gemini 처방 캐시

---

## 12. 룰 엔진 분석 원리 (왜 믿을 수 있나)

이 시스템은 **"몇 % 넘으면 나쁨" 같은 고정 임계값을 쓰지 않습니다.**
대신 각 선수 **자신의 깨끗한 러닝**(페널티 직후가 아닌 Run 1·2·6·7)을
기준선으로 삼아, 종목 직후 러닝이 그 기준선에서 **표준편차의 몇 배**만큼
벗어났는지(z-score)를 봅니다. 그래서:

- 러닝이 원래 들쭉날쭉한 선수는 웬만한 드롭도 "정상 범위"로 보고,
- 러닝이 매우 일정한 선수는 작은 드롭도 "유의미한 이상"으로 잡아냅니다.

이렇게 나온 정량 수치(방사형 5축, 종목별 Pace Drop, 심박 회복)를
**먼저 화면에 그리고**, Gemini에는 그 수치를 넘겨 **"어떻게 훈련할지"** 처방만
쓰게 합니다. 판단은 룰 엔진이, 언어화는 AI가 맡는 구조입니다.

---

## 문제 해결

- **심박계가 안 잡혀요**: 스트랩 센서에 물을 살짝 묻히고, 노트북 블루투스가 켜져 있는지 확인하세요.
- **대시보드에 데이터가 안 떠요**: `config.py`의 센서 ID와 `/setup`의 센서 ID가 정확히 같은지 확인하세요(6·5번 항목).
- **화면이 3대에서 따로 놀아요**: 현재 프리뷰는 브라우저 1대 기준입니다. 실제 3대 동기화는 MQTT 공유 토픽이 필요합니다(개발 로드맵).

---

ⓒ sunbo kang · XON TRAINING
