"use client";

import { useState } from "react";

interface MitigationPanelProps {
  currentStage: string;
  nextStage: string;
  confidence: number;
  mitigation: string;
  attackerIp: string;
}

export default function MitigationPanel({
  currentStage,
  nextStage,
  confidence,
  mitigation,
  attackerIp,
}: MitigationPanelProps) {
  const [enforcing, setEnforcing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleEnforce = async () => {
    setEnforcing(true);
    setResult(null);
    try {
      const res = await fetch(
        `http://${window.location.hostname}:8000/api/mitigate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attacker_ip: attackerIp,
            action: "DROP",
            reason: `Predicted ${nextStage} with ${confidence.toFixed(1)}% confidence`,
            stage: nextStage,
          }),
        }
      );
      const data = await res.json();
      setResult({ success: data.success, message: data.message });
    } catch (e) {
      setResult({ success: false, message: "Failed to connect to backend" });
    }
    setEnforcing(false);
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Mitigation Panel
      </h3>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Attacker IP</span>
          <span className="text-sm font-mono text-gray-300">{attackerIp}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Current Stage</span>
          <span className="text-sm text-red-400 font-semibold">{currentStage}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Predicted Next</span>
          <span className="text-sm text-orange-400 font-semibold">{nextStage}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Confidence</span>
          <span className="text-sm text-yellow-400 font-mono">
            {confidence.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 mb-4">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
          Recommended Action
        </div>
        <div className="text-xs text-gray-300 leading-relaxed">{mitigation}</div>
      </div>

      <button
        onClick={handleEnforce}
        disabled={enforcing}
        className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
          enforcing
            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/40 active:scale-[0.98]"
        }`}
      >
        {enforcing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Enforcing...
          </span>
        ) : (
          "Enforce Firewall Rule"
        )}
      </button>

      {result && (
        <div
          className={`mt-3 p-2.5 rounded-lg text-xs ${
            result.success
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
