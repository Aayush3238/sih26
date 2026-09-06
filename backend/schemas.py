from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TelemetryFeatures(BaseModel):
    src_ip: str = "0.0.0.0"
    dst_ip: str = "0.0.0.0"
    src_port: int = 0
    dst_port: int = 0
    flow_duration: float = 0.0
    total_packets: int = 0
    fwd_packets: int = 0
    bwd_packets: int = 0
    total_bytes: int = 0
    packet_rate: float = 0.0
    byte_entropy: float = 0.0
    flag_syn: int = 0
    flag_ack: int = 0
    flag_fin: int = 0
    flag_rst: int = 0


class ThreatPrediction(BaseModel):
    src_ip: str
    dst_ip: str
    dst_port: int
    current_stage: str
    next_stage: str
    confidence: float
    current_stage_idx: int
    next_stage_idx: int
    mitigation: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class MitigationRequest(BaseModel):
    attacker_ip: str
    action: str = "DROP"
    reason: str = ""
    stage: str = ""


class MitigationResponse(BaseModel):
    success: bool
    attacker_ip: str
    rule: str
    message: str


class NodeStatus(BaseModel):
    node_id: str
    hostname: str
    ip_address: str
    status: str = "online"
    last_seen: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    threats_detected: int = 0
