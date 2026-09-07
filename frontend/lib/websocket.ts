const BACKEND_HOST = "sih26-dqgv.onrender.com";

const WS_URL = typeof window !== "undefined"
  ? `ws://${BACKEND_HOST}/ws/telemetry`
  : "";

type PredictionData = {
  type: string;
  data: {
    current_stage: string;
    next_stage: string;
    confidence: number;
    current_stage_idx: number;
    next_stage_idx: number;
    mitigation: string;
    src_ip: string;
    dst_ip: string;
    dst_port: number;
    timestamp: string;
  };
};

type MessageHandler = (data: PredictionData) => void;
type StatusHandler = (status: "connected" | "disconnected" | "error") => void;

let ws: WebSocket | null = null;
let handlers: MessageHandler[] = [];
let statusHandlers: StatusHandler[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function connectWebSocket(onMessage: MessageHandler, onStatus?: StatusHandler) {
  if (typeof window === "undefined") return;

  handlers.push(onMessage);
  if (onStatus) statusHandlers.push(onStatus);

  if (ws && ws.readyState === WebSocket.OPEN) {
    onStatus?.("connected");
    return;
  }

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log("[WS] Connected to backend");
    statusHandlers.forEach((h) => h("connected"));
  };

  ws.onmessage = (event) => {
    try {
      const data: PredictionData = JSON.parse(event.data);
      handlers.forEach((h) => h(data));
    } catch (e) {
      console.error("[WS] Parse error:", e);
    }
  };

  ws.onclose = () => {
    console.log("[WS] Disconnected");
    statusHandlers.forEach((h) => h("disconnected"));
    scheduleReconnect();
  };

  ws.onerror = () => {
    statusHandlers.forEach((h) => h("error"));
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      const newHandlers = [...handlers];
      const newStatus = [...statusHandlers];
      handlers = [];
      statusHandlers = [];
      connectWebSocket(newHandlers[0] || (() => {}), newStatus[0]);
    }
  }, 3000);
}

export function sendFeatures(features: number[], srcIp?: string, dstIp?: string, dstPort?: number) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      features,
      src_ip: srcIp || "simulated",
      dst_ip: dstIp || "192.168.1.10",
      dst_port: dstPort || 443,
    }));
  }
}

export function disconnectWebSocket() {
  handlers = [];
  statusHandlers = [];
  if (reconnectTimer) clearTimeout(reconnectTimer);
  ws?.close();
  ws = null;
}
