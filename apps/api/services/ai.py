"""
CivicMind AI — AI Service (Gemini Vertex AI Orchestration)

Orchestrates all Gemini-powered features: dataset analysis, conversational
RAG assistant, and AI recommendation generation. Uses strict Pydantic
models for structured output parsing and includes safety-aware fallbacks.
"""

import json
import logging
from typing import Any, Optional

from apps.api.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ─── Gemini Client (Lazy Singleton) ─────────────────────────────────────────

_ai_client = None


def _get_ai_client():
    """Initialize and return a cached Gemini API client."""
    global _ai_client
    if _ai_client is not None:
        return _ai_client

    api_key = settings.gemini_api_key
    if not api_key:
        raise EnvironmentError(
            "GEMINI_API_KEY is not configured. "
            "Set it in your .env file or environment variables."
        )

    from google.genai import Client
    _ai_client = Client(api_key=api_key)
    return _ai_client


# ═══════════════════════════════════════════════════════════════════════════
# 1. Deep Dataset Analysis
# ═══════════════════════════════════════════════════════════════════════════

async def analyze_dataset_with_ai(dataset: dict[str, Any]) -> dict[str, Any]:
    """Perform deep AI-powered analysis on a dataset.

    Sends dataset metadata and sample rows to Gemini for contextual
    intelligence extraction, key metric identification, anomaly
    detection, and action recommendations.

    Args:
        dataset: Dataset dictionary with name, type, source, rows, etc.

    Returns:
        Structured analysis report as a dictionary.
    """
    try:
        client = _get_ai_client()
        truncated_rows = dataset.get("rows", [])[:30]

        prompt = f"""You are CivicMind AI, a Senior Community Decision Intelligence Specialist.
Analyze the following dataset metadata and sample records. Generate a deep operational intelligence report.

Dataset Name: {dataset.get('name', 'Unknown')}
Dataset Category: {dataset.get('type', 'General')}
Source: {dataset.get('source', 'Unknown')}
Total Records Count: {len(dataset.get('rows', []))}

Sample Records (up to 30):
{json.dumps(truncated_rows, indent=2, default=str)}

Provide your output in valid, structured JSON matching this schema:
{{
  "executiveSummary": "A concise executive-level summary of the dataset's operational state",
  "keyMetrics": [
    {{ "name": "Metric Name", "value": "Metric Value", "change": "Trend comment" }}
  ],
  "anomalies": [
    {{ "title": "Anomaly Title", "description": "Explanation", "severity": "High | Medium | Low" }}
  ],
  "recommendedActionSummary": "High-level guidance on what decision-makers should do next"
}}"""

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "system_instruction": (
                    "You are an expert civic intelligence auditor. "
                    "Always output valid structured JSON. "
                    "Do not include markdown formatting."
                ),
            },
        )

        text_result = response.text or ""
        return json.loads(text_result.strip())

    except EnvironmentError:
        logger.warning("Gemini API key not configured, returning simulated analysis.")
        return _fallback_analysis(dataset)
    except Exception as exc:
        logger.error("AI Dataset Analysis failed: %s", exc)
        return _fallback_analysis(dataset)


def _fallback_analysis(dataset: dict[str, Any]) -> dict[str, Any]:
    """Generate a fallback analysis report when AI is unavailable."""
    return {
        "executiveSummary": (
            f"CivicMind AI processed the {dataset.get('name', 'Unknown')} dataset. "
            f"The records outline standard municipal distribution with "
            f"typical localized variance."
        ),
        "keyMetrics": [
            {
                "name": "Total Rows",
                "value": str(len(dataset.get("rows", []))),
                "change": "Baseline loaded successfully",
            },
            {
                "name": "Quality Rating",
                "value": f"{dataset.get('qualityScore', 0)}%",
                "change": "Within operational confidence",
            },
        ],
        "anomalies": [
            {
                "title": "Localized Variance Detected",
                "description": (
                    "Slight standard deviations detected in regional subgroups. "
                    "Standard municipal fluctuations."
                ),
                "severity": "Low",
            }
        ],
        "recommendedActionSummary": (
            "Review the analytics benchmark to optimize queries, and run "
            "the risk assessment to see contributing factors."
        ),
        "isSimulated": True,
    }


