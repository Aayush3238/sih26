"use client";

import { useEffect, useState } from "react";

interface PredictionPopupProps {
  currentStage: string;
  nextStage: string;
  confidence: number;
  mitigation: string;
  srcIp: string;
  visible: boolean;
  onDismiss: () => void;
}

export default function PredictionPopup({
  currentStage,
  nextStage,
  confidence,
  mitigation,
  srcIp,
  visible,
  onDismiss,
}: PredictionPopupProps) {
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (visible) {
      setExiting(false);
      setShow(true);
      const timer = setTimeout(() => {
        setExiting(true);
        setTimeout(() => {
          setShow(false);
          onDismiss();
        }, 400);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [visible, currentStage, nextStage]);

  if (!show) return null;

  const severity =
    confidence > 70 ? "critical" : confidence > 45 ? "high" : "medium";

  const severityConfig = {
    critical: {
      bg: "bg-red-500/10",
      border: "border-red-500/40",
      icon: "text-red-400",
      badge: "bg-red-500/20 text-red-300",
      pulse: "bg-red-500",
    },
    high: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/40",
      icon: "text-orange-400",
      badge: "bg-orange-500/20 text-orange-300",
      pulse: "bg-orange-500",
    },
    medium: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/40",
      icon: "text-yellow-400",
      badge: "bg-yellow-500/20 text-yellow-300",
      pulse: "bg-yellow-500",
    },
  };

  const s = severityConfig[severity];

  return (
    <div
      className={`fixed top-20 right-6 z-[100] w-[420px] ${s.bg} border ${s.border} rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-400 ${
        exiting
          ? "opacity-0 translate-x-8 scale-95"
          : "opacity-100 translate-x-0 scale-100"
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${s.pulse} animate-pulse`} />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-gray-400">
                Attack Prediction
              </div>
              <div className={`text-xs font-bold mt-0.5 px-2 py-0.5 rounded-full inline-block ${s.badge}`}>
                {severity.toUpperCase()} CONFIDENCE
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setExiting(true);
              setTimeout(() => {
                setShow(false);
                onDismiss();
              }, 300);
            }}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${s.bg} border ${s.border} flex items-center justify-center ${s.icon}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-gray-500 uppercase">Current Stage</div>
              <div className="text-sm font-semibold text-gray-200">{currentStage}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4">
            <div className="h-px flex-1 bg-white/10" />
            <svg className={`w-4 h-4 ${s.icon}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-gray-500 uppercase">Predicted Next Step</div>
              <div className="text-sm font-bold text-red-300">{nextStage}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-gray-500 uppercase">Confidence</div>
              <div className={`text-lg font-bold ${s.icon}`}>{confidence.toFixed(1)}%</div>
            </div>
          </div>

          <div className="bg-black/20 rounded-lg p-3 border border-white/5">
            <div className="text-[10px] text-gray-500 uppercase mb-1">Source IP</div>
            <div className="text-xs font-mono text-gray-300">{srcIp}</div>
          </div>

          <div className="bg-black/20 rounded-lg p-3 border border-white/5">
            <div className="text-[10px] text-gray-500 uppercase mb-1">Recommended Action</div>
            <div className="text-xs text-gray-300 leading-relaxed">{mitigation}</div>
          </div>
        </div>
      </div>

      <div className={`h-1 ${s.bg} rounded-b-2xl overflow-hidden`}>
        <div
          className={`h-full ${s.pulse} opacity-60`}
          style={{
            animation: "shrink 6s linear forwards",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
