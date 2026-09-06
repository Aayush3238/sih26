"use client";

import { useState, useEffect, useCallback } from "react";

const STEPS = [
  {
    num: "01",
    title: "Network Telemetry Capture",
    desc: "The system continuously monitors network flow data — packet rates, byte entropy, flow durations, port patterns — from your endpoints using a lightweight agent.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <circle cx="12" cy="11" r="3" />
      </svg>
    ),
    color: "from-blue-500 to-cyan-400",
    glow: "shadow-blue-500/30",
    detail: "Supports live Scapy packet sniffing or synthetic telemetry for demo purposes.",
  },
  {
    num: "02",
    title: "AI-Powered Analysis",
    desc: "A PyTorch LSTM model with Multi-Head Attention processes sliding windows of 30 consecutive flow records, learning temporal attack patterns from CICIDS2017 training data.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    color: "from-purple-500 to-pink-400",
    glow: "shadow-purple-500/30",
    detail: "12 flow features are extracted and normalized in real-time for each prediction cycle.",
  },
  {
    num: "03",
    title: "MITRE ATT&CK Mapping",
    desc: "Every prediction maps to one of 14 MITRE ATT&CK stages — from Reconnaissance to Impact — giving security analysts a standardized threat classification.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="8" cy="6" r="2" fill="currentColor" />
        <circle cx="16" cy="12" r="2" fill="currentColor" />
        <circle cx="10" cy="18" r="2" fill="currentColor" />
      </svg>
    ),
    color: "from-orange-500 to-yellow-400",
    glow: "shadow-orange-500/30",
    detail: "Outputs: Current Stage, Predicted Next Stage, Confidence %, and Recommended Mitigation.",
  },
  {
    num: "04",
    title: "Real-Time SOC Dashboard",
    desc: "A dark-themed security operations dashboard streams predictions via WebSocket — threat gauge, kill chain timeline, network topology, and live threat feed update without page refresh.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    color: "from-green-500 to-emerald-400",
    glow: "shadow-green-500/30",
    detail: "Built with Next.js 14, Tailwind CSS, and native WebSocket — zero page reloads.",
  },
  {
    num: "05",
    title: "Automated Mitigation",
    desc: "When a threat is detected, analysts can enforce firewall rules with a single click. The system issues IPTables DROP rules against the attacker IP instantly.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    color: "from-red-500 to-rose-400",
    glow: "shadow-red-500/30",
    detail: "Simulated on Windows/macOS for safe demo; real iptables enforcement on Linux.",
  },
];