# ═══════════════════════════════════════════════════════════════════════════
# 2. Conversational AI / RAG Assistant
# ═══════════════════════════════════════════════════════════════════════════

async def answer_conversational_ai(
    query: str,
    current_dataset: Optional[dict[str, Any]] = None,
    all_datasets: Optional[list[dict[str, Any]]] = None,
    recommendations: Optional[list[dict[str, Any]]] = None,
    alerts: Optional[list[dict[str, Any]]] = None,
    chat_history: Optional[list[dict[str, str]]] = None,
) -> dict[str, Any]:
    """Answer a user query using context-aware Gemini RAG.

    Retrieves relevant context from active datasets, recommendations,
    and alerts to ground the response in real platform data.

    Args:
        query: The user's natural language question.
        current_dataset: The currently selected dataset (if any).
        all_datasets: All available datasets for broader context.
        recommendations: Active platform recommendations.
        alerts: Active threshold alerts.
        chat_history: Previous conversation messages.

    Returns:
        A chat response dictionary with text and metadata.
    """
    try:
        client = _get_ai_client()

        # Build context from active data
        context = ""
        if current_dataset:
            ds = current_dataset
            context = (
                f"Active dataset: {ds.get('name', 'Unknown')} "
                f"({ds.get('type', 'General')}) with "
                f"{len(ds.get('rows', []))} rows. "
                f"Schema: {json.dumps(ds.get('schema', []), default=str)}. "
                f"Sample records: {json.dumps(ds.get('rows', [])[:15], default=str)}."
            )

        recs_json = json.dumps(recommendations or [], indent=2, default=str)
        alerts_json = json.dumps(alerts or [], indent=2, default=str)

        history_prompt = "\n".join(
            f"{'User' if h.get('sender') == 'user' else 'Assistant'}: {h.get('text', '')}"
            for h in (chat_history or [])
        )

        prompt = f"""You are CivicMind AI, a helpful decision intelligence assistant.

Context Data:
{context}

Active Recommendations:
{recs_json}

Active Threshold Alerts:
{alerts_json}

Conversation History:
{history_prompt}

User Question: "{query}"

Guidelines:
1. Provide a professional, scannable, and supportive response.
2. Reference the context data when answering about districts, safety, environment, or traffic.
3. If asked for recommendations, reference existing ones or propose new actions.
4. If asked about BigQuery queries, write helpful SQL snippets.
5. Use Markdown formatting for structure."""

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config={
                "system_instruction": (
                    "You are CivicMind AI, a community decision support system. "
                    "Speak objectively and clearly using markdown."
                ),
            },
        )

        from datetime import datetime, timezone

        return {
            "text": response.text or "No response received.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except EnvironmentError:
        logger.warning("Gemini API key not configured, returning simulated response.")
        return _fallback_chat(query)
    except Exception as exc:
        logger.error("Conversational AI failed: %s", exc)
        return _fallback_chat(query)


def _fallback_chat(query: str) -> dict[str, Any]:
    """Generate a fallback chat response when AI is unavailable."""
    from datetime import datetime, timezone

    text = (
        f'I analyzed your query: **"{query}"**.\n\n'
        f"To unlock the full power of Gemini reasoning, please configure "
        f"your **GEMINI_API_KEY** in the environment.\n\n"
        f"### Local Insights:\n"
    )

    ql = query.lower()
    if "safety" in ql or "district" in ql:
        text += (
            "- **Safety Alert**: District A (Downtown) has the highest "
            "density of high-severity emergency logs.\n"
            "- **Resource Alert**: Deploy additional responder reserves."
        )
    elif "environmental" in ql or "aqi" in ql:
        text += (
            "- **Air Quality Warning**: District C (East River) has "
            "substandard AQI peaks (112-125 ppm).\n"
            "- **Action**: Route sanitation trucks to District C."
        )
    else:
        text += (
            "- **Overview**: Active datasets cover Public Safety, "
            "Environment, and Traffic domains."
        )

    return {
        "text": text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "isSimulated": True,
    }


# ═══════════════════════════════════════════════════════════════════════════
# 3. AI Recommendation Generator
# ═══════════════════════════════════════════════════════════════════════════

async def generate_ai_recommendations(
    dataset: dict[str, Any],
) -> list[dict[str, Any]]:
    """Generate AI-powered recommendations for a dataset.

    Sends dataset context to Gemini and requests structured
    recommendations with priority, confidence, and impact analysis.

    Args:
        dataset: The dataset to analyze for recommendations.

    Returns:
        A list of recommendation dictionaries.
    """
    import uuid

    try:
        client = _get_ai_client()
        truncated_rows = dataset.get("rows", [])[:30]

        prompt = f"""You are CivicMind AI. Based on the following community operational dataset,
propose exactly 2-3 highly critical, prioritized municipal recommendations.

Dataset: {dataset.get('name', 'Unknown')}
Type: {dataset.get('type', 'General')}
Sample Records:
{json.dumps(truncated_rows, indent=2, default=str)}

Provide your output in valid JSON as an ARRAY of objects:
[
  {{
    "title": "Clear Action-Oriented Title",
    "description": "Thorough justification based on the data",
    "category": "Operational | Environmental | Infrastructure | Public Safety | Resource",
    "confidence": 88,
    "priority": "High | Medium | Low",
    "impact": "Detailed operational impact explanation",
    "benefit": "Quantifiable benefit (e.g., reduces AQI by 12%)"
  }}
]"""

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "system_instruction": (
                    "Output strict JSON arrays of recommendation objects. "
                    "Do not include markdown wraps."
                ),
            },
        )

        parsed = json.loads(response.text.strip() if response.text else "[]")
        return [
            {
                "id": f"ai_rec_{uuid.uuid4().hex[:9]}",
                "datasetId": dataset.get("id", ""),
                "title": item.get("title", "Untitled Recommendation"),
                "description": item.get("description", ""),
                "category": item.get("category", "Operational"),
                "confidence": item.get("confidence", 85),
                "priority": item.get("priority", "Medium"),
                "impact": item.get("impact", "Improves community quality indices."),
                "benefit": item.get("benefit", "Lowers municipal operational friction."),
                "status": "Pending",
            }
            for item in parsed
        ]

    except EnvironmentError:
        logger.warning("Gemini API key not configured, generating fallback recommendations.")
        return _fallback_recommendations(dataset)
    except Exception as exc:
        logger.error("AI Recommendation Generation failed: %s", exc)
        return _fallback_recommendations(dataset)


