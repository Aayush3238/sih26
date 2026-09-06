"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import ThreatGauge from "../components/ThreatGauge";
import KillChainTimeline from "../components/KillChainTimeline";
import NetworkTopology from "../components/NetworkTopology";
import MitigationPanel from "../components/MitigationPanel";
import { connectWebSocket, sendFeatures } from "../lib/websocket";

interface PredictionData {
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
}

interface ThreatLog {
  id: number;
  time: string;
  srcIp: string;
  stage: string;
  confidence: number;
}

export default function Dashboard() {
  const [confidence, setConfidence] = useState(0);
  const [currentStage, setCurrentStage] = useState("Reconnaissance");
  const [nextStage, setNextStage] = useState("Resource Development");
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [nextStageIdx, setNextStageIdx] = useState(1);
  const [mitigation, setMitigation] = useState("Awaiting telemetry...");
  const [attackerIp, setAttackerIp] = useState("0.0.0.0");
  const [wsStatus, setWsStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const [threatLogs, setThreatLogs] = useState<ThreatLog[]>([]);
  const [tick, setTick] = useState(0);
  const logIdRef = useRef(0);

  const handleMessage = useCallback((msg: PredictionData) => {
    if (msg.type === "prediction") {
      const d = msg.data;
      setConfidence(d.confidence);
      setCurrentStage(d.current_stage);
      setNextStage(d.next_stage);
      setCurrentStageIdx(d.current_stage_idx);
      setNextStageIdx(d.next_stage_idx);
      setMitigation(d.mitigation);
      setAttackerIp(d.src_ip);
      setTick((t) => t + 1);

      logIdRef.current += 1;
      setThreatLogs((prev) => {
        const next = [
          {
            id: logIdRef.current,
            time: new Date().toLocaleTimeString(),
            srcIp: d.src_ip,
            stage: d.current_stage,
            confidence: d.confidence,
          },
          ...prev,
        ];
        return next.slice(0, 20);
      });
    }
  }, []);

  useEffect(() => {
    connectWebSocket(handleMessage, setWsStatus);
  }, [handleMessage]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (wsStatus === "connected") {
        const features = Array.from({ length: 12 }, () => Math.random());
        sendFeatures(features);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [wsStatus]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide">
                AI ATTACK FORECASTER
              </h1>
              <p className="text-[10px] text-gray-500 tracking-widest uppercase">
                SIH26153 · Network Threat Intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  wsStatus === "connected"
                    ? "bg-green-500 animate-pulse"
                    : wsStatus === "error"
                    ? "bg-red-500"
                    : "bg-yellow-500"
                }`}
              />
              <span className="text-xs text-gray-400">
                {wsStatus === "connected"
                  ? "LIVE"
                  : wsStatus === "error"
                  ? "ERROR"
                  : "CONNECTING..."}
              </span>
            </div>
            <div className="text-xs text-gray-600 font-mono">
              Tick: {tick}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 lg:col-span-3 space-y-5">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 flex justify-center">
              <ThreatGauge confidence={confidence} />
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <NetworkTopology />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5 space-y-5">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <KillChainTimeline
                currentStageIdx={currentStageIdx}
                nextStageIdx={nextStageIdx}
              />
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Live Threat Feed
              </h3>
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                {threatLogs.length === 0 && (
                  <div className="text-center text-gray-600 text-xs py-8">
                    Waiting for telemetry data...
                  </div>
                )}
                {threatLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-2 text-[11px] py-1.5 px-2 rounded bg-white/[0.02] border border-white/[0.04] animate-in fade-in"
                  >
                    <span className="text-gray-600 font-mono w-16 flex-shrink-0">
                      {log.time}
                    </span>
                    <span className="text-gray-500 font-mono w-28 flex-shrink-0 truncate">
                      {log.srcIp}
                    </span>
                    <span className="text-gray-400 truncate flex-1">{log.stage}</span>
                    <span
                      className={`font-mono w-12 text-right flex-shrink-0 ${
                        log.confidence > 70
                          ? "text-red-400"
                          : log.confidence > 40
                          ? "text-yellow-400"
                          : "text-green-400"
                      }`}
                    >
                      {log.confidence.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-5">
            <MitigationPanel
              currentStage={currentStage}
              nextStage={nextStage}
              confidence={confidence}
              mitigation={mitigation}
              attackerIp={attackerIp}
            />

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Attack Summary
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Unique Sources</div>
                  <div className="text-xl font-bold text-white mt-1">
                    {new Set(threatLogs.map((l) => l.srcIp)).size}
                  </div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Total Events</div>
                  <div className="text-xl font-bold text-white mt-1">{tick}</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Avg Confidence</div>
                  <div className="text-xl font-bold text-yellow-400 mt-1">
                    {threatLogs.length > 0
                      ? (
                          threatLogs.reduce((a, b) => a + b.confidence, 0) /
                          threatLogs.length
                        ).toFixed(1)
                      : "0.0"}
                    %
                  </div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 uppercase">High Alerts</div>
                  <div className="text-xl font-bold text-red-400 mt-1">
                    {threatLogs.filter((l) => l.confidence > 70).length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
