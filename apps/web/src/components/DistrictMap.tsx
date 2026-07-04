import React, { useState } from "react";
import { MapPin, AlertTriangle, Shield, CheckCircle, Sparkles } from "lucide-react";

interface DistrictInfo {
  id: string;
  name: string;
  color: string;
  score: number;
  status: "Low" | "Medium" | "High" | "Critical";
  majorIssues: string[];
  recommendation: string;
}

export default function DistrictMap() {
  const [selectedDistrict, setSelectedDistrict] = useState<string>("district_c");

  const districts: { [key: string]: DistrictInfo } = {
    district_a: {
      id: "district_a",
      name: "District A (Downtown)",
      color: "#ef4444", // High/Critical
      score: 74,
      status: "High",
      majorIssues: ["High emergency response latency (avg 8.5 min)", "High density of commercial fire dispatches"],
      recommendation: "Relocate secondary rescue vehicle to the Downtown substation.",
    },
    district_b: {
      id: "district_b",
      name: "District B (Northside)",
      color: "#f59e0b", // Medium/High
      score: 58,
      status: "Medium",
      majorIssues: ["Peak-hour signal corridor congestion at Hwy 101 Outlet", "Increased vehicle traffic counters"],
      recommendation: "Re-phase signal timings automatically via SCATS integration.",
    },
    district_c: {
      id: "district_c",
      name: "District C (East River)",
      color: "#ef4444", // Critical
      score: 88,
      status: "Critical",
      majorIssues: ["Substandard AQI spikes exceeding 125 ppm", "Solid waste bins overflow average exceeding 98%"],
      recommendation: "Deploy immediate municipal sanitation truck route re-dispatch.",
    },
    district_d: {
      id: "district_d",
      name: "District D (South Hills)",
      color: "#10b981", // Low Risk
      score: 22,
      status: "Low",
      majorIssues: ["Optimal residential transit counts", "Sub-30 AQI indices"],
      recommendation: "Maintain standard smart city operations. No intervention needed.",
    },
  };

  const active = districts[selectedDistrict];

  const getBadgeClass = (status: string) => {
    switch (status) {
      case "Critical":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "High":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "Medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Interactive SVG Map Card */}
      <div className="rounded-xl glass-panel p-5 glass-panel-hover lg:col-span-7">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white font-display">Geospatial Community Risk Assessment</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Click on municipal zones to query real-time IoT metrics</p>
          </div>
          <span className="rounded-full bg-slate-950/40 border border-white/5 px-2.5 py-1 text-[10px] font-mono text-slate-400 backdrop-blur-sm">
            METRO INTERACTIVE CHOROPLETH
          </span>
        </div>

        {/* Vector SVG container */}
        <div className="relative flex h-80 items-center justify-center rounded-lg bg-slate-950/40 p-4 border border-white/5 backdrop-blur-sm">
          <svg
            viewBox="0 0 500 400"
            className="h-full w-full max-w-[450px]"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background Map Grid */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" rx="8" />

            {/* District B: Northside */}
            <path
              d="M 50,50 L 450,50 L 400,180 L 220,160 Z"
              fill={selectedDistrict === "district_b" ? "#f59e0b" : "#f59e0b20"}
              stroke="#f59e0b"
              strokeWidth={selectedDistrict === "district_b" ? "2.5" : "1"}
              className="transition-all duration-200 cursor-pointer hover:fill-amber-500/40"
              onClick={() => setSelectedDistrict("district_b")}
            />
            <text x="250" y="110" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle" className="pointer-events-none drop-shadow font-display">
              District B (Northside) - 58
            </text>

            {/* District C: East River */}
            <path
              d="M 400,180 L 450,50 L 450,350 L 300,320 Z"
              fill={selectedDistrict === "district_c" ? "#ef4444" : "#ef444415"}
              stroke="#ef4444"
              strokeWidth={selectedDistrict === "district_c" ? "2.5" : "1"}
              className="transition-all duration-200 cursor-pointer hover:fill-red-500/40"
              onClick={() => setSelectedDistrict("district_c")}
            />
            <text x="380" y="240" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle" className="pointer-events-none drop-shadow font-display">
              District C - 88
            </text>

            {/* District A: Downtown */}
            <path
              d="M 50,50 L 220,160 L 300,320 L 150,350 Z"
              fill={selectedDistrict === "district_a" ? "#ef4444" : "#ef444415"}
              stroke="#ef4444"
              strokeWidth={selectedDistrict === "district_a" ? "2.5" : "1"}
              className="transition-all duration-200 cursor-pointer hover:fill-red-500/40"
              onClick={() => setSelectedDistrict("district_a")}
            />
            <text x="170" y="210" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle" className="pointer-events-none drop-shadow font-display">
              District A (Downtown) - 74
            </text>

            {/* District D: South Hills */}
            <path
              d="M 50,50 L 150,350 L 50,350 Z"
              fill={selectedDistrict === "district_d" ? "#10b981" : "#10b98115"}
              stroke="#10b981"
              strokeWidth={selectedDistrict === "district_d" ? "2.5" : "1"}
              className="transition-all duration-200 cursor-pointer hover:fill-emerald-500/40"
              onClick={() => setSelectedDistrict("district_d")}
            />
            <text x="90" y="290" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle" className="pointer-events-none drop-shadow font-display">
              District D - 22
            </text>
          </svg>

          {/* Map Legends */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2.5 rounded-lg border border-white/5 bg-slate-950/60 p-2.5 text-[10px] backdrop-blur font-display">
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-emerald-500"></span>
              <span className="text-slate-400">Low (&lt;35)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-amber-500"></span>
              <span className="text-slate-400">Med (35-60)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-red-500"></span>
              <span className="text-slate-400">High (&gt;60)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected District Telemetry Info Card */}
      <div className="rounded-xl glass-panel p-5 glass-panel-hover lg:col-span-5 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-base font-display font-bold text-white">{active.name}</h4>
              <p className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">District Telemetry Profile</p>
            </div>
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getBadgeClass(active.status)}`}>
              {active.status} RISK
            </span>
          </div>

          {/* Risk Ring Score */}
          <div className="my-6 flex items-center gap-4 rounded-xl bg-slate-950/40 p-4 border border-white/5 backdrop-blur-sm">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white/5" style={{ borderTopColor: active.color }}>
              <span className="text-base font-extrabold text-white font-mono">{active.score}</span>
              <span className="absolute bottom-1 text-[8px] text-slate-500 uppercase font-bold font-display">Risk</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200 font-display">Municipal Risk Factor Score</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Aggregated cross-sensor anomalies and dispatch delays place this zone under {active.status.toLowerCase()} security and environmental oversight guidelines.
              </p>
            </div>
          </div>

          {/* Major Operational Issues */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-display">Contributing Outliers</p>
            {active.majorIssues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="text-slate-350 leading-normal">{issue}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Actionable Recommendation */}
        <div className="mt-6 border-t border-white/5 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-display">
            <Sparkles className="h-3 w-3 text-cyan-400" /> Actionable Intelligence Recommendation
          </p>
          <div className="mt-2.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs">
            <p className="font-semibold text-cyan-300 font-display">Urgent Intervention Recommended:</p>
            <p className="text-slate-350 leading-relaxed mt-1 text-[11px]">{active.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
