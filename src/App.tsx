import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  getAdviserAdvice,
  getEconomicWarnings,
  type AchievementId,
  type Economy,
  type EventChoice,
} from "./economy.js";
import "./styles.css";

type Policies = Pick<
  Economy,
  "taxRate" | "publicSpending" | "interestRate" | "minimumWage" | "tariffRate" | "energySubsidy"
>;
type PolicyInputs = { [Key in keyof Policies]: string };
type RequestAction = "advance" | "start" | "reset" | "event" | null;
const TURN_INTERVAL_MS = 1000;

const ACHIEVEMENT_LABELS: Record<AchievementId, string> = {
  balancedBudget: "Balanced budget",
  priceStability: "Price stability",
  weatheredRecession: "Weathered a recession",
  resilientInvestment: "Resilient investment",
};

async function requestEconomy(path: string, init?: RequestInit): Promise<Economy> {
  const response = await fetch(path, init);
  let result: unknown;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }

  if (!response.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return result as Economy;
}

function policiesFrom(economy: Economy): PolicyInputs {
  return {
    taxRate: String(economy.taxRate),
    publicSpending: String(economy.publicSpending),
    interestRate: String(economy.interestRate),
    minimumWage: String(economy.minimumWage),
    tariffRate: String(economy.tariffRate),
    energySubsidy: String(economy.energySubsidy),
  };
}

