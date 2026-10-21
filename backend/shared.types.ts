export type EventChoice = "subsidise" | "passThrough";

export type PolicyInput = Pick<Settings, "taxRate" | "publicSpending" | "interestRate"> &
  Partial<Pick<Settings, "minimumWage" | "tariffRate" | "energySubsidy">>;

export type Settings = {
  taxRate: number;
  publicSpending: number;
  interestRate: number;
  minimumWage: number;
  tariffRate: number;
  energySubsidy: number;
};

export type InterestGroups = {
  workers: number;
  businesses: number;
  publicSector: number;
};

export type ScheduledEffect = {
  kind: "capacity";
  dueTurn: number;
  amount: number;
};

export type EventType =
  | "energyShock"
  | "recession"
  | "publicStrike"
  | "taxWindfall"
  | "tradeDisruption"
  | "borrowingShock";

export type GameEvent = {
  type: EventType;
  title: string;
  description: string;
  requiresDecision: boolean;
};

export type HistoryEntry = {
  turn: number;
  type: "policy" | "event" | "milestone";
  text: string;
  eventType?: EventType;
};

export type IndicatorSnapshot = Pick<
  Economy,
  | "turn"
  | "gdp"
  | "inflation"
  | "unemployment"
  | "averageWage"
  | "treasury"
  | "debt"
  | "approval"
  | "population"
  | "wellbeing"
  | "productiveCapacity"
  | "resourceReserves"
  | "unrest"
>;

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
  pendingEffects: ScheduledEffect[];
  pendingEvent: GameEvent | null;
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
