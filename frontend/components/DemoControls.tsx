"use client";

import { useState, useEffect, useRef } from "react";
import { ATTACK_SCENARIOS, AttackScenario } from "../lib/scenarios";

interface DemoControlsProps {
  onStep: (features: number[], scenarioId: string, stepIdx: number) => void;
  isRunning: boolean;
}

export default function DemoControls({ onStep, isRunning }: DemoControlsProps) {
  const [selectedId, setSelectedId] = useState<string>(ATTACK_SCENARIOS[0].id);
  const [currentStep, setCurrentStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [speed, setSpeed] = useState(2000);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scenario = ATTACK_SCENARIOS.find((s) => s.id === selectedId)!;
  const totalSteps = scenario.steps.length;
  const isFinished = currentStep >= totalSteps;

  useEffect(() => {
    setCurrentStep(0);
    setAutoPlay(false);
    clearAutoPlay();
  }, [selectedId]);

  useEffect(() => {
    if (autoPlay && !isFinished && !isRunning) {
      intervalRef.current = setTimeout(() => {
        handleStep();
      }, speed);
    }
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [autoPlay, currentStep, isFinished, isRunning, speed]);

  const clearAutoPlay = () => {
    if (intervalRef.current) clearTimeout(intervalRef.current);
    intervalRef.current = null;
  };

  const handleStep = () => {
    if (isFinished || isRunning) return;
    const step = scenario.steps[currentStep];
    onStep(step.features, scenario.id, currentStep);
    setCurrentStep((s) => s + 1);
  };

  const handleReset = () => {
    setAutoPlay(false);
    clearAutoPlay();
    setCurrentStep(0);
  };

  const handleToggleAutoPlay = () => {
    if (isFinished) {
      setCurrentStep(0);
      setAutoPlay(true);
    } else {
      setAutoPlay((a) => !a);
    }
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Demo Mode
        </h3>
        <div className={`w-2 h-2 rounded-full ${autoPlay ? "bg-green-500 animate-pulse" : "bg-gray-600"}`} />
      </div>

      <div className="mb-4">
        <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1.5">
          Attack Scenario
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={autoPlay}
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-white/20 disabled:opacity-50"
        >
          {ATTACK_SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.icon} {s.name} ({s.severity})
            </option>
          ))}
        </select>
        <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
          {scenario.description}
        </p>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] text-gray-500 uppercase tracking-widest">
            Progress
          </label>
          <span className="text-[10px] text-gray-500 font-mono">
            {Math.min(currentStep, totalSteps)} / {totalSteps}
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
            style={{ width: `${(Math.min(currentStep, totalSteps) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="mb-4 space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
        {scenario.steps.map((step, i) => {
          const isCurrent = i === currentStep - 1;
          const isPast = i < currentStep - 1;
          const isFuture = i >= currentStep;

          return (
            <div
              key={i}
              className={`flex items-center gap-2 text-[11px] py-1 px-2 rounded transition-all duration-200 ${
                isCurrent
                  ? "bg-blue-500/10 border border-blue-500/20 text-blue-300"
                  : isPast
                  ? "bg-white/[0.02] text-gray-500"
                  : "text-gray-600"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isCurrent ? "bg-blue-500" : isPast ? "bg-gray-600" : "bg-gray-700"
                }`}
              />
              <span className="truncate">{step.label}</span>
              {isCurrent && (
                <span className="ml-auto text-[9px] text-blue-400 font-mono">NOW</span>
              )}
            </div>
          );
        })}
      </div>

      {currentStep > 0 && (
        <div className="mb-4 bg-white/[0.03] border border-white/[0.04] rounded-lg p-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
            What&apos;s Happening
          </div>
          <div className="text-xs text-gray-300 leading-relaxed">
            {scenario.steps[Math.min(currentStep - 1, totalSteps - 1)].description}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleStep}
          disabled={isFinished || isRunning || autoPlay}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            isFinished || isRunning || autoPlay
              ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
        >
          {isRunning ? "Processing..." : "Next Step"}
        </button>
        <button
          onClick={handleToggleAutoPlay}
          disabled={isRunning}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            autoPlay
              ? "bg-yellow-600 hover:bg-yellow-500 text-white"
              : isFinished
              ? "bg-green-600 hover:bg-green-500 text-white"
              : "bg-white/[0.06] hover:bg-white/[0.1] text-gray-300"
          }`}
        >
          {autoPlay ? "Pause" : isFinished ? "Replay" : "Auto-Play"}
        </button>
        <button
          onClick={handleReset}
          className="py-2 px-3 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 transition-all"
        >
          Reset
        </button>
      </div>

      {autoPlay && (
        <div className="mt-3 flex items-center gap-2">
          <label className="text-[10px] text-gray-500">Speed:</label>
          <input
            type="range"
            min={500}
            max={5000}
            step={250}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="flex-1 h-1 accent-blue-500"
          />
          <span className="text-[10px] text-gray-500 font-mono w-8">{(speed / 1000).toFixed(1)}s</span>
        </div>
      )}
    </div>
  );
}
