import { describe, expect, it } from "vitest";
import { advanceTurn, createInitialEconomy } from "../src/economy.js";
import type { Economy } from "../src/economy.js";

describe("createInitialEconomy", () => {
  it("returns the initial economy values", () => {
    expect(createInitialEconomy()).toStrictEqual({
      turn: 1,
      gdp: 1000,
      inflation: 2,
      unemployment: 5,
      treasury: 500,
      taxRate: 25,
      publicSpending: 200,
      interestRate: 3,
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
    expect(advanceTurn(createInitialEconomy(), policies)).toStrictEqual({
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

  it("keeps economic indicators finite and clamps GDP, treasury, and unemployment", () => {
    const economy: Economy = {
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
    expect(nextEconomy.treasury).toBeGreaterThanOrEqual(0);
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
  ])("rejects $key value $value", ({ key, value, min, max }) => {
    const invalidPolicies = { ...policies, [key]: value };

    expect(() => advanceTurn(createInitialEconomy(), invalidPolicies)).toThrow(
      new RegExp(`${key}.*${min}.*${max}`),
    );
  });
});