function numericPoliciesFrom(inputs: PolicyInputs): Policies {
  return {
    taxRate: Number(inputs.taxRate),
    publicSpending: Number(inputs.publicSpending),
    interestRate: Number(inputs.interestRate),
    minimumWage: Number(inputs.minimumWage),
    tariffRate: Number(inputs.tariffRate),
    energySubsidy: Number(inputs.energySubsidy),
  };
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatPopulation(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function handlePolicyKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Enter") return;

  const input = event.currentTarget;
  if (input.value === "" || !input.validity.valid) {
    event.preventDefault();
    return;
  }

  input.blur();
}

function App() {
  const [economy, setEconomy] = useState<Economy | null>(null);
  const [policies, setPolicies] = useState<PolicyInputs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<RequestAction>(null);
  const [error, setError] = useState<string | null>(null);
  const requestLocked = useRef(false);
  const economyRef = useRef<Economy | null>(economy);
  const policiesRef = useRef<PolicyInputs | null>(policies);
  const isReady = !isLoading && economy !== null && policies !== null;
  economyRef.current = economy;
  policiesRef.current = policies;

  useEffect(() => {
    let isMounted = true;

    requestEconomy("/api/economy")
      .then((result) => {
        if (isMounted) {
          economyRef.current = result;
          setEconomy(result);
          setPolicies(policiesFrom(result));
        }
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load the economy.",
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function advanceTurn() {
    const currentPolicies = policiesRef.current;
    const currentEconomy = economyRef.current;
    if (
      !currentPolicies ||
      !currentEconomy ||
      !currentEconomy.started ||
      currentEconomy.pendingEvent ||
      currentEconomy.outcome ||
      requestLocked.current
    ) return;

    requestLocked.current = true;
    setActiveRequest("advance");
    setError(null);
    try {
      const result = await requestEconomy("/api/economy/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(numericPoliciesFrom(currentPolicies)),
      });
      economyRef.current = result;
      setEconomy(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to advance the economy.",
      );
    } finally {
      requestLocked.current = false;
      setActiveRequest(null);
    }
  }

  async function startGame() {
    const currentPolicies = policiesRef.current;
    if (!currentPolicies || requestLocked.current) return;

    requestLocked.current = true;
    setActiveRequest("start");
    setError(null);
    try {
      const result = await requestEconomy("/api/economy/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(numericPoliciesFrom(currentPolicies)),
      });
      economyRef.current = result;
      setEconomy(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to start the game.",
      );
    } finally {
      requestLocked.current = false;
      setActiveRequest(null);
    }
  }

  useEffect(() => {
    if (!isReady || !economy?.started || economy.pendingEvent || economy.outcome) return;

    const interval = window.setInterval(() => {
      void advanceTurn();
    }, TURN_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isReady, economy?.started, economy?.pendingEvent, economy?.outcome]);

  async function answerEvent(choice: EventChoice) {
    if (requestLocked.current) return;

    requestLocked.current = true;
    setActiveRequest("event");
    setError(null);
    try {
      const result = await requestEconomy("/api/economy/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
      });
      economyRef.current = result;
      setEconomy(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to apply the event decision.",
      );
    } finally {
      requestLocked.current = false;
      setActiveRequest(null);
    }
  }

  async function resetGame() {
    if (requestLocked.current) return;

    requestLocked.current = true;
    setActiveRequest("reset");
    setError(null);
    try {
      const result = await requestEconomy("/api/economy/reset", { method: "POST" });
      economyRef.current = result;
      setEconomy(result);
      setPolicies(policiesFrom(result));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reset the economy.",
      );
    } finally {
      requestLocked.current = false;
      setActiveRequest(null);
    }
  }

  if (isLoading) {
    return (
      <main className="loading-screen">
        <p role="status">Loading economy...</p>
      </main>
    );
  }

  if (!economy || !policies) {
    return (
      <main className="loading-screen">
        <p className="error-message" role="alert">{error || "Economy unavailable."}</p>
        <button className="button button-secondary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </main>
    );
  }

  const isResilient =
    economy.inflation >= 0 &&
    economy.inflation <= 5 &&
    economy.unemployment <= 8 &&
    economy.gdp >= 1000 &&
    economy.treasury >= 0;
  const isBusy = activeRequest !== null;
  const warnings = getEconomicWarnings(economy);
  const advice = getAdviserAdvice(economy);

  function updatePolicy(field: keyof Policies, value: string) {
    setPolicies((current) => ({
      ...current!,
      [field]: value,
    }));
  }

  return (
    <div className="app-shell">
      <main id="top" className="main-content">
        <section className="page-intro" aria-labelledby="page-title">
          <div className="page-intro-copy">
            <p className="eyebrow">ECONOMIC BRIEF / INTERACTIVE EDITION</p>
            <h1 id="page-title">False Economy</h1>
            <h2 className="page-dek">It's the economy, stupid</h2>
          </div>
          <div className="turn-marker" aria-label={`Turn ${economy.turn}`}>
            <span className="turn-marker-label">CURRENT TURN</span>
            <span className="turn-marker-value">{String(economy.turn).padStart(2, "0")}</span>
            <span className="turn-marker-note">{economy.started ? "LIVE CYCLE" : "NOT STARTED"}</span>
          </div>
        </section>

        {error && <p className="error-message" role="alert">{error}</p>}

        {warnings.length > 0 && (
          <section className="warning-panel" aria-label="Warnings">
            <p className="eyebrow">SIGNALS UNDER PRESSURE</p>
            <ul>
              {warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </section>
        )}

        <div className="feature-grid">
          <section className="economy-section" aria-labelledby="indicators-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">NATIONAL INDICATORS / LIVE READOUT</p>
                <h2 id="indicators-title">Current state</h2>
              </div>
            </div>

            <dl className="metrics-grid">
              <div className="metric metric-primary">
                <dt>Gross domestic product</dt>
                <dd>{formatMoney(economy.gdp)}</dd>
                <span className="metric-unit">GDP</span>
                <span className="metric-growth">{formatPercent(economy.growthRate)} growth</span>
              </div>
              <div className="metric">
                <dt>Inflation</dt>
                <dd>{formatPercent(economy.inflation)}</dd>
                <span className="metric-unit">ANNUAL RATE</span>
              </div>
              <div className="metric">
                <dt>Unemployment</dt>
                <dd>{formatPercent(economy.unemployment)}</dd>
                <span className="metric-unit">WORKFORCE</span>
              </div>
              <div className="metric">
                <dt>Treasury</dt>
                <dd>{formatMoney(economy.treasury)}</dd>
                <span className="metric-unit">PUBLIC BALANCE</span>
              </div>
              <div className="metric">
                <dt>Public debt</dt>
                <dd>{formatMoney(economy.debt)}</dd>
                <span className="metric-unit">OUTSTANDING</span>
              </div>
              <div className="metric">
                <dt>Public approval</dt>
                <dd>{formatPercent(economy.approval)}</dd>
                <span className="metric-unit">NATIONAL POLL</span>
              </div>
              <div className="metric">
                <dt>Population</dt>
                <dd>{formatPopulation(economy.population)}</dd>
                <span className="metric-unit">CITIZENS</span>
              </div>
              <div className="metric">
                <dt>Wellbeing</dt>
                <dd>{formatPercent(economy.wellbeing)}</dd>
                <span className="metric-unit">CITIZEN INDEX</span>
              </div>
              <div className="metric">
                <dt>Social unrest</dt>
                <dd>{formatPercent(economy.unrest)}</dd>
                <span className="metric-unit">PUBLIC TENSION</span>
              </div>
            </dl>
          </section>

          <section className="assessment" aria-labelledby="assessment-title">
            <div className="assessment-heading">
              <p className="eyebrow">LIVE ASSESSMENT</p>
              <h2 id="assessment-title">Current outlook</h2>
              <p
                className={`assessment-result ${isResilient ? "is-resilient" : "is-strained"}`}
                role="status"
              >
                <span className="assessment-status-mark" aria-hidden="true" />
                {isResilient ? "Resilient economy" : "Economy under pressure"}
              </p>
            </div>
            <p className="assessment-thresholds">
              Resilient means inflation is 0–5%, unemployment is at most 8%, GDP is at least
              $1,000, and treasury is at least $0.
            </p>
          </section>
        </div>

        <section className="groups-section" aria-labelledby="groups-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">COMPETING INTERESTS</p>
              <h2 id="groups-title">Who supports the programme?</h2>
            </div>
          </div>
          <dl className="groups-grid">
            <div><dt>Workers</dt><dd>{formatPercent(economy.groups.workers)}</dd></div>
            <div><dt>Businesses</dt><dd>{formatPercent(economy.groups.businesses)}</dd></div>
            <div><dt>Public sector</dt><dd>{formatPercent(economy.groups.publicSector)}</dd></div>
          </dl>
        </section>

        <section className="news-panel" aria-labelledby="headline-title">
          <div>
            <p className="eyebrow">THE DAILY BRIEF / TURN {economy.turn}</p>
            <h2 id="headline-title">{economy.headline}</h2>
          </div>
          <div className="adviser-grid" aria-label="Cabinet advisers">
            <p><strong>Treasury adviser:</strong>{advice.treasury.replace("Treasury adviser: ", "")}</p>
            <p><strong>Political adviser:</strong>{advice.political.replace("Political adviser: ", "")}</p>
          </div>
        </section>

        {economy.pendingEvent && (
          <section className="event-panel" aria-labelledby="event-title">
            <p className="eyebrow">CABINET DECISION / TURN {economy.turn}</p>
            <h2 id="event-title">{economy.pendingEvent.title}</h2>
            <p>{economy.pendingEvent.description}</p>
            <div className="event-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => void answerEvent("subsidize")}
                disabled={isBusy}
              >
                Subsidize household bills
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => void answerEvent("passThrough")}
                disabled={isBusy}
              >
                Pass costs through
              </button>
            </div>
          </section>
        )}

        <section className="achievements-section" aria-labelledby="achievements-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">RECORD OF GOVERNMENT</p>
              <h2 id="achievements-title">Milestones</h2>
            </div>
          </div>
          {economy.achievements.length === 0 ? (
            <p className="empty-state">No milestones recorded yet.</p>
          ) : (
            <ul className="achievement-list">
              {economy.achievements.map((achievement) => (
                <li key={achievement}>{ACHIEVEMENT_LABELS[achievement]}</li>
              ))}
            </ul>
          )}
        </section>

        {economy.outcome && (
          <section className="final-report" aria-labelledby="final-report-title">
            <p className="eyebrow">GAME OVER / {economy.outcome.kind.toUpperCase()}</p>
            <h2 id="final-report-title">Final report</h2>
            <p className="outcome-reason">{economy.outcome.reason}</p>
            <dl className="report-grid">
              <div><dt>GDP change</dt><dd>{formatMoney(economy.outcome.report.gdpChange)}</dd></div>
              <div><dt>Inflation change</dt><dd>{formatPercent(economy.outcome.report.inflationChange)}</dd></div>
              <div><dt>Treasury change</dt><dd>{formatMoney(economy.outcome.report.treasuryChange)}</dd></div>
              <div><dt>Population change</dt><dd>{formatPopulation(economy.outcome.report.populationChange)}</dd></div>
              <div><dt>Public approval</dt><dd>{formatPercent(economy.outcome.report.approval)}</dd></div>
              <div><dt>Social unrest</dt><dd>{formatPercent(economy.outcome.report.unrest)}</dd></div>
            </dl>
            <h3>Policies and events</h3>
            <ul className="report-history">
              {economy.outcome.report.history.map((entry, index) => (
                <li key={`${entry.turn}-${entry.type}-${index}`}>
                  <span>Turn {entry.turn}</span>{entry.text}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="policy-section" aria-labelledby="policy-title">
          <div className="section-heading policy-heading">
            <div>
              <p className="eyebrow">
                {economy.started ? "POLICY DESK / LIVE LEVERS" : "POLICY DESK / SET BEFORE START"}
              </p>
              <h2 id="policy-title">Policy settings</h2>
            </div>
            <div className="policy-actions">
              {!economy.started && (
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => void startGame()}
                  disabled={isBusy}
                >
                  {activeRequest === "start" ? "Starting..." : "Start game"}
                </button>
              )}
              <button
                className="button button-secondary reset-button"
                type="button"
                onClick={() => void resetGame()}
                disabled={isBusy}
              >
                {activeRequest === "reset" ? "Resetting..." : "Reset game"}
              </button>
            </div>
          </div>

          <div className="policy-grid">
              <div className="policy-control">
                <label htmlFor="tax-rate">Tax rate <span>(%)</span></label>
                <div className="input-row">
                  <input
                    id="tax-rate"
                    type="number"
                    min={0}
                    max={60}
                    step="any"
                    value={policies.taxRate}
                    onChange={(event) => updatePolicy("taxRate", event.currentTarget.value)}
                    onKeyDown={handlePolicyKeyDown}
                    disabled={activeRequest === "reset" || activeRequest === "start"}
                  />
                  <span className="input-range">0—60%</span>
                  <span className="policy-note">Revenue for the state; less disposable income.</span>
                </div>
              </div>
              <div className="policy-control">
                <label htmlFor="public-spending">Public spending <span>($)</span></label>
                <div className="input-row">
                  <input
                    id="public-spending"
                    type="number"
                    min={0}
                    max={500}
                    step="any"
                    value={policies.publicSpending}
                    onChange={(event) => updatePolicy("publicSpending", event.currentTarget.value)}
                    onKeyDown={handlePolicyKeyDown}
                    disabled={activeRequest === "reset" || activeRequest === "start"}
                  />
                  <span className="input-range">$0—$500</span>
                  <span className="policy-note">Immediate cost; large investment can raise future output.</span>
                </div>
              </div>
              <div className="policy-control">
                <label htmlFor="interest-rate">Interest rate <span>(%)</span></label>
                <div className="input-row">
                  <input
                    id="interest-rate"
                    type="number"
                    min={0}
                    max={20}
                    step="any"
                    value={policies.interestRate}
                    onChange={(event) => updatePolicy("interestRate", event.currentTarget.value)}
                    onKeyDown={handlePolicyKeyDown}
                    disabled={activeRequest === "reset" || activeRequest === "start"}
                  />
                  <span className="input-range">0—20%</span>
                  <span className="policy-note">Can cool prices while weighing on borrowing and growth.</span>
                </div>
              </div>
              <div className="policy-control">
                <label htmlFor="minimum-wage">Minimum wage <span>($ / hour)</span></label>
                <div className="input-row">
                  <input id="minimum-wage" type="number" min={0} max={30} step="any" value={policies.minimumWage}
                    onChange={(event) => updatePolicy("minimumWage", event.currentTarget.value)}
                    onKeyDown={handlePolicyKeyDown} disabled={activeRequest === "reset" || activeRequest === "start"} />
                  <span className="input-range">$0—$30</span>
                  <span className="policy-note">Supports wages; may raise hiring costs and prices.</span>
                </div>
              </div>
              <div className="policy-control">
                <label htmlFor="tariff-rate">Tariff rate <span>(%)</span></label>
                <div className="input-row">
                  <input id="tariff-rate" type="number" min={0} max={40} step="any" value={policies.tariffRate}
                    onChange={(event) => updatePolicy("tariffRate", event.currentTarget.value)}
                    onKeyDown={handlePolicyKeyDown} disabled={activeRequest === "reset" || activeRequest === "start"} />
                  <span className="input-range">0—40%</span>
                  <span className="policy-note">Shelters some producers; raises import costs.</span>
                </div>
              </div>
              <div className="policy-control">
                <label htmlFor="energy-subsidy">Energy subsidy <span>($)</span></label>
                <div className="input-row">
                  <input id="energy-subsidy" type="number" min={0} max={300} step="any" value={policies.energySubsidy}
                    onChange={(event) => updatePolicy("energySubsidy", event.currentTarget.value)}
                    onKeyDown={handlePolicyKeyDown} disabled={activeRequest === "reset" || activeRequest === "start"} />
                  <span className="input-range">$0—$300</span>
                  <span className="policy-note">Reduces household costs; draws on the treasury.</span>
                </div>
              </div>
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;