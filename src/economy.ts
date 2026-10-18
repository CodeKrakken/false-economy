export type Policies = {
  taxRate: number;
  publicSpending: number;
  interestRate: number;
  minimumWage: number;
  tariffRate: number;
  energySubsidy: number;
};

export type PolicyInput = Pick<Policies, "taxRate" | "publicSpending" | "interestRate"> &
  Partial<Pick<Policies, "minimumWage" | "tariffRate" | "energySubsidy">>;

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

export type EventChoice = "subsidize" | "passThrough";

export type HistoryEntry = {
  turn: number;
  type: "policy" | "event" | "milestone";
  text: string;
  eventType?: EventType;
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

export type AdviserAdvice = {
  treasury: string;
  political: string;
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
  achievements: AchievementId[];
  outcome: GameOutcome | null;
  gameStart: GameStart;
  rules: EconomyRules;
};

const DEFAULT_RULES: EconomyRules = {
  overthrowApproval: 25,
  overthrowUnrest: 80,
  overthrowGraceTurns: 2,
  insolvencyLimit: -1000,
  insolvencyGraceTurns: 2,
  collapseGdp: 500,
  collapseGraceTurns: 3,
};

const POLICY_LIMITS: Record<keyof Policies, [number, number]> = {
  taxRate: [0, 60],
  publicSpending: [0, 500],
  interestRate: [0, 20],
  minimumWage: [0, 30],
  tariffRate: [0, 40],
  energySubsidy: [0, 300],
};

const EVENT_INTERVAL = 3;
const EVENT_CHANCE = 0.4;
const CRITICAL_UNREST = 95;
const CRITICAL_APPROVAL = 40;
const CRITICAL_UNEMPLOYMENT = 20;
const CRITICAL_WELLBEING = 25;
const CRITICAL_INFLATION = 15;
const EVENTS: GameEvent[] = [
  { type: "energyShock", title: "Energy prices jump", description: "A global supply squeeze pushes household energy costs higher.", requiresDecision: true },
  { type: "recession", title: "Trading partners slide into recession", description: "Weaker foreign demand cuts output and raises unemployment.", requiresDecision: false },
  { type: "publicStrike", title: "Public services face a strike", description: "A pay dispute disrupts public services and adds to social pressure.", requiresDecision: false },
  { type: "taxWindfall", title: "A tax windfall eases the budget", description: "Unexpected receipts improve the government's immediate finances.", requiresDecision: false },
  { type: "tradeDisruption", title: "A trade route is disrupted", description: "Import delays raise costs and interrupt production.", requiresDecision: false },
  { type: "borrowingShock", title: "Borrowing costs rise suddenly", description: "Investors demand a higher premium to finance the government.", requiresDecision: false },
];

function bounded(value: number, minimum: number, maximum: number): number {
  if (Number.isNaN(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function policiesFor(economy: Economy, input: PolicyInput): Policies {
  return {
    taxRate: input.taxRate,
    publicSpending: input.publicSpending,
    interestRate: input.interestRate,
    minimumWage: input.minimumWage ?? economy.minimumWage,
    tariffRate: input.tariffRate ?? economy.tariffRate,
    energySubsidy: input.energySubsidy ?? economy.energySubsidy,
  };
}

function validatePolicies(policies: Policies): void {
  for (const field of Object.keys(POLICY_LIMITS) as (keyof Policies)[]) {
    const [minimum, maximum] = POLICY_LIMITS[field];
    const value = policies[field];
    if (!Number.isFinite(value) || value < minimum || value > maximum) {
      throw new RangeError(`${field} must be a finite number between ${minimum} and ${maximum}.`);
    }
  }
}

function groupsFor(
  economy: Economy,
  policies: Policies,
  inflation: number,
  unemployment: number,
  averageWage: number,
): InterestGroups {
  const wageChange = policies.minimumWage - economy.minimumWage;
  return {
    workers: oneDecimal(bounded(
      economy.groups.workers +
        wageChange * 0.5 +
        (averageWage - economy.averageWage) +
        Math.max(0, 5 - unemployment) * 0.08 -
        Math.max(0, unemployment - 8) * 0.12 -
        Math.max(0, inflation - 2) * 0.4 -
        Math.max(0, 50 - economy.wellbeing) * 0.03 +
        policies.energySubsidy * 0.015,
      0,
      100,
    )),
    businesses: oneDecimal(bounded(
      economy.groups.businesses -
        wageChange * 0.3 +
        (25 - policies.taxRate) * 0.03 +
        (policies.tariffRate - economy.tariffRate) * 0.1 -
        (5 - policies.tariffRate) * 0.02 -
        (policies.interestRate - economy.interestRate) * 0.15 -
        Math.max(0, averageWage - 15) * 0.08 +
        Math.max(0, economy.growthRate) * 0.02 -
        Math.max(0, unemployment - 8) * 0.03,
      0,
      100,
    )),
    publicSector: oneDecimal(bounded(
      economy.groups.publicSector +
        (policies.publicSpending - economy.publicSpending) * 0.02 +
        (policies.publicSpending - 200) * 0.005,
      0,
      100,
    )),
  };
}

function approvalFor(groups: InterestGroups): number {
  return oneDecimal(bounded(
    groups.workers * 0.4 + groups.businesses * 0.35 + groups.publicSector * 0.25,
    0,
    100,
  ));
}

export function startGame(economy: Economy, input: PolicyInput): Economy {
  if (economy.started || economy.outcome) {
    throw new RangeError("The game has already started.");
  }
  const policies = policiesFor(economy, input);
  validatePolicies(policies);
  const averageWage = Math.max(economy.averageWage, policies.minimumWage);
  const groups = groupsFor(
    economy,
    policies,
    economy.inflation,
    economy.unemployment,
    averageWage,
  );
  return {
    ...economy,
    ...policies,
    averageWage,
    groups,
    approval: approvalFor(groups),
    started: true,
    history: [...economy.history, ...policyHistory(economy, policies, economy.turn)],
  };
}

function policyHistory(economy: Economy, policies: Policies, turn: number): HistoryEntry[] {
  const labels: Record<keyof Policies, string> = {
    taxRate: "taxes",
    publicSpending: "public spending",
    interestRate: "interest rates",
    minimumWage: "minimum wage",
    tariffRate: "tariffs",
    energySubsidy: "energy subsidies",
  };
  const changed = (Object.keys(labels) as (keyof Policies)[])
    .filter((field) => economy[field] !== policies[field])
    .map((field) => `${labels[field]} ${economy[field]} to ${policies[field]}`);

  return changed.length > 0
    ? [{ turn, type: "policy", text: `Policy changed: ${changed.join(", ")}.` }]
    : [];
}

function chooseEvent(turn: number, random: () => number): GameEvent | null {
  if (turn % EVENT_INTERVAL !== 0) return null;

  const chanceRoll = random();
  if (!Number.isFinite(chanceRoll) || chanceRoll >= EVENT_CHANCE) return null;

  const choiceRoll = random();
  const index = Number.isFinite(choiceRoll)
    ? bounded(Math.floor(choiceRoll * EVENTS.length), 0, EVENTS.length - 1)
    : 0;
  return EVENTS[index];
}

function applyOutputShock(economy: Economy, multiplier: number): Economy {
  return {
    ...economy,
    gdp: bounded(economy.gdp * multiplier, 0, Number.MAX_VALUE),
    growthRate: oneDecimal(((1 + economy.growthRate / 100) * multiplier - 1) * 100),
  };
}

function applyAutomaticEvent(
  economy: Economy,
  eventType: Exclude<EventType, "energyShock">,
): Economy {
  switch (eventType) {
    case "recession":
      return {
        ...applyOutputShock(economy, 0.97),
        unemployment: bounded(economy.unemployment + 2, 0, 100),
        unrest: bounded(economy.unrest + 4, 0, 100),
        groups: {
          workers: bounded(economy.groups.workers - 4, 0, 100),
          businesses: bounded(economy.groups.businesses - 3, 0, 100),
          publicSector: bounded(economy.groups.publicSector - 2, 0, 100),
        },
      };
    case "publicStrike":
      return {
        ...applyOutputShock(economy, 0.98),
        groups: { ...economy.groups, publicSector: bounded(economy.groups.publicSector - 12, 0, 100) },
        unrest: bounded(economy.unrest + 8, 0, 100),
      };
    case "taxWindfall":
      return {
        ...economy,
        treasury: economy.treasury + 150,
        debt: bounded(economy.debt - 150, 0, Number.MAX_VALUE),
        groups: {
          workers: bounded(economy.groups.workers + 3, 0, 100),
          businesses: bounded(economy.groups.businesses + 3, 0, 100),
          publicSector: bounded(economy.groups.publicSector + 3, 0, 100),
        },
      };
    case "tradeDisruption":
      return {
        ...applyOutputShock(economy, 0.98),
        inflation: bounded(economy.inflation + 1.5, -Number.MAX_VALUE, Number.MAX_VALUE),
        unrest: bounded(economy.unrest + 4, 0, 100),
        resourceReserves: bounded(economy.resourceReserves - 5, 0, 100),
        groups: {
          workers: bounded(economy.groups.workers - 4, 0, 100),
          businesses: bounded(economy.groups.businesses - 4, 0, 100),
          publicSector: bounded(economy.groups.publicSector - 1, 0, 100),
        },
      };
    case "borrowingShock":
      return {
        ...applyOutputShock(economy, 0.99),
        treasury: economy.treasury - 80,
        debt: bounded(economy.debt + 200, 0, Number.MAX_VALUE),
        groups: {
          workers: bounded(economy.groups.workers - 3, 0, 100),
          businesses: bounded(economy.groups.businesses - 5, 0, 100),
          publicSector: bounded(economy.groups.publicSector - 2, 0, 100),
        },
      };
  }
}

function headlineFor(economy: Economy, event: GameEvent | null): string {
  if (event) return event.title;
  if (economy.resourceReserves < 30) return "Resource shortages constrain production and raise prices";
  if (economy.inflation > 5) return "Inflation refuses to leave the front page";
  if (economy.treasury < 0) return "Deficit puts the public finances under scrutiny";
  if (economy.unemployment > 8) return "Growth holds, but the jobs recovery falters";
  if (economy.growthRate < 0) return "Weak demand and investment pull output into contraction";
  return "Growth steadies as the policy experiment continues";
}

function outcomeFor(economy: Economy): GameOutcome | null {
  let kind: GameOutcome["kind"] | null = null;
  let reason = "";

  if (economy.population <= 0) {
    kind = "defeat";
    reason = "Population collapse leaves the country without a viable base.";
  } else if (economy.overthrowRiskTurns >= economy.rules.overthrowGraceTurns) {
    kind = "defeat";
    reason = "Sustained severe public anger and economic crisis have overthrown the government.";
  } else if (economy.insolvencyTurns >= economy.rules.insolvencyGraceTurns) {
    kind = "defeat";
    reason = "The government cannot meet its obligations: a fiscal crisis.";
  } else if (economy.collapseTurns >= economy.rules.collapseGraceTurns) {
    kind = "defeat";
    reason = "GDP remains below the critical threshold: economic collapse.";
  }

  if (!kind) return null;

  return {
    kind,
    reason,
    endedTurn: economy.turn,
    report: {
      reason,
      gdpChange: oneDecimal(economy.gdp - economy.gameStart.gdp),
      inflationChange: oneDecimal(economy.inflation - economy.gameStart.inflation),
      treasuryChange: oneDecimal(economy.treasury - economy.gameStart.treasury),
      populationChange: economy.population - economy.gameStart.population,
      approval: economy.approval,
      unrest: economy.unrest,
      history: economy.history,
    },
  };
}

function hasOverthrowRisk(economy: Economy): boolean {
  const sustainedLowSupport =
    economy.approval < economy.rules.overthrowApproval &&
    economy.unrest >= economy.rules.overthrowUnrest;
  const criticalSignals =
    Number(economy.approval < CRITICAL_APPROVAL) +
    Number(economy.unemployment >= CRITICAL_UNEMPLOYMENT) +
    Number(economy.wellbeing <= CRITICAL_WELLBEING) +
    Number(economy.inflation >= CRITICAL_INFLATION) +
    Number(economy.growthRate <= -5);
  const severeCrisis = economy.unrest >= CRITICAL_UNREST && criticalSignals > 0;
  return sustainedLowSupport || severeCrisis;
}

function addAchievements(economy: Economy, treasuryChange: number): AchievementId[] {
  const earned = new Set(economy.achievements);
  if (treasuryChange >= 0) earned.add("balancedBudget");
  if (economy.inflation <= 2) earned.add("priceStability");
  if (economy.history.some((entry) => entry.eventType === "recession" && entry.turn < economy.turn)) {
    earned.add("weatheredRecession");
  }
  if (economy.wellbeing >= 65 && economy.treasury >= 0) earned.add("resilientInvestment");
  return [...earned];
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

export function advanceTurn(
  economy: Economy,
  input: PolicyInput,
  random: () => number = Math.random,
): Economy {
  if (!economy.started || economy.outcome || economy.pendingEvent) return economy;
  const policies = policiesFor(economy, input);
  validatePolicies(policies);

  const nextTurn = economy.turn + 1;
  const wageGrowthRate = bounded(
    Math.max(0, 8 - economy.unemployment) * 0.002 -
      Math.max(0, economy.unemployment - 8) * 0.0005 +
      Math.max(0, economy.inflation - 3) * 0.0002,
    -0.01,
    0.02,
  );
  const averageWage = Math.max(
    policies.minimumWage,
    economy.averageWage * (1 + wageGrowthRate),
  );
  const demandGrowthRate =
    0.02 +
    (policies.publicSpending - 200) / 10_000 +
    (25 - policies.taxRate) * 0.0002 +
    Math.max(0, 3 - policies.interestRate) * 0.0002 -
    Math.max(0, policies.interestRate - 5) * 0.0004 +
    (policies.minimumWage - 12) * 0.00005 -
    Math.max(0, policies.minimumWage - 18) * 0.0003 -
    (policies.tariffRate - 5) * 0.00008 -
    Math.max(0, economy.debt - 1000) / 1_000_000 +
    (economy.groups.businesses - 60) * 0.00005 +
    (economy.wellbeing - 60) * 0.0001 +
    (averageWage - economy.averageWage) * 0.0001;

  const dueEffects = economy.pendingEffects.filter((effect) => effect.dueTurn <= nextTurn);
  const pendingEffects = economy.pendingEffects.filter((effect) => effect.dueTurn > nextTurn);
  const capacityInvestment = dueEffects.reduce((total, effect) => total + effect.amount, 0);
  const productiveCapacity = Math.max(
    0,
    economy.productiveCapacity -
      Math.max(0, 250 - policies.publicSpending) * 0.02 +
      capacityInvestment,
  );
  const previousGdp = Number.isFinite(economy.gdp) ? economy.gdp : 0;
  const potentialGdp = Number.isFinite(economy.gdp)
    ? Math.max(
      0,
      previousGdp * (1 + demandGrowthRate) + (policies.publicSpending - 200) * 0.1,
    )
    : 0;
  const resourceAvailability = 0.5 + economy.resourceReserves * 0.005;
  const gdp = Math.min(potentialGdp, productiveCapacity * resourceAvailability);
  const growthRate = previousGdp > 0 ? gdp / previousGdp - 1 : 0;
  const calculatedInflation =
    economy.inflation +
    policies.publicSpending / 1_000 -
    policies.interestRate * 0.1 +
    Math.max(0, policies.tariffRate - 5) * 0.05 +
    Math.max(0, policies.minimumWage - 18) * 0.04 -
    policies.energySubsidy * 0.01 +
    Math.max(0, 70 - economy.resourceReserves) * 0.015;
  const inflation = Number.isNaN(calculatedInflation)
    ? 0
    : bounded(calculatedInflation, -Number.MAX_VALUE, Number.MAX_VALUE);
  const capacityShortfall = Math.max(0, potentialGdp - gdp) / Math.max(1, potentialGdp);
  const unemployment = bounded(
    economy.unemployment -
    growthRate * 10 +
    capacityShortfall * 6 +
    Math.max(0, policies.minimumWage - 15) * 0.2 +
    Math.max(0, policies.interestRate - 5) * 0.15,
    0,
    100,
  );
  const calculatedTreasury =
    economy.treasury +
    (economy.gdp * policies.taxRate) / 100 -
    policies.publicSpending -
    policies.energySubsidy;
  const treasury = Number.isFinite(calculatedTreasury) ? calculatedTreasury : 0;

  const groups = groupsFor(economy, policies, inflation, unemployment, averageWage);
  const approval = approvalFor(groups);
  const wellbeing = oneDecimal(bounded(
    economy.wellbeing +
      (policies.publicSpending - 200) * 0.015 +
      policies.energySubsidy * 0.04 -
      Math.max(0, inflation - 2) * 0.25 -
      Math.max(0, unemployment - 5) * 0.2 +
      Math.max(0, averageWage - economy.averageWage) * 0.5,
    0,
    100,
  ));
  const unrest = oneDecimal(bounded(
    economy.unrest +
      (50 - approval) * 0.08 +
      Math.max(0, inflation - 4) * 0.2 +
      Math.max(0, unemployment - 8) * 0.08 +
      Math.max(0, 50 - wellbeing) * 0.04 +
      Math.max(0, -growthRate * 100) * 0.35,
    0,
    100,
  ));
  const resourceReserves = bounded(economy.resourceReserves - gdp / 2_000, 0, 100);
  const populationRate = 0.0002 + (wellbeing - 50) * 0.000005 - Math.max(0, unrest - 60) * 0.00001;
  const population = Math.max(0, Math.round(economy.population * (1 + populationRate)));
  const treasuryChange = treasury - economy.treasury;
  const debt = bounded(
    economy.debt + Math.max(0, -treasuryChange) - Math.min(economy.debt, Math.max(0, treasuryChange) * 0.1),
    0,
    Number.MAX_VALUE,
  );

  if (![
    gdp,
    potentialGdp,
    growthRate,
    inflation,
    unemployment,
    treasury,
    approval,
    unrest,
    wellbeing,
    averageWage,
    productiveCapacity,
    resourceReserves,
    population,
    debt,
  ]
    .every(Number.isFinite)) {
    throw new RangeError("Economic calculations produced a non-finite value.");
  }

  if (policies.publicSpending >= 350) {
    pendingEffects.push({
      kind: "capacity",
      dueTurn: nextTurn + 2,
      amount: oneDecimal((policies.publicSpending - 300) * 0.2 * (groups.businesses / 60)),
    });
  }

  const event = chooseEvent(nextTurn, random);
  const entries = policyHistory(economy, policies, nextTurn);
  let nextEconomy: Economy = {
    ...economy,
    turn: nextTurn,
    gdp,
    growthRate: oneDecimal(growthRate * 100),
    inflation,
    unemployment,
    treasury,
    ...policies,
    approval,
    debt,
    population,
    wellbeing,
    unrest,
    averageWage,
    productiveCapacity,
    resourceReserves,
    groups,
    pendingEffects,
    history: [...economy.history, ...entries],
  };

  if (event) {
    nextEconomy = event.type === "energyShock"
      ? { ...nextEconomy, pendingEvent: event }
      : applyAutomaticEvent(nextEconomy, event.type);
    nextEconomy.history = [...nextEconomy.history, {
      turn: nextTurn,
      type: "event",
      text: event.description,
      eventType: event.type,
    }];
  }

  nextEconomy.approval = approvalFor(nextEconomy.groups);
  nextEconomy = {
    ...nextEconomy,
    overthrowRiskTurns: hasOverthrowRisk(nextEconomy)
      ? economy.overthrowRiskTurns + 1
      : 0,
    insolvencyTurns:
      nextEconomy.treasury < nextEconomy.rules.insolvencyLimit
        ? economy.insolvencyTurns + 1
        : 0,
    collapseTurns:
      nextEconomy.gdp < nextEconomy.rules.collapseGdp
        ? economy.collapseTurns + 1
        : 0,
  };
  nextEconomy = { ...nextEconomy, outcome: outcomeFor(nextEconomy) };
  nextEconomy = {
    ...nextEconomy,
    headline: headlineFor(nextEconomy, event),
    achievements: addAchievements(nextEconomy, nextEconomy.treasury - economy.treasury),
  };

  return nextEconomy;
}

export function resolveEventDecision(economy: Economy, choice: EventChoice): Economy {
  if (!economy.pendingEvent || economy.pendingEvent.type !== "energyShock") {
    throw new RangeError("No event is waiting for a decision.");
  }

  const subsidized = choice === "subsidize";
  const groups: InterestGroups = {
    ...economy.groups,
    workers: bounded(economy.groups.workers + (subsidized ? 4 : -6), 0, 100),
  };
  const approval = oneDecimal(bounded(
    groups.workers * 0.4 + groups.businesses * 0.35 + groups.publicSector * 0.25,
    0,
    100,
  ));
  let nextEconomy: Economy = {
    ...economy,
    pendingEvent: null,
    treasury: economy.treasury - (subsidized ? 100 : 0),
    debt: bounded(economy.debt + (subsidized ? 100 : 0), 0, Number.MAX_VALUE),
    inflation: bounded(economy.inflation + (subsidized ? 0.6 : 2), -Number.MAX_VALUE, Number.MAX_VALUE),
    wellbeing: bounded(economy.wellbeing + (subsidized ? 4 : -5), 0, 100),
    unrest: bounded(economy.unrest + (subsidized ? 1 : 8), 0, 100),
    groups,
    approval,
    history: [...economy.history, {
      turn: economy.turn,
      type: "policy",
      text: subsidized
        ? "Energy shock response: subsidised household bills at a fiscal cost."
        : "Energy shock response: passed higher energy costs through to households.",
    }],
  };
  nextEconomy = { ...nextEconomy, headline: headlineFor(nextEconomy, economy.pendingEvent) };
  return nextEconomy;
}

export function createInitialEconomy(
  rules: Partial<EconomyRules> = {},
): Economy {
  const economy: Economy = {
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
    achievements: [],
    outcome: null,
    gameStart: { gdp: 1000, inflation: 2, treasury: 500, population: 1_000_000 },
    rules: { ...DEFAULT_RULES, ...rules },
  };
  return economy;
}
