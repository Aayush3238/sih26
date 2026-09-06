from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
from backend.schemas import (
    MitigationRequest, MitigationResponse,
    NodeStatus, ThreatPrediction,
)
from ai_engine.inference import predict as ai_predict
from agent.mitigation_executor import execute_mitigation

router = APIRouter()

threat_history: List[dict] = []
nodes_db: List[dict] = [
    {
        "node_id": "node-01",
        "hostname": "web-server-01",
        "ip_address": "192.168.1.10",
        "status": "online",
        "threats_detected": 0,
    },
    {
        "node_id": "node-02",
        "hostname": "db-server-01",
        "ip_address": "192.168.1.20",
        "status": "online",
        "threats_detected": 0,
    },
    {
        "node_id": "node-03",
        "hostname": "workstation-01",
        "ip_address": "192.168.1.101",
        "status": "online",
        "threats_detected": 0,
    },
    {
        "node_id": "node-04",
        "hostname": "firewall-gw",
        "ip_address": "192.168.1.1",
        "status": "online",
        "threats_detected": 0,
    },
]


@router.get("/api/threats/history", response_model=List[dict])
async def get_threat_history():
    return threat_history[-50:]


@router.post("/api/mitigate", response_model=MitigationResponse)
async def mitigate_threat(req: MitigationRequest):
    result = execute_mitigation(req.attacker_ip, req.action, req.reason)
    return MitigationResponse(
        success=result["success"],
        attacker_ip=req.attacker_ip,
        rule=result.get("rule", ""),
        message=result.get("message", ""),
    )


@router.get("/api/nodes", response_model=List[dict])
async def get_nodes():
    return nodes_db


@router.post("/api/telemetry")
async def receive_telemetry(features: list[float]):
    prediction = ai_predict(features)
    record = {
        "src_ip": "simulated",
        "dst_ip": "simulated",
        "dst_port": 0,
        **prediction,
    }
    threat_history.append(record)
    if len(threat_history) > 500:
        threat_history.pop(0)
    return prediction


connected_clients: List[WebSocket] = []


async def broadcast_to_clients(data: dict):
    disconnected = []
    for client in connected_clients:
        try:
            await client.send_json(data)
        except Exception:
            disconnected.append(client)
    for c in disconnected:
        connected_clients.remove(c)


async def ws_telemetry_handler(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            features = data.get("features", [])
            prediction = ai_predict(features)
            record = {
                "src_ip": data.get("src_ip", "0.0.0.0"),
                "dst_ip": data.get("dst_ip", "0.0.0.0"),
                "dst_port": data.get("dst_port", 0),
                **prediction,
            }
            threat_history.append(record)
            if len(threat_history) > 500:
                threat_history.pop(0)
            await websocket.send_json({"type": "prediction", "data": record})
            await broadcast_to_clients({"type": "prediction", "data": record})
    except WebSocketDisconnect:
        if websocket in connected_clients:
            connected_clients.remove(websocket)
    except Exception:
        if websocket in connected_clients:
            connected_clients.remove(websocket)
