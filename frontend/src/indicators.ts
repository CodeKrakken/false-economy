import type { IndicatorSnapshot } from "../../backend/src/economy.js";

export type IndicatorKey = Exclude<keyof IndicatorSnapshot, "turn">;
export type IndicatorFormat = "money" | "percent" | "wage" | "population";
export type Indicator = {
  key: IndicatorKey;
  name: string;
  unit: string;
  format: IndicatorFormat;
  color: string;
};

export const INDICATORS: Indicator[] = [
  { key: "gdp", name: "Gross domestic product", unit: "GDP", format: "money", color: "#b30d08" },
  { key: "inflation", name: "Inflation", unit: "ANNUAL RATE", format: "percent", color: "#a05a20" },
  { key: "unemployment", name: "Unemployment", unit: "WORKFORCE", format: "percent", color: "#406d70" },
  { key: "averageWage", name: "Average wage", unit: "HOURLY PAY", format: "wage", color: "#4d6d50" },
  { key: "treasury", name: "Treasury", unit: "PUBLIC BALANCE", format: "money", color: "#466482" },
  { key: "debt", name: "Public debt", unit: "OUTSTANDING", format: "money", color: "#7b5151" },
  { key: "approval", name: "Public approval", unit: "NATIONAL POLL", format: "percent", color: "#b30d08" },
  { key: "population", name: "Population", unit: "CITIZENS", format: "population", color: "#657a43" },
  { key: "wellbeing", name: "Wellbeing", unit: "CITIZEN INDEX", format: "percent", color: "#537d73" },
  { key: "productiveCapacity", name: "Productive capacity", unit: "OUTPUT CEILING", format: "money", color: "#ad6d31" },
  { key: "resourceReserves", name: "Resource reserves", unit: "RESOURCE INDEX", format: "percent", color: "#557e92" },
  { key: "unrest", name: "Social unrest", unit: "PUBLIC TENSION", format: "percent", color: "#9f3a31" },
];

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatWage(value: number): string {
  return `${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)}/hr`;
}

export function formatPopulation(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function formatIndicator(value: number, format: IndicatorFormat): string {
  if (!Number.isFinite(value)) return "N/A";
  if (format === "money") return formatMoney(value);
  if (format === "percent") return formatPercent(value);
  if (format === "wage") return formatWage(value);
  return formatPopulation(value);
}
