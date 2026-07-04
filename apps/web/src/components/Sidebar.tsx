import React from "react";
import {
  LayoutDashboard,
  Database,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Lightbulb,
  Radio,
  FileText,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, onLogout }: SidebarProps) {
  const menuItems = [
    { id: "overview", name: "Overview Dashboard", icon: LayoutDashboard },
    { id: "ingestion", name: "Operations & Ingestion", icon: Database },
    { id: "analytics", name: "Accelerated Analytics", icon: BarChart3 },
    { id: "forecasting", name: "Predictive Forecasting", icon: TrendingUp },
    { id: "risk", name: "Community Risk Scoring", icon: ShieldAlert },
    { id: "recommendations", name: "AI Recommendations", icon: Lightbulb },
    { id: "alerts", name: "Threshold Alert Center", icon: Radio },
    { id: "audits", name: "System Audits & Logs", icon: FileText },
  ];

  return (
    <aside className="flex h-[calc(100vh-4rem)] w-64 flex-col justify-between border-r border-white/5 bg-slate-950/25 p-4 shrink-0 backdrop-blur-xl">
      {/* Menu Options */}
      <nav className="flex flex-col gap-1.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-display">
          Decision Platforms
        </p>
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all duration-150 cursor-pointer text-left ${
                isActive
                  ? "bg-white/[0.05] text-cyan-400 border border-white/10 shadow-sm"
                  : "text-slate-400 border border-transparent hover:bg-white/[0.02] hover:text-slate-200"
              }`}
            >
              <IconComponent className={`h-4 w-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
              <span className="font-display font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="border-t border-white/5 pt-4">
        <div className="rounded-lg bg-white/[0.015] p-3 border border-white/5 backdrop-blur-md">
          <p className="text-[10px] font-semibold text-slate-400 uppercase font-display">Operational Zone</p>
          <p className="text-[11px] text-emerald-400 font-mono mt-1">Status: Operational</p>
          <p className="text-[10px] text-slate-500 mt-0.5">NVIDIA CUDA 12.2 • L4 GPU</p>
        </div>
        <button
          onClick={onLogout}
          className="mt-3 flex w-full items-center gap-3 rounded-lg border border-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span className="font-display">Exit Console</span>
        </button>
      </div>
    </aside>
  );
}
