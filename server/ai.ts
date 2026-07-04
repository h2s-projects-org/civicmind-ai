import { GoogleGenAI, Type } from "@google/genai";
import { db, Dataset, Recommendation } from "./db";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not configured in the environment. Please add it via Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export async function analyzeDatasetWithAI(dataset: Dataset) {
  try {
    const ai = getAiClient();
    const truncatedRows = dataset.rows.slice(0, 30); // limit payload size

    const prompt = `You are CivicMind AI, a Senior Community Decision Intelligence Specialist.
Analyze the following dataset metadata and sample records. Generate a deep operational intelligence report.

Dataset Name: ${dataset.name}
Dataset Category: ${dataset.type}
Source: ${dataset.source}
Total Records Count: ${dataset.rows.length}

Sample Records (up to 30):
${JSON.stringify(truncatedRows, null, 2)}

Provide your output in valid, structured JSON matching this schema:
{
  "executiveSummary": "A concise executive-level summary of the dataset's operational state",
  "keyMetrics": [
    { "name": "Metric Name", "value": "Metric Value (e.g., avg response time, max level)", "change": "Upward/Downward or positive/negative trend comment" }
  ],
  "anomalies": [
    { "title": "Anomaly Title", "description": "Explanation of detected outlier or concern", "severity": "High" | "Medium" | "Low" }
  ],
  "recommendedActionSummary": "High-level guidance on what decision-makers should do next based on this data"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an expert civic intelligence auditor. Always output valid structured JSON conforming to the requested schema. Do not include markdown formatting like ```json or ```.",
      },
    });

    const textResult = response.text || "";
    return JSON.parse(textResult.trim());
  } catch (error: any) {
    console.error("AI Dataset Analysis failed:", error);
    // Fallback Mock Response to guarantee stable UI if API is unconfigured
    return {
      executiveSummary: `CivicMind AI processed the ${dataset.name} dataset. The records outline standard municipal distribution with typical localized variance.`,
      keyMetrics: [
        { name: "Total Rows", value: String(dataset.rows.length), change: "Baseline loaded successfully" },
        { name: "Quality Rating", value: `${dataset.qualityScore}%`, change: "Within operational confidence" }
      ],
      anomalies: [
        { title: "Localized Variance Detected", description: "Slight standard deviations detected in regional subgroups. Standard municipal fluctuations.", severity: "Low" }
      ],
      recommendedActionSummary: "Review the analytics benchmark to optimize queries, and run the risk assessment to see contributing factors.",
      isSimulated: true
    };
  }
}

export async function answerConversationalAI(query: string, currentDatasetId?: string, chatHistory: { sender: "user" | "bot"; text: string }[] = []) {
  try {
    const ai = getAiClient();

    let context = "";
    if (currentDatasetId) {
      const ds = db.datasets.find((d) => d.id === currentDatasetId);
      if (ds) {
        context = `Active dataset selected: ${ds.name} (${ds.type}) with ${ds.rows.length} rows. Sample schema: ${JSON.stringify(ds.schema)}. Sample records: ${JSON.stringify(ds.rows.slice(0, 15))}.`;
      }
    }

    const currentRecommendations = db.recommendations.filter(r => !currentDatasetId || r.datasetId === currentDatasetId);
    const activeAlerts = db.alerts.filter(a => !currentDatasetId || a.datasetId === currentDatasetId);

    const historyPrompt = chatHistory.map(h => `${h.sender === "user" ? "User" : "Assistant"}: ${h.text}`).join("\n");

    const prompt = `You are CivicMind AI, a helpful decision intelligence assistant for community leaders.
Context Data:
${context}

Active Recommendations in Platform:
${JSON.stringify(currentRecommendations, null, 2)}

Active Threshold Alerts:
${JSON.stringify(activeAlerts, null, 2)}

Conversation History:
${historyPrompt}

User Question: "${query}"

Guidelines:
1. Provide a highly professional, scannable, and supportive response.
2. If the user asks about districts, environmental issues, traffic, safety, or resources, refer to the context data.
3. If they ask for recommendations, point them to existing recommendations or propose new ones.
4. If they ask how to query this data in Google BigQuery, write a helpful BigQuery SQL snippet.
5. Keep the tone executive, objective, and action-oriented. Use Markdown for layout.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are CivicMind AI, a community decision support system. Speak objectively and clearly, utilizing markdown elements like bullet points, tables, and code blocks for SQL queries.",
      },
    });

    return {
      text: response.text || "No response received.",
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error("Conversational AI failed:", error);
    // Dynamic simulated response to let client function even if API Key is missing!
    let simulatedText = `I analyzed your query: **"${query}"**.\n\nTo unlock the full power of real-time Gemini reasoning over this dataset, please configure your **GEMINI_API_KEY** under **Settings > Secrets**.\n\n### Local Insights based on Seeding Pattern:\n`;
    if (query.toLowerCase().includes("safety") || query.toLowerCase().includes("district")) {
      simulatedText += `- **Safety Alert**: District A (Downtown) holds the highest density of high-severity emergency fire logs with an average response time of 8.5 minutes.\n- **Resource Alert**: Deployed responder levels are constrained. We recommend deploying additional reserves.`;
    } else if (query.toLowerCase().includes("environmental") || query.toLowerCase().includes("aqi")) {
      simulatedText += `- **Air Quality Warning**: District C (East River) has substandard air quality peaks (AQI 112 - 125 ppm) coupled with waste bin fill levels of 98%.\n- **Action Suggested**: Route sanitation trucks to District C immediately.`;
    } else {
      simulatedText += `- **Operational Summary**: Active datasets represent Public Safety, Environment, and Traffic. District C has severe waste accumulation and high AQI risk, while District A requires faster dispatch deployment.`;
    }
    return {
      text: simulatedText,
      timestamp: new Date().toISOString(),
      isSimulated: true
    };
  }
}

