import os
import hashlib
import random
from pathlib import Path
from typing import Optional

import numpy as np

try:
    import onnxruntime as ort
    HAS_ONNX = True
except ImportError:
    HAS_ONNX = False

from ai_engine.config import ATTACK_STAGES, NUM_STAGES, FEATURE_DIM, WINDOW_SIZE

ONNX_PATH = Path(__file__).parent / "models" / "attack_forecaster.onnx"
PYTORCH_PATH = Path(__file__).parent / "models" / "attack_forecaster.pth"


class InferenceEngine:
    """ONNX Runtime inference with deterministic mock fallback."""

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
        self.session: Optional["ort.InferenceSession"] = None
        self.use_mock = True
        self._window: list[list[float]] = []
        self._tick = 0

        self._try_load_model()

    def _try_load_model(self):
        # Try ONNX first
        if HAS_ONNX and ONNX_PATH.exists():
            try:
                opts = ort.SessionOptions()
                opts.inter_op_num_threads = 1
                opts.intra_op_num_threads = 1
                opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                self.session = ort.InferenceSession(str(ONNX_PATH), opts, providers=["CPUExecutionProvider"])
                self.use_mock = False
                print(f"[InferenceEngine] Loaded ONNX model from {ONNX_PATH} ({ONNX_PATH.stat().st_size / 1024:.0f} KB)")
                return
            except Exception as e:
                print(f"[InferenceEngine] ONNX load failed: {e}")

        # Try PyTorch fallback
        if not HAS_ONNX and PYTORCH_PATH.exists():
            try:
                import torch
                from ai_engine.model import AttackForecasterLSTM
                model = AttackForecasterLSTM()
                state = torch.load(PYTORCH_PATH, map_location="cpu", weights_only=True)
                model.load_state_dict(state)
                model.eval()
                self._torch_model = model
                self.use_mock = False
                print(f"[InferenceEngine] Loaded PyTorch model (ONNX Runtime not available)")
                return
            except Exception as e:
                print(f"[InferenceEngine] PyTorch load failed: {e}")

        print(f"[InferenceEngine] No model found. Using mock fallback.")

    def predict(self, features: list[float]) -> dict:
        if len(features) < FEATURE_DIM:
            features = features + [0.0] * (FEATURE_DIM - len(features))
        elif len(features) > FEATURE_DIM:
            features = features[:FEATURE_DIM]

        self._window.append(features)
        if len(self._window) > WINDOW_SIZE:
            self._window = self._window[-WINDOW_SIZE:]

        if self.use_mock:
            return self._mock_predict(features)
        elif self.session is not None:
            return self._onnx_predict()
        else:
            return self._torch_predict()

    def _onnx_predict(self) -> dict:
        window = list(self._window)
        while len(window) < WINDOW_SIZE:
            window.insert(0, [0.0] * FEATURE_DIM)

        arr = np.array(window[-WINDOW_SIZE:], dtype=np.float32)
        arr = arr[np.newaxis, :]  # (1, 30, 12)

        cur_logits, nxt_logits = self.session.run(None, {"input": arr})

        cur_probs = self._softmax(cur_logits[0])
        nxt_probs = self._softmax(nxt_logits[0])

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

    def _torch_predict(self) -> dict:
        import torch
        window = list(self._window)
        while len(window) < WINDOW_SIZE:
            window.insert(0, [0.0] * FEATURE_DIM)

        arr = np.array(window[-WINDOW_SIZE:], dtype=np.float32)
        tensor = torch.tensor(arr, dtype=torch.float32).unsqueeze(0)

        with torch.no_grad():
            cur_logits, nxt_logits = self._torch_model(tensor)

        cur_probs = self._softmax(cur_logits.squeeze(0).numpy())
        nxt_probs = self._softmax(nxt_logits.squeeze(0).numpy())

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
        self._tick += 1
        tick = self._tick

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

    @staticmethod
    def _softmax(x):
        e = np.exp(x - np.max(x))
        return e / e.sum()


_engine: Optional[InferenceEngine] = None


def get_engine() -> InferenceEngine:
    global _engine
    if _engine is None:
        _engine = InferenceEngine()
    return _engine


def predict(features: list[float]) -> dict:
    return get_engine().predict(features)
