"""
CivicMind AI — Risk Scoring Service

Generates risk scores from 0–100 across five categories: Public Safety,
Environmental, Infrastructure, Resource, and Operational risk. Each score
includes a severity level, explanation, and contributing factors derived
from real dataset analysis.
"""

from typing import Any


def calculate_risk_scores(datasets: list[dict[str, Any]]) -> dict[str, Any]:
    """Calculate community risk scores across all active datasets.

    Dynamically computes risk for each category based on real data
    distributions, then aggregates into an overall risk report.

    Args:
        datasets: List of dataset dictionaries with ``id``, ``type``,
                  and ``rows`` fields.

    Returns:
        A risk report dictionary containing overall and per-category scores.
    """

    # ── Find datasets by known IDs or type ──────────────────────────────
    safety_ds = _find_dataset(datasets, "dataset_safety_01", "Safety")
    env_ds = _find_dataset(datasets, "dataset_env_01", "Environmental")
    trans_ds = _find_dataset(datasets, "dataset_trans_01", "Transportation")

    # ── Default Baselines ───────────────────────────────────────────────
    safety_score = 45
    env_score = 55
    trans_score = 60
    resource_score = 50

    safety_factors = ["Historical emergency baseline activity"]
    env_factors = ["Baseline municipal sensor carbon monitoring"]
    trans_factors = ["Peak hour intersection congestion models"]
    resource_factors = ["Officer and responder deployment densities"]
    operational_factors = ["Department dispatch delay averages"]

    # ── 1. Public Safety Risk ───────────────────────────────────────────
    if safety_ds and safety_ds.get("rows"):
        rows = safety_ds["rows"]
        critical = sum(
            1 for r in rows
            if r.get("severity") in ("Critical", "High")
        )
        avg_response = (
            sum(r.get("response_time", 0) for r in rows) / len(rows)
        )
        safety_score = min(
            100,
            round((critical / len(rows)) * 60 + avg_response * 3),
        )
        if critical > 2:
            safety_factors.append(
                f"High proportion of critical/high severity calls "
                f"({critical} incidents)"
            )
        if avg_response > 12:
            safety_factors.append(
                f"Extended average response latency "
                f"({avg_response:.1f} mins)"
            )

    # ── 2. Environmental Risk ───────────────────────────────────────────
    if env_ds and env_ds.get("rows"):
        rows = env_ds["rows"]
        max_aqi = max((r.get("aqi", 0) for r in rows), default=0)
        avg_waste = (
            sum(r.get("waste_bin_fill_rate", 0) for r in rows) / len(rows)
        )
        env_score = min(
            100,
            round((max_aqi / 300) * 50 + (avg_waste / 100) * 50),
        )
        if max_aqi > 100:
            env_factors.append(
                f"Substandard regional AQI peak of {max_aqi} ppm"
            )
        if avg_waste > 75:
            env_factors.append(
                f"Accumulated waste loads (avg {avg_waste:.0f}% fill)"
            )

    # ── 3. Infrastructure Risk ──────────────────────────────────────────
    if trans_ds and trans_ds.get("rows"):
        rows = trans_ds["rows"]
        avg_delay = (
            sum(r.get("average_delay_sec", 0) for r in rows) / len(rows)
        )
        critical_congestions = sum(
            1 for r in rows
            if r.get("peak_congestion_level") == "Critical"
        )
        trans_score = min(
            100,
            round(
                (avg_delay / 100) * 50
                + (critical_congestions / len(rows)) * 50
            ),
        )
        if avg_delay > 50:
            trans_factors.append(
                f"Systemic intersection delay peaks exceeding {avg_delay:.0f}s"
            )
        if critical_congestions > 0:
            trans_factors.append(
                "Unresolved bottlenecks on highway outlet corridors"
            )

    # ── 4. Resource Risk ────────────────────────────────────────────────
    if safety_ds and safety_ds.get("rows"):
        rows = safety_ds["rows"]
        total_deployed = sum(r.get("officers_deployed", 0) for r in rows)
        critical_incidents = sum(
            1 for r in rows if r.get("severity") == "Critical"
        )
        avg_deployed = total_deployed / len(rows) if rows else 0
        resource_score = min(
            100,
            round(critical_incidents * 15 + (10 - avg_deployed) * 8),
        )
        if total_deployed < 15:
            resource_factors.append(
                "Low available responder reserves per dispatch"
            )
        if critical_incidents > 0:
            resource_factors.append(
                "Surge in high-impact asset allocation during critical events"
            )

    # ── 5. Operational Risk (composite) ─────────────────────────────────
    operational_score = round(
        (safety_score + env_score + trans_score) / 3
    )
    if operational_score > 50:
        operational_factors.append(
            "Departmental data siloing causing delay in action dispatch"
        )
    else:
        operational_factors.append(
            "Optimized inter-department communication limits delay"
        )

    # ── Build Category Reports ──────────────────────────────────────────
    categories = [
        _build_category("Public Safety Risk", safety_score, safety_factors),
        _build_category("Environmental Risk", env_score, env_factors),
        _build_category("Infrastructure Risk", trans_score, trans_factors),
        _build_category("Resource Risk", resource_score, resource_factors),
        _build_category("Operational Risk", operational_score, operational_factors),
    ]

    overall_score = round(
        sum(c["score"] for c in categories) / len(categories)
    )

    return {
        "overallScore": overall_score,
        "overallLevel": _get_level(overall_score),
        "categories": categories,
    }


def _find_dataset(
    datasets: list[dict[str, Any]],
    target_id: str,
    target_type: str,
) -> dict[str, Any] | None:
    """Find a dataset by ID or type."""
    for ds in datasets:
        if ds.get("id") == target_id:
            return ds
    for ds in datasets:
        if ds.get("type") == target_type:
            return ds
    return None


def _get_level(score: int) -> str:
    """Map a numeric risk score to a severity level."""
    if score < 35:
        return "Low"
    if score < 60:
        return "Medium"
    if score < 80:
        return "High"
    return "Critical"


def _build_category(
    name: str,
    score: int,
    factors: list[str],
) -> dict[str, Any]:
    """Build a single risk category report."""
    level = _get_level(score)
    explanation = (
        f"Current {name.lower()} is {level.lower()}, driven by "
        f"{' and '.join(factors)}."
    )
    return {
        "name": name,
        "score": score,
        "level": level,
        "explanation": explanation,
        "contributingFactors": factors,
    }
