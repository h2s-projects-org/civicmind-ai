import React, { useState } from "react";
import { Radio, Plus, Trash2, Volume2, VolumeX, AlertTriangle, HelpCircle } from "lucide-react";
import { Dataset, ThresholdAlert } from "../types";

interface AlertsTabProps {
  alerts: ThresholdAlert[];
  datasets: Dataset[];
  selectedDatasetId: string;
  onAddAlert: (alert: any) => Promise<void>;
  onToggleMute: (id: string, status: "Active" | "Muted") => Promise<void>;
}

export default function AlertsTab({
  alerts,
  datasets,
  selectedDatasetId,
  onAddAlert,
  onToggleMute,
}: AlertsTabProps) {
  const [name, setName] = useState("");
  const [column, setColumn] = useState("");
  const [operator, setOperator] = useState<"gt" | "lt" | "eq">("gt");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const activeDataset = datasets.find((d) => d.id === selectedDatasetId);

  // Set default column based on active dataset
  React.useEffect(() => {
    if (activeDataset && activeDataset.schema.length > 0) {
      const numCols = activeDataset.schema.filter((f) => f.type === "number");
      setColumn(numCols.length > 0 ? numCols[0].name : activeDataset.schema[0].name);
    }
  }, [activeDataset]);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !column || !value || !selectedDatasetId) return;

    try {
      setLoading(true);
      await onAddAlert({
        name,
        datasetId: selectedDatasetId,
        column,
        operator,
        value: Number(value),
      });
      setName("");
      setValue("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 animate-fade-in">
      {/* Alert Creator Form */}
      <div className="rounded-xl glass-panel p-5 glass-panel-hover lg:col-span-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-4.5 w-4.5 text-cyan-400 animate-pulse" />
            <h3 className="text-sm font-semibold text-white font-display">Configure IoT Threshold Alert</h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Instantiate real-time alerts when streaming metrics violate operational parameters.
          </p>

          {activeDataset ? (
            <form onSubmit={handleAddRule} className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 font-display">Alert Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Extreme AQI Violation Alarm"
                  className="mt-1 w-full rounded-lg glass-input p-2 text-xs text-white placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 font-display">Trigger Target Column</label>
                <select
                  value={column}
                  onChange={(e) => setColumn(e.target.value)}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 font-display">Operator</label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as any)}
                    className="mt-1 w-full rounded-lg glass-input p-2 text-xs text-white focus:outline-none [&>option]:bg-[#0c1222]"
                  >
                    <option value="gt">Greater Than (&gt;)</option>
                    <option value="lt">Less Than (&lt;)</option>
                    <option value="eq">Equals (=)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 font-display">Trigger Value</label>
                  <input
                    type="number"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="90"
                    className="mt-1 w-full rounded-lg glass-input p-2 text-xs text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md border border-white/10 font-display"
              >
                <Plus className="h-4 w-4" />
                <span>Publish Threshold Rule</span>
              </button>
            </form>
          ) : (
            <p className="py-12 text-center text-xs text-slate-500 font-display">Select active dataset to publish rules</p>
          )}
        </div>

        {activeDataset && (
          <div className="mt-4 rounded-lg bg-slate-950/40 p-3 border border-white/5 backdrop-blur-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase font-display">Operational Scopes</p>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
              Violations are computed at database ingestion points. Triggered alerts propagate immediate warning logs.
            </p>
          </div>
        )}
      </div>

      {/* Active Threshold Rules List */}
      <div className="rounded-xl glass-panel p-5 glass-panel-hover lg:col-span-8">
        <h3 className="text-sm font-semibold text-white font-display">Active Operational Alarm Threshold Rules</h3>
        <p className="text-[11px] text-slate-400 mt-0.5">Real-time status registers for active threshold monitoring</p>

        <div className="mt-4 space-y-3">
          {alerts.length === 0 ? (
            <p className="py-12 text-center text-xs text-slate-400 font-display">No configured threshold alarms.</p>
          ) : (
            alerts.map((rule) => {
              const datasetName = datasets.find((d) => d.id === rule.datasetId)?.name || "External Dataset";
              const isMuted = rule.status === "Muted";

              return (
                <div
                  key={rule.id}
                  className={`rounded-xl border p-4 backdrop-blur transition-all flex items-center justify-between ${
                    isMuted
                      ? "border-white/5 bg-slate-950/20 opacity-60"
                      : "border-white/5 bg-slate-950/40 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 border ${isMuted ? "bg-slate-900/40 border-white/5 text-slate-500" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                      <AlertTriangle className="h-4.5 w-4.5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white font-display">{rule.name}</h4>
                      <p className="text-[10px] text-slate-450 truncate mt-0.5 max-w-sm">Dataset Scope: {datasetName}</p>
                      
                      <div className="mt-2.5 flex items-center gap-3 text-[10px]">
                        <span className="rounded-md bg-slate-950/60 border border-white/5 px-2 py-0.5 text-slate-350 font-mono">
                          Rule: {rule.column} {rule.operator === "gt" ? ">" : rule.operator === "lt" ? "<" : "="} {rule.value}
                        </span>
                        <span className={`font-semibold font-display ${rule.triggeredCount > 0 ? "text-red-400" : "text-emerald-400"}`}>
                          Triggered: {rule.triggeredCount} times
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleMute(rule.id, isMuted ? "Active" : "Muted")}
                    className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all font-display ${
                      isMuted
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        : "border-white/10 bg-slate-950/40 text-slate-300 hover:text-white hover:bg-slate-950/60"
                    }`}
                  >
                    {isMuted ? (
                      <>
                        <Volume2 className="h-3.5 w-3.5" />
                        <span>Unmute Alarm</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="h-3.5 w-3.5" />
                        <span>Mute Alarm</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
