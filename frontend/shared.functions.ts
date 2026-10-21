import type { AdviserAdvice, Economy } from "./shared.types.js";
import type { IndicatorFormat } from "./shared.types.js";

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

function hasOverthrowRisk(economy: Economy): boolean {
  const sustainedLowSupport =
    economy.approval < economy.rules.overthrowApproval &&
    economy.unrest >= economy.rules.overthrowUnrest;
  const criticalSignals =
    Number(economy.approval < 40) +
    Number(economy.unemployment >= 20) +
    Number(economy.wellbeing <= 25) +
    Number(economy.inflation >= 15) +
    Number(economy.growthRate <= -5);
  const severeCrisis = economy.unrest >= 95 && criticalSignals > 0;
  return sustainedLowSupport || severeCrisis;
}

export function getEconomicWarnings(economy: Economy): string[] {
  const warnings: string[] = [];
  if (economy.inflation > 5) warnings.push("Inflation is above the 5% resilience ceiling.");
  if (economy.unemployment > 8) warnings.push("Unemployment is above 8%.");
  if (economy.treasury < 0) warnings.push("Treasury is below zero.");
  if (economy.gdp <= economy.rules.collapseGdp * 1.2) warnings.push("GDP is close to collapse.");
  if (economy.population < economy.gameStart.population * 0.9) warnings.push("Population is declining.");
  if (hasOverthrowRisk(economy)) {
    warnings.push("Severe unrest and economic crisis put the government at risk of overthrow.");
  } else if (economy.approval < 40 && economy.unrest >= 55) {
    warnings.push("Low approval and high unrest threaten the government.");
  }
  return warnings;
}

export function getAdviserAdvice(economy: Economy): AdviserAdvice {
  let treasury: string;
  if (economy.treasury < 0 || economy.debt > 1000) {
    treasury = "Treasury adviser: debt and deficit risk call for a credible fiscal plan.";
  } else if (economy.inflation > 5) {
    treasury = "Treasury adviser: inflation is eroding purchasing power and needs restraint.";
  } else {
    treasury = "Treasury adviser: the budget is balanced and debt remains contained.";
  }

  let political: string;
  if (hasOverthrowRisk(economy)) {
    political = "Political adviser: severe unrest and economic crisis put the government at risk of overthrow.";
  } else if (economy.approval < 40 && economy.unrest >= 55) {
    political = "Political adviser: public anger is approaching overthrow risk.";
  } else if (economy.groups.businesses < 40) {
    political = "Political adviser: squeezed business margins may be holding back investment and hiring.";
  } else if (economy.groups.workers < 40) {
    political = "Political adviser: wages, job prospects, or prices are squeezing household demand.";
  } else if (economy.groups.publicSector < 40) {
    political = "Political adviser: strained public services can erode living standards.";
  } else {
    political = "Political adviser: public support is broad, but policy trade-offs remain.";
  }
  return { treasury, political };
}
