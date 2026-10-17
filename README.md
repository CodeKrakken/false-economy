# False Economy

A satirical, deterministic policy-strategy game about the trade-offs behind taxation, public services, monetary policy, wages, trade, and energy costs. The live simulation advances once per second until a government completes its term or reaches a defined defeat condition.

## Features

- Six policy levers with bounded inputs and immediate, delayed, and distributional effects.
- GDP, growth, inflation, unemployment, treasury, debt, population, wellbeing, approval, and unrest.
- Separate worker, business, and public-sector approval.
- Scheduled public-investment returns and interval-based economic/political events.
- State-based newspaper headlines, treasury and political advisers, warnings, milestones, and an end-of-term report.
- Configurable term and defeat thresholds, plus grace periods for recoverable crises.
- Responsive React dashboard and Express JSON API; the server owns game state and calculations.

## Tech Stack

- Node.js, TypeScript, Express 5.
- React 19, Vite 8.
- Vitest, Supertest, React Testing Library, user-event, and jsdom.

## Install And Run

```sh
npm ci
```

For local development, run the API and frontend in separate terminals:

```sh
PORT=3000 npm run dev:server
npm run dev
```

Open <http://localhost:5173/>. Vite proxies `/api` requests to the backend at `http://localhost:3000`.

```sh
npm test
npm run test:coverage
npm run build
```

Run a production build with `npm start`; Express serves the API and built frontend together on port 8080 by default. Set `PORT` to choose another port. The game state is in memory and resets when the server restarts. It is a single-process demo, not a multi-user persistent service.

## API

### `GET /api/economy`

Returns the full current game state, including indicators, group approval, pending effects/events, history, achievements, configurable rules, and any outcome report.

### `POST /api/economy/turn`

Advances one turn. `taxRate`, `publicSpending`, and `interestRate` are required. The other policy fields are optional for compatibility and retain their current values when omitted.

| Policy | Allowed range | Unit |
| --- | ---: | --- |
| `taxRate` | 0–60 | percent |
| `publicSpending` | 0–500 | model units per turn |
| `interestRate` | 0–20 | percent |
| `minimumWage` | 0–30 | model currency per hour |
| `tariffRate` | 0–40 | percent |
| `energySubsidy` | 0–300 | model units per turn |

Example:

```sh
curl -X POST http://localhost:3000/api/economy/turn \
  -H 'Content-Type: application/json' \
  -d '{"taxRate":30,"publicSpending":250,"interestRate":4,"minimumWage":15,"tariffRate":8,"energySubsidy":50}'
```

Invalid or non-finite values return HTTP `400` with a descriptive JSON error.

### `POST /api/economy/event`

Resolves a pending energy-price shock with `{"choice":"subsidize"}` or `{"choice":"passThrough"}`. The endpoint rejects choices when no decision is pending.

### `POST /api/economy/reset`

Restores the initial economy, rules, history, and achievement state.

## Model Assumptions

The model is deterministic and illustrative, not a forecast. Values and thresholds below are intentionally small and tunable so cause and effect remain readable. Policy bounds are validated on every turn; calculated bounded indicators are clamped and non-finite states are rejected or safely normalized.

### Policy And Indicator Effects

Let `s` be public spending, `i` the interest rate, `t` the tax rate, `w` the minimum wage, `r` the tariff, `e` the energy subsidy, and `d` existing public debt. Baseline growth is `0.02 + (s - 200) / 10,000`. Lower rates below 3 and higher rates above 5 have small opposing growth effects; wage changes have a modest demand effect, very high wages and tariffs reduce growth, and debt above 1,000 reduces growth by 0.1 percentage points per additional 1,000 model units. GDP grows by that rate plus any due productivity effect.

- Inflation starts from its previous value, adds spending pressure (`s / 1,000`), subtracts `i * 0.1`, and adds tariff/high-wage pressure while subsidies reduce household energy-price pressure.
- Unemployment moves opposite growth, with additional pressure from very high wages and rates; it is bounded to `0–100`.
- Treasury changes by tax receipts (`current GDP * t / 100`) minus spending and subsidies. Deficits add debt; surpluses pay down up to one tenth of the current surplus.
- Workers, businesses, and public-sector employees each have approval from `0–100`. Overall approval weights them `40% / 35% / 25%` respectively. These are illustrative weights, not claims about real-world influence.
- Inflation, unemployment, spending, and subsidies affect wellbeing. Wellbeing and unrest affect a small population-growth rate; population cannot become negative.
- Minimum-wage and tariff effects are stylized demand/cost/protection trade-offs. The model does not represent sectors, exchange rates, banking, expectations, or endogenous productivity beyond the scheduled investment effect.

Public spending of at least 350 schedules a productivity addition of `(spending - 300) * 0.2` for two turns later. Due entries are applied once and removed from the queue.

### Events, Reporting, And Outcomes

An event is considered every third turn, with a 40% chance. The random-number function is injectable into `advanceTurn` and `createApp` for deterministic tests. Events include energy shocks (player choice), recessions, public strikes, tax windfalls, trade disruptions, and borrowing shocks. Automatic effects and event descriptions are recorded in state history. Headlines are selected from the actual event and indicator thresholds; advisers use current fiscal, inflation, approval, and group data.

The default rules are a 20-turn term; overthrow after two consecutive turns with approval below 25 and unrest at least 80; fiscal defeat after two consecutive turns with treasury below -1,000; economic collapse after three turns with GDP below 500; and immediate population-collapse defeat at zero. A government that reaches its term without defeat wins. Population collapse has priority over overthrow, fiscal crisis, economic collapse, then term completion. Rules can be overridden when constructing an initial economy. An unresolved event or final outcome pauses automatic progression.

Achievements are state-earned and recorded once: non-deficit turn cash flow, inflation at or below 2%, surviving a recession through the following turn, completing the term, and wellbeing at least 65 while treasury remains non-negative. The final report records changes from the starting state and the actual policy/event history; it does not infer unsupported causal claims.

## Architecture

- `src/economy.ts` defines typed state, policy validation, effects, events, reporting, achievements, and pure turn transitions.
- `src/app.ts` provides the in-memory Express API and injectable random source.
- `src/App.tsx` renders indicators, controls, warnings, events, advisers, milestones, and reports; it contains no economic formulas.
- `src/styles.css` provides the responsive editorial interface.

## Testing And Accessibility

Economy tests exercise deterministic policy, event, delayed-effect, outcome, and achievement cases. Supertest covers the API contract and decision validation. React Testing Library and user-event cover the timed loop, policy editing, event choices, warnings, and reports. `npm run test:coverage` is expected to report 100% statements, branches, functions, and lines.

The interface uses semantic sections and headings, labeled numeric controls with published ranges, keyboard-visible focus, status/alert regions, and responsive layouts. An open event pauses the timer until the player decides; a completed game stops normal progression.
