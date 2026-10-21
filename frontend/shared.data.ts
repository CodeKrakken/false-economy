import type { Indicator } from "./shared.types.js";

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
