import React, { useState, useEffect } from "react";
import {
  Shield,
  Sparkles,
  Database,
  LayoutDashboard,
  Cpu,
  ArrowRight,
  ShieldAlert,
  Bot,
  HelpCircle,
  FileText,
  ChevronRight,
  MessageSquare,
  Plus,
  Check,
  Radio,
  LogIn,
  AlertTriangle,
  Key,
} from "lucide-react";

import {
  Dataset,
  Recommendation,
  AuditLog,
  ThresholdAlert,
  NotificationLog,
  RiskReport,
  BenchmarkResult,
  ForecastingReport,
  User,
} from "./types";

// Modular Component Imports
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import DistrictMap from "./components/DistrictMap";
import DatasetSelector from "./components/DatasetSelector";
import ChatAssistant from "./components/ChatAssistant";
import IngestionTab from "./components/IngestionTab";
import AnalyticsTab from "./components/AnalyticsTab";
import ForecastingTab from "./components/ForecastingTab";
import RiskTab from "./components/RiskTab";
import RecommendationsTab from "./components/RecommendationsTab";
import AlertsTab from "./components/AlertsTab";
import AuditsTab from "./components/AuditsTab";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("Analyst");

  const [activeTab, setActiveTab] = useState("overview");
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [alerts, setAlerts] = useState<ThresholdAlert[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [showChatDrawer, setShowChatDrawer] = useState(false);

  // Sync state from Backend APIs
  const fetchAllState = async () => {
    try {
      const [resDs, resRec, resAlert, resNotif, resLogs] = await Promise.all([
        fetch("/api/datasets").then((r) => r.json()),
        fetch("/api/recommendations").then((r) => r.json()),
        fetch("/api/alerts").then((r) => r.json()),
        fetch("/api/notifications").then((r) => r.json()),
        fetch("/api/audit-logs").then((r) => r.json()),
      ]);

      setDatasets(resDs || []);
      setRecommendations(resRec || []);
      setAlerts(resAlert || []);
      setNotifications(resNotif || []);
      setAuditLogs(resLogs || []);

      if (resDs && resDs.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(resDs[0].id);
      }
    } catch (e) {
      console.error("Failed to fetch initial operational state:", e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllState();
    }
  }, [user]);

  // Auth Quick Logins
  const handleQuickLogin = async (profileEmail: string, role: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profileEmail, password: "mock", role }),
      });
      const data = await res.json();
      setUser(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    handleQuickLogin(email, selectedRole);
  };

  const handleLogout = () => {
    setUser(null);
    setDatasets([]);
    setRecommendations([]);
    setAlerts([]);
    setNotifications([]);
    setAuditLogs([]);
    setSelectedDatasetId("");
    setActiveTab("overview");
  };

  // Dataset Operations
  const handleUploadDataset = async (datasetPayload: any) => {
    try {
      const res = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datasetPayload),
      });
      const newDataset = await res.json();
      setDatasets((prev) => [...prev, newDataset]);
      setSelectedDatasetId(newDataset.id);
      fetchAllState();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDataset = async (id: string) => {
    try {
      await fetch(`/api/datasets/${id}`, { method: "DELETE" });
      setDatasets((prev) => prev.filter((d) => d.id !== id));
      if (selectedDatasetId === id) {
        setSelectedDatasetId(datasets[0]?.id || "");
      }
      fetchAllState();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCleanDataset = async (id: string) => {
    try {
      const res = await fetch(`/api/datasets/${id}/clean`, { method: "POST" });
      const data = await res.json();
      setDatasets((prev) => prev.map((d) => (d.id === id ? data.dataset : d)));
      fetchAllState();
    } catch (e) {
      console.error(e);
    }
  };

  // Run Benchmark Queries
  const handleRunQuery = async (groupByCol: string, aggregateCol: string, operation: string) => {
    const res = await fetch(`/api/datasets/${selectedDatasetId}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupByCol, aggregateCol, operation }),
    });
    return res.json();
  };

  // Run Forecasting Projections
  const handleRunForecast = async (metricCol: string, labelCol: string, periods: number) => {
    const res = await fetch(`/api/datasets/${selectedDatasetId}/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metricCol, labelCol, periods }),
    });
    return res.json();
  };

  // Fetch Risk Scores
  const handleFetchRiskScores = async () => {
    const res = await fetch("/api/risk-scores");
    return res.json();
  };

  // Update Recommendation Status
  const handleUpdateRecommendationStatus = async (id: string, status: string, assignedTo?: string) => {
    const res = await fetch(`/api/recommendations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, assignedTo }),
    });
    await res.json();
    fetchAllState();
  };

  // Generate Gemini AI Recommendations
  const handleGenerateAiRecommendations = async (datasetId: string) => {
    await fetch(`/api/datasets/${datasetId}/generate-recommendations`, { method: "POST" });
    fetchAllState();
  };

  // Threshold Alerts operations
  const handleAddAlert = async (alertPayload: any) => {
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alertPayload),
    });
    fetchAllState();
  };

  const handleToggleAlertMute = async (id: string, status: "Active" | "Muted") => {
    await fetch(`/api/alerts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchAllState();
  };

  // Clear system notifications
  const handleMarkNotificationsRead = async () => {
    await fetch("/api/notifications/read", { method: "POST" });
    fetchAllState();
  };

  // Send Conversational Assistant message
  const handleSendAiQuery = async (query: string, chatHistory: any[]) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        currentDatasetId: selectedDatasetId,
        chatHistory: chatHistory.map((h) => ({ sender: h.sender, text: h.text })),
      }),
    });
    return res.json();
  };

  const activeDataset = datasets.find((d) => d.id === selectedDatasetId) || null;

  // --- RENDERING LOGIN MODULE ---
  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0c1222] via-[#080d19] to-[#121c2e] px-4 py-12 overflow-hidden font-sans">
        {/* Ambient Blurred Background Elements */}
        <div className="absolute -top-10 -left-10 h-[500px] w-[500px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none animate-float-slow" />
        <div className="absolute -bottom-10 -right-10 h-[500px] w-[500px] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none animate-float-delayed" />
        <div className="absolute top-1/3 left-1/3 h-[400px] w-[400px] rounded-full bg-indigo-600/10 blur-[110px] pointer-events-none animate-pulse duration-[8000ms]" />

        <div className="relative w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 rounded-2xl border border-white/10 bg-white/[0.02] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-2xl overflow-hidden">
          {/* Left panel: Info Panel */}
          <div className="md:col-span-5 bg-gradient-to-br from-slate-950/80 via-slate-950/70 to-slate-900/60 p-8 flex flex-col justify-between border-r border-white/5">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 text-slate-950 font-bold p-1 shadow-lg shadow-cyan-500/20">
                  <Shield className="h-5.5 w-5.5 text-slate-950" />
                </div>
                <span className="text-base font-display font-extrabold tracking-tight text-white">CivicMind AI</span>
              </div>
              <p className="text-[10px] text-emerald-400 font-mono tracking-wider mt-5">DECISION SUPPORT POWERHOUSE</p>
              <h2 className="text-xl font-display font-bold tracking-tight text-white mt-2 leading-tight">
                Transforming Siloed Operational Data Into Actionable Intelligence
              </h2>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Empowering municipal heads, NGOs, and dispatch officers with real-time vector benchmarks, predictive trend forecasting, and Gemini in-context reasoning.
              </p>
            </div>

            <div className="mt-8 border-t border-white/5 pt-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 font-display">Enterprise Capabilities</p>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                  <span>NVIDIA cuDF GPU Data Compilers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                  <span>Explainable Neural forecasting</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                  <span>In-Context RAG Decision Assist</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Login forms */}
          <div className="md:col-span-7 p-8 flex flex-col justify-center bg-slate-950/20">
            <h3 className="text-lg font-display font-bold text-white">Portal Session Authentication</h3>
            <p className="text-xs text-slate-400 mt-1">Select an officer credentials node or key in departmental details</p>

            {/* Quick Logins */}
            <div className="mt-5 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-display">Quick Departmental Sign-In</p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <button
                  onClick={() => handleQuickLogin("safety.analyst@metro.gov", "Analyst")}
                  className="rounded-lg border border-white/5 bg-white/[0.015] p-3 hover:border-cyan-500/40 text-left transition-all cursor-pointer hover:bg-white/[0.04] shadow-sm"
                >
                  <p className="text-xs font-bold text-white">Public Safety</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Analyst Console</p>
                </button>
                <button
                  onClick={() => handleQuickLogin("transit.director@metro.gov", "Decision Maker")}
                  className="rounded-lg border border-white/5 bg-white/[0.015] p-3 hover:border-cyan-500/40 text-left transition-all cursor-pointer hover:bg-white/[0.04] shadow-sm"
                >
                  <p className="text-xs font-bold text-white">Transportation</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Decision Maker</p>
                </button>
                <button
                  onClick={() => handleQuickLogin("sanitation.admin@metro.gov", "Organization Admin")}
                  className="rounded-lg border border-white/5 bg-white/[0.015] p-3 hover:border-cyan-500/40 text-left transition-all cursor-pointer hover:bg-white/[0.04] shadow-sm"
                >
                  <p className="text-xs font-bold text-white">Sanitation / Env</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Dept Administrator</p>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="my-6 flex items-center justify-between text-[10px] uppercase font-bold text-slate-600 font-display">
              <hr className="w-1/3 border-white/5" />
              <span>Or Authenticate Manually</span>
              <hr className="w-1/3 border-white/5" />
            </div>

            {/* Manual Form */}
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 font-display">Department Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" officer.name@metro.gov"
                  className="mt-1 w-full rounded-lg glass-input p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 font-display">Assigned RBAC Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="mt-1 w-full rounded-lg glass-input p-2.5 text-xs text-white focus:outline-none [&>option]:bg-slate-950"
                  >
                    <option value="Viewer">Viewer (Read-only)</option>
                    <option value="Analyst">Analyst (Ingest / Clean)</option>
                    <option value="Decision Maker">Decision Maker (Approve / Assign)</option>
                    <option value="Organization Admin">Organization Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 font-display">Security Key Phrase</label>
                  <div className="relative mt-1">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg glass-input p-2.5 text-xs text-white placeholder-slate-700 focus:outline-none"
                    />
                    <Key className="absolute right-3 top-3.5 h-3.5 w-3.5 text-slate-600" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500/80 to-emerald-500/80 py-3 text-center text-xs font-bold text-slate-950 hover:from-cyan-400 hover:to-emerald-400 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10 border border-white/10"
              >
                <span>Authorize Operational Node</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN LAYOUT RENDER ---
  return (
    <div className="flex h-screen w-screen flex-col bg-gradient-to-br from-[#0c1222] via-[#080d19] to-[#121c2e] overflow-hidden relative font-sans text-slate-100">
      {/* Ambient Glassmorphism Blurred Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full bg-cyan-600/10 blur-[130px] pointer-events-none animate-float-slow z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-emerald-600/5 blur-[130px] pointer-events-none animate-float-delayed z-0" />
      <div className="absolute top-[40%] left-[30%] h-[400px] w-[400px] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none animate-pulse duration-[10000ms] z-0" />

      {/* Navbar */}
      <Navbar
        user={user}
        notifications={notifications}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onLogout={handleLogout}
      />

      {/* Primary Panels */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar Left */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

        {/* Core Workspace Center */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10">
          {/* Active Dataset Focus Header */}
          <DatasetSelector
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            onSelectDataset={setSelectedDatasetId}
            onAddNewClick={() => setActiveTab("ingestion")}
          />

          {/* TAB ROUTING CONTENT */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Geographic District Map */}
              <DistrictMap />

              {/* Ingested dataset outline summary */}
              {activeDataset && (
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-md shadow-lg glass-panel-hover">
                  <div className="flex items-center gap-2">
                    <Database className="h-4.5 w-4.5 text-cyan-400" />
                    <div>
                      <h3 className="text-sm font-semibold text-white font-display">Operational Dataset Ingest Details</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Representing active telemetry compiled from {activeDataset.source}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg bg-slate-950/40 p-3.5 border border-white/5 backdrop-blur-sm">
                      <p className="text-[9px] font-bold text-slate-500 uppercase leading-none font-display">Dataset Label</p>
                      <p className="text-xs font-semibold text-white mt-1.5 truncate">{activeDataset.name}</p>
                    </div>
                    <div className="rounded-lg bg-slate-950/40 p-3.5 border border-white/5 backdrop-blur-sm">
                      <p className="text-[9px] font-bold text-slate-500 uppercase leading-none font-display">Total Ingested Rows</p>
                      <p className="text-xs font-bold text-emerald-400 font-mono mt-1.5">{activeDataset.rows.length} rows</p>
                    </div>
                    <div className="rounded-lg bg-slate-950/40 p-3.5 border border-white/5 backdrop-blur-sm">
                      <p className="text-[9px] font-bold text-slate-500 uppercase leading-none font-display">Data Quality Index</p>
                      <p className="text-xs font-bold text-white font-mono mt-1.5">{activeDataset.qualityScore}%</p>
                    </div>
                    <div className="rounded-lg bg-slate-950/40 p-3.5 border border-white/5 backdrop-blur-sm">
                      <p className="text-[9px] font-bold text-slate-500 uppercase leading-none font-display">Custodian Authority</p>
                      <p className="text-xs font-semibold text-slate-300 mt-1.5 truncate">{activeDataset.owner}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "ingestion" && (
            <IngestionTab
              datasets={datasets}
              selectedDatasetId={selectedDatasetId}
              onSelectDataset={setSelectedDatasetId}
              onUploadDataset={handleUploadDataset}
              onDeleteDataset={handleDeleteDataset}
              onCleanDataset={handleCleanDataset}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsTab activeDataset={activeDataset} onRunQuery={handleRunQuery} />
          )}

          {activeTab === "forecasting" && (
            <ForecastingTab activeDataset={activeDataset} onRunForecast={handleRunForecast} />
          )}

          {activeTab === "risk" && <RiskTab onFetchRiskScores={handleFetchRiskScores} />}

          {activeTab === "recommendations" && (
            <RecommendationsTab
              recommendations={recommendations}
              selectedDatasetId={selectedDatasetId}
              onUpdateStatus={handleUpdateRecommendationStatus}
              onGenerateAiRecommendations={handleGenerateAiRecommendations}
            />
          )}

          {activeTab === "alerts" && (
            <AlertsTab
              alerts={alerts}
              datasets={datasets}
              selectedDatasetId={selectedDatasetId}
              onAddAlert={handleAddAlert}
              onToggleMute={handleToggleAlertMute}
            />
          )}

          {activeTab === "audits" && <AuditsTab logs={auditLogs} />}
        </main>

        {/* Side Panel Conversational Assistant (Toggleable Sidebar Drawer) */}
        <div
          className={`flex-col border-l border-slate-800 bg-slate-950 transition-all duration-200 shrink-0 ${
            showChatDrawer ? "flex w-96 p-4" : "hidden w-0"
          }`}
        >
          <div className="flex-1 overflow-hidden">
            <ChatAssistant activeDataset={activeDataset} onSendQuery={handleSendAiQuery} />
          </div>
        </div>
      </div>

      {/* Floating Chat Drawer Activator */}
      <button
        onClick={() => setShowChatDrawer(!showChatDrawer)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        title="Toggle AI Decision Assist"
      >
        {showChatDrawer ? <ChevronRight className="h-6 w-6 text-slate-950" /> : <Bot className="h-6 w-6 text-slate-950 animate-bounce" />}
      </button>
    </div>
  );
}
