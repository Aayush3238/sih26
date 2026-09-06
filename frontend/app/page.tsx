"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import ThreatGauge from "../components/ThreatGauge";
import KillChainTimeline from "../components/KillChainTimeline";
import NetworkTopology from "../components/NetworkTopology";
import MitigationPanel from "../components/MitigationPanel";
import DemoControls from "../components/DemoControls";
import { connectWebSocket } from "../lib/websocket";

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
  scenario?: string;
}

export default function Dashboard() {
  const [confidence, setConfidence] = useState(0);
  const [currentStage, setCurrentStage] = useState("Reconnaissance");
  const [nextStage, setNextStage] = useState("Resource Development");
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [nextStageIdx, setNextStageIdx] = useState(1);
  const [mitigation, setMitigation] = useState("Select a scenario to begin demo");
  const [attackerIp, setAttackerIp] = useState("10.0.0.1");
  const [wsStatus, setWsStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const [threatLogs, setThreatLogs] = useState<ThreatLog[]>([]);
  const [tick, setTick] = useState(0);
  const [demoMode, setDemoMode] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeScenario, setActiveScenario] = useState("");
  const [currentStepDesc, setCurrentStepDesc] = useState("");
  const logIdRef = useRef(0);

  const handleMessage = useCallback((msg: PredictionData) => {
    if (demoMode) return;
    if (msg.type === "prediction") {
      const d = msg.data;
      applyPrediction(d, "live");
    }
  }, [demoMode]);

  const applyPrediction = (d: PredictionData["data"], source: string, scenario?: string, stepDesc?: string) => {
    setConfidence(d.confidence);
    setCurrentStage(d.current_stage);
    setNextStage(d.next_stage);
    setCurrentStageIdx(d.current_stage_idx);
    setNextStageIdx(d.next_stage_idx);
    setMitigation(d.mitigation);
    setAttackerIp(d.src_ip);
    setTick((t) => t + 1);
    if (stepDesc) setCurrentStepDesc(stepDesc);

    logIdRef.current += 1;
    setThreatLogs((prev) => {
      const next = [
        {
          id: logIdRef.current,
          time: new Date().toLocaleTimeString(),
          srcIp: d.src_ip,
          stage: d.current_stage,
          confidence: d.confidence,
          scenario,
        },
        ...prev,
      ];
      return next.slice(0, 20);
    });
  };

  const handleDemoStep = async (features: number[], scenarioId: string, stepIdx: number) => {
    setProcessing(true);
    setActiveScenario(scenarioId);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(features),
      });
      const data = await res.json();
      applyPrediction(
        {
          ...data,
          src_ip: `attacker-${scenarioId}`,
          dst_ip: "192.168.1.10",
          dst_port: 443,
          timestamp: new Date().toISOString(),
        },
        "demo",
        scenarioId
      );
    } catch (e) {
      console.error("Demo step failed:", e);
    }
    setProcessing(false);
  };

  useEffect(() => {
    if (!demoMode) {
      connectWebSocket(handleMessage, setWsStatus);
    }
  }, [demoMode, handleMessage]);

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
              <h1 className="text-sm font-bold tracking-wide">AI ATTACK FORECASTER</h1>
              <p className="text-[10px] text-gray-500 tracking-widest uppercase">
                SIH26153 · Network Threat Intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/[0.05] rounded-lg p-1">
              <button
                onClick={() => setDemoMode(true)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  demoMode ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Demo
              </button>
              <button
                onClick={() => setDemoMode(false)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  !demoMode ? "bg-green-600 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Live
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  demoMode
                    ? "bg-blue-500"
                    : wsStatus === "connected"
                    ? "bg-green-500 animate-pulse"
                    : wsStatus === "error"
                    ? "bg-red-500"
                    : "bg-yellow-500"
                }`}
              />
              <span className="text-xs text-gray-400">
                {demoMode ? "DEMO" : wsStatus === "connected" ? "LIVE" : "CONNECTING..."}
              </span>
            </div>
            <a href="/about" className="text-xs text-gray-500 hover:text-gray-300 transition-colors border border-white/[0.08] rounded-lg px-3 py-1.5">
              How It Works
            </a>
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

            {demoMode && currentStepDesc && (
              <div className="bg-blue-500/[0.05] border border-blue-500/[0.15] rounded-xl p-4">
                <div className="text-[10px] text-blue-400 uppercase tracking-widest mb-1">
                  Stage Detail
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{currentStepDesc}</p>
              </div>
            )}

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {demoMode ? "Demo Event Log" : "Live Threat Feed"}
              </h3>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {threatLogs.length === 0 && (
                  <div className="text-center text-gray-600 text-xs py-8">
                    {demoMode ? "Select a scenario and click Next Step" : "Waiting for telemetry..."}
                  </div>
                )}
                {threatLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-2 text-[11px] py-1.5 px-2 rounded bg-white/[0.02] border border-white/[0.04]"
                  >
                    <span className="text-gray-600 font-mono w-16 flex-shrink-0">{log.time}</span>
                    <span className="text-gray-500 font-mono w-28 flex-shrink-0 truncate">{log.srcIp}</span>
                    <span className="text-gray-400 truncate flex-1">{log.stage}</span>
                    <span
                      className={`font-mono w-12 text-right flex-shrink-0 ${
                        log.confidence > 70 ? "text-red-400" : log.confidence > 40 ? "text-yellow-400" : "text-green-400"
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
            {demoMode ? (
              <DemoControls onStep={handleDemoStep} isRunning={processing} />
            ) : (
              <MitigationPanel
                currentStage={currentStage}
                nextStage={nextStage}
                confidence={confidence}
                mitigation={mitigation}
                attackerIp={attackerIp}
              />
            )}

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Attack Summary
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Events</div>
                  <div className="text-xl font-bold text-white mt-1">{tick}</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Avg Confidence</div>
                  <div className="text-xl font-bold text-yellow-400 mt-1">
                    {threatLogs.length > 0
                      ? (threatLogs.reduce((a, b) => a + b.confidence, 0) / threatLogs.length).toFixed(1)
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
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 uppercase">Scenarios</div>
                  <div className="text-xl font-bold text-blue-400 mt-1">
                    {new Set(threatLogs.map((l) => l.scenario).filter(Boolean)).size || "-"}
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

