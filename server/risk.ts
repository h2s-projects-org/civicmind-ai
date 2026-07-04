export interface RiskCategory {
  name: string;
  score: number; // 0 to 100
  level: "Low" | "Medium" | "High" | "Critical";
  explanation: string;
  contributingFactors: string[];
}

export interface RiskReport {
  overallScore: number;
  overallLevel: "Low" | "Medium" | "High" | "Critical";
  categories: RiskCategory[];
}

export function calculateRiskScores(datasets: any[]): RiskReport {
  // Pull existing datasets to look at active levels
  const safetyDataset = datasets.find((d) => d.id === "dataset_safety_01");
  const envDataset = datasets.find((d) => d.id === "dataset_env_01");
  const transDataset = datasets.find((d) => d.id === "dataset_trans_01");

  // Default baselines
  let safetyScore = 45;
  let envScore = 55;
  let transScore = 60;
  let resourceScore = 50;
  let operationalScore = 42;

  const safetyFactors: string[] = ["Historical emergency baseline activity"];
  const envFactors: string[] = ["Baseline municipal sensor carbon monitoring"];
  const transFactors: string[] = ["Peak hour intersection congestion models"];
  const resourceFactors: string[] = ["Officer and responder deployment densities"];
  const operationalFactors: string[] = ["Department dispatch delay averages"];

  // 1. Calculate Public Safety Risk dynamically if safety data is available
  if (safetyDataset && safetyDataset.rows.length > 0) {
    const rows = safetyDataset.rows;
    const criticalIncidents = rows.filter((r: any) => r.severity === "Critical" || r.severity === "High").length;
    const avgResponseTime = rows.reduce((acc: number, r: any) => acc + (r.response_time || 0), 0) / rows.length;

    safetyScore = Math.min(100, Math.round((criticalIncidents / rows.length) * 60 + avgResponseTime * 3));
    if (criticalIncidents > 2) safetyFactors.push(`High proportion of critical/high severity calls (${criticalIncidents} incidents)`);
    if (avgResponseTime > 12) safetyFactors.push(`Extended average first-responder response latency (${avgResponseTime.toFixed(1)} mins)`);
  }

  // 2. Calculate Environmental Risk dynamically
  if (envDataset && envDataset.rows.length > 0) {
    const rows = envDataset.rows;
    const maxAqi = Math.max(...rows.map((r: any) => r.aqi || 0));
    const avgWasteFill = rows.reduce((acc: number, r: any) => acc + (r.waste_bin_fill_rate || 0), 0) / rows.length;

    envScore = Math.min(100, Math.round((maxAqi / 300) * 50 + (avgWasteFill / 100) * 50));
    if (maxAqi > 100) envFactors.push(`Substandard regional Air Quality Index peak of ${maxAqi} ppm`);
    if (avgWasteFill > 75) envFactors.push(`Accumulated street-level solid waste loads (avg ${avgWasteFill.toFixed(0)}% fill rate)`);
  }

  // 3. Calculate Infrastructure Risk dynamically
  if (transDataset && transDataset.rows.length > 0) {
    const rows = transDataset.rows;
    const avgDelay = rows.reduce((acc: number, r: any) => acc + (r.average_delay_sec || 0), 0) / rows.length;
    const criticalCongestions = rows.filter((r: any) => r.peak_congestion_level === "Critical").length;

    transScore = Math.min(100, Math.round((avgDelay / 100) * 50 + (criticalCongestions / rows.length) * 50));
    if (avgDelay > 50) transFactors.push(`Systemic intersection delay peaks exceeding ${avgDelay.toFixed(0)}s`);
    if (criticalCongestions > 0) transFactors.push(`Unresolved bottlenecks on Northside highway outlet corridors`);
  }

  // 4. Calculate Resource Risk (deployment availability vs. load)
  if (safetyDataset && safetyDataset.rows.length > 0) {
    const totalDeployed = safetyDataset.rows.reduce((acc: number, r: any) => acc + (r.officers_deployed || 0), 0);
    const criticalIncidents = safetyDataset.rows.filter((r: any) => r.severity === "Critical").length;

    resourceScore = Math.min(100, Math.round((criticalIncidents * 15) + (10 - totalDeployed / safetyDataset.rows.length) * 8));
    if (totalDeployed < 15) resourceFactors.push(`Low available responder reserves deployed per dispatch`);
    if (criticalIncidents > 0) resourceFactors.push("Surge in high-impact asset allocation during critical fires");
  }

  // 5. Operational Risk (overall platform efficiency score)
  operationalScore = Math.round((safetyScore + envScore + transScore) / 3);
  if (operationalScore > 50) {
    operationalFactors.push("Departmental data siloing causing delay in action dispatch");
  } else {
    operationalFactors.push("Optimized inter-department communication limits delay");
  }

  const getLevel = (score: number): "Low" | "Medium" | "High" | "Critical" => {
    if (score < 35) return "Low";
    if (score < 60) return "Medium";
    if (score < 80) return "High";
    return "Critical";
  };

  const categories: RiskCategory[] = [
    {
      name: "Public Safety Risk",
      score: safetyScore,
      level: getLevel(safetyScore),
      explanation: `Calculated from response-time latency averages and active high-severity call dispatch registers. Current risk is ${getLevel(safetyScore).toLowerCase()} due to ${safetyFactors.join(" and ")}.`,
      contributingFactors: safetyFactors,
    },
    {
      name: "Environmental Risk",
      score: envScore,
      level: getLevel(envScore),
      explanation: `Calculated from regional IoT air quality monitoring (AQI) and municipal solid waste levels. Current risk is driven by ${envFactors.join(" and ")}.`,
      contributingFactors: envFactors,
    },
    {
      name: "Infrastructure Risk",
      score: transScore,
      level: getLevel(transScore),
      explanation: `Determined by peak vehicle counter volumes and automatic congestion delay times. Key contributors include ${transFactors.join(" and ")}.`,
      contributingFactors: transFactors,
    },
    {
      name: "Resource Risk",
      score: resourceScore,
      level: getLevel(resourceScore),
      explanation: `Measures personnel and responder asset availability constraints vs critical load. Influenced by ${resourceFactors.join(" and ")}.`,
      contributingFactors: resourceFactors,
    },
    {
      name: "Operational Risk",
      score: operationalScore,
      level: getLevel(operationalScore),
      explanation: `Aggregates cross-department bottlenecks and workflow assignment delays. Driven by ${operationalFactors.join(" and ")}.`,
      contributingFactors: operationalFactors,
    },
  ];

  const overallScore = Math.round(categories.reduce((acc, cat) => acc + cat.score, 0) / categories.length);

  return {
    overallScore,
    overallLevel: getLevel(overallScore),
    categories,
  };
}
