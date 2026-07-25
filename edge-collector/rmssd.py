# rmssd.py
# ═══════════════════════════════════════════════════════════════════
#  RMSSD (단기 심박변이도 = 피로도 지표) 실시간 연산
#  RMSSD = sqrt( mean( diff(RR)^2 ) )  (ms)
#  선수별로 인스턴스 1개씩 유지한다.
# ═══════════════════════════════════════════════════════════════════

import time
from collections import deque

import numpy as np


class RMSSDCalculator:
    def __init__(self, window_sec: int = 30):
        self.window_sec = window_sec
        self.samples = deque()  # (수신시각, RR_ms)

    def add_rr(self, rr_ms: float):
        now = time.time()
        self.samples.append((now, rr_ms))
        while self.samples and (now - self.samples[0][0]) > self.window_sec:
            self.samples.popleft()

    def compute(self):
        if len(self.samples) < 3:
            return None
        rr = np.array([v for (_, v) in self.samples], dtype=np.float64)
        # 아티팩트 필터: 250ms(240bpm)~2000ms(30bpm)만 유효
        rr = rr[(rr >= 250) & (rr <= 2000)]
        if rr.size < 3:
            return None
        diffs = np.diff(rr)
        return round(float(np.sqrt(np.mean(diffs ** 2))), 2)
