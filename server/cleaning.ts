export interface CleaningReport {
  beforeRows: number;
  afterRows: number;
  missingValuesCount: number;
  duplicatesRemoved: number;
  outliersDetected: number;
  normalizedDates: number;
  cleanedRows: any[];
}

export function cleanDataset(rows: any[], schema: any[]): CleaningReport {
  const beforeRows = rows.length;
  let missingValuesCount = 0;
  let duplicatesRemoved = 0;
  let outliersDetected = 0;
  let normalizedDates = 0;

  // 1. Remove duplicate rows based on string representation of everything except 'id'
  const uniqueRows: any[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const { id, ...rest } = row;
    const str = JSON.stringify(rest);
    if (seen.has(str)) {
      duplicatesRemoved++;
    } else {
      seen.add(str);
      uniqueRows.push({ ...row });
    }
  }

  // 2. Perform cleaning, missing value detection, outlier detection and date normalization on unique rows
  const cleanedRows = uniqueRows.map((row, index) => {
    const newRow = { ...row };

    for (const field of schema) {
      const val = newRow[field.name];

      // Missing value check
      if (val === undefined || val === null || val === "" || (typeof val === "number" && isNaN(val))) {
        missingValuesCount++;
        // Apply smart defaults based on type
        if (field.type === "number") {
          newRow[field.name] = 0; // standard numeric default
        } else if (field.type === "string") {
          newRow[field.name] = "Unknown";
        } else if (field.type === "boolean") {
          newRow[field.name] = false;
        } else if (field.type === "date") {
          newRow[field.name] = new Date().toISOString();
        }
      } else {
        // Date Normalization
        if (field.type === "date") {
          try {
            const parsedDate = new Date(val);
            if (!isNaN(parsedDate.getTime())) {
              const originalStr = String(val);
              const isoStr = parsedDate.toISOString();
              if (originalStr !== isoStr) {
                newRow[field.name] = isoStr;
                normalizedDates++;
              }
            } else {
              newRow[field.name] = new Date().toISOString();
              normalizedDates++;
            }
          } catch {
            newRow[field.name] = new Date().toISOString();
            normalizedDates++;
          }
        }

        // Outlier detection (simple statistical boundary for known numeric parameters)
        if (field.type === "number" && typeof val === "number") {
          // Detect unreasonable numbers based on municipal operations context
          if (
            (field.name.includes("time") && val > 120) || // emergency response taking > 2 hours
            (field.name.includes("aqi") && (val < 0 || val > 500)) || // invalid air quality index
            (field.name.includes("rate") && (val < 0 || val > 150)) || // percentage-like rate out of bounds
            (field.name.includes("delay") && val > 600) // transit delays > 10 mins
          ) {
            outliersDetected++;
            // Soft-bound outlier cap instead of deleting row
            if (field.name.includes("time") && val > 120) newRow[field.name] = 45; // cap to 45 mins
            if (field.name.includes("aqi") && val > 500) newRow[field.name] = 150;
            if (field.name.includes("rate") && val > 150) newRow[field.name] = 100;
          }
        }
      }
    }
    return newRow;
  });

  return {
    beforeRows,
    afterRows: cleanedRows.length,
    missingValuesCount,
    duplicatesRemoved,
    outliersDetected,
    normalizedDates,
    cleanedRows,
  };
}

export function profileColumns(rows: any[], schema: any[]) {
  return schema.map((field) => {
    const values = rows.map((r) => r[field.name]).filter((v) => v !== undefined && v !== null && v !== "");
    const totalCount = rows.length;
    const filledCount = values.length;
    const fillRate = totalCount > 0 ? (filledCount / totalCount) * 100 : 0;

    let stats: any = {};
    if (field.type === "number") {
      const nums = values.filter((v) => typeof v === "number") as number[];
      if (nums.length > 0) {
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        const sum = nums.reduce((a, b) => a + b, 0);
        const avg = sum / nums.length;
        stats = { min, max, avg: parseFloat(avg.toFixed(2)) };
      }
    } else if (field.type === "string") {
      const stringVals = values.map(String);
      const frequencies: { [key: string]: number } = {};
      stringVals.forEach((v) => {
        frequencies[v] = (frequencies[v] || 0) + 1;
      });
      const topValues = Object.entries(frequencies)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([value, count]) => ({ value, count }));
      stats = { uniqueCount: Object.keys(frequencies).length, topValues };
    }

    return {
      columnName: field.name,
      type: field.type,
      fillRate: parseFloat(fillRate.toFixed(1)),
      stats,
    };
  });
}
