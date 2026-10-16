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
