import { describe, expect, it } from "vitest";
import { getAdviserAdvice, getEconomicWarnings } from "../../frontend/shared.functions.js";
import { createInitialEconomy } from "./shared/economy-fixtures";

describe("economy advice", () => {
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

    const severeCrisis = { ...initial, approval: 55, unrest: 100, unemployment: 20 };
    expect(getEconomicWarnings(severeCrisis)).toContain(
      "Severe unrest and economic crisis put the government at risk of overthrow.",
    );

    const lowApproval = {
      ...initial,
      approval: initial.rules.overthrowApproval - 1,
      unrest: initial.rules.overthrowUnrest - 1,
    };

    expect(getEconomicWarnings(lowApproval)).toContain(
      "Low approval and high unrest threaten the government.",
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
});