export default function AboutPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const advanceStep = useCallback(() => {
    if (isAnimating) return;
    if (currentStep < STEPS.length - 1) {
      setIsAnimating(true);
      setShowDetail(false);
      setTimeout(() => {
        setCurrentStep((s) => s + 1);
        setTimeout(() => {
          setIsAnimating(false);
          setTimeout(() => setShowDetail(true), 300);
        }, 100);
      }, 200);
    }
  }, [currentStep, isAnimating]);

  const resetSteps = useCallback(() => {
    setIsAnimating(true);
    setShowDetail(false);
    setTimeout(() => {
      setCurrentStep(0);
      setIsAnimating(false);
      setTimeout(() => setShowDetail(true), 300);
    }, 200);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowDetail(true), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        advanceStep();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [advanceStep]);

  const step = STEPS[currentStep];

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white cursor-pointer select-none"
      onClick={advanceStep}
    >
      <header className="border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide">AI ATTACK FORECASTER</h1>
              <p className="text-[10px] text-gray-500 tracking-widest uppercase">How It Works</p>
            </div>
          </a>
          <a
            href="/"
            className="text-xs text-gray-400 hover:text-white transition-colors border border-white/10 rounded-lg px-3 py-1.5"
          >
            Back to Dashboard
          </a>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-transparent">
            How It Works
          </h2>
          <p className="text-gray-500 text-sm">
            Click anywhere or press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-300 text-xs">Space</kbd> to advance
          </p>
        </div>

        <div className="relative mb-16">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-white/[0.06]">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          <div className="relative flex justify-between">
            {STEPS.map((s, i) => (
              <div key={i} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    i < currentStep
                      ? "bg-gradient-to-br " + s.color + " text-white scale-100"
                      : i === currentStep
                      ? "bg-white text-black scale-110 shadow-lg " + s.glow
                      : "bg-white/[0.06] text-gray-600 scale-90"
                  }`}
                >
                  {i < currentStep ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  ) : (
                    s.num
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8 items-start">
          <div className="col-span-12 lg:col-span-5">
            <div
              className={`transition-all duration-300 ${
                isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
              }`}
            >
              <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${step.color} mb-4 shadow-lg ${step.glow}`}>
                {step.icon}
              </div>

              <div className="text-xs text-gray-500 font-mono mb-2 tracking-widest">
                STEP {step.num} OF {STEPS.length}
              </div>

              <h3 className="text-2xl font-bold mb-3">{step.title}</h3>

              <p className="text-gray-400 leading-relaxed mb-4">{step.desc}</p>

              <div
                className={`text-sm text-gray-500 border-l-2 border-white/10 pl-3 transition-all duration-500 ${
                  showDetail ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                }`}
              >
                {step.detail}
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <div
              className={`transition-all duration-300 ${
                isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
              }`}
            >
              <StepVisual stepIndex={currentStep} />
            </div>
          </div>
        </div>

        {currentStep === STEPS.length - 1 && (
          <div className="text-center mt-16 animate-pulse">
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetSteps();
              }}
              className="px-6 py-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-sm font-medium transition-colors border border-white/[0.08]"
            >
              Restart Tour
            </button>
          </div>
        )}

        <div className="text-center mt-12 text-gray-600 text-xs">
          {currentStep + 1} / {STEPS.length}
        </div>
      </main>
    </div>
  );
}

function StepVisual({ stepIndex }: { stepIndex: number }) {
  const visuals = [
    <NetworkVisual key="net" />,
    <ModelVisual key="model" />,
    <AttackVisual key="attack" />,
    <DashboardVisual key="dash" />,
    <MitigateVisual key="mit" />,
  ];
  return <div className="w-full">{visuals[stepIndex]}</div>;
}

