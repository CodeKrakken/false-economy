import { describe, expect, it } from "vitest";
import {
  advanceTurn,
  createInitialEconomy,
  getAdviserAdvice,
  getEconomicWarnings,
  resolveEventDecision,
} from "../src/economy.js";
import type { Economy } from "../src/economy.js";

describe("createInitialEconomy", () => {
  it("returns the initial economy values", () => {
    expect(createInitialEconomy()).toStrictEqual({
      turn: 1,
      gdp: 1000,
      growthRate: 2,
      inflation: 2,
      unemployment: 5,
      treasury: 500,
      taxRate: 25,
      publicSpending: 200,
      interestRate: 3,
      minimumWage: 12,
      tariffRate: 5,
      energySubsidy: 0,
      approval: 60,
      debt: 0,
      population: 1_000_000,
      wellbeing: 60,
      unrest: 20,
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
      termStart: { gdp: 1000, inflation: 2, treasury: 500, population: 1_000_000 },
      rules: {
        termLength: 20,
        overthrowApproval: 25,
        overthrowUnrest: 80,
        overthrowGraceTurns: 2,
        insolvencyLimit: -1000,
        insolvencyGraceTurns: 2,
        collapseGdp: 500,
        collapseGraceTurns: 3,
      },
    });
  });
});

