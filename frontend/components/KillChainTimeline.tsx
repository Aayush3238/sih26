"use client";

const STAGES = [
  "Reconnaissance",
  "Resource Development",
  "Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Command and Control",
  "Exfiltration",
  "Impact",
];

interface KillChainTimelineProps {
  currentStageIdx: number;
  nextStageIdx: number;
}

export default function KillChainTimeline({
  currentStageIdx,
  nextStageIdx,
}: KillChainTimelineProps) {
  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Attack Trajectory
      </h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-yellow-500 to-red-500 opacity-30" />
        <div className="space-y-1">
          {STAGES.map((stage, idx) => {
            const isCurrent = idx === currentStageIdx;
            const isNext = idx === nextStageIdx;
            const isPast = idx < currentStageIdx;
            const isFuture = idx > nextStageIdx;

            let bgColor = "bg-transparent";
            let textColor = "text-gray-600";
            let dotColor = "bg-gray-700";
            let border = "";

            if (isCurrent) {
              bgColor = "bg-red-500/10";
              textColor = "text-red-400 font-bold";
              dotColor = "bg-red-500";
              border = "border border-red-500/30";
            } else if (isNext) {
              bgColor = "bg-orange-500/10";
              textColor = "text-orange-400 font-semibold";
              dotColor = "bg-orange-500";
              border = "border border-dashed border-orange-500/30";
            } else if (isPast) {
              bgColor = "bg-white/[0.02]";
              textColor = "text-gray-500";
              dotColor = "bg-gray-600";
            }

            return (
              <div
                key={stage}
                className={`flex items-center gap-3 px-3 py-1.5 rounded-md ${bgColor} ${border} transition-all duration-300`}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${dotColor} ${
                      isCurrent ? "animate-pulse shadow-lg shadow-red-500/50" : ""
                    }`}
                  />
                  {isCurrent && (
                    <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping opacity-30" />
                  )}
                </div>
                <span
                  className={`text-xs ${textColor} ${
                    isFuture ? "opacity-40" : ""
                  }`}
                >
                  {stage}
                </span>
                {isCurrent && (
                  <span className="text-[10px] text-red-400 font-mono ml-auto">
                    CURRENT
                  </span>
                )}
                {isNext && (
                  <span className="text-[10px] text-orange-400 font-mono ml-auto">
                    NEXT →
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
