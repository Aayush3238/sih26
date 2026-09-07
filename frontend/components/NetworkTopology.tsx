"use client";

import { useEffect, useState } from "react";

interface Node {
  node_id: string;
  hostname: string;
  ip_address: string;
  status: string;
  threats_detected: number;
}

const STATUS_COLORS: Record<string, string> = {
  online: "bg-green-500",
  warning: "bg-yellow-500",
  offline: "bg-gray-500",
  compromised: "bg-red-500",
};

const STATUS_TEXT: Record<string, string> = {
  online: "text-green-400",
  warning: "text-yellow-400",
  offline: "text-gray-400",
  compromised: "text-red-400",
};

export default function NetworkTopology() {
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    fetch(`https://sih26-dqgv.onrender.com/api/nodes`)
      .then((r) => r.json())
      .then(setNodes)
      .catch(console.error);
  }, []);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Network Nodes
      </h3>
      <div className="space-y-2">
        {nodes.map((node) => (
          <div
            key={node.node_id}
            className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg hover:bg-white/[0.05] transition-colors"
          >
            <div className="relative">
              <div
                className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[node.status] || STATUS_COLORS.offline}`}
              />
              {node.status === "online" && (
                <div
                  className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${STATUS_COLORS[node.status]} animate-ping opacity-40`}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-200 truncate">
                {node.hostname}
              </div>
              <div className="text-xs text-gray-500 font-mono">
                {node.ip_address}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className={`text-xs font-semibold ${STATUS_TEXT[node.status] || STATUS_TEXT.offline}`}>
                {node.status.toUpperCase()}
              </div>
              {node.threats_detected > 0 && (
                <div className="text-[10px] text-red-400">
                  {node.threats_detected} threat{node.threats_detected > 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        ))}
        {nodes.length === 0 && (
          <div className="text-center text-gray-600 text-xs py-4">
            Connecting to backend...
          </div>
        )}
      </div>
    </div>
  );
}