describe("advanceTurn", () => {
  const policies = {
    taxRate: 30,
    publicSpending: 250,
    interestRate: 4,
  };

  it("advances one turn and applies policies and deterministic economic rules", () => {
    const nextEconomy = advanceTurn(createInitialEconomy(), policies);
    expect(nextEconomy.growthRate).toBe(2.5);
    expect({
      turn: nextEconomy.turn,
      gdp: nextEconomy.gdp,
      inflation: nextEconomy.inflation,
      unemployment: nextEconomy.unemployment,
      treasury: nextEconomy.treasury,
      taxRate: nextEconomy.taxRate,
      publicSpending: nextEconomy.publicSpending,
      interestRate: nextEconomy.interestRate,
    }).toStrictEqual({
      turn: 2,
      gdp: 1025,
      inflation: 1.85,
      unemployment: 4.75,
      treasury: 550,
      taxRate: 30,
      publicSpending: 250,
      interestRate: 4,
    });
  });

  it("returns no warnings for a stable economy and state-specific warnings under pressure", () => {
    const initial = createInitialEconomy();
    expect(getEconomicWarnings(initial)).toStrictEqual([]);

    const pressured = {
      ...initial,
      inflation: 6,
      unemployment: 9,
      treasury: -1,
      gdp: 550,
      population: 500_000,
      approval: 30,
      unrest: 60,
    };
    expect(getEconomicWarnings(pressured)).toStrictEqual([
      "Inflation is above the 5% resilience ceiling.",
      "Unemployment is above 8%.",
      "Treasury is below zero.",
      "GDP is close to collapse.",
      "Population is declining.",
      "Low approval and high unrest threaten the government.",
    ]);
  });

  it("gives fiscal and political advice based on actual risk indicators", () => {
    const initial = createInitialEconomy();
    const stable = getAdviserAdvice(initial);
    expect(stable.treasury).toMatch(/balanced/i);
    expect(stable.political).toMatch(/support/i);

    const inflationRisk = getAdviserAdvice({ ...initial, inflation: 6 });
    expect(inflationRisk.treasury).toMatch(/inflation/i);

    const politicalRisk = getAdviserAdvice({
      ...initial,
      treasury: -100,
      debt: 1500,
      approval: 30,
      unrest: 60,
    });
    expect(politicalRisk.treasury).toMatch(/debt|deficit/i);
    expect(politicalRisk.political).toMatch(/overthrow/i);

    const groupRisk = getAdviserAdvice({
      ...initial,
      groups: { ...initial.groups, workers: 35 },
    });
    expect(groupRisk.political).toMatch(/interest groups/i);
  });

  it("returns a new economy without mutating the input", () => {
    const economy = createInitialEconomy();
    const original = { ...economy };
    const nextEconomy = advanceTurn(economy, policies);

    expect(nextEconomy).not.toBe(economy);
    expect(economy).toStrictEqual(original);
  });

  it("grows GDP more with higher public spending", () => {
    const economy = createInitialEconomy();
    const lowerSpending = advanceTurn(economy, {
      ...policies,
      publicSpending: 100,
    });
    const higherSpending = advanceTurn(economy, {
      ...policies,
      publicSpending: 400,
    });

    expect(higherSpending.gdp).toBeGreaterThan(lowerSpending.gdp);
  });

  it("reduces inflation more with higher interest rates", () => {
    const economy = createInitialEconomy();
    const lowerRate = advanceTurn(economy, { ...policies, interestRate: 1 });
    const higherRate = advanceTurn(economy, { ...policies, interestRate: 10 });

    expect(higherRate.inflation).toBeLessThan(lowerRate.inflation);
  });

  it("raises treasury revenue with higher tax rates", () => {
    const economy = createInitialEconomy();
    const lowerTax = advanceTurn(economy, { ...policies, taxRate: 10 });
    const higherTax = advanceTurn(economy, { ...policies, taxRate: 40 });

    expect(higherTax.treasury).toBeGreaterThan(lowerTax.treasury);
  });

  it("lets excessive public debt weigh on economic growth", () => {
    const economy = createInitialEconomy();
    const lowDebt = advanceTurn(economy, policies, () => 1);
    const highDebt = advanceTurn({ ...economy, debt: 20_000 }, policies, () => 1);

    expect(highDebt.growthRate).toBeLessThan(lowDebt.growthRate);
    expect(highDebt.gdp).toBeLessThan(lowDebt.gdp);
  });

  it("models minimum wage gains for workers and costs for businesses", () => {
    const nextEconomy = advanceTurn(createInitialEconomy(), {
      ...policies,
      minimumWage: 18,
      tariffRate: 5,
      energySubsidy: 0,
    });

    expect(nextEconomy.groups.workers).toBeGreaterThan(60);
    expect(nextEconomy.groups.businesses).toBeLessThan(60);
  });

  it("models tariff protection and the cost and relief of energy subsidies", () => {
    const economy = createInitialEconomy();
    const openTrade = advanceTurn(economy, {
      ...policies,
      minimumWage: 12,
      tariffRate: 5,
      energySubsidy: 0,
    });
    const protection = advanceTurn(economy, {
      ...policies,
      minimumWage: 12,
      tariffRate: 25,
      energySubsidy: 0,
    });
    const subsidized = advanceTurn(economy, {
      ...policies,
      minimumWage: 12,
      tariffRate: 5,
      energySubsidy: 100,
    });

    expect(protection.groups.businesses).toBeGreaterThan(openTrade.groups.businesses);
    expect(protection.inflation).toBeGreaterThan(openTrade.inflation);
    expect(subsidized.treasury).toBeLessThan(openTrade.treasury);
    expect(subsidized.wellbeing).toBeGreaterThan(openTrade.wellbeing);
    expect(subsidized.inflation).toBeLessThan(openTrade.inflation);
  });

  it("schedules public investment and applies it once on its due turn", () => {
    const investment = advanceTurn(createInitialEconomy(), {
      ...policies,
      publicSpending: 400,
      minimumWage: 12,
      tariffRate: 5,
      energySubsidy: 0,
    }, () => 1);

    expect(investment.pendingEffects).toStrictEqual([
      { kind: "productivity", dueTurn: 4, amount: 20 },
    ]);

    const waiting = advanceTurn(investment, {
      ...policies,
      publicSpending: 200,
      minimumWage: 12,
      tariffRate: 5,
      energySubsidy: 0,
    }, () => 1);
    expect(waiting.pendingEffects).toHaveLength(1);

    const due = advanceTurn(waiting, {
      ...policies,
      publicSpending: 200,
      minimumWage: 12,
      tariffRate: 5,
      energySubsidy: 0,
    }, () => 1);
    expect(due.pendingEffects).toHaveLength(0);
    expect(due.gdp).toBeGreaterThan(waiting.gdp * 1.02);
  });

  it("selects interval events deterministically and waits for a decision", () => {
    const fullPolicies = {
      ...policies,
      minimumWage: 12,
      tariffRate: 5,
      energySubsidy: 0,
    };
    const turnTwo = advanceTurn(createInitialEconomy(), fullPolicies, () => 1);
    const rolls = [0, 0];
    const energyShock = advanceTurn(turnTwo, fullPolicies, () => rolls.shift() ?? 1);

    expect(energyShock.turn).toBe(3);
    expect(energyShock.pendingEvent).toMatchObject({
      type: "energyShock",
      requiresDecision: true,
    });
    expect(energyShock.history.at(-1)?.type).toBe("event");
    expect(advanceTurn(energyShock, fullPolicies, () => 1)).toBe(energyShock);
  });

  it("applies the explicit subsidy and pass-through choices for an energy shock", () => {
    const fullPolicies = {
      ...policies,
      minimumWage: 12,
      tariffRate: 5,
      energySubsidy: 0,
    };
    const turnTwo = advanceTurn(createInitialEconomy(), fullPolicies, () => 1);
    const rolls = [0, 0];
    const event = advanceTurn(turnTwo, fullPolicies, () => rolls.shift() ?? 1);

    const subsidized = resolveEventDecision(event, "subsidize");
    const passedThrough = resolveEventDecision(event, "passThrough");
    expect(subsidized.pendingEvent).toBeNull();
    expect(subsidized.treasury).toBe(event.treasury - 100);
    expect(subsidized.wellbeing).toBeGreaterThan(passedThrough.wellbeing);
    expect(subsidized.inflation).toBeLessThan(passedThrough.inflation);
    expect(() => resolveEventDecision(createInitialEconomy(), "subsidize")).toThrow(
      /no event is waiting/i,
    );
  });

  it("applies automatic recession effects and records their source", () => {
    const fullPolicies = {
      ...policies,
      minimumWage: 12,
      tariffRate: 5,
      energySubsidy: 0,
    };
    const turnTwo = advanceTurn(createInitialEconomy(), fullPolicies, () => 1);
    const rolls = [0, 0.2];
    const recession = advanceTurn(turnTwo, fullPolicies, () => rolls.shift() ?? 1);

    expect(recession.history.at(-1)).toMatchObject({ type: "event", eventType: "recession" });
    expect(recession.gdp).toBeLessThan(turnTwo.gdp * 1.02);
    expect(recession.unemployment).toBeGreaterThan(turnTwo.unemployment);
    expect(recession.achievements).not.toContain("weatheredRecession");

    const survived = advanceTurn(recession, fullPolicies, () => 1);
    expect(survived.achievements).toContain("weatheredRecession");
  });

  it.each([
    { index: 2, eventType: "publicStrike" },
    { index: 3, eventType: "taxWindfall" },
    { index: 4, eventType: "tradeDisruption" },
    { index: 5, eventType: "borrowingShock" },
  ] as const)("applies the $eventType event effect", ({ index, eventType }) => {
    const fullPolicies = {
      ...policies,
      minimumWage: 12,
      tariffRate: 5,
      energySubsidy: 0,
    };
    const turnTwo = advanceTurn(createInitialEconomy(), fullPolicies, () => 1);
    const quiet = advanceTurn(turnTwo, fullPolicies, () => 1);
    const rolls = [0, (index + 0.1) / 6];
    const event = advanceTurn(turnTwo, fullPolicies, () => rolls.shift() ?? 1);

    expect(event.history.at(-1)?.eventType).toBe(eventType);
    if (eventType === "publicStrike") {
      expect(event.groups.publicSector).toBeLessThan(quiet.groups.publicSector);
    } else if (eventType === "taxWindfall") {
      expect(event.treasury).toBeGreaterThan(quiet.treasury);
    } else if (eventType === "tradeDisruption") {
      expect(event.inflation).toBeGreaterThan(quiet.inflation);
    } else {
      expect(event.debt).toBeGreaterThan(quiet.debt);
    }
  });

  it("uses the safe first event if the injected event-choice roll is non-finite", () => {
    const fullPolicies = { ...policies, minimumWage: 12, tariffRate: 5, energySubsidy: 0 };
    const turnTwo = advanceTurn(createInitialEconomy(), fullPolicies, () => 1);
    const rolls = [0, Number.NaN];
    const event = advanceTurn(turnTwo, fullPolicies, () => rolls.shift() ?? 1);

    expect(event.pendingEvent?.type).toBe("energyShock");
  });

  it("writes state-based headlines for inflation, deficits, and unemployment", () => {
    const inflationary = advanceTurn({ ...createInitialEconomy(), inflation: 4.5 }, {
      ...policies,
      publicSpending: 500,
      minimumWage: 30,
      tariffRate: 40,
      energySubsidy: 0,
    }, () => 1);
    const deficit = advanceTurn({ ...createInitialEconomy(), treasury: -100 }, {
      ...policies,
      taxRate: 0,
      minimumWage: 12,
      tariffRate: 5,
      energySubsidy: 0,
    }, () => 1);
    const jobLosses = advanceTurn({ ...createInitialEconomy(), unemployment: 10 }, {
      ...policies,
      publicSpending: 0,
      minimumWage: 12,
      tariffRate: 5,
      energySubsidy: 0,
    }, () => 1);

    expect(inflationary.headline).toMatch(/inflation/i);
    expect(deficit.headline).toMatch(/deficit/i);
    expect(jobLosses.headline).toMatch(/jobs/i);
  });

  it("rejects invalid numeric state instead of propagating it", () => {
    const economy = {
      ...createInitialEconomy(),
      population: Number.NaN,
    };

    expect(() => advanceTurn(economy, policies, () => 1)).toThrow(
      /non-finite value/i,
    );
  });

  it("requires sustained low approval and high unrest before overthrow", () => {
    const economy = {
      ...createInitialEconomy(),
      approval: 5,
      unrest: 90,
      groups: { workers: 5, businesses: 5, publicSector: 5 },
    };
    const firstRiskTurn = advanceTurn(economy, policies, () => 1);
    expect(firstRiskTurn.outcome).toBeNull();
    expect(firstRiskTurn.overthrowRiskTurns).toBe(1);

    const overthrow = advanceTurn(firstRiskTurn, policies, () => 1);
    expect(overthrow.outcome).toMatchObject({ kind: "defeat", reason: /overthrow/i });
    expect(advanceTurn(overthrow, policies, () => 1)).toBe(overthrow);
  });

  it("allows recovery before the fiscal insolvency grace period expires", () => {
    const policy = { taxRate: 60, publicSpending: 0, interestRate: 3 };
    const unstable = {
      ...createInitialEconomy(),
      treasury: -1100,
      insolvencyTurns: 1,
    };
    const recovered = advanceTurn(unstable, policy, () => 1);

    expect(recovered.treasury).toBeGreaterThan(-1000);
    expect(recovered.insolvencyTurns).toBe(0);
    expect(recovered.outcome).toBeNull();
  });

  it("ends after two insolvent turns and reports the fiscal crisis", () => {
    const economy = { ...createInitialEconomy(), treasury: -1100 };
    const first = advanceTurn(economy, { taxRate: 0, publicSpending: 0, interestRate: 3 }, () => 1);
    const defeated = advanceTurn(first, { taxRate: 0, publicSpending: 0, interestRate: 3 }, () => 1);

    expect(defeated.outcome).toMatchObject({ kind: "defeat", reason: /fiscal/i });
    expect(defeated.outcome?.report).toMatchObject({
      approval: defeated.approval,
      unrest: defeated.unrest,
      populationChange: defeated.population - defeated.termStart.population,
    });
  });

  it("ends after three consecutive turns below the GDP threshold", () => {
    let economy = { ...createInitialEconomy(), gdp: 400 };
    for (let turn = 0; turn < 2; turn += 1) {
      economy = advanceTurn(economy, policies, () => 1);
      expect(economy.outcome).toBeNull();
    }
    economy = advanceTurn(economy, policies, () => 1);
    expect(economy.outcome).toMatchObject({ kind: "defeat", reason: /economic collapse/i });
  });

  it("ends immediately at zero population and prioritizes that report reason", () => {
    const economy = { ...createInitialEconomy(), population: 0, treasury: -2000, gdp: 100 };
    const defeated = advanceTurn(economy, policies, () => 1);

    expect(defeated.outcome).toMatchObject({ kind: "defeat", reason: /population collapse/i });
  });

  it("awards milestones once and records a surviving full-term victory", () => {
    const initial = createInitialEconomy({ termLength: 2 });
    const policy = { taxRate: 60, publicSpending: 300, interestRate: 3, minimumWage: 12, tariffRate: 5, energySubsidy: 100 };
    const victory = advanceTurn(initial, policy, () => 1);
    const repeated = advanceTurn(victory, policy, () => 1);

    expect(victory.outcome).toMatchObject({ kind: "victory", reason: /term/i });
    expect(victory.achievements).toContain("fullTerm");
    expect(victory.achievements).toContain("balancedBudget");
    expect(victory.achievements).toContain("priceStability");
    expect(victory.achievements).toContain("resilientInvestment");
    expect(repeated).toBe(victory);
    expect(victory.achievements.filter((item) => item === "fullTerm")).toHaveLength(1);
  });

  it("keeps economic indicators finite and clamps GDP and unemployment", () => {    const economy: Economy = {
      ...createInitialEconomy(),
      gdp: -10,
      unemployment: 150,
      treasury: -100,
    };
    const nextEconomy = advanceTurn(economy, {
      taxRate: 0,
      publicSpending: 500,
      interestRate: 20,
    });

    expect([
      nextEconomy.gdp,
      nextEconomy.inflation,
      nextEconomy.unemployment,
      nextEconomy.treasury,
    ].every(Number.isFinite)).toBe(true);
    expect(nextEconomy.gdp).toBeGreaterThanOrEqual(0);
    expect(nextEconomy.treasury).toBeLessThan(0);    
    expect(nextEconomy.unemployment).toBe(100);

    const noUnemployment = advanceTurn(
      { ...createInitialEconomy(), unemployment: -10 },
      policies,
    );
    expect(noUnemployment.unemployment).toBe(0);
  });

  it("replaces NaN indicators with their safe fallback values", () => {
    const nextEconomy = advanceTurn(
      {
        ...createInitialEconomy(),
        gdp: Number.NaN,
        inflation: Number.NaN,
        treasury: Number.NaN,
      },
      policies,
    );

    expect(nextEconomy.gdp).toBe(0);
    expect(nextEconomy.inflation).toBe(0);
    expect(nextEconomy.treasury).toBe(0);
  });

  it.each([
    { key: "taxRate", value: -1, min: 0, max: 60 },
    { key: "taxRate", value: 61, min: 0, max: 60 },
    { key: "taxRate", value: Number.NaN, min: 0, max: 60 },
    { key: "taxRate", value: Number.POSITIVE_INFINITY, min: 0, max: 60 },
    { key: "publicSpending", value: -1, min: 0, max: 500 },
    { key: "publicSpending", value: 501, min: 0, max: 500 },
    { key: "interestRate", value: -1, min: 0, max: 20 },
    { key: "interestRate", value: 21, min: 0, max: 20 },
    { key: "minimumWage", value: -1, min: 0, max: 30 },
    { key: "minimumWage", value: 31, min: 0, max: 30 },
    { key: "tariffRate", value: -1, min: 0, max: 40 },
    { key: "tariffRate", value: 41, min: 0, max: 40 },
    { key: "energySubsidy", value: -1, min: 0, max: 300 },
    { key: "energySubsidy", value: 301, min: 0, max: 300 },
  ])("rejects $key value $value", ({ key, value, min, max }) => {
    const invalidPolicies = { ...policies, [key]: value };

    expect(() => advanceTurn(createInitialEconomy(), invalidPolicies)).toThrow(
      new RegExp(`${key}.*${min}.*${max}`),
    );
  });
});