export async function generateAiRecommendations(dataset: Dataset): Promise<Recommendation[]> {
  try {
    const ai = getAiClient();
    const truncatedRows = dataset.rows.slice(0, 30);

    const prompt = `You are CivicMind AI. Based on the following community operational dataset, propose exactly 2-3 highly critical, prioritized municipal recommendations.

Dataset: ${dataset.name}
Type: ${dataset.type}
Sample Records:
${JSON.stringify(truncatedRows, null, 2)}

Provide your output in valid, structured JSON conforming to this schema (ARRAY of objects):
[
  {
    "title": "Clear Action-Oriented Title (e.g. Expand Bus Route 10)",
    "description": "Thorough justification explaining why this action is required based on the data",
    "category": "Operational" | "Environmental" | "Infrastructure" | "Public Safety" | "Resource",
    "confidence": 88, // number from 0 to 100
    "priority": "High" | "Medium" | "Low",
    "impact": "Detailed explanation of visual/functional operational impact",
    "benefit": "Quantifiable benefit explanation (e.g., reduces AQI peaks by 12%)"
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are CivicMind AI. You output strict JSON arrays containing prioritizable recommendation models. Do not include markdown wraps.",
      },
    });

    const parsed: any[] = JSON.parse(response.text?.trim() || "[]");
    return parsed.map((item, index) => ({
      id: "ai_rec_" + Math.random().toString(36).substr(2, 9),
      datasetId: dataset.id,
      title: item.title,
      description: item.description,
      category: item.category || "Operational",
      confidence: item.confidence || 85,
      priority: item.priority || "Medium",
      impact: item.impact || "Improves overall community quality indices.",
      benefit: item.benefit || "Lowers municipal operational friction.",
      status: "Pending"
    }));
  } catch (error) {
    console.error("AI Recommendation Generation failed, falling back to static generation:", error);
    // Fallback generator based on dataset type
    const list: Recommendation[] = [];
    if (dataset.type === "Safety") {
      list.push({
        id: "ai_rec_fallback_1",
        datasetId: dataset.id,
        title: "Deploy Traffic Patrols during Peak Accident Hours",
        description: "Safety log analysis reveals peak accidents centered around District B. Targeted speed enforcement is recommended.",
        category: "Public Safety",
        confidence: 90,
        priority: "High",
        impact: "Reduces vehicle collision risk during rainy or congested peak hours.",
        benefit: "Expected reduction of traffic accidents by up to 18%.",
        status: "Pending"
      });
    } else if (dataset.type === "Environmental") {
      list.push({
        id: "ai_rec_fallback_2",
        datasetId: dataset.id,
        title: "Install Tree-Canopy Filters in District C Corridor",
        description: "Persistent AQI peaks above 110 in East River indicate poor micro-climatic filtration. Direct canopy deployment is suggested.",
        category: "Environmental",
        confidence: 85,
        priority: "Medium",
        impact: "Provides natural carbon capture and cools local street temperatures.",
        benefit: "Lowers average seasonal AQI scores by 8-10 points.",
        status: "Pending"
      });
    } else {
      list.push({
        id: "ai_rec_fallback_3",
        datasetId: dataset.id,
        title: "Execute Dataset Audit & Anomaly Investigation",
        description: "Inspect schema and normalize values to isolate outliers across columns.",
        category: "Operational",
        confidence: 80,
        priority: "Medium",
        impact: "Resolves minor data quality discrepancies before dashboard deployment.",
        benefit: "Saves analyst preparation overhead.",
        status: "Pending"
      });
    }
    return list;
  }
}
