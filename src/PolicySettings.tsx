import type { KeyboardEvent } from "react";
import type { Economy } from "./economy.js";
import PolicyControl from "./PolicyControl";

export type Policies = Pick<
  Economy,
  "taxRate" | "publicSpending" | "interestRate" | "minimumWage" | "tariffRate" | "energySubsidy"
>;
export type PolicyInputs = { [Key in keyof Policies]: string };
export type ActiveRequest = "advance" | "start" | "reset" | "event" | null;

const POLICY_CONTROLS: Array<{
  key: keyof Policies;
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  range: string;
  note: string;
}> = [
  {
    key: "taxRate",
    id: "tax-rate",
    label: "Tax rate",
    unit: "%",
    min: 0,
    max: 60,
    range: "0—60%",
    note: "Revenue for the state; less disposable income.",
  },
  {
    key: "publicSpending",
    id: "public-spending",
    label: "Public spending",
    unit: "$",
    min: 0,
    max: 500,
    range: "$0—$500",
    note: "Immediate cost; large investment can raise future output.",
  },
  {
    key: "interestRate",
    id: "interest-rate",
    label: "Interest rate",
    unit: "%",
    min: 0,
    max: 20,
    range: "0—20%",
    note: "Can cool prices while weighing on borrowing and growth.",
  },
  {
    key: "minimumWage",
    id: "minimum-wage",
    label: "Minimum wage",
    unit: "$ / hour",
    min: 0,
    max: 30,
    range: "$0—$30",
    note: "Supports wages; may raise hiring costs and prices.",
  },
  {
    key: "tariffRate",
    id: "tariff-rate",
    label: "Tariff rate",
    unit: "%",
    min: 0,
    max: 40,
    range: "0—40%",
    note: "Shelters some producers; raises import costs.",
  },
  {
    key: "energySubsidy",
    id: "energy-subsidy",
    label: "Energy subsidy",
    unit: "$",
    min: 0,
    max: 300,
    range: "$0—$300",
    note: "Reduces household costs; draws on the treasury.",
  },
];

type PolicySettingsProps = {
  policies: PolicyInputs;
  started: boolean;
  activeRequest: ActiveRequest;
  onPolicyChange: (field: keyof Policies, value: string) => void;
  onPolicyKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onStart: () => void;
  onReset: () => void;
};

function PolicySettings({
  policies,
  started,
  activeRequest,
  onPolicyChange,
  onPolicyKeyDown,
  onStart,
  onReset,
}: PolicySettingsProps) {
  const isBusy = activeRequest !== null;

  return (
    <section className="policy-section" aria-labelledby="policy-title">
      <div className="section-heading policy-heading">
        <div>
          <p className="eyebrow">
            {started ? "POLICY DESK / LIVE LEVERS" : "POLICY DESK / SET BEFORE START"}
          </p>
          <h2 id="policy-title">Policy settings</h2>
        </div>
        <div className="policy-actions">
          {!started && (
            <button
              className="button button-primary"
              type="button"
              onClick={onStart}
              disabled={isBusy}
            >
              {activeRequest === "start" ? "Starting..." : "Start game"}
            </button>
          )}
          <button
            className="button button-secondary reset-button"
            type="button"
            onClick={onReset}
            disabled={isBusy}
          >
            {activeRequest === "reset" ? "Resetting..." : "Reset game"}
          </button>
        </div>
      </div>
      <div className="policy-grid">
        {POLICY_CONTROLS.map(({ key, ...control }) => (
          <PolicyControl
            key={key}
            {...control}
            value={policies[key]}
            onChange={(value) => onPolicyChange(key, value)}
            onKeyDown={onPolicyKeyDown}
            disabled={activeRequest === "reset" || activeRequest === "start"}
          />
        ))}
      </div>
    </section>
  );
}

export default PolicySettings;
