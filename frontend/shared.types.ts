import { Economy, IndicatorSnapshot } from "../shared.types";

export type Policies = Pick<
  Economy,
  "taxRate" | "publicSpending" | "interestRate" | "minimumWage" | "tariffRate" | "energySubsidy"
>;
export type PolicyInputs = { [Key in keyof Policies]: string };
export type ActiveRequest = "advance" | "start" | "reset" | "event" | null;

export type IndicatorKey = Exclude<keyof IndicatorSnapshot, "turn">;
export type IndicatorFormat = "money" | "percent" | "wage" | "population";
export type Indicator = {
  key: IndicatorKey;
  name: string;
  unit: string;
  format: IndicatorFormat;
  color: string;
};

export type AdviserAdvice = {
  treasury: string;
  political: string;
};
