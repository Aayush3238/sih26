import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
import math
import random
import hashlib
import json
import asyncio
from datetime import datetime, timezone
from typing import Optional

FEATURE_DIM = 12


def _mock_flow_features(tick: int) -> list[float]:
    """Generate deterministic mock flow features that simulate evolving attack patterns."""
    progress = min(tick / 300.0, 1.0)
    seed = int(hashlib.md5(str(tick).encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)

    features = [
        min(1.0, 0.1 + progress * 0.7 + rng.uniform(-0.05, 0.05)),
        min(1.0, 0.05 + progress * 0.8 + rng.uniform(-0.05, 0.05)),
        min(1.0, 0.2 + progress * 0.5 + rng.uniform(-0.05, 0.05)),
        min(1.0, 0.3 + (1 - progress) * 0.4 + rng.uniform(-0.05, 0.05)),
        min(1.0, 0.0 + progress * 0.6 + rng.uniform(-0.03, 0.03)),
        min(1.0, 0.1 + progress * 0.5 + rng.uniform(-0.05, 0.05)),
        rng.uniform(0.1, 0.9),
        rng.uniform(0.1, 0.9),
        min(1.0, progress * 0.6 + rng.uniform(-0.05, 0.05)),
        min(1.0, 0.1 + progress * 0.7 + rng.uniform(-0.05, 0.05)),
        min(1.0, 0.3 + progress * 0.3 + rng.uniform(-0.03, 0.03)),
        min(1.0, 0.2 + progress * 0.4 + rng.uniform(-0.03, 0.03)),
    ]
    return [max(0.0, min(1.0, f)) for f in features]


def _mock_ip() -> str:
    return f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"


def generate_mock_telemetry(tick: int) -> dict:
    src_ip = _mock_ip()
    dst_ip = "192.168.1.10"
    features = _mock_flow_features(tick)
    return {
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "dst_port": random.choice([22, 80, 443, 3389, 8080, 445, 135, 3306]),
        "features": features,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def run_sniffer(ws_url: str = "ws://localhost:8000/ws/telemetry", interval: float = 1.0):
    """Stream mock telemetry to the backend via WebSocket."""
    try:
        import websockets
        from websockets.exceptions import ConnectionClosed
    except ImportError:
        print("[sniffer] Installing websockets...")
        os.system(f"{sys.executable} -m pip install websockets -q")
        import websockets
        from websockets.exceptions import ConnectionClosed

    print(f"[sniffer] Connecting to {ws_url}...")
    tick = 0
    async with websockets.connect(ws_url, ping_interval=20, ping_timeout=10) as ws:
        print("[sniffer] Connected. Streaming telemetry...")
        try:
            while True:
                tick += 1
                telemetry = generate_mock_telemetry(tick)
                await ws.send(json.dumps(telemetry))

                try:
                    response = await asyncio.wait_for(ws.recv(), timeout=5)
                    data = json.loads(response)
                    if data.get("type") == "prediction":
                        p = data["data"]
                        print(
                            f"[tick {tick:4d}] {telemetry['src_ip']:>15s} -> {telemetry['dst_ip']:>15s} | "
                            f"Stage: {p['current_stage']:<25s} -> {p['next_stage']:<25s} | "
                            f"Conf: {p['confidence']:.1f}%"
                        )
                except asyncio.TimeoutError:
                    pass

                await asyncio.sleep(interval)
        except ConnectionClosed:
            print(f"\n[sniffer] Connection closed after {tick} ticks.")
        except KeyboardInterrupt:
            print(f"\n[sniffer] Stopped after {tick} ticks.")


def run_sniffer_sync(ws_url: str = "ws://localhost:8000/ws/telemetry", interval: float = 1.0):
    asyncio.run(run_sniffer(ws_url, interval))


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "ws://localhost:8000/ws/telemetry"
    run_sniffer_sync(url)
