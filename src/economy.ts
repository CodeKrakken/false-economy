export type Economy = {
  turn: number;
  gdp: number;
  inflation: number;
  unemployment: number;
  treasury: number;
  taxRate: number;
  publicSpending: number;
  interestRate: number;
};

export function advanceTurn(
  economy: Economy,
  policies: { taxRate: number; publicSpending: number; interestRate: number },
): Economy {
  if (
    !Number.isFinite(policies.taxRate) ||
    policies.taxRate < 0 ||
    policies.taxRate > 60
  ) {
    throw new RangeError("taxRate must be a finite number between 0 and 60.");
  }
  if (
    !Number.isFinite(policies.publicSpending) ||
    policies.publicSpending < 0 ||
    policies.publicSpending > 500
  ) {
    throw new RangeError("publicSpending must be a finite number between 0 and 500.");
  }
  if (
    !Number.isFinite(policies.interestRate) ||
    policies.interestRate < 0 ||
    policies.interestRate > 20
  ) {
    throw new RangeError("interestRate must be a finite number between 0 and 20.");
  }

  // Public spending shifts baseline GDP growth by 0.01 per 100 units.
  const growthRate = 0.02 + (policies.publicSpending - 200) / 10_000;
  const gdp = economy.gdp * (1 + growthRate);
  const inflation =
    economy.inflation + policies.publicSpending / 1_000 - policies.interestRate * 0.1;
  const unemployment = economy.unemployment - growthRate * 10;
  // Tax revenue is a share of current GDP, less public spending.
  const treasury =
    economy.treasury + (economy.gdp * policies.taxRate) / 100 - policies.publicSpending;

  return {
    turn: economy.turn + 1,
    gdp: clamp(gdp, 0, Number.MAX_VALUE),
    inflation: Number.isNaN(inflation)
      ? 0
      : clamp(inflation, -Number.MAX_VALUE, Number.MAX_VALUE),
    unemployment: clamp(unemployment, 0, 100),
    treasury: Number.isFinite(treasury) ? treasury : 0,    
    taxRate: policies.taxRate,
    publicSpending: policies.publicSpending,
    interestRate: policies.interestRate,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (Number.isNaN(value)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, value));
}

export function createInitialEconomy(): Economy {
  return {
    turn: 1,
    gdp: 1000,
    inflation: 2,
    unemployment: 5,
    treasury: 500,
    taxRate: 25,
    publicSpending: 200,
    interestRate: 3,
  };
}
