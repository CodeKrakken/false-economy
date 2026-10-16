import { describe, expect, it } from "vitest";
import { createInitialEconomy } from "../src/economy.js";

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