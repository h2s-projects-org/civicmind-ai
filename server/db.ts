import fs from "fs";
import path from "path";

export interface Dataset {
  id: string;
  name: string;
  type: string;
  source: string;
  owner: string;
  uploadTime: string;
  rows: any[];
  schema: { name: string; type: "string" | "number" | "boolean" | "date" }[];
  qualityScore: number;
  isCleaned: boolean;
  cleaningStats?: {
    missingValuesCount: number;
    duplicatesRemoved: number;
    outliersDetected: number;
    normalizedDates: number;
    beforeRows: number;
    afterRows: number;
  };
}

export interface Recommendation {
  id: string;
  datasetId: string;
  title: string;
  description: string;
  category: "Operational" | "Environmental" | "Infrastructure" | "Public Safety" | "Resource";
  confidence: number; // 0 to 100
  priority: "High" | "Medium" | "Low";
  impact: string;
  benefit: string;
  status: "Pending" | "Approved" | "In_Progress" | "Completed" | "Dismissed";
  assignedTo?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface ThresholdAlert {
  id: string;
  name: string;
  datasetId: string;
  column: string;
  operator: "gt" | "lt" | "eq";
  value: number;
  status: "Active" | "Muted";
  triggeredCount: number;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: "AI_Recommendation" | "Threshold_Alert" | "System";
  read: boolean;
}

// In-Memory Database with optional persistent backup
class CivicMindDB {
  private filePath = path.join(process.cwd(), "civicmind_db.json");
  public datasets: Dataset[] = [];
  public recommendations: Recommendation[] = [];
  public auditLogs: AuditLog[] = [];
  public alerts: ThresholdAlert[] = [];
  public notifications: NotificationLog[] = [];

