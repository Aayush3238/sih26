import os
import time
import random
import hashlib
from pathlib import Path
from typing import Optional

import numpy as np

import torch

from ai_engine.model import AttackForecasterLSTM, ATTACK_STAGES, NUM_STAGES, FEATURE_DIM, WINDOW_SIZE

MODEL_PATH = Path(__file__).parent / "models" / "attack_forecaster.pth"


class InferenceEngine:
    """Unified inference interface: real model or deterministic mock fallback."""

    STAGE_RECOMMENDATIONS = {
        "Reconnaissance": "Monitor traffic patterns; enable IDS signature updates",
        "Resource Development": "Block suspicious outbound connections; audit DNS queries",
        "Initial Access": "Enforce MFA; patch exposed services; block attacker IP",
        "Execution": "Isolate host; terminate suspicious processes",
        "Persistence": "Audit scheduled tasks and startup items; reset credentials",
        "Privilege Escalation": "Apply least-privilege policies; audit sudoers",
        "Defense Evasion": "Enable advanced logging; deploy EDR agents",
        "Credential Access": "Force password rotation; enable credential guard",
        "Discovery": "Restrict network scanning; segment the network",
        "Lateral Movement": "Disable RDP; enforce network segmentation",
        "Collection": "Monitor file access; restrict shared drive permissions",
        "Command and Control": "Block C2 domains/IPs at firewall; isolate host",
        "Exfiltration": "Block external data transfer; enable DLP policies",
        "Impact": "Activate incident response plan; isolate critical assets",
    }

    def __init__(self):
        self.model: Optional[AttackForecasterLSTM] = None
        self.device = torch.device("cpu")
        self.use_mock = True
        self._mock_state = {"window": [], "stage_idx": 0, "tick": 0}

        self._try_load_model()

    def _try_load_model(self):
        if MODEL_PATH.exists():
            try:
                self.model = AttackForecasterLSTM()
                state = torch.load(MODEL_PATH, map_location=self.device, weights_only=True)
                self.model.load_state_dict(state)
                self.model.to(self.device)
                self.model.eval()
                self.use_mock = False
                print(f"[InferenceEngine] Loaded trained model from {MODEL_PATH}")
            except Exception as e:
                print(f"[InferenceEngine] Failed to load model: {e}. Using mock fallback.")
                self.model = None
                self.use_mock = True
        else:
            print(f"[InferenceEngine] No .pth file at {MODEL_PATH}. Using mock fallback.")

    def predict(self, features: list[float]) -> dict:
        """
        Accepts a single feature vector ( FEATURE_DIM floats ).
        Internally manages a sliding window buffer.
        Returns dict with current_stage, next_stage, confidence, mitigation.
        """
        if len(features) < FEATURE_DIM:
            features = features + [0.0] * (FEATURE_DIM - len(features))
        elif len(features) > FEATURE_DIM:
            features = features[:FEATURE_DIM]

        self._mock_state["window"].append(features)
        if len(self._mock_state["window"]) > WINDOW_SIZE:
            self._mock_state["window"] = self._mock_state["window"][-WINDOW_SIZE:]

        if self.use_mock:
            return self._mock_predict(features)
        else:
            return self._model_predict()

    def _model_predict(self) -> dict:
        window = self._mock_state["window"]
        while len(window) < WINDOW_SIZE:
            window.insert(0, [0.0] * FEATURE_DIM)

        arr = np.array(window[-WINDOW_SIZE:], dtype=np.float32)
        tensor = torch.tensor(arr, dtype=torch.float32).unsqueeze(0).to(self.device)

        with torch.no_grad():
            cur_logits, nxt_logits = self.model(tensor)

        cur_probs = torch.softmax(cur_logits, dim=-1).squeeze(0).cpu().numpy()
        nxt_probs = torch.softmax(nxt_logits, dim=-1).squeeze(0).cpu().numpy()

        cur_idx = int(np.argmax(cur_probs))
        nxt_idx = int(np.argmax(nxt_probs))
        confidence = float(cur_probs[cur_idx]) * 100.0

        return {
            "current_stage": ATTACK_STAGES[cur_idx],
            "next_stage": ATTACK_STAGES[nxt_idx],
            "confidence": round(confidence, 2),
            "current_stage_idx": cur_idx,
            "next_stage_idx": nxt_idx,
            "mitigation": self.STAGE_RECOMMENDATIONS.get(
                ATTACK_STAGES[nxt_idx], "Review network traffic and isolate suspicious hosts"
            ),
        }

    def _mock_predict(self, features: list[float]) -> dict:
        self._mock_state["tick"] += 1
        tick = self._mock_state["tick"]

        seed_val = sum(features[:6]) + tick * 0.1
        h = int(hashlib.md5(str(seed_val).encode()).hexdigest()[:8], 16)
        random.seed(h)

        progress = min(tick / 200.0, 1.0)
        base_stage = int(progress * (NUM_STAGES - 1))
        jitter = random.choice([-1, 0, 0, 0, 1])
        cur_idx = max(0, min(NUM_STAGES - 1, base_stage + jitter))
        nxt_idx = min(NUM_STAGES - 1, cur_idx + random.choice([0, 0, 1, 1, 1]))

        high_features = sum(1 for f in features[:6] if f > 0.7)
        confidence = min(95.0, max(35.0, 50.0 + high_features * 8.0 + random.uniform(-5, 5)))

        return {
            "current_stage": ATTACK_STAGES[cur_idx],
            "next_stage": ATTACK_STAGES[nxt_idx],
            "confidence": round(confidence, 2),
            "current_stage_idx": cur_idx,
            "next_stage_idx": nxt_idx,
            "mitigation": self.STAGE_RECOMMENDATIONS.get(
                ATTACK_STAGES[nxt_idx], "Review network traffic and isolate suspicious hosts"
            ),
        }


_engine: Optional[InferenceEngine] = None


def get_engine() -> InferenceEngine:
    global _engine
    if _engine is None:
        _engine = InferenceEngine()
    return _engine


def predict(features: list[float]) -> dict:
    return get_engine().predict(features)