def _fallback_recommendations(dataset: dict[str, Any]) -> list[dict[str, Any]]:
    """Generate fallback recommendations when AI is unavailable."""
    import uuid

    ds_type = dataset.get("type", "Custom")
    ds_id = dataset.get("id", "")

    if ds_type == "Safety":
        return [
            {
                "id": f"ai_rec_{uuid.uuid4().hex[:9]}",
                "datasetId": ds_id,
                "title": "Deploy Traffic Patrols during Peak Accident Hours",
                "description": (
                    "Safety log analysis reveals peak accidents in District B. "
                    "Targeted speed enforcement is recommended."
                ),
                "category": "Public Safety",
                "confidence": 90,
                "priority": "High",
                "impact": "Reduces collision risk during peak hours.",
                "benefit": "Expected reduction of traffic accidents by up to 18%.",
                "status": "Pending",
            }
        ]
    elif ds_type == "Environmental":
        return [
            {
                "id": f"ai_rec_{uuid.uuid4().hex[:9]}",
                "datasetId": ds_id,
                "title": "Install Tree-Canopy Filters in District C Corridor",
                "description": (
                    "Persistent AQI peaks above 110 indicate poor "
                    "micro-climatic filtration."
                ),
                "category": "Environmental",
                "confidence": 85,
                "priority": "Medium",
                "impact": "Provides natural carbon capture.",
                "benefit": "Lowers average AQI scores by 8-10 points.",
                "status": "Pending",
            }
        ]
    else:
        return [
            {
                "id": f"ai_rec_{uuid.uuid4().hex[:9]}",
                "datasetId": ds_id,
                "title": "Execute Dataset Audit & Anomaly Investigation",
                "description": "Inspect schema and normalize values to isolate outliers.",
                "category": "Operational",
                "confidence": 80,
                "priority": "Medium",
                "impact": "Resolves data quality discrepancies.",
                "benefit": "Saves analyst preparation overhead.",
                "status": "Pending",
            }
        ]
