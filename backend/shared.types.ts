export type PolicyInput = Pick<
  Settings, "taxRate" | "publicSpending" | "interestRate"
> & Partial<
  Pick<Settings, "minimumWage" | "tariffRate" | "energySubsidy">
>;

export type Settings = {
  taxRate         : number;
  publicSpending  : number;
  interestRate    : number;
  minimumWage     : number;
  tariffRate      : number;
  energySubsidy   : number;
};