  constructor() {
    this.load();
    if (this.datasets.length === 0) {
      this.seedDefaultData();
    }
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
        this.datasets = data.datasets || [];
        this.recommendations = data.recommendations || [];
        this.auditLogs = data.auditLogs || [];
        this.alerts = data.alerts || [];
        this.notifications = data.notifications || [];
        console.log("CivicMind DB loaded successfully from disk.");
      }
    } catch (e) {
      console.error("Failed to load CivicMind DB, using fresh memory state:", e);
    }
  }

  public save() {
    try {
      fs.writeFileSync(
        this.filePath,
        JSON.stringify({
          datasets: this.datasets,
          recommendations: this.recommendations,
          auditLogs: this.auditLogs,
          alerts: this.alerts,
          notifications: this.notifications,
        }, null, 2),
        "utf-8"
      );
    } catch (e) {
      console.error("Failed to save CivicMind DB to disk:", e);
    }
  }

  public logAction(user: string, action: string, details: string) {
    const log: AuditLog = {
      id: "log_" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      user,
      action,
      details,
    };
    this.auditLogs.unshift(log);
    this.save();
  }

  private seedDefaultData() {
    console.log("Seeding initial community operational datasets...");

    // 1. PUBLIC SAFETY & EMERGENCY CALLS
    const safetyRows = [
      { id: 1, district: "District A (Downtown)", type: "Medical Emergency", response_time: 8.5, officers_deployed: 2, severity: "High", time: "2026-07-01T08:30:00Z" },
      { id: 2, district: "District B (Northside)", type: "Traffic Accident", response_time: 14.2, officers_deployed: 3, severity: "Medium", time: "2026-07-01T11:15:00Z" },
      { id: 3, district: "District A (Downtown)", type: "Theft Report", response_time: 25.0, officers_deployed: 1, severity: "Low", time: "2026-07-01T14:45:00Z" },
      { id: 4, district: "District C (East River)", type: "Fire Incident", response_time: 6.1, officers_deployed: 6, severity: "Critical", time: "2026-07-02T02:10:00Z" },
      { id: 5, district: "District B (Northside)", type: "Medical Emergency", response_time: 11.8, officers_deployed: 2, severity: "High", time: "2026-07-02T09:00:00Z" },
      { id: 6, district: "District D (South Hills)", type: "Disturbance", response_time: 18.3, officers_deployed: 1, severity: "Low", time: "2026-07-02T19:30:00Z" },
      { id: 7, district: "District A (Downtown)", type: "Fire Incident", response_time: 5.4, officers_deployed: 8, severity: "Critical", time: "2026-07-03T01:20:00Z" },
      { id: 8, district: "District C (East River)", type: "Traffic Accident", response_time: 12.0, officers_deployed: 2, severity: "Medium", time: "2026-07-03T10:45:00Z" },
      { id: 9, district: "District D (South Hills)", type: "Medical Emergency", response_time: 15.6, officers_deployed: 2, severity: "High", time: "2026-07-03T16:15:00Z" },
      { id: 10, district: "District B (Northside)", type: "Theft Report", response_time: 28.1, officers_deployed: 1, severity: "Low", time: "2026-07-04T05:00:00Z" }
    ];

    const safetyDataset: Dataset = {
      id: "dataset_safety_01",
      name: "Public Safety & Emergency Response Logs",
      type: "Safety",
      source: "Municipal Dispatch (CAD)",
      owner: "Department of Public Safety",
      uploadTime: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      rows: safetyRows,
      schema: [
        { name: "id", type: "number" },
        { name: "district", type: "string" },
        { name: "type", type: "string" },
        { name: "response_time", type: "number" },
        { name: "officers_deployed", type: "number" },
        { name: "severity", type: "string" },
        { name: "time", type: "date" }
      ],
      qualityScore: 92,
      isCleaned: true,
      cleaningStats: {
        missingValuesCount: 2,
        duplicatesRemoved: 0,
        outliersDetected: 1,
        normalizedDates: 10,
        beforeRows: 10,
        afterRows: 10
      }
    };

    // 2. ENVIRONMENTAL & AIR QUALITY
    const envRows = [
      { id: 1, location: "District A (Downtown)", aqi: 82, carbon_ppm: 420, temperature_c: 26.5, humidity_pct: 54, waste_bin_fill_rate: 85 },
      { id: 2, location: "District B (Northside)", aqi: 48, carbon_ppm: 385, temperature_c: 24.2, humidity_pct: 60, waste_bin_fill_rate: 42 },
      { id: 3, location: "District C (East River)", aqi: 112, carbon_ppm: 465, temperature_c: 28.0, humidity_pct: 48, waste_bin_fill_rate: 94 },
      { id: 4, location: "District D (South Hills)", aqi: 35, carbon_ppm: 360, temperature_c: 22.8, humidity_pct: 68, waste_bin_fill_rate: 30 },
      { id: 5, location: "District A (Downtown)", aqi: 88, carbon_ppm: 428, temperature_c: 27.2, humidity_pct: 52, waste_bin_fill_rate: 90 },
      { id: 6, location: "District B (Northside)", aqi: 52, carbon_ppm: 390, temperature_c: 24.8, humidity_pct: 58, waste_bin_fill_rate: 55 },
      { id: 7, location: "District C (East River)", aqi: 125, carbon_ppm: 480, temperature_c: 29.1, humidity_pct: 45, waste_bin_fill_rate: 98 },
      { id: 8, location: "District D (South Hills)", aqi: 38, carbon_ppm: 365, temperature_c: 23.0, humidity_pct: 65, waste_bin_fill_rate: 35 }
    ];

    const envDataset: Dataset = {
      id: "dataset_env_01",
      name: "Smart City Environmental Sensors & Waste Levels",
      type: "Environmental",
      source: "IoT Sensor Mesh",
      owner: "Bureau of Sanitation & Environment",
      uploadTime: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      rows: envRows,
      schema: [
        { name: "id", type: "number" },
        { name: "location", type: "string" },
        { name: "aqi", type: "number" },
        { name: "carbon_ppm", type: "number" },
        { name: "temperature_c", type: "number" },
        { name: "humidity_pct", type: "number" },
        { name: "waste_bin_fill_rate", type: "number" }
      ],
      qualityScore: 96,
      isCleaned: true,
      cleaningStats: {
        missingValuesCount: 0,
        duplicatesRemoved: 0,
        outliersDetected: 0,
        normalizedDates: 0,
        beforeRows: 8,
        afterRows: 8
      }
    };

    // 3. TRANSPORTATION & ROAD TRAFFIC SENSORS
    const transRows = [
      { id: 1, intersection: "Downtown Main St & 5th Ave", vehicle_count: 1420, average_delay_sec: 45.2, public_transit_delay_min: 8, peak_congestion_level: "High" },
      { id: 2, intersection: "Northside Hwy 101 Outlet", vehicle_count: 2200, average_delay_sec: 75.8, public_transit_delay_min: 14, peak_congestion_level: "Critical" },
      { id: 3, intersection: "East River Bridge Crossing", vehicle_count: 1850, average_delay_sec: 55.0, public_transit_delay_min: 5, peak_congestion_level: "High" },
      { id: 4, intersection: "South Hills Residential Pkwy", vehicle_count: 650, average_delay_sec: 12.4, public_transit_delay_min: 2, peak_congestion_level: "Low" },
      { id: 5, intersection: "Downtown Main St & 5th Ave", vehicle_count: 1380, average_delay_sec: 41.5, public_transit_delay_min: 6, peak_congestion_level: "High" },
      { id: 6, intersection: "Northside Hwy 101 Outlet", vehicle_count: 2150, average_delay_sec: 71.2, public_transit_delay_min: 12, peak_congestion_level: "Critical" },
      { id: 7, intersection: "East River Bridge Crossing", vehicle_count: 1900, average_delay_sec: 62.4, public_transit_delay_min: 8, peak_congestion_level: "High" }
    ];

    const transDataset: Dataset = {
      id: "dataset_trans_01",
      name: "Automated Traffic Counter (ATC) Traffic Volumes",
      type: "Transportation",
      source: "SCATS Signal System",
      owner: "Department of Transportation",
      uploadTime: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      rows: transRows,
      schema: [
        { name: "id", type: "number" },
        { name: "intersection", type: "string" },
        { name: "vehicle_count", type: "number" },
        { name: "average_delay_sec", type: "number" },
        { name: "public_transit_delay_min", type: "number" },
        { name: "peak_congestion_level", type: "string" }
      ],
      qualityScore: 89,
      isCleaned: true,
      cleaningStats: {
        missingValuesCount: 3,
        duplicatesRemoved: 1,
        outliersDetected: 2,
        normalizedDates: 0,
        beforeRows: 8,
        afterRows: 7
      }
    };

    this.datasets.push(safetyDataset, envDataset, transDataset);

    // Seed default recommendations
    this.recommendations = [
      {
        id: "rec_01",
        datasetId: "dataset_env_01",
        title: "Deploy Urgent Sanitation Dispatch to District C",
        description: "Sensor data reports waste bin fill rates exceeding 98% in District C (East River), posing a high environmental risk index. Initiate emergency trash pickup route.",
        category: "Environmental",
        confidence: 96,
        priority: "High",
        impact: "Reduces environmental risk score, decreases pests and municipal litter, and resolves community complaints immediately.",
        benefit: "Lowers regional environmental risk by 15%, saving an estimated $12,000 in clean-up cost overhead.",
        status: "Pending"
      },
      {
        id: "rec_02",
        datasetId: "dataset_safety_01",
        title: "Relocate Fire Rescue Vehicle to District A Substation",
        description: "District A (Downtown) reports high response times (avg 8.5 min) and highest density of high-severity emergency fire logs. Temporary tactical relocation is recommended.",
        category: "Public Safety",
        confidence: 92,
        priority: "High",
        impact: "Accelerates response times by up to 35% in District A, ensuring critical emergency standard coverage.",
        benefit: "Prevents critical escalation of small commercial incidents, preserving civic assets.",
        status: "In_Progress",
        assignedTo: "Chief Commander"
      },
      {
        id: "rec_03",
        datasetId: "dataset_trans_01",
        title: "Signal Timing Optimization on Northside Hwy 101",
        description: "Average delay times during peak hour counter analysis show critical signal bottlenecks at Northside Hwy 101 Outlet, exceeding 75 seconds per vehicle.",
        category: "Infrastructure",
        confidence: 85,
        priority: "Medium",
        impact: "Improves vehicle transit throughput, reduces gridlock queue spillbacks, and reduces micro-emissions from idling.",
        benefit: "Saves estimated 2,400 daily vehicle hours and reduces fuel waste congestion.",
        status: "Approved"
      }
    ];

    // Seed default alerts
    this.alerts = [
      {
        id: "alert_01",
        name: "District C Solid Waste Overflow Alert",
        datasetId: "dataset_env_01",
        column: "waste_bin_fill_rate",
        operator: "gt",
        value: 90,
        status: "Active",
        triggeredCount: 4
      },
      {
        id: "alert_02",
        name: "Critical Traffic Bottleneck Delay Alert",
        datasetId: "dataset_trans_01",
        column: "average_delay_sec",
        operator: "gt",
        value: 70,
        status: "Active",
        triggeredCount: 2
      }
    ];

    // Seed some notifications
    this.notifications = [
      {
        id: "notif_01",
        timestamp: new Date().toISOString(),
        title: "New AI Recommendation Generated",
        message: "CivicMind AI generated 2 high-priority recommendations for District C waste and District A emergency fire substation.",
        type: "AI_Recommendation",
        read: false
      },
      {
        id: "notif_02",
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        title: "Solid Waste Level Exceeded Threshold",
        message: "Waste bin fill rate in District C reached 98%, triggering the 'District C Solid Waste Overflow Alert'.",
        type: "Threshold_Alert",
        read: false
      }
    ];

    // Log the seed action
    this.logAction("System", "Database Initialization", "Successfully seeded default community operational datasets.");
    this.save();
  }
}

export const db = new CivicMindDB();
