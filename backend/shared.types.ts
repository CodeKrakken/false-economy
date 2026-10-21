type EventChoice = "subsidise" | "passThrough";

type PolicyInput = Pick<Settings, "taxRate" | "publicSpending" | "interestRate"> &
  Partial<Pick<Settings, "minimumWage" | "tariffRate" | "energySubsidy">>;

type Settings = {
  taxRate         : number;
  publicSpending  : number;
  interestRate    : number;
  minimumWage     : number;
  tariffRate      : number;
  energySubsidy   : number;
};

export type {
  Settings,
  PolicyInput,
  EventChoice
}