function NetworkVisual() {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Live Network Flow</div>
      <div className="space-y-2">
        {["192.168.1.101 → 10.0.2.15:443", "10.0.0.5 → 192.168.1.20:80", "172.16.0.8 → 192.168.1.10:22", "10.0.3.12 → 192.168.1.10:3389", "192.168.1.50 → 10.0.1.200:8080"].map(
          (flow, i) => (
            <div key={i} className="flex items-center gap-3 text-xs font-mono">
              <div className={`w-1.5 h-1.5 rounded-full ${i === 2 ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
              <span className="text-gray-400">{flow}</span>
              <span className="ml-auto text-gray-600">{(Math.random() * 5 + 0.1).toFixed(1)} MB</span>
            </div>
          )
        )}
      </div>
      <div className="mt-4 pt-3 border-t border-white/[0.04] flex gap-4 text-[10px] text-gray-600">
        <span>Flow Duration</span>
        <span>Total Packets</span>
        <span>Byte Entropy</span>
        <span>Port Delta</span>
        <span>Packet Rate</span>
      </div>
    </div>
  );
}

function ModelVisual() {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">LSTM + Attention Pipeline</div>
      <div className="flex items-center gap-2 text-xs">
        <div className="bg-blue-500/20 text-blue-300 px-3 py-2 rounded-lg border border-blue-500/20">
          Input
          <div className="text-[9px] text-blue-400/60 mt-0.5">(30×12) window</div>
        </div>
        <svg className="w-4 h-4 text-gray-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        <div className="bg-purple-500/20 text-purple-300 px-3 py-2 rounded-lg border border-purple-500/20">
          LSTM
          <div className="text-[9px] text-purple-400/60 mt-0.5">128 hidden × 2</div>
        </div>
        <svg className="w-4 h-4 text-gray-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        <div className="bg-pink-500/20 text-pink-300 px-3 py-2 rounded-lg border border-pink-500/20">
          Attention
          <div className="text-[9px] text-pink-400/60 mt-0.5">4 heads</div>
        </div>
        <svg className="w-4 h-4 text-gray-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        <div className="bg-green-500/20 text-green-300 px-3 py-2 rounded-lg border border-green-500/20">
          Output
          <div className="text-[9px] text-green-400/60 mt-0.5">14 classes</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="bg-white/[0.03] rounded-lg p-3">
          <div className="text-[10px] text-gray-500">Current Stage</div>
          <div className="text-green-400 font-semibold mt-1">Command and Control</div>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <div className="text-[10px] text-gray-500">Next Predicted</div>
          <div className="text-orange-400 font-semibold mt-1">Exfiltration</div>
        </div>
      </div>
    </div>
  );
}

function AttackVisual() {
  const stages = ["Reconnaissance", "Initial Access", "Execution", "Lateral Movement", "Exfiltration"];
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">MITRE ATT&CK Kill Chain</div>
      <div className="space-y-2">
        {stages.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${i <= 3 ? "bg-red-500" : "bg-gray-700"} ${i === 3 ? "animate-pulse" : ""}`} />
            <span className={`text-xs ${i <= 3 ? "text-gray-300" : "text-gray-600"} ${i === 3 ? "font-bold" : ""}`}>
              {s}
            </span>
            {i === 3 && <span className="text-[10px] text-red-400 font-mono ml-auto">CURRENT</span>}
            {i === 4 && <span className="text-[10px] text-orange-400 font-mono ml-auto">PREDICTED</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardVisual() {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">SOC Dashboard Preview</div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.03] rounded-lg p-3 col-span-1 flex flex-col items-center justify-center">
          <svg height="60" width="60">
            <circle stroke="rgba(255,255,255,0.05)" fill="transparent" strokeWidth="6" r="24" cx="30" cy="30" />
            <circle stroke="#ef4444" fill="transparent" strokeWidth="6" strokeLinecap="round" strokeDasharray="138" strokeDashoffset="40" r="24" cx="30" cy="30" style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
          </svg>
          <div className="text-xs text-gray-400 mt-2">72% Threat</div>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3 col-span-2">
          <div className="text-[10px] text-gray-500 mb-2">Live Feed</div>
          <div className="space-y-1">
            {["10.0.3.12 → C2 Detected", "172.16.0.8 → Brute Force", "10.0.0.5 → Normal"].map((l, i) => (
              <div key={i} className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                <div className={`w-1 h-1 rounded-full ${i === 0 ? "bg-red-500" : i === 1 ? "bg-yellow-500" : "bg-green-500"}`} />
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 bg-white/[0.03] rounded-lg p-3">
        <div className="text-[10px] text-gray-500 mb-1">Recommended Action</div>
        <div className="text-xs text-gray-300">Block C2 domains/IPs at firewall; isolate host</div>
      </div>
    </div>
  );
}

function MitigateVisual() {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">One-Click Mitigation</div>
      <div className="bg-white/[0.03] rounded-lg p-4 mb-3">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-gray-500">Attacker IP</span>
          <span className="font-mono text-gray-300">10.0.3.12</span>
        </div>
        <div className="flex justify-between text-xs mb-2">
          <span className="text-gray-500">Threat</span>
          <span className="text-red-400 font-semibold">Exfiltration</span>
        </div>
        <div className="flex justify-between text-xs mb-3">
          <span className="text-gray-500">Confidence</span>
          <span className="text-yellow-400 font-mono">87.3%</span>
        </div>
        <div className="w-full py-2 rounded-lg bg-red-600 text-white text-xs font-semibold text-center">
          Enforce Firewall Rule
        </div>
      </div>
      <div className="text-[10px] text-gray-500 font-mono bg-white/[0.03] rounded p-2">
        $ sudo iptables -A INPUT -s 10.0.3.12 -j DROP
      </div>
    </div>
  );
}
