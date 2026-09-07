"use client";

import { useState, useRef } from "react";

interface Prediction {
  row: number;
  original_label: string;
  current_stage: string;
  next_stage: string;
  confidence: number;
  current_stage_idx: number;
  next_stage_idx: number;
  mitigation: string;
  src_ip: string;
  dst_ip: string;
  dst_port: number;
}

interface UploadResult {
  total_rows: number;
  filename: string;
  predictions: Prediction[];
}

interface CsvUploadProps {
  onPrediction: (prediction: Prediction) => void;
}

export default function CsvUpload({ onPrediction }: CsvUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Only CSV files are supported");
      return;
    }
    setUploading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const backendHost = "sih26-dqgv.onrender.com";
      const res = await fetch(`http://${backendHost}/api/upload-csv`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
      const data: UploadResult = await res.json();
      setResult(data);
      if (data.predictions.length > 0) {
        onPrediction(data.predictions[data.predictions.length - 1]);
      }
    } catch (e: any) {
      setError(e.message || "Upload failed");
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Upload CSV
        </h3>
        <div className="group relative">
          <svg className="w-3.5 h-3.5 text-gray-600 cursor-help" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-gray-900 border border-white/10 rounded-lg text-[11px] text-gray-300 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            Upload a CICIDS2017 CSV file. The model extracts 12 flow features from each row and predicts the attack stage and next likely step.
          </div>
        </div>
      </div>
      <p className="text-[11px] text-gray-500 mb-3">
        Drop a CICIDS2017 CSV to predict attack stages from real network flow data
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          dragging
            ? "border-blue-500 bg-blue-500/5"
            : "border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {uploading ? (
          <div className="text-xs text-gray-400">
            <svg className="animate-spin h-5 w-5 mx-auto mb-2 text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing CSV...
          </div>
        ) : (
          <>
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9,15 12,12 15,15" />
            </svg>
            <div className="text-xs text-gray-400">
              <span className="text-blue-400 font-semibold">Click to browse</span> or drag CSV here
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500">
              {result.filename} — {result.total_rows} rows analyzed
            </span>
          </div>
          <div className="max-h-[180px] overflow-y-auto space-y-1 pr-1">
            {result.predictions.map((p) => (
              <div
                key={p.row}
                className="flex items-center gap-2 text-[10px] py-1.5 px-2 rounded bg-white/[0.02] border border-white/[0.04]"
              >
                <span className="text-gray-600 font-mono w-6">#{p.row}</span>
                <span className="text-gray-500 font-mono truncate w-20">{p.src_ip}</span>
                <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                  p.current_stage === p.original_label?.replace("DoS ", "DoS\n") 
                    ? "bg-green-500/10 text-green-400" 
                    : "bg-yellow-500/10 text-yellow-400"
                }`}>
                  {p.current_stage}
                </span>
                <svg className="w-2 h-2 text-gray-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span className="text-orange-400 font-semibold truncate">{p.next_stage}</span>
                <span className={`ml-auto font-mono ${
                  p.confidence > 70 ? "text-red-400" : "text-yellow-400"
                }`}>
                  {p.confidence.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
