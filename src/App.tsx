import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Economy } from "./economy.js";
import "./styles.css";

type Policies = Pick<Economy, "taxRate" | "publicSpending" | "interestRate">;
type PolicyInputs = { [Key in keyof Policies]: string };
type RequestAction = "advance" | "reset" | null;
const TURN_INTERVAL_MS = 1000;

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
  };
}

function numericPoliciesFrom(inputs: PolicyInputs): Policies {
  return {
    taxRate: Number(inputs.taxRate),
    publicSpending: Number(inputs.publicSpending),
    interestRate: Number(inputs.interestRate),
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
  const policiesRef = useRef<PolicyInputs | null>(policies);
  const isReady = !isLoading && economy !== null && policies !== null;
  policiesRef.current = policies;

  useEffect(() => {
    let isMounted = true;

    requestEconomy("/api/economy")
      .then((result) => {
        if (isMounted) {
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
    if (!currentPolicies || requestLocked.current) return;

    requestLocked.current = true;
    setActiveRequest("advance");
    setError(null);
    try {
      const result = await requestEconomy("/api/economy/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(numericPoliciesFrom(currentPolicies)),
      });
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

  useEffect(() => {
    if (!isReady) return;

    const interval = window.setInterval(() => {
      void advanceTurn();
    }, TURN_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isReady]);

  async function resetGame() {
    if (requestLocked.current) return;

    requestLocked.current = true;
    setActiveRequest("reset");
    setError(null);
    try {
      const result = await requestEconomy("/api/economy/reset", { method: "POST" });
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

  function updatePolicy(field: keyof Policies, value: string) {
    setPolicies((current) => ({
      ...current!,
      [field]: value,
    }));
  }

  return (
    <div className="app-shell">
      <header className="masthead">
        <a className="wordmark" href="#top" aria-label="Economy Simulator home">
          <span className="wordmark-mark" aria-hidden="true">E</span>
          <span>ECONOMY<br />SIMULATOR</span>
        </a>
        <div className="masthead-meta">
          <span className="live-indicator" aria-hidden="true" />
          <span>LIVE</span>
          <span className="meta-divider" />
          <span>1S / TURN</span>
        </div>
      </header>

      <main id="top" className="main-content">
        <section className="page-intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">PUBLIC FINANCE / SIMULATION 01</p>
            <h1 id="page-title">Economy dashboard</h1>
          </div>
          <div className="turn-marker" aria-label={`Turn ${economy.turn}`}>
            <span className="turn-marker-label">CURRENT TURN</span>
            <span className="turn-marker-value">{String(economy.turn).padStart(2, "0")}</span>
          </div>
        </section>

        {error && <p className="error-message" role="alert">{error}</p>}

        <section className="economy-section" aria-labelledby="indicators-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NATIONAL INDICATORS</p>
              <h2 id="indicators-title">Current state</h2>
            </div>
            <p className="turn-count">Turn {economy.turn}</p>
          </div>

          <dl className="metrics-grid">
            <div className="metric metric-primary">
              <dt>Gross domestic product</dt>
              <dd>{formatMoney(economy.gdp)}</dd>
              <span className="metric-unit">GDP</span>
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
            <div className="metric metric-turn">
              <dt>Current turn</dt>
              <dd>{economy.turn}</dd>
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
              {isResilient ? "Resilient economy" : "Economy under pressure"}
            </p>
          </div>
          <p className="assessment-thresholds">
            Resilient means inflation is 0–5%, unemployment is at most 8%, GDP is at least
            $1,000, and treasury is at least $0.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="policy-title">
          <div className="section-heading policy-heading">
            <div>
              <p className="eyebrow">NEXT DECISION</p>
              <h2 id="policy-title">Policy settings</h2>
            </div>
            <button
              className="button button-secondary reset-button"
              type="button"
              onClick={resetGame}
              disabled={isBusy}
            >
              {activeRequest === "reset" ? "Resetting..." : "Reset game"}
            </button>
          </div>

          <div>
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
                    disabled={activeRequest === "reset"}
                  />
                  <span className="input-range">0—60%</span>
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
                    disabled={activeRequest === "reset"}
                  />
                  <span className="input-range">$0—$500</span>
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
                    disabled={activeRequest === "reset"}
                  />
                  <span className="input-range">0—20%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;