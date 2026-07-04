import React from "react";
import { FolderHeart, Database, ShieldAlert, Sparkles, Plus, RefreshCw } from "lucide-react";
import { Dataset } from "../types";

interface DatasetSelectorProps {
  datasets: Dataset[];
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  onAddNewClick?: () => void;
}

export default function DatasetSelector({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onAddNewClick,
}: DatasetSelectorProps) {
  const activeDataset = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between backdrop-blur-md shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950/40 border border-white/5 text-cyan-400 backdrop-blur-md">
          <Database className="h-5 w-5" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block leading-tight font-display">
            Active Community Dataset Target
          </label>
          <div className="relative mt-1">
            <select
              value={selectedDatasetId}
              onChange={(e) => onSelectDataset(e.target.value)}
              className="w-72 rounded-lg glass-input px-3 py-1.5 text-xs font-semibold text-white focus:outline-none cursor-pointer [&>option]:bg-[#0c1222]"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.rows.length} rows)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {activeDataset && (
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Quality Rating */}
          <div className="rounded-lg bg-slate-950/40 border border-white/5 px-3 py-1.5 backdrop-blur-md">
            <p className="text-[9px] font-bold text-slate-500 uppercase leading-none font-display">Data Quality Rating</p>
            <p className="font-mono text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${activeDataset.qualityScore > 90 ? "bg-emerald-400" : "bg-amber-400"}`}></span>
              {activeDataset.qualityScore}% {activeDataset.qualityScore > 90 ? "Excellent" : "Standard"}
            </p>
          </div>

          {/* Dataset Type Category */}
          <div className="rounded-lg bg-slate-950/40 border border-white/5 px-3 py-1.5 backdrop-blur-md">
            <p className="text-[9px] font-bold text-slate-500 uppercase leading-none font-display">Operational Category</p>
            <p className="font-semibold text-slate-300 mt-1">{activeDataset.type}</p>
          </div>

          {/* Cleaning Status */}
          <div className="rounded-lg bg-slate-950/40 border border-white/5 px-3 py-1.5 backdrop-blur-md">
            <p className="text-[9px] font-bold text-slate-500 uppercase leading-none font-display">Standardization State</p>
            <p className={`font-semibold mt-1 flex items-center gap-1.5 ${activeDataset.isCleaned ? "text-cyan-400" : "text-amber-400"}`}>
              {activeDataset.isCleaned ? "Standardized (Cleaned)" : "Raw Data (Needs Cleaning)"}
            </p>
          </div>

          {onAddNewClick && (
            <button
              onClick={onAddNewClick}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span className="font-display">Ingest Dataset</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
