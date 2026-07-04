import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Cpu, Zap, Activity, BarChart3, RefreshCw, Layers } from "lucide-react";
import { Dataset, BenchmarkResult } from "../types";

interface AnalyticsTabProps {
  activeDataset: Dataset | null;
  onRunQuery: (groupByCol: string, aggregateCol: string, operation: string) => Promise<BenchmarkResult>;
}

export default function AnalyticsTab({ activeDataset, onRunQuery }: AnalyticsTabProps) {
  const [groupByCol, setGroupByCol] = useState("");
  const [aggregateCol, setAggregateCol] = useState("");
  const [operation, setOperation] = useState("avg");
  const [benchmark, setBenchmark] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Set default columns based on selected dataset schema
  useEffect(() => {
    if (activeDataset && activeDataset.schema.length > 0) {
      const stringCols = activeDataset.schema.filter((f) => f.type === "string");
      const numCols = activeDataset.schema.filter((f) => f.type === "number");

      setGroupByCol(stringCols.length > 0 ? stringCols[0].name : activeDataset.schema[0].name);
      setAggregateCol(numCols.length > 0 ? numCols[0].name : activeDataset.schema[0].name);
    }
  }, [activeDataset]);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDataset || !groupByCol || !aggregateCol) return;

    try {
      setLoading(true);
      const res = await onRunQuery(groupByCol, aggregateCol, operation);
      setBenchmark(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const speedChartData = benchmark
    ? [
        {
          name: "Processing Latency (ms)",
          "Standard CPU (Pandas)": parseFloat((benchmark.processingTimeMs * benchmark.accelerationFactor).toFixed(3)),
          "NVIDIA cuDF (GPU accelerated)": benchmark.processingTimeMs,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Upper Grid: Query Builder vs GPU Benchmarks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Compiler Form */}
        <div className="rounded-xl glass-panel p-5 glass-panel-hover lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4.5 w-4.5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white font-display">Aggregated Query Compiler</h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Select variables to perform high-resolution grouping and vector aggregations.
            </p>

            {activeDataset ? (
              <form onSubmit={handleQuery} className="mt-4 space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 font-display">Group By Column (Strings)</label>
                  <select
                    value={groupByCol}
                    onChange={(e) => setGroupByCol(e.target.value)}
                    className="mt-1 w-full rounded-lg glass-input p-2 text-xs text-white focus:outline-none [&>option]:bg-[#0c1222]"
                  >
                    {activeDataset.schema.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.name} ({f.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 font-display">Aggregate Target (Numeric)</label>
                  <select
                    value={aggregateCol}
                    onChange={(e) => setAggregateCol(e.target.value)}
                    className="mt-1 w-full rounded-lg glass-input p-2 text-xs text-white focus:outline-none [&>option]:bg-[#0c1222]"
                  >
                    {activeDataset.schema.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.name} ({f.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 font-display">Reduction Operation</label>
                  <select
                    value={operation}
                    onChange={(e) => setOperation(e.target.value)}
                    className="mt-1 w-full rounded-lg glass-input p-2 text-xs text-white focus:outline-none [&>option]:bg-[#0c1222]"
                  >
                    <option value="avg">Average (Mean)</option>
                    <option value="sum">Summation</option>
                    <option value="count">Count (Density)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md border border-white/10 font-display"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  <span>Execute Accelerated Aggregate</span>
                </button>
              </form>
            ) : (
              <p className="py-12 text-center text-xs text-slate-500 font-display">Ingest datasets first to compiler</p>
            )}
          </div>

          {activeDataset && (
            <div className="mt-4 rounded-lg bg-slate-950/40 p-3 border border-white/5 backdrop-blur-sm">
              <p className="text-[10px] font-bold text-slate-500 uppercase font-display">Data Architecture Guide</p>
              <p className="text-[11px] text-slate-350 leading-relaxed mt-1">
                This query will run server-side in Node-TS, benchmarking performance compared to an NVIDIA L4 GPU running a cuDF RAPIDS container instance.
              </p>
            </div>
          )}
        </div>

        {/* GPU Performance Benchmark Card */}
        <div className="rounded-xl glass-panel p-5 glass-panel-hover lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 font-display">
                  <Cpu className="h-4.5 w-4.5 text-emerald-400" />
                  NVIDIA cuDF Hardware Acceleration Benchmark
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  GPU-accelerated analytics outperforms traditional Pandas CPU processing on big operational tables.
                </p>
              </div>
            </div>

            {benchmark ? (
              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-12">
                {/* Stats Columns */}
                <div className="space-y-3.5 md:col-span-4">
                  <div className="rounded-lg bg-slate-950/40 p-3 border border-white/5 backdrop-blur-sm">
                    <p className="text-[10px] text-slate-500 uppercase font-mono">Acceleration Factor</p>
                    <p className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5 animate-pulse">
                      {benchmark.accelerationFactor}x Speedup
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-950/40 p-3 border border-white/5 backdrop-blur-sm">
                    <p className="text-[10px] text-slate-500 uppercase font-mono">GPU Target Processing</p>
                    <p className="text-xl font-extrabold text-cyan-400 font-mono mt-0.5">
                      {benchmark.processingTimeMs} ms
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-950/40 p-3 border border-white/5 backdrop-blur-sm">
                    <p className="text-[10px] text-slate-500 uppercase font-mono">Memory Delta Overhead</p>
                    <p className="text-sm font-bold text-white font-mono mt-0.5">
                      {benchmark.memoryUsageKb} KB
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-950/40 p-3 border border-white/5 backdrop-blur-sm">
                    <p className="text-[10px] text-slate-500 uppercase font-mono">Records Processed</p>
                    <p className="text-sm font-bold text-white font-mono mt-0.5">
                      {benchmark.rowsProcessed} rows
                    </p>
                  </div>
                </div>

                {/* Speed Comparison Chart */}
                <div className="h-60 md:col-span-8 bg-slate-950/40 rounded-lg p-3 border border-white/5 flex flex-col justify-between backdrop-blur-sm">
                  <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider block">
                    LATENCY COMPARISON (LOWER IS BETTER)
                  </span>
                  <div className="flex-1 min-h-0 mt-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={speedChartData} layout="vertical">
                        <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} hide />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.08)", borderRadius: "8px" }}
                          labelClassName="text-slate-200"
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="Standard CPU (Pandas)" fill="#f59e0b" radius={[0, 4, 4, 0]} opacity={0.85} />
                        <Bar dataKey="NVIDIA cuDF (GPU accelerated)" fill="#10b981" radius={[0, 4, 4, 0]} opacity={0.85} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-white/10 p-12 text-center">
                <Layers className="mx-auto h-8 w-8 text-slate-500 animate-pulse" />
                <p className="mt-3 text-xs text-slate-400 font-display">Compile and execute a query to trigger hardware performance metrics</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lower Block: Aggregation Query Output Data */}
      {benchmark && (
        <div className="rounded-xl glass-panel p-5 glass-panel-hover animate-fade-in">
          <h3 className="text-sm font-semibold text-white font-display">Aggregated Output Registry</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Direct vector outcomes from high-performance reducing query</p>

          <div className="mt-4 overflow-x-auto rounded-lg border border-white/5 bg-slate-950/40 backdrop-blur-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/40 text-slate-400 uppercase text-[9px] font-bold tracking-wider border-b border-white/5 font-display">
                <tr>
                  <th className="px-4 py-3">Group Variable: ({groupByCol})</th>
                  <th className="px-4 py-3">Aggregation Outcome ({operation.toUpperCase()} of {aggregateCol})</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {benchmark.results.map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-semibold text-white font-display">{row.group}</td>
                    <td className="px-4 py-3 font-mono text-emerald-400 font-bold">{row.value}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] text-emerald-400 font-semibold uppercase font-display">
                        Vectored
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
