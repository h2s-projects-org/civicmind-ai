import React, { useState } from "react";
import { UploadCloud, CheckCircle, Trash2, ShieldCheck, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { Dataset } from "../types";

interface IngestionTabProps {
  datasets: Dataset[];
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  onUploadDataset: (dataset: any) => Promise<void>;
  onDeleteDataset: (id: string) => Promise<void>;
  onCleanDataset: (id: string) => Promise<void>;
}

export default function IngestionTab({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onUploadDataset,
  onDeleteDataset,
  onCleanDataset,
}: IngestionTabProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Safety");
  const [source, setSource] = useState("");
  const [owner, setOwner] = useState("");
  const [rawJson, setRawJson] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [cleaningId, setCleaningId] = useState<string | null>(null);

  const activeDataset = datasets.find((d) => d.id === selectedDatasetId);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!name || !rawJson) {
      setErrorMsg("Dataset Name and Data JSON are required.");
      return;
    }

    try {
      setLoading(true);
      const rows = JSON.parse(rawJson);
      if (!Array.isArray(rows)) {
        throw new Error("Uploaded data must be an array of objects");
      }

      await onUploadDataset({
        name,
        type,
        source: source || "Manual Ingestion Portal",
        owner: owner || "Civic Officer",
        rows,
      });

      setName("");
      setRawJson("");
      setSource("");
      setOwner("");
    } catch (e: any) {
      setErrorMsg(`Failed to parse JSON structure: ${e.message}. Please input a valid JSON array of objects.`);
    } finally {
      setLoading(false);
    }
  };

  const loadSampleJson = () => {
    const samples: { [key: string]: any[] } = {
      Safety: [
        { id: 101, district: "District C (East River)", type: "Theft Report", response_time: 14.2, officers_deployed: 2, severity: "Low", time: "2026-07-04" },
        { id: 102, district: "District A (Downtown)", type: "Medical Emergency", response_time: 22.5, officers_deployed: 2, severity: "High", time: "" },
        { id: 103, district: "District A (Downtown)", type: "Medical Emergency", response_time: 8.1, officers_deployed: 2, severity: "High", time: "2026-07-04" }
      ],
      Environmental: [
        { id: 101, location: "District C (East River)", aqi: 135, carbon_ppm: 490, temperature_c: 29.5, humidity_pct: 42, waste_bin_fill_rate: 99 },
        { id: 102, location: "District B (Northside)", aqi: 45, carbon_ppm: null, temperature_c: 22.1, humidity_pct: 61, waste_bin_fill_rate: 50 }
      ],
      Transportation: [
        { id: 101, intersection: "Downtown Main St & 5th Ave", vehicle_count: 1450, average_delay_sec: 42.0, public_transit_delay_min: 5, peak_congestion_level: "High" },
        { id: 102, intersection: "Northside Hwy 101 Outlet", vehicle_count: 2300, average_delay_sec: 980, public_transit_delay_min: 15, peak_congestion_level: "Critical" }
      ]
    };
    setRawJson(JSON.stringify(samples[type], null, 2));
  };

  const handleCleanTrigger = async (id: string) => {
    try {
      setCleaningId(id);
      await onCleanDataset(id);
    } finally {
      setCleaningId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper Grid: Active Info vs Data Clean console */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Dataset Ingestion Form */}
        <div className="rounded-xl glass-panel p-5 glass-panel-hover lg:col-span-6">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 font-display">
            <UploadCloud className="h-4.5 w-4.5 text-cyan-400" />
            Ingest Structured Community Dataset
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Supports Excel/CSV parsed JSON arrays representing operational municipality records.
          </p>

          <form onSubmit={handleUpload} className="mt-4 space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 font-display">Dataset Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Transit Corridor Counter Logs"
                  className="mt-1 w-full rounded-lg glass-input p-2 text-xs text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 font-display">Categorical Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-1 w-full rounded-lg glass-input p-2 text-xs text-white focus:outline-none [&>option]:bg-[#0c1222]"
                >
                  <option value="Safety">Public Safety & Rescue</option>
                  <option value="Environmental">Environmental & Air Quality</option>
                  <option value="Transportation">Transportation & Congestion</option>
                  <option value="Custom">Custom Operations</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 font-display">Source Agency</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., DOT IoT Sensors"
                  className="mt-1 w-full rounded-lg glass-input p-2 text-xs text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 font-display">Department Custodian</label>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="e.g., Jane Cooper, Director"
                  className="mt-1 w-full rounded-lg glass-input p-2 text-xs text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase text-slate-500 font-display">Dataset JSON Array</label>
                <button
                  type="button"
                  onClick={loadSampleJson}
                  className="text-[10px] text-cyan-400 font-bold hover:underline cursor-pointer font-display"
                >
                  Load sample data schema
                </button>
              </div>
              <textarea
                required
                rows={5}
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                placeholder='[ { "district": "District A", "metric_val": 42.1 } ]'
                className="mt-1 w-full rounded-lg glass-input p-2 font-mono text-[11px] text-emerald-400 placeholder-slate-700 focus:outline-none"
              />
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md border border-white/10"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              <span className="font-display">Complete Ingestion Pipeline</span>
            </button>
          </form>
        </div>

        {/* Cleaning Engine Panel */}
        <div className="rounded-xl glass-panel p-5 glass-panel-hover lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 font-display">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
                  Automated Data Cleaning Engine
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Triggers anomaly scans, missing values capping, and date ISO standardizations.
                </p>
              </div>
            </div>

            {activeDataset ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg bg-slate-950/40 p-4 border border-white/5 backdrop-blur-sm">
                  <p className="text-xs font-semibold text-slate-200 font-display">Selected target: {activeDataset.name}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Rows count: {activeDataset.rows.length} records</p>

                  <div className="mt-3 flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${activeDataset.isCleaned ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"}`} />
                    <span className="text-xs text-slate-400 font-medium">
                      Status: {activeDataset.isCleaned ? "Cleaned & Outliers Standardized" : "Pending cleaning assessment"}
                    </span>
                  </div>
                </div>

                {activeDataset.isCleaned && activeDataset.cleaningStats ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-display">Before & After Pipe Statistics</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-lg border border-white/5 bg-slate-950/40 p-2 text-center backdrop-blur-sm">
                        <p className="text-slate-400 text-[10px] font-display">Outliers Mitigated</p>
                        <p className="text-sm font-extrabold text-emerald-400 font-mono mt-1">
                          {activeDataset.cleaningStats.outliersDetected}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-slate-950/40 p-2 text-center backdrop-blur-sm">
                        <p className="text-slate-400 text-[10px] font-display">Missing Fields Capped</p>
                        <p className="text-sm font-extrabold text-emerald-400 font-mono mt-1">
                          {activeDataset.cleaningStats.missingValuesCount}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-slate-950/40 p-2 text-center backdrop-blur-sm">
                        <p className="text-slate-400 text-[10px] font-display">Dates Normalized</p>
                        <p className="text-sm font-extrabold text-emerald-400 font-mono mt-1">
                          {activeDataset.cleaningStats.normalizedDates}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-slate-950/40 p-2 text-center backdrop-blur-sm">
                        <p className="text-slate-400 text-[10px] font-display">Duplicates Purged</p>
                        <p className="text-sm font-extrabold text-emerald-400 font-mono mt-1">
                          {activeDataset.cleaningStats.duplicatesRemoved}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3.5 text-xs text-slate-350 leading-normal">
                    <p className="font-semibold text-amber-400 font-display">Cleaning Assessment Advisory:</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Our schema analysis indicates that running the standard cleaning pipeline on this dataset will automatically restore confidence, normalize temporal parameters, and align coordinates.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="py-12 text-center text-xs text-slate-500 font-display">Please choose or upload a dataset to clean</p>
            )}
          </div>

          {activeDataset && !activeDataset.isCleaned && (
            <button
              onClick={() => handleCleanTrigger(activeDataset.id)}
              disabled={cleaningId !== null}
              className="mt-4 w-full rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-2.5 text-center text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm font-display"
            >
              {cleaningId ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>Execute Automated Standardization Pipe</span>
            </button>
          )}
        </div>
      </div>

      {/* Lower Block: Dataset Registry & Schema */}
      <div className="rounded-xl glass-panel p-5 glass-panel-hover">
        <h3 className="text-sm font-semibold text-white font-display">Ingested Dataset Repositories</h3>
        <p className="text-[11px] text-slate-400 mt-0.5">Manage uploaded municipal databases and schema definitions</p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-white/5 bg-slate-950/40 backdrop-blur-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/40 text-slate-400 uppercase text-[9px] font-bold tracking-wider border-b border-white/5 font-display">
              <tr>
                <th className="px-4 py-3">Dataset Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Source Agency</th>
                <th className="px-4 py-3">Records Count</th>
                <th className="px-4 py-3">Ingested On</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {datasets.map((d) => (
                <tr
                  key={d.id}
                  className={`hover:bg-white/[0.02] cursor-pointer transition-colors ${
                    selectedDatasetId === d.id ? "bg-white/[0.04]" : ""
                  }`}
                  onClick={() => onSelectDataset(d.id)}
                >
                  <td className="px-4 py-3 font-semibold text-white font-display">{d.name}</td>
                  <td className="px-4 py-3 text-slate-300">{d.type}</td>
                  <td className="px-4 py-3 text-slate-400">{d.source}</td>
                  <td className="px-4 py-3 text-emerald-400 font-mono font-bold">{d.rows.length}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono">
                    {new Date(d.uploadTime).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onDeleteDataset(d.id)}
                      className="rounded p-1 text-slate-450 hover:text-red-400 transition-all cursor-pointer"
                      title="Purge Dataset"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
