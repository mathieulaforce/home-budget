---
name: household-benchmarks
description: Average household spending data sources and comparison methodology for Belgian/European households. Use when building the benchmark comparison feature, sourcing reference data, or displaying user-vs-average spending.
---

# Household Benchmarks

## Purpose

Let users compare their spending against the average household in their region. This answers: "Am I spending more or less than typical on groceries, housing, transport, etc.?"

## Data Sources

### Primary: Statbel (Statistics Belgium)

- **Household Budget Survey (HBS)**: Published annually by Statbel
- URL: `https://statbel.fgov.be/en/themes/households/household-budget`
- Provides: average monthly/yearly spending per category for Belgian households
- Breakdowns available by: region (Flanders, Wallonia, Brussels), household size, income quintile

### Secondary: Eurostat

- **HBS data** across EU member states
- URL: `https://ec.europa.eu/eurostat/web/household-budget-surveys`
- Useful for cross-country comparisons

### Data Update Frequency

HBS data is published ~1-2 years behind. Store the latest available dataset and note the reference year.

## Benchmark Data Structure

Store benchmark data in a DB table or static JSON file:

```typescript
interface HouseholdBenchmark {
  id: number;
  referenceYear: number;         // e.g. 2024
  region: string;                // "belgium", "flanders", "wallonia", "brussels"
  categoryGroup: string;         // maps to Category.groupName
  averageMonthly: number;        // cents per month
  medianMonthly: number | null;  // if available
  source: string;                // "statbel-hbs-2024"
}
```

For the default benchmark dataset, see [benchmark-data.md](benchmark-data.md).

## Mapping App Categories to Benchmark Categories

The app's category groups must map to the benchmark data categories:

| App Group | Benchmark Category (Statbel HBS) |
|-----------|----------------------------------|
| Housing | Housing, water, electricity, gas |
| Food | Food and non-alcoholic beverages |
| Transport | Transport |
| Health | Health |
| Entertainment | Recreation and culture |
| Shopping | Clothing and footwear; Furnishings |
| Financial | Insurance, financial services |

Store mapping in `src/lib/benchmarks/categoryMapping.ts`.

## Comparison Methodology

### Per-Category Comparison

For each category group, compute:

```typescript
interface BenchmarkComparison {
  categoryGroup: string;
  userMonthly: number;          // user's average monthly spend (cents)
  benchmarkMonthly: number;     // regional average (cents)
  difference: number;           // user - benchmark
  differencePercent: number;    // (difference / benchmark) * 100
  rating: "below" | "average" | "above";
}
```

Rating thresholds:
- **Below average**: user spends < 80% of benchmark
- **Average**: user spends 80%-120% of benchmark
- **Above average**: user spends > 120% of benchmark

### Computing User's Monthly Average

To make a fair comparison:
- Use at least 3 months of data to smooth out anomalies
- Exclude transfer transactions
- Calculate: `SUM(expenses in period) / number_of_months`

### Adjustments

Allow the user to optionally set:
- **Household size**: scale benchmarks (single vs couple vs family)
- **Region**: select their specific region for more accurate comparison

Scaling factors (approximate, from Statbel data):
- Single person: 0.6x average household
- Couple without children: 0.85x
- Couple with 1 child: 1.0x (reference)
- Couple with 2 children: 1.15x
- Single parent with children: 0.75x

## Display Guidelines

- Show as horizontal bar chart: user bar vs benchmark bar per category
- Color code: green (below average), yellow (average), red (above average)
- Always show the reference year and source
- Add disclaimer: "Based on [source] data for [year]. Actual averages vary by income, location, and household composition."
