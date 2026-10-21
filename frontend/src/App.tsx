import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  getAdviserAdvice,
  getEconomicWarnings,
  type AchievementId,
  type Economy,
  type EventChoice,
  type IndicatorSnapshot,
} from "../../backend/src/economy.js";
import CompetingInterests from "./CompetingInterests";
import EconomicIndicators from "./EconomicIndicators";
import PolicySettings from "./PolicySettings";
import type { ActiveRequest, Policies, PolicyInputs } from "./PolicySettings";
import { formatIndicator, formatMoney, formatPercent, formatPopulation } from "./indicators";
import "./styles.css";

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

function snapshotFor(economy: Economy): IndicatorSnapshot {
  return {
    turn: economy.turn,
    gdp: economy.gdp,
    inflation: economy.inflation,
    unemployment: economy.unemployment,
    averageWage: economy.averageWage,
    treasury: economy.treasury,
    debt: economy.debt,
    approval: economy.approval,
    population: economy.population,
    wellbeing: economy.wellbeing,
    productiveCapacity: economy.productiveCapacity,
    resourceReserves: economy.resourceReserves,
    unrest: economy.unrest,
  };
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
  const [activeRequest, setActiveRequest] = useState<ActiveRequest>(null);
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
  const indicatorHistory = economy.indicatorHistory.length > 0
    ? economy.indicatorHistory
    : [snapshotFor(economy)];

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

        <EconomicIndicators economy={economy} history={indicatorHistory} />

        {economy.pendingEvent && (
          <section className="event-panel" aria-labelledby="event-title">
            <p className="eyebrow">CABINET DECISION / TURN {economy.turn}</p>
            <h2 id="event-title">{economy.pendingEvent.title}</h2>
            <p>{economy.pendingEvent.description}</p>
            <div className="event-actions">
              <button className="button button-secondary" type="button"
                onClick={() => void answerEvent("subsidise")} disabled={isBusy}>
                subsidise household bills
              </button>
              <button className="button button-secondary" type="button"
                onClick={() => void answerEvent("passThrough")} disabled={isBusy}>
                Pass costs through
              </button>
            </div>
          </section>
        )}

        <div className="decision-grid">
          <PolicySettings
            policies={policies}
            started={economy.started}
            activeRequest={activeRequest}
            onPolicyChange={updatePolicy}
            onPolicyKeyDown={handlePolicyKeyDown}
            onStart={() => void startGame()}
            onReset={() => void resetGame()}
          />
          <CompetingInterests groups={economy.groups} />
        </div>

        <div className="secondary-grid">
          {warnings.length > 0 && (
            <section className="warning-panel" aria-label="Warnings">
              <p className="eyebrow">SIGNALS UNDER PRESSURE</p>
              <ul>
                {warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </section>
          )}
          <section className="assessment" aria-labelledby="assessment-title">
            <div className="assessment-heading">
              <p className="eyebrow">LIVE ASSESSMENT</p>
              <h2 id="assessment-title">Current outlook</h2>
              <p className={`assessment-result ${isResilient ? "is-resilient" : "is-strained"}`}
                role="status">
                <span className="assessment-status-mark" aria-hidden="true" />
                {isResilient ? "Resilient economy" : "Economy under pressure"}
              </p>
            </div>
            <p className="assessment-thresholds">
              Resilient means inflation is 0–5%, unemployment is at most 8%, GDP is at least
              $1,000, and treasury is at least $0.
            </p>
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
        </div>

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

      </main>
    </div>
  );
}

export default App;