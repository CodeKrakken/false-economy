export type EventChoice = "subsidise" | "passThrough";

export type InterestGroups = {
  workers: number;
  businesses: number;
  publicSector: number;
};

export type HistoryEntry = {
  turn: number;
  type: "policy" | "event" | "milestone";
  text: string;
  eventType?: EventType;
};

export type EventType =
  | "energyShock"
  | "recession"
  | "publicStrike"
  | "taxWindfall"
  | "tradeDisruption"
  | "borrowingShock";

export type IndicatorSnapshot = {
  turn: number;
  gdp: number;
  inflation: number;
  unemployment: number;
  averageWage: number;
  treasury: number;
  debt: number;
  approval: number;
  population: number;
  wellbeing: number;
  productiveCapacity: number;
  resourceReserves: number;
  unrest: number;
};

export type AchievementId =
  | "balancedBudget"
  | "priceStability"
  | "weatheredRecession"
  | "resilientInvestment";

export type EconomyRules = {
  overthrowApproval: number;
  overthrowUnrest: number;
  overthrowGraceTurns: number;
  insolvencyLimit: number;
  insolvencyGraceTurns: number;
  collapseGdp: number;
  collapseGraceTurns: number;
};

export type GameStart = {
  gdp: number;
  inflation: number;
  treasury: number;
  population: number;
};

export type FinalReport = {
  reason: string;
  gdpChange: number;
  inflationChange: number;
  treasuryChange: number;
  populationChange: number;
  approval: number;
  unrest: number;
  history: HistoryEntry[];
};

export type GameOutcome = {
  kind: "defeat";
  reason: string;
  endedTurn: number;
  report: FinalReport;
};

export type Economy = {
  turn: number;
  started: boolean;
  gdp: number;
  growthRate: number;
  inflation: number;
  unemployment: number;
  treasury: number;
  taxRate: number;
  publicSpending: number;
  interestRate: number;
  minimumWage: number;
  averageWage: number;
  tariffRate: number;
  energySubsidy: number;
  approval: number;
  debt: number;
  population: number;
  wellbeing: number;
  unrest: number;
  productiveCapacity: number;
  resourceReserves: number;
  groups: InterestGroups;
  pendingEffects: Array<{ kind: "capacity"; dueTurn: number; amount: number }>;
  pendingEvent: {
    type: EventType;
    title: string;
    description: string;
    requiresDecision: boolean;
  } | null;
  overthrowRiskTurns: number;
  insolvencyTurns: number;
  collapseTurns: number;
  headline: string;
  history: HistoryEntry[];
  indicatorHistory: IndicatorSnapshot[];
  achievements: AchievementId[];
  outcome: GameOutcome | null;
  gameStart: GameStart;
  rules: EconomyRules;
};

export type Policies = Pick<
  Economy,
  "taxRate" | "publicSpending" | "interestRate" | "minimumWage" | "tariffRate" | "energySubsidy"
>;
export type PolicyInputs = { [Key in keyof Policies]: string };
export type ActiveRequest = "advance" | "start" | "reset" | "event" | null;

export type IndicatorKey = Exclude<keyof IndicatorSnapshot, "turn">;
export type IndicatorFormat = "money" | "percent" | "wage" | "population";
export type Indicator = {
  key: IndicatorKey;
  name: string;
  unit: string;
  format: IndicatorFormat;
  color: string;
};

export type AdviserAdvice = {
  treasury: string;
  political: string;
};
