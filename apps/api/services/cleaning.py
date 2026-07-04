"""
CivicMind AI — Data Cleaning Service

Implements automated data quality operations: duplicate removal, missing value
detection and imputation, outlier detection and soft-capping, date normalization,
and column profiling with statistical summaries.
"""

import math
from typing import Any


class CleaningReport:
    """Container for cleaning pipeline statistics."""

    def __init__(self):
        self.before_rows: int = 0
        self.after_rows: int = 0
        self.missing_values_count: int = 0
        self.duplicates_removed: int = 0
        self.outliers_detected: int = 0
        self.normalized_dates: int = 0
        self.cleaned_rows: list[dict[str, Any]] = []

    def to_dict(self) -> dict:
        return {
            "before_rows": self.before_rows,
            "after_rows": self.after_rows,
            "missing_values_count": self.missing_values_count,
            "duplicates_removed": self.duplicates_removed,
            "outliers_detected": self.outliers_detected,
            "normalized_dates": self.normalized_dates,
        }


def clean_dataset(
    rows: list[dict[str, Any]],
    schema: list[dict[str, str]],
) -> CleaningReport:
    """Run the full cleaning pipeline on a list of row dictionaries.

    Steps:
    1. Deduplicate rows (by non-id fields)
    2. Detect and impute missing values
    3. Normalize date fields to ISO 8601
    4. Detect and soft-cap numeric outliers

    Args:
        rows: The raw data rows to clean.
        schema: Column metadata list with ``name`` and ``type`` keys.

    Returns:
        A ``CleaningReport`` containing statistics and cleaned rows.
    """
    report = CleaningReport()
    report.before_rows = len(rows)

    # ── Step 1: Deduplicate ─────────────────────────────────────────────
    unique_rows: list[dict[str, Any]] = []
    seen: set[str] = set()

    for row in rows:
        # Build a fingerprint excluding the 'id' field
        key_parts = {k: v for k, v in row.items() if k != "id"}
        fingerprint = str(sorted(key_parts.items()))
        if fingerprint in seen:
            report.duplicates_removed += 1
        else:
            seen.add(fingerprint)
            unique_rows.append(dict(row))

    # ── Step 2–4: Per-row cleaning ──────────────────────────────────────
    cleaned: list[dict[str, Any]] = []
    for row in unique_rows:
        new_row = dict(row)
        for field in schema:
            col_name = field["name"]
            col_type = field["type"]
            val = new_row.get(col_name)

            # Missing value detection
            is_missing = (
                val is None
                or val == ""
                or (isinstance(val, float) and math.isnan(val))
            )

            if is_missing:
                report.missing_values_count += 1
                # Impute with sensible defaults
                if col_type == "number":
                    new_row[col_name] = 0
                elif col_type == "string":
                    new_row[col_name] = "Unknown"
                elif col_type == "boolean":
                    new_row[col_name] = False
                elif col_type == "date":
                    from datetime import datetime, timezone

                    new_row[col_name] = datetime.now(timezone.utc).isoformat()
            else:
                # Date normalization
                if col_type == "date":
                    try:
                        from datetime import datetime

                        parsed = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
                        iso_str = parsed.isoformat()
                        if str(val) != iso_str:
                            new_row[col_name] = iso_str
                            report.normalized_dates += 1
                    except (ValueError, TypeError):
                        from datetime import datetime, timezone

                        new_row[col_name] = datetime.now(timezone.utc).isoformat()
                        report.normalized_dates += 1

                # Outlier detection (domain-aware thresholds)
                if col_type == "number" and isinstance(val, (int, float)):
                    capped = _detect_and_cap_outlier(col_name, val)
                    if capped is not None:
                        report.outliers_detected += 1
                        new_row[col_name] = capped

        cleaned.append(new_row)

    report.after_rows = len(cleaned)
    report.cleaned_rows = cleaned
    return report


def _detect_and_cap_outlier(col_name: str, value: float) -> float | None:
    """Apply domain-specific outlier capping rules.

    Returns the capped value if an outlier was detected, or None otherwise.
    """
    rules = [
        # Emergency response time > 2 hours → cap to 45 mins
        ("time", lambda v: v > 120, 45),
        # AQI outside 0–500 → cap to 150
        ("aqi", lambda v: v < 0 or v > 500, 150),
        # Percentage rates > 150 → cap to 100
        ("rate", lambda v: v < 0 or v > 150, 100),
        # Transit delay > 600s → cap to 120s
        ("delay", lambda v: v > 600, 120),
    ]

    for keyword, check_fn, cap_value in rules:
        if keyword in col_name.lower() and check_fn(value):
            return cap_value

    return None


def profile_columns(
    rows: list[dict[str, Any]],
    schema: list[dict[str, str]],
) -> list[dict[str, Any]]:
    """Generate a statistical profile for each column in the dataset.

    Args:
        rows: The dataset rows.
        schema: Column metadata.

    Returns:
        A list of column profile dictionaries containing fill rates,
        min/max/avg for numerics, and unique counts for strings.
    """
    profiles: list[dict[str, Any]] = []

    for field in schema:
        col_name = field["name"]
        col_type = field["type"]
        values = [
            r[col_name]
            for r in rows
            if r.get(col_name) is not None and r[col_name] != ""
        ]
        total = len(rows)
        filled = len(values)
        fill_rate = round((filled / total) * 100, 1) if total > 0 else 0.0

        stats: dict[str, Any] = {}

        if col_type == "number":
            nums = [v for v in values if isinstance(v, (int, float))]
            if nums:
                stats["min"] = min(nums)
                stats["max"] = max(nums)
                stats["avg"] = round(sum(nums) / len(nums), 2)

        elif col_type == "string":
            str_vals = [str(v) for v in values]
            freq: dict[str, int] = {}
            for sv in str_vals:
                freq[sv] = freq.get(sv, 0) + 1
            top_values = sorted(freq.items(), key=lambda x: -x[1])[:5]
            stats["unique_count"] = len(freq)
            stats["top_values"] = [
                {"value": v, "count": c} for v, c in top_values
            ]

        profiles.append({
            "column_name": col_name,
            "type": col_type,
            "fill_rate": fill_rate,
            "stats": stats,
        })

    return profiles
