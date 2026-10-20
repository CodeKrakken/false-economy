import { describe, expect, it } from "vitest";
import {
  advanceTurn,
  createInitialEconomy,
  getAdviserAdvice,
  getEconomicWarnings,
  resolveEventDecision,
  startGame,
} from "../../backend/src/economy.js";
import type { Economy } from "../../backend/src/economy.js";

describe("createInitialEconomy", () => {
  it("returns the initial economy values", () => {
    expect(createInitialEconomy()).toStrictEqual({
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
      rules: {
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

  const runningEconomy = (overrides: Partial<Economy> = {}): Economy => ({
    ...createInitialEconomy(),
    started: true,
    ...overrides,
  });

  it("starts with selected policies without advancing the simulation", () => {
    const started = startGame(createInitialEconomy(), {
      ...policies,
      minimumWage: 15,
      tariffRate: 10,
      energySubsidy: 25,
    });

    expect(started).toMatchObject({
      started: true,
      turn: 1,
      taxRate: 30,
      publicSpending: 250,
      interestRate: 4,
      minimumWage: 15,
      tariffRate: 10,
      energySubsidy: 25,
    });
    expect(started.averageWage).toBe(15);
    expect(started.indicatorHistory).toStrictEqual([{
      turn: 1,
      gdp: 1000,
      inflation: 2,
      unemployment: 5,
      averageWage: 15,
      treasury: 500,
      debt: 0,
      approval: 60.9,
      population: 1_000_000,
      wellbeing: 60,
      productiveCapacity: 1600,
      resourceReserves: 100,
      unrest: 20,
    }]);
    expect(started.history).toHaveLength(1);
    expect(started.history[0]).toMatchObject({ turn: 1, type: "policy" });
    expect(advanceTurn(createInitialEconomy(), policies)).toStrictEqual(createInitialEconomy());
    expect(() => startGame(started, policies)).toThrow(/already started/i);
    const nextTurn = advanceTurn(started, policies, () => 1);
    expect(nextTurn.indicatorHistory).toHaveLength(2);
    expect(nextTurn.indicatorHistory.at(-1)).toMatchObject({
      turn: nextTurn.turn,
      gdp: nextTurn.gdp,
      inflation: nextTurn.inflation,
      treasury: nextTurn.treasury,
    });
  });

  it("advances one turn and applies policies and deterministic economic rules", () => {
    const nextEconomy = advanceTurn(runningEconomy(), policies);
    expect(nextEconomy.growthRate).toBe(2.9);
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
      gdp: 1029.009,
      inflation: 1.85,
      unemployment: expect.closeTo(4.71),
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

    const extremeButRecoverable = { ...initial, unrest: 100 };
    expect(getEconomicWarnings(extremeButRecoverable)).toStrictEqual([]);
    expect(advanceTurn(runningEconomy({ unrest: 100 }), policies, () => 1).overthrowRiskTurns).toBe(0);

    const severeCrisis = { ...initial, approval: 55, unrest: 100, unemployment: 20 };
    expect(getEconomicWarnings(severeCrisis)).toContain(
      "Severe unrest and economic crisis put the government at risk of overthrow.",
    );
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

    const severeCrisis = getAdviserAdvice({
      ...initial,
      approval: 55,
      unrest: 100,
      unemployment: 20,
    });
    expect(severeCrisis.political).toMatch(/severe unrest.*overthrow/i);

    const groupRisk = getAdviserAdvice({
      ...initial,
      groups: { ...initial.groups, workers: 35 },
    });
    expect(groupRisk.political).toMatch(/household demand/i);

    const businessRisk = getAdviserAdvice({
      ...initial,
      groups: { ...initial.groups, businesses: 35 },
    });
    expect(businessRisk.political).toMatch(/investment and hiring/i);

    const publicServiceRisk = getAdviserAdvice({
      ...initial,
      groups: { ...initial.groups, publicSector: 35 },
    });
    expect(publicServiceRisk.political).toMatch(/public services.*living standards/i);
  });

  it("returns a new economy without mutating the input", () => {
    const economy = runningEconomy();
    const original = { ...economy };
    const nextEconomy = advanceTurn(economy, policies);

    expect(nextEconomy).not.toBe(economy);
    expect(economy).toStrictEqual(original);
  });

  it("grows GDP more with higher public spending", () => {
    const economy = runningEconomy();
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
    const economy = runningEconomy();
    const lowerRate = advanceTurn(economy, { ...policies, interestRate: 1 });
    const higherRate = advanceTurn(economy, { ...policies, interestRate: 10 });

    expect(higherRate.inflation).toBeLessThan(lowerRate.inflation);
  });

  it("raises treasury revenue with higher tax rates", () => {
    const economy = runningEconomy();
    const lowerTax = advanceTurn(economy, { ...policies, taxRate: 10 });
    const higherTax = advanceTurn(economy, { ...policies, taxRate: 40 });

    expect(higherTax.treasury).toBeGreaterThan(lowerTax.treasury);
  });

  it("lets excessive public debt weigh on economic growth", () => {
    const economy = runningEconomy();
    const lowDebt = advanceTurn(economy, policies, () => 1);
    const highDebt = advanceTurn({ ...economy, debt: 20_000 }, policies, () => 1);

    expect(highDebt.growthRate).toBeLessThan(lowDebt.growthRate);
    expect(highDebt.gdp).toBeLessThan(lowDebt.gdp);
  });

  it("links demand, taxes, employment and wage pressure to economic output", () => {
    const economy = runningEconomy();
    const stimulus = advanceTurn(economy, {
      ...policies,
      taxRate: 20,
      publicSpending: 400,
      minimumWage: 12,
    }, () => 1);
    const austerity = advanceTurn(economy, {
      ...policies,
      taxRate: 40,
      publicSpending: 0,
      minimumWage: 12,
    }, () => 1);
    const highWages = advanceTurn(economy, {
      ...policies,
      minimumWage: 30,
    }, () => 1);
    const highUnemployment = advanceTurn(runningEconomy({ unemployment: 20 }), policies, () => 1);
    const higherTaxes = advanceTurn(economy, {
      ...policies,
      taxRate: 60,
    }, () => 1);
    const revenueInRecession = advanceTurn(runningEconomy({ gdp: 500 }), policies, () => 1);

    expect(stimulus.gdp).toBeGreaterThan(austerity.gdp);
    expect(austerity.unemployment).toBeGreaterThan(stimulus.unemployment);
    expect(highWages.groups.workers).toBeGreaterThan(highWages.groups.businesses);
    expect(highUnemployment.groups.workers).toBeLessThan(economy.groups.workers);
    expect(highWages.growthRate).toBeLessThan(
      advanceTurn(economy, { ...policies, minimumWage: 12 }, () => 1).growthRate,
    );
    expect(higherTaxes.gdp).toBeLessThan(stimulus.gdp);
    expect(revenueInRecession.treasury).toBeLessThan(
      advanceTurn(economy, policies, () => 1).treasury,
    );
  });

  it("invests in productive capacity after a delay and depletes resources", () => {
    const economy = runningEconomy();
    const investment = advanceTurn(economy, {
      ...policies,
      publicSpending: 400,
    }, () => 1);
    const waiting = advanceTurn(investment, policies, () => 1);
    const due = advanceTurn(waiting, policies, () => 1);
    const austerity = advanceTurn(economy, {
      ...policies,
      publicSpending: 0,
    }, () => 1);
    const profitableInvestment = advanceTurn(runningEconomy({
      groups: { workers: 60, businesses: 80, publicSector: 60 },
    }), { ...policies, publicSpending: 400 }, () => 1);
    const weakInvestment = advanceTurn(runningEconomy({
      groups: { workers: 60, businesses: 20, publicSector: 60 },
    }), { ...policies, publicSpending: 400 }, () => 1);

    expect(investment.productiveCapacity).toBe(economy.productiveCapacity);
    expect(investment.pendingEffects).toStrictEqual([
      { kind: "capacity", dueTurn: 4, amount: 19.9 },
    ]);
    expect(due.productiveCapacity).toBeGreaterThan(waiting.productiveCapacity);
    expect(austerity.productiveCapacity).toBeLessThan(economy.productiveCapacity);
    expect(investment.resourceReserves).toBeLessThan(economy.resourceReserves);
    expect(profitableInvestment.pendingEffects[0].amount).toBeGreaterThan(
      weakInvestment.pendingEffects[0].amount,
    );
  });

  it("lets resource scarcity constrain output and increase production costs", () => {
    const policies = { taxRate: 30, publicSpending: 250, interestRate: 4 };
    const abundant = advanceTurn(runningEconomy({ resourceReserves: 100 }), policies, () => 1);
    const scarce = advanceTurn(runningEconomy({ resourceReserves: 0 }), policies, () => 1);

    expect(scarce.gdp).toBeLessThan(abundant.gdp);
    expect(scarce.inflation).toBeGreaterThan(abundant.inflation);
    expect(scarce.resourceReserves).toBe(0);
  });

  it("models minimum wage gains for workers and costs for businesses", () => {
    const nextEconomy = advanceTurn(runningEconomy(), {
      ...policies,
      minimumWage: 18,
      tariffRate: 5,
      energySubsidy: 0,
    });

    expect(nextEconomy.groups.workers).toBeGreaterThan(60);
    expect(nextEconomy.groups.businesses).toBeLessThan(60);
  });

  it("lets tight labour markets raise average wages while slack labour markets weaken them", () => {
    const fullEmployment = advanceTurn(
      runningEconomy({ unemployment: 2 }),
      { ...policies, minimumWage: 12 },
      () => 1,
    );
    const slackLabourMarket = advanceTurn(
      runningEconomy({ unemployment: 20 }),
      { ...policies, minimumWage: 12 },
      () => 1,
    );
    const extremeTightMarket = advanceTurn(
      runningEconomy({ unemployment: 0, inflation: 100 }),
      { ...policies, minimumWage: 12 },
      () => 1,
    );
    const extremeSlackMarket = advanceTurn(
      runningEconomy({ unemployment: 100 }),
      { ...policies, minimumWage: 12 },
      () => 1,
    );

    expect(fullEmployment.averageWage).toBeGreaterThan(slackLabourMarket.averageWage);
    expect(fullEmployment.averageWage).toBeGreaterThan(15);
    expect(slackLabourMarket.averageWage).toBeLessThan(15);
    expect(fullEmployment.groups.workers).toBeGreaterThan(slackLabourMarket.groups.workers);
    expect(fullEmployment.wellbeing).toBeGreaterThan(slackLabourMarket.wellbeing);
    expect(extremeTightMarket.averageWage).toBeCloseTo(15.3);
    expect(extremeSlackMarket.averageWage).toBeCloseTo(14.85);
  });

  it("models tariff protection and the cost and relief of energy subsidies", () => {
    const economy = runningEconomy();
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
    const investment = advanceTurn(runningEconomy(), {
      ...policies,
      publicSpending: 400,
      minimumWage: 12,
      tariffRate: 5,
      energySubsidy: 0,
    }, () => 1);

    expect(investment.pendingEffects).toStrictEqual([
      { kind: "capacity", dueTurn: 4, amount: 19.9 },
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
    expect(due.productiveCapacity).toBeGreaterThan(waiting.productiveCapacity);
  });

  it("selects interval events deterministically and waits for a decision", () => {
    const fullPolicies = {
      ...policies,
      minimumWage: 12,
      tariffRate: 5,
      energySubsidy: 0,
    };
    const turnTwo = advanceTurn(runningEconomy(), fullPolicies, () => 1);
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
    const turnTwo = advanceTurn(runningEconomy(), fullPolicies, () => 1);
    const rolls = [0, 0];
    const event = advanceTurn(turnTwo, fullPolicies, () => rolls.shift() ?? 1);

    const subsidized = resolveEventDecision(event, "subsidize");
    const passedThrough = resolveEventDecision(event, "passThrough");
    expect(subsidized.pendingEvent).toBeNull();
    expect(subsidized.treasury).toBe(event.treasury - 100);
    expect(subsidized.wellbeing).toBeGreaterThan(passedThrough.wellbeing);
    expect(subsidized.inflation).toBeLessThan(passedThrough.inflation);
    expect(subsidized.indicatorHistory).toHaveLength(event.indicatorHistory.length);
    expect(subsidized.indicatorHistory.at(-1)).toMatchObject({
      turn: event.turn,
      treasury: subsidized.treasury,
      inflation: subsidized.inflation,
    });
    expect(passedThrough.indicatorHistory.at(-1)).toMatchObject({
      turn: event.turn,
      treasury: passedThrough.treasury,
      inflation: passedThrough.inflation,
    });
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
    const turnTwo = advanceTurn(runningEconomy(), fullPolicies, () => 1);
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
    const turnTwo = advanceTurn(runningEconomy(), fullPolicies, () => 1);
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
    const turnTwo = advanceTurn(runningEconomy(), fullPolicies, () => 1);
    const rolls = [0, Number.NaN];
    const event = advanceTurn(turnTwo, fullPolicies, () => rolls.shift() ?? 1);

    expect(event.pendingEvent?.type).toBe("energyShock");
  });

  it("writes state-based headlines for inflation, deficits, and unemployment", () => {
    const inflationary = advanceTurn(runningEconomy({ inflation: 4.5 }), {
      ...policies,
      publicSpending: 500,
      minimumWage: 30,
      tariffRate: 40,
      energySubsidy: 0,
    }, () => 1);
    const deficit = advanceTurn(runningEconomy({ treasury: -100 }), {
      ...policies,
      taxRate: 0,
      minimumWage: 12,
      tariffRate: 5,
      energySubsidy: 0,
    }, () => 1);
    const jobLosses = advanceTurn(runningEconomy({ unemployment: 10 }), {
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
      ...runningEconomy(),
      population: Number.NaN,
    };

    expect(() => advanceTurn(economy, policies, () => 1)).toThrow(
      /non-finite value/i,
    );
  });

  it("requires sustained low approval and high unrest before overthrow", () => {
    const economy = {
      ...runningEconomy(),
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

  it("keeps event-driven approval low long enough for an overthrow at maximum unrest", () => {
    const economy = runningEconomy({
      turn: 2,
      ...policies,
      approval: 25.5,
      unrest: 100,
      groups: { workers: 25.5, businesses: 25.5, publicSector: 25.5 },
    });
    const rolls = [0, 0.99];
    const borrowingShock = advanceTurn(economy, policies, () => rolls.shift() ?? 1);

    expect(borrowingShock.approval).toBeLessThan(borrowingShock.rules.overthrowApproval);
    expect(borrowingShock.unrest).toBe(100);
    expect(borrowingShock.overthrowRiskTurns).toBe(1);

    const nextTurn = advanceTurn(borrowingShock, policies, () => 1);
    expect(nextTurn.outcome).toMatchObject({ kind: "defeat", reason: /overthrow/i });
  });

  it("overthrows the government after a sustained crisis reaches maximum unrest", () => {
    let economy = runningEconomy({
      approval: 10,
      unrest: 100,
      groups: { workers: 10, businesses: 10, publicSector: 10 },
    });
    economy = advanceTurn(economy, policies, () => 1);
    expect(economy.outcome).toBeNull();
    economy = advanceTurn(economy, policies, () => 1);

    expect(economy.unrest).toBe(100);
    expect(economy.outcome).toMatchObject({
      kind: "defeat",
      reason: /overthrow/i,
      report: { unrest: 100 },
    });
    expect(advanceTurn(economy, policies, () => 1)).toBe(economy);
  });

  it("overthrows at maximum unrest when prolonged unemployment keeps the crisis severe", () => {
    const crisisPolicies = {
      ...policies,
      minimumWage: 30,
      tariffRate: 5,
      energySubsidy: 0,
    };
    let economy = runningEconomy({
      approval: 55,
      unrest: 100,
      unemployment: 20,
      groups: { workers: 55, businesses: 55, publicSector: 55 },
    });
    economy = advanceTurn(economy, crisisPolicies, () => 1);

    expect(economy.approval).toBeGreaterThan(40);
    expect(economy.unemployment).toBeGreaterThanOrEqual(20);
    expect(economy.overthrowRiskTurns).toBe(1);
    expect(economy.outcome).toBeNull();

    economy = advanceTurn(economy, crisisPolicies, () => 1);
    expect(economy.outcome).toMatchObject({ kind: "defeat", reason: /overthrow/i });
  });

  it("can recover from political pressure when demand and living standards improve", () => {
    const strained = runningEconomy({
      unrest: 82,
      wellbeing: 40,
    });
    const recovery = advanceTurn(strained, {
      taxRate: 25,
      publicSpending: 500,
      interestRate: 6,
      minimumWage: 15,
      tariffRate: 5,
      energySubsidy: 100,
    }, () => 1);

    expect(recovery.unrest).toBeLessThan(strained.unrest);
    expect(recovery.wellbeing).toBeGreaterThan(strained.wellbeing);
    expect(recovery.overthrowRiskTurns).toBe(0);
    expect(recovery.outcome).toBeNull();
  });

  it("allows recovery before the fiscal insolvency grace period expires", () => {
    const policy = { taxRate: 60, publicSpending: 0, interestRate: 3 };
    const unstable = {
      ...runningEconomy(),
      treasury: -1100,
      insolvencyTurns: 1,
    };
    const recovered = advanceTurn(unstable, policy, () => 1);

    expect(recovered.treasury).toBeGreaterThan(-1000);
    expect(recovered.insolvencyTurns).toBe(0);
    expect(recovered.outcome).toBeNull();
  });

  it("ends after two insolvent turns and reports the fiscal crisis", () => {
    const economy = runningEconomy({ treasury: -1100 });
    const first = advanceTurn(economy, { taxRate: 0, publicSpending: 0, interestRate: 3 }, () => 1);
    const defeated = advanceTurn(first, { taxRate: 0, publicSpending: 0, interestRate: 3 }, () => 1);

    expect(defeated.outcome).toMatchObject({ kind: "defeat", reason: /fiscal/i });
    expect(defeated.outcome?.report).toMatchObject({
      approval: defeated.approval,
      unrest: defeated.unrest,
      populationChange: defeated.population - defeated.gameStart.population,
    });
  });

  it("ends after three consecutive turns below the GDP threshold", () => {
    let economy = runningEconomy({ gdp: 400 });
    for (let turn = 0; turn < 2; turn += 1) {
      economy = advanceTurn(economy, policies, () => 1);
      expect(economy.outcome).toBeNull();
    }
    economy = advanceTurn(economy, policies, () => 1);
    expect(economy.outcome).toMatchObject({ kind: "defeat", reason: /economic collapse/i });
  });

  it("ends immediately at zero population and prioritizes that report reason", () => {
    const economy = runningEconomy({ population: 0, treasury: -2000, gdp: 100 });
    const defeated = advanceTurn(economy, policies, () => 1);

    expect(defeated.outcome).toMatchObject({ kind: "defeat", reason: /population collapse/i });
  });

  it("continues indefinitely without a term-based victory", () => {
    let economy = runningEconomy();
    for (let turn = 0; turn < 25; turn += 1) {
      economy = advanceTurn(economy, {
        taxRate: 60,
        publicSpending: 300,
        interestRate: 3,
        minimumWage: 12,
        tariffRate: 5,
        energySubsidy: 100,
      }, () => 1);
    }

    expect(economy.turn).toBe(26);
    expect(economy.outcome).toBeNull();
    expect(economy.achievements).not.toContain("fullTerm");
  });

  it("keeps economic indicators finite and clamps GDP and unemployment", () => {    const economy: Economy = {
      ...runningEconomy(),
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
      runningEconomy({ unemployment: -10 }),
      policies,
    );
    expect(noUnemployment.unemployment).toBe(0);
  });

  it("replaces NaN indicators with their safe fallback values", () => {
    const nextEconomy = advanceTurn(
      {
        ...runningEconomy(),
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

    expect(() => advanceTurn(runningEconomy(), invalidPolicies)).toThrow(
      new RegExp(`${key}.*${min}.*${max}`),
    );
  });
});