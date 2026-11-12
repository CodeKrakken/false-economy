import { Economy, EconomyRules } from "./shared.types.js";

type OverthrowRiskState = Pick<
  Economy,
  "approval" | "unrest" | "unemployment" | "wellbeing" | "inflation" | "growthRate" | "rules"
>;

export function hasOverthrowRisk(economy: OverthrowRiskState): boolean {
  const sustainedLowSupport =
    economy.approval < economy.rules.overthrowApproval &&
    economy.unrest >= economy.rules.overthrowUnrest;
  const criticalSignals =
    Number(economy.approval < 40) +
    Number(economy.unemployment >= 20) +
    Number(economy.wellbeing <= 25) +
    Number(economy.inflation >= 15) +
    Number(economy.growthRate <= -5);
  return sustainedLowSupport || (economy.unrest >= 95 && criticalSignals > 0);
}

const DEFAULT_RULES: EconomyRules = {
  overthrowApproval: 25,
  overthrowUnrest: 80,
  overthrowGraceTurns: 2,
  insolvencyLimit: -1000,
  insolvencyGraceTurns: 2,
  collapseGdp: 500,
  collapseGraceTurns: 3,
};

export function createInitialEconomy(rules: Partial<EconomyRules> = {}): Economy {
  return {
    turn: 1,
    started: false,
    gdp: 1000,
    growthRate: 2,
    inflation: 2,
    unemployment: 5,
    treasury: 500,
    taxRate: 25,
    publicSpending: 200,
    interestRate: 3,
    minimumWage: 12,
    averageWage: 15,
    tariffRate: 5,
    energySubsidy: 0,
    approval: 60,
    debt: 0,
    population: 1_000_000,
    wellbeing: 60,
    unrest: 20,
    productiveCapacity: 1600,
    resourceReserves: 100,
    groups: { workers: 60, businesses: 60, publicSector: 60 },
    pendingEffects: [],
    pendingEvent: null,
    overthrowRiskTurns: 0,
    insolvencyTurns: 0,
    collapseTurns: 0,
    headline: "A new government inherits steady foundations",
    history: [],
    indicatorHistory: [],
    achievements: [],
    outcome: null,
    gameStart: { gdp: 1000, inflation: 2, treasury: 500, population: 1_000_000 },
    rules: { ...DEFAULT_RULES, ...rules },
  };
}
