import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db, Dataset, Recommendation, ThresholdAlert } from "./server/db";
import { cleanDataset, profileColumns } from "./server/cleaning";
import { benchmarkQuery } from "./server/analytics";
import { generateForecast } from "./server/forecasting";
import { calculateRiskScores } from "./server/risk";
import { analyzeDatasetWithAI, answerConversationalAI, generateAiRecommendations } from "./server/ai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // --- API ROUTES ---

  // 1. Authentication API
  app.post("/api/auth/login", (req, res) => {
    const { email, password, role } = req.body;
    // Simple, helpful role-based mock logins for departments
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const name = email.split("@")[0];
    const user = {
      email,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      role: role || "Analyst", //Viewer, Decision Maker, Analyst, Organization Admin, Super Admin
      department: email.includes("safety")
        ? "Department of Public Safety"
        : email.includes("env")
        ? "Bureau of Sanitation & Environment"
        : email.includes("trans")
        ? "Department of Transportation"
        : "Community Administration",
      organization: {
        name: "Metro Civic Commission",
        type: "Municipality",
        region: "State Central Region"
      }
    };

    db.logAction(user.name, "User Login", `Logged in successfully as ${user.role} inside ${user.department}.`);
    res.json(user);
  });

  // 2. Dataset Management APIs
  app.get("/api/datasets", (req, res) => {
    res.json(db.datasets);
  });

  app.post("/api/datasets", (req, res) => {
    const { name, type, source, owner, rows, schema } = req.body;
    if (!name || !rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "Missing required fields or rows array is empty" });
    }

    const id = "dataset_" + Math.random().toString(36).substr(2, 9);
    
    // Auto infer schema if not supplied
    const finalSchema = schema || Object.keys(rows[0]).map((key) => {
      const sampleVal = rows[0][key];
      let colType: "string" | "number" | "boolean" | "date" = "string";
      if (typeof sampleVal === "number") colType = "number";
      else if (typeof sampleVal === "boolean") colType = "boolean";
      else if (sampleVal && !isNaN(Date.parse(sampleVal)) && String(sampleVal).length > 8) colType = "date";
      return { name: key, type: colType };
    });

    // Auto-calculate data quality score (base metrics)
    let nullCount = 0;
    for (const row of rows) {
      for (const field of finalSchema) {
        if (row[field.name] === undefined || row[field.name] === null || row[field.name] === "") {
          nullCount++;
        }
      }
    }
    const totalCells = rows.length * finalSchema.length;
    const nullRate = totalCells > 0 ? nullCount / totalCells : 0;
    const qualityScore = Math.max(40, Math.round((1 - nullRate) * 100));

    const newDataset: Dataset = {
      id,
      name,
      type: type || "Custom",
      source: source || "User Upload",
      owner: owner || "Civic Analyst",
      uploadTime: new Date().toISOString(),
      rows,
      schema: finalSchema,
      qualityScore,
      isCleaned: false,
    };

    db.datasets.push(newDataset);
    db.logAction(newDataset.owner, "Dataset Ingested", `Uploaded dataset '${newDataset.name}' with ${rows.length} rows.`);
    db.save();

    res.status(201).json(newDataset);
  });

  app.delete("/api/datasets/:id", (req, res) => {
    const { id } = req.params;
    const idx = db.datasets.findIndex((d) => d.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    const removed = db.datasets.splice(idx, 1);
    db.logAction("Analyst", "Dataset Deleted", `Removed dataset '${removed[0].name}'.`);
    
    // Clear associated recommendations
    db.recommendations = db.recommendations.filter((r) => r.datasetId !== id);
    db.save();

    res.json({ message: "Dataset and associated alerts successfully deleted" });
  });

  // 3. Data Cleaning Engine API
  app.post("/api/datasets/:id/clean", (req, res) => {
    const { id } = req.params;
    const ds = db.datasets.find((d) => d.id === id);
    if (!ds) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    const report = cleanDataset(ds.rows, ds.schema);
    
    // Update dataset inline
    ds.rows = report.cleanedRows;
    ds.isCleaned = true;
    ds.qualityScore = 100; // cleaning standard elevates score to 100%
    ds.cleaningStats = {
      missingValuesCount: report.missingValuesCount,
      duplicatesRemoved: report.duplicatesRemoved,
      outliersDetected: report.outliersDetected,
      normalizedDates: report.normalizedDates,
      beforeRows: report.beforeRows,
      afterRows: report.afterRows,
    };

    db.logAction("System Cleaning Engine", "Dataset Standardized", `Cleaned dataset '${ds.name}' - duplicate reduction and outlier capping executed.`);
    db.save();

    res.json({
      dataset: ds,
      report: ds.cleaningStats,
    });
  });

  // 4. Accelerated Analytics Querying Benchmark
  app.post("/api/datasets/:id/query", (req, res) => {
    const { id } = req.params;
    const { groupByCol, aggregateCol, operation } = req.body;
    const ds = db.datasets.find((d) => d.id === id);
    if (!ds) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    if (!groupByCol || !aggregateCol) {
      return res.status(400).json({ error: "groupByCol and aggregateCol parameters are required" });
    }

    const benchmark = benchmarkQuery(ds.rows, groupByCol, aggregateCol, operation || "avg");
    res.json(benchmark);
  });

  // 5. Predictive Forecasting API
  app.post("/api/datasets/:id/forecast", (req, res) => {
    const { id } = req.params;
    const { metricCol, labelCol, periods } = req.body;
    const ds = db.datasets.find((d) => d.id === id);
    if (!ds) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    if (!metricCol || !labelCol) {
      return res.status(400).json({ error: "metricCol and labelCol parameters are required" });
    }

    // Prepare chronological historical data
    const historicalData = ds.rows.map((row) => ({
      label: String(row[labelCol] || "N/A"),
      value: Number(row[metricCol]) || 0,
    }));

    const report = generateForecast(historicalData, metricCol, periods || 6);
    res.json(report);
  });

  // 6. Gemini AI Deep Dataset In-context Analysis API
  app.post("/api/datasets/:id/analyze", async (req, res) => {
    const { id } = req.params;
    const ds = db.datasets.find((d) => d.id === id);
    if (!ds) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    const aiReport = await analyzeDatasetWithAI(ds);
    res.json(aiReport);
  });

  // 7. Gemini AI Dynamic Recommendation Generator API
  app.post("/api/datasets/:id/generate-recommendations", async (req, res) => {
    const { id } = req.params;
    const ds = db.datasets.find((d) => d.id === id);
    if (!ds) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    const newRecs = await generateAiRecommendations(ds);
    db.recommendations.push(...newRecs);

    // Create trigger notification for user UI
    db.notifications.unshift({
      id: "notif_" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      title: "New AI Recommendations Available",
      message: `CivicMind AI analyzed dataset '${ds.name}' and added ${newRecs.length} actionable intelligence workflows.`,
      type: "AI_Recommendation",
      read: false
    });

    db.logAction("Gemini Core Engine", "Recommendations Computed", `Generated ${newRecs.length} community proposals for dataset '${ds.name}'.`);
    db.save();

    res.json(newRecs);
  });

  // 8. Global and Dataset Risk Scores API
  app.get("/api/risk-scores", (req, res) => {
    const report = calculateRiskScores(db.datasets);
    res.json(report);
  });

  // 9. Workflow / Recommendations State Managers API
  app.get("/api/recommendations", (req, res) => {
    res.json(db.recommendations);
  });

  app.put("/api/recommendations/:id", (req, res) => {
    const { id } = req.params;
    const { status, assignedTo } = req.body;
    const rec = db.recommendations.find((r) => r.id === id);
    if (!rec) {
      return res.status(404).json({ error: "Recommendation not found" });
    }

    if (status) rec.status = status;
    if (assignedTo !== undefined) rec.assignedTo = assignedTo;

    db.logAction("Decision Maker", "Workflow Updated", `Updated recommendation status '${rec.title}' to ${rec.status}.`);
    db.save();

    res.json(rec);
  });

  // 10. conversational AI / RAG API
  app.post("/api/chat", async (req, res) => {
    const { query, currentDatasetId, chatHistory } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const aiAnswer = await answerConversationalAI(query, currentDatasetId, chatHistory || []);
    res.json(aiAnswer);
  });

  // 11. Alerts APIs
  app.get("/api/alerts", (req, res) => {
    res.json(db.alerts);
  });

  app.post("/api/alerts", (req, res) => {
    const { name, datasetId, column, operator, value } = req.body;
    if (!name || !datasetId || !column || !operator || value === undefined) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const newAlert: ThresholdAlert = {
      id: "alert_" + Math.random().toString(36).substr(2, 9),
      name,
      datasetId,
      column,
      operator,
      value: Number(value),
      status: "Active",
      triggeredCount: 0
    };

    db.alerts.push(newAlert);
    db.logAction("Analyst", "Alert Configured", `Set threshold trigger '${newAlert.name}' on column '${column}'.`);
    db.save();

    res.status(201).json(newAlert);
  });

  app.put("/api/alerts/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const alert = db.alerts.find(a => a.id === id);
    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }

    if (status) alert.status = status;
    db.save();
    res.json(alert);
  });

  // 12. System Notifications API
  app.get("/api/notifications", (req, res) => {
    res.json(db.notifications);
  });

  app.post("/api/notifications/read", (req, res) => {
    db.notifications.forEach((n) => (n.read = true));
    db.save();
    res.json({ message: "All notifications marked as read" });
  });

  // 13. System Audit Logs
  app.get("/api/audit-logs", (req, res) => {
    res.json(db.auditLogs);
  });

  // --- VITE DEV / PRODUCTION STATIC MIDDLWARE ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CivicMind AI full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Critical server failure:", error);
});
