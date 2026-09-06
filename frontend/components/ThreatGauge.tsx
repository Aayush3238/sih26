"use client";

import { useEffect, useState } from "react";

interface ThreatGaugeProps {
  confidence: number;
}

export default function ThreatGauge({ confidence }: ThreatGaugeProps) {
  const [animatedConf, setAnimatedConf] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedConf(confidence), 50);
    return () => clearTimeout(timer);
  }, [confidence]);

  const radius = 70;
  const stroke = 10;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedConf / 100) * circumference;

  const getColor = (c: number) => {
    if (c < 30) return "#22c55e";
    if (c < 60) return "#eab308";
    if (c < 80) return "#f97316";
    return "#ef4444";
  };

  const getLabel = (c: number) => {
    if (c < 30) return "LOW";
    if (c < 60) return "MODERATE";
    if (c < 80) return "HIGH";
    return "CRITICAL";
  };

  const color = getColor(confidence);

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Threat Level
      </h3>
      <div className="relative">
        <svg height={radius * 2} width={radius * 2}>
          <circle
            stroke="rgba(255,255,255,0.05)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
              transition: "stroke-dashoffset 0.8s ease-in-out, stroke 0.3s ease",
              filter: `drop-shadow(0 0 6px ${color}60)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-bold"
            style={{ color, fontVariantNumeric: "tabular-nums" }}
          >
            {Math.round(animatedConf)}
          </span>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">%</span>
        </div>
      </div>
      <span
        className="mt-2 text-xs font-bold uppercase tracking-widest"
        style={{ color }}
      >
        {getLabel(confidence)}
      </span>
    </div>
  );
}
