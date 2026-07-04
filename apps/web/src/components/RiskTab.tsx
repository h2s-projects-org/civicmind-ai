import React, { useEffect, useState } from "react";
import { Shield, ShieldAlert, Sparkles, HelpCircle, AlertCircle, RefreshCw } from "lucide-react";
import { RiskReport } from "../types";

interface RiskTabProps {
  onFetchRiskScores: () => Promise<RiskReport>;
}

export default function RiskTab({ onFetchRiskScores }: RiskTabProps) {
  const [report, setReport] = useState<RiskReport | null>(null);
  const [loading, setLoading] = useState(false);

  const loadScores = async () => {
    try {
      setLoading(true);
      const res = await onFetchRiskScores();
      setReport(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScores();
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case "Critical":
        return "text-red-400";
      case "High":
        return "text-orange-400";
      case "Medium":
        return "text-amber-400";
      default:
        return "text-emerald-400";
    }
  };

  const getRiskBg = (level: string) => {
    switch (level) {
      case "Critical":
        return "bg-red-500/10 border-red-500/20 text-red-400";
      case "High":
        return "bg-orange-500/10 border-orange-500/20 text-orange-400";
      case "Medium":
        return "bg-amber-500/10 border-amber-500/20 text-amber-400";
      default:
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with overall index */}
      <div className="flex flex-col gap-4 rounded-xl glass-panel p-5 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950/40 border border-white/5 text-cyan-400 backdrop-blur-sm">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-display">Aggregated Community Risk Intelligence Index</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Reflects the weighted operational risk across all districts and ingested streams.
            </p>
          </div>
        </div>

        {report && (
          <div className="flex items-center gap-4 bg-slate-950/40 border border-white/5 rounded-xl px-5 py-2.5 backdrop-blur-sm shadow-sm">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-display">Operational Risk Index</span>
              <p className={`text-sm font-bold mt-0.5 ${getRiskColor(report.overallLevel)} font-display`}>
                {report.overallLevel} Risk Level
              </p>
            </div>
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 border-white/5" style={{ borderTopColor: report.overallScore > 60 ? "#f87171" : "#34d399" }}>
              <span className="text-sm font-extrabold text-white font-mono">{report.overallScore}</span>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2 font-display">
          <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
          <span>Recalculating community risk models...</span>
        </div>
      )}

      {/* Bento Grid layout */}
      {report && !loading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {report.categories.map((cat, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-xl glass-panel p-5 glass-panel-hover"
            >
              <div>
                <div className="flex items-start justify-between">
                  <h4 className="text-xs font-bold text-slate-200 font-display">{cat.name}</h4>
                  <span className={`rounded px-2.5 py-0.5 text-[9px] font-bold uppercase border ${getRiskBg(cat.level)}`}>
                    {cat.level}
                  </span>
                </div>

                {/* Score and meter */}
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-2xl font-extrabold text-white font-mono leading-none">{cat.score}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-950/50 overflow-hidden border border-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.score}%`,
                        backgroundColor: cat.score > 75 ? "#ef4444" : cat.score > 40 ? "#f59e0b" : "#10b981",
                      }}
                    />
                  </div>
                </div>

                {/* Explanation */}
                <p className="text-[11px] text-slate-350 leading-relaxed mt-4 bg-slate-950/40 p-3 rounded-lg border border-white/5 backdrop-blur-sm">
                  {cat.explanation}
                </p>
              </div>

              {/* Contributing factors */}
              <div className="mt-4 border-t border-white/5 pt-3.5 space-y-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block font-display">Contributing Factors:</span>
                <div className="space-y-1.5">
                  {cat.contributingFactors.map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[10px]">
                      <AlertCircle className="mt-0.5 h-3 w-3 text-slate-400 shrink-0" />
                      <span className="text-slate-350 leading-tight">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* AI Advisor Card inside bento box */}
          <div className="rounded-xl border border-dashed border-cyan-500/20 bg-cyan-500/5 p-5 backdrop-blur-md flex flex-col justify-between hover:border-cyan-500/30 transition-all hover:shadow-lg">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-cyan-400 animate-pulse" />
                <h4 className="text-xs font-bold text-cyan-300 font-display">Gemini Risk Advisory Council</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-2.5">
                The Platform continuously cross-references solid waste sensors, police dispatch CAD systems, and air quality parameters to alert stakeholders.
              </p>
              <div className="mt-4 rounded-lg bg-slate-950/40 p-3 text-[10px] text-slate-400 border border-white/5 leading-normal backdrop-blur-sm">
                <span className="font-bold text-slate-300 font-display">Advisory:</span> Systemic air quality (AQI) spikes in District C present immediate respiratory threats. Relocating firefighting units downtown preserves core response margins.
              </div>
            </div>
            <button
              onClick={loadScores}
              className="mt-4 w-full rounded-lg bg-cyan-500/10 border border-cyan-500/25 py-2 text-center text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer font-display"
            >
              Re-poll Operational Indices
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
