import React from "react";
import { FileText, ShieldAlert, Heart, Server, Shield, Activity } from "lucide-react";
import { AuditLog } from "../types";

interface AuditsTabProps {
  logs: AuditLog[];
}

export default function AuditsTab({ logs }: AuditsTabProps) {
  return (
    <div className="space-y-6">
      {/* Health panel */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4 animate-fade-in">
        <div className="rounded-xl glass-panel p-4 flex items-center gap-3.5 glass-panel-hover">
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-emerald-400 backdrop-blur-sm">
            <Heart className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold font-display">API Gateway Status</p>
            <p className="text-xs font-bold text-white mt-0.5">Healthy & Live</p>
          </div>
        </div>

        <div className="rounded-xl glass-panel p-4 flex items-center gap-3.5 glass-panel-hover">
          <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-2 text-cyan-400 backdrop-blur-sm">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold font-display">Node.js Memory Leakage</p>
            <p className="text-xs font-bold text-slate-200 mt-0.5">0.0% Deviations</p>
          </div>
        </div>

        <div className="rounded-xl glass-panel p-4 flex items-center gap-3.5 glass-panel-hover">
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2 text-blue-400 backdrop-blur-sm">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold font-display">Role-Based Auth Guard</p>
            <p className="text-xs font-bold text-slate-200 mt-0.5">Strict (JWT / RBAC)</p>
          </div>
        </div>

        <div className="rounded-xl glass-panel p-4 flex items-center gap-3.5 glass-panel-hover">
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-emerald-400 backdrop-blur-sm">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold font-display">L4 GPU Accelerator</p>
            <p className="text-xs font-bold text-emerald-400 mt-0.5 font-mono">cuDF Cores Ready</p>
          </div>
        </div>
      </div>

      {/* Main logs table card */}
      <div className="rounded-xl glass-panel p-5 glass-panel-hover">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-4.5 w-4.5 text-cyan-400" />
          <div>
            <h3 className="text-sm font-semibold text-white font-display">Cryptographic Platform Audit Trail Log</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Maintains an immutable record of analytical queries, data standardizations, and dispatched recommendations.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-white/5 bg-slate-950/40 backdrop-blur-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/40 text-slate-400 uppercase text-[9px] font-bold tracking-wider border-b border-white/5 font-display">
              <tr>
                <th className="px-4 py-3">Timestamp (UTC)</th>
                <th className="px-4 py-3">Operator User</th>
                <th className="px-4 py-3">Activity Action</th>
                <th className="px-4 py-3">Activity Description Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400 font-display">
                    Audit trail registries empty.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(log.timestamp).toISOString().replace("T", " ").substring(0, 19)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-200">{log.user}</td>
                    <td className="px-4 py-3 text-cyan-400">{log.action}</td>
                    <td className="px-4 py-3 text-slate-350">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
