import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line } from "recharts";
import { TrendingUp, RefreshCw, AlertTriangle, Cpu, HelpCircle, CheckCircle } from "lucide-react";
import { Dataset, ForecastingReport } from "../types";

interface ForecastingTabProps {
  activeDataset: Dataset | null;
  onRunForecast: (metricCol: string, labelCol: string, periods: number) => Promise<ForecastingReport>;
}

export default function ForecastingTab({ activeDataset, onRunForecast }: ForecastingTabProps) {
  const [metricCol, setMetricCol] = useState("");
  const [labelCol, setLabelCol] = useState("");
  const [periods, setPeriods] = useState(6);
  const [report, setReport] = useState<ForecastingReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeDataset && activeDataset.schema.length > 0) {
      const numCols = activeDataset.schema.filter((f) => f.type === "number" && f.name !== "id");
      const labelCols = activeDataset.schema.filter((f) => f.type === "date" || f.type === "string");

      setMetricCol(numCols.length > 0 ? numCols[0].name : activeDataset.schema[0].name);
      setLabelCol(labelCols.length > 0 ? labelCols[0].name : activeDataset.schema[0].name);
    }
  }, [activeDataset]);

  const handleForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDataset || !metricCol || !labelCol) return;

    try {
      setLoading(true);
      const res = await onRunForecast(metricCol, labelCol, periods);
      setReport(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Convert report forecast points into a single timeline chart format
  const chartData = report
    ? report.forecast.map((pt) => ({
        period: pt.period,
        "Historical Observed": pt.historicalValue !== undefined ? pt.historicalValue : null,
        "Forecast Projection": pt.forecastValue !== undefined ? pt.forecastValue : null,
        "Uncertainty Interval": pt.forecastValue !== undefined ? [pt.lowerBound, pt.upperBound] : null,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Forecast Configuration Form */}
        <div className="rounded-xl glass-panel p-5 glass-panel-hover lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white font-display">Predictive Forecast Modeler</h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Construct Autoregressive models to forecast future municipal demand and sensor metrics.
            </p>

            {activeDataset ? (
              <form onSubmit={handleForecast} className="mt-4 space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 font-display">Metric Target (Numeric)</label>
                  <select
                    value={metricCol}
                    onChange={(e) => setMetricCol(e.target.value)}
                    className="mt-1 w-full rounded-lg glass-input p-2 text-xs text-white focus:outline-none [&>option]:bg-[#0c1222]"
                  >
                    {activeDataset.schema
                      .filter((f) => f.type === "number" && f.name !== "id")
                      .map((f) => (
                        <option key={f.name} value={f.name}>
                          {f.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 font-display">Chronological Axis (Date/Label)</label>
                  <select
                    value={labelCol}
                    onChange={(e) => setLabelCol(e.target.value)}
                    className="mt-1 w-full rounded-lg glass-input p-2 text-xs text-white focus:outline-none [&>option]:bg-[#0c1222]"
                  >
                    {activeDataset.schema
                      .filter((f) => f.type === "string" || f.type === "date")
                      .map((f) => (
                        <option key={f.name} value={f.name}>
                          {f.name} ({f.type})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 font-display">Future Intervals to Project</label>
                  <select
                    value={periods}
                    onChange={(e) => setPeriods(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg glass-input p-2 text-xs text-white focus:outline-none [&>option]:bg-[#0c1222]"
                  >
                    <option value="6">Next 6 Periods (Short-term)</option>
                    <option value="12">Next 12 Periods (Medium-term)</option>
                    <option value="18">Next 18 Periods (Long-term)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md border border-white/10 font-display"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                  <span>Execute Neural Projections</span>
                </button>
              </form>
            ) : (
              <p className="py-12 text-center text-xs text-slate-500 font-display">Ingest datasets first to forecast</p>
            )}
          </div>

          {activeDataset && (
            <div className="mt-4 rounded-lg bg-slate-950/40 p-3 border border-white/5 backdrop-blur-sm">
              <p className="text-[10px] font-bold text-slate-500 uppercase font-display">Explainable AI Framework</p>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                Forecasting outputs automatically calculate confidence bands using residual moving deviations to prevent false certainty.
              </p>
            </div>
          )}
        </div>

        {/* Forecast Visualization Chart */}
        <div className="rounded-xl glass-panel p-5 glass-panel-hover lg:col-span-8 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white font-display">Advanced Autoregressive Projections Timeline</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Visualizes historical trends, estimated future outcomes, and confidence deviation thresholds.
            </p>

            {report ? (
              <div className="mt-4 space-y-4">
                {/* Recharts Area Timeline */}
                <div className="h-64 w-full bg-slate-950/40 rounded-lg p-3 border border-white/5 backdrop-blur-sm">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="period" stroke="#94a3b8" fontSize={9} />
                      <YAxis stroke="#94a3b8" fontSize={9} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.08)", borderRadius: "8px" }}
                        labelClassName="text-slate-200"
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      
                      {/* Range Confidence Interval Area */}
                      <Area
                        type="monotone"
                        dataKey="Uncertainty Interval"
                        stroke="none"
                        fill="#10b981"
                        fillOpacity={0.12}
                        name="95% Confidence Band"
                      />

                      {/* Historical Solid Line */}
                      <Area
                        type="monotone"
                        dataKey="Historical Observed"
                        stroke="#0ea5e9"
                        strokeWidth={2.5}
                        fill="none"
                        name="Historical Observed"
                      />

                      {/* Forecast Dashed Line */}
                      <Area
                        type="monotone"
                        dataKey="Forecast Projection"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        strokeDasharray="5 5"
                        fill="none"
                        name="Forecast Projection"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Explainable AI Model Insights Summary */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-white/5 bg-slate-950/40 p-3 text-center backdrop-blur-sm">
                    <p className="text-slate-500 text-[10px] font-bold uppercase font-mono">Trend Growth Rate</p>
                    <p className={`text-lg font-mono font-extrabold mt-1 ${report.growthRatePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {report.growthRatePct >= 0 ? "+" : ""}{report.growthRatePct}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-slate-950/40 p-3 text-center backdrop-blur-sm">
                    <p className="text-slate-500 text-[10px] font-bold uppercase font-mono">Seasonality Model</p>
                    <p className="text-xs font-semibold text-slate-200 mt-1 truncate">
                      {report.seasonalityType}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-slate-950/40 p-3 text-center backdrop-blur-sm">
                    <p className="text-slate-500 text-[10px] font-bold uppercase font-mono">Anomaly Flag</p>
                    <p className={`text-xs font-bold mt-1 ${report.anomalyDetected ? "text-amber-400" : "text-emerald-400"}`}>
                      {report.anomalyDetected ? "Potential Volatility" : "Stable Baseline"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-white/10 p-12 text-center mt-6">
                <TrendingUp className="mx-auto h-8 w-8 text-slate-500 animate-pulse" />
                <p className="mt-3 text-xs text-slate-400 font-display">Configure parameters and click 'Execute Neural Projections' to generate future metrics</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Narrative Card */}
      {report && (
        <div className="rounded-xl glass-panel p-5 glass-panel-hover animate-fade-in">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-display">
            <Cpu className="h-4 w-4 text-cyan-400" /> Explainable AI Forecast Summary Narrative
          </h4>
          <p className="mt-3.5 text-xs text-slate-350 leading-relaxed font-normal bg-slate-950/40 p-4 rounded-lg border border-white/5 backdrop-blur-sm">
            {report.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
