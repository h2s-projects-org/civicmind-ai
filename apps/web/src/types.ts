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
  confidence: number;
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

export interface RiskCategory {
  name: string;
  score: number;
  level: "Low" | "Medium" | "High" | "Critical";
  explanation: string;
  contributingFactors: string[];
}

export interface RiskReport {
  overallScore: number;
  overallLevel: "Low" | "Medium" | "High" | "Critical";
  categories: RiskCategory[];
}

export interface BenchmarkResult {
  processingTimeMs: number;
  memoryUsageKb: number;
  rowsProcessed: number;
  gpuAccelerated: boolean;
  accelerationFactor: number;
  gpuSavingsTimeMs: number;
  results: { group: string; value: number }[];
}

export interface ForecastPoint {
  period: string;
  historicalValue?: number;
  forecastValue?: number;
  upperBound?: number;
  lowerBound?: number;
}

export interface ForecastingReport {
  metricName: string;
  explanation: string;
  growthRatePct: number;
  seasonalityType: string;
  peakPeriod: string;
  anomalyDetected: boolean;
  forecast: ForecastPoint[];
}

export interface User {
  email: string;
  name: string;
  role: string;
  department: string;
  organization: {
    name: string;
    type: string;
    region: string;
  };
}
