# False Economy

A satirical, deterministic policy-strategy game about the trade-offs behind taxation, public services, monetary policy, wages, trade, and energy costs. Choose policies before starting; the live simulation then advances once per second until defeat.

## Features

- Six policy levers with bounded inputs and immediate, delayed, and distributional effects.
- GDP, growth, inflation, unemployment, treasury, debt, population, wellbeing, approval, and unrest.
- Separate worker, business, and public-sector approval.
- Scheduled public-investment returns and interval-based economic/political events.
- State-based newspaper headlines, treasury and political advisers, warnings, milestones, and a final defeat report.
- Configurable defeat thresholds, plus grace periods for recoverable crises.
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

### `POST /api/economy/start`

Starts a new game with the submitted policies. `taxRate`, `publicSpending`, and `interestRate` are required; the other policy fields are optional. The game does not advance until this request succeeds.

### `POST /api/economy/turn`

Advances one turn after the game has started. `taxRate`, `publicSpending`, and `interestRate` are required. The other policy fields are optional for compatibility and retain their current values when omitted. Advancing before the game starts returns HTTP `409`.

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

The model keeps units distinct: GDP, treasury, debt, productive capacity, and hourly wages are model currency/output units; inflation, unemployment, approval, unrest, and resource reserves are percentages or indices. The resource reserve index starts at 100 and is finite, while capacity is a persistent ceiling on output. The minimum wage is a policy floor; average wage is a separate endogenous hourly-pay estimate.

Let `s` be public spending, `i` the interest rate, `t` the tax rate, `w` the minimum wage, `r` the tariff, `e` the energy subsidy, and `d` existing public debt. Aggregate-demand growth starts from `0.02 + (s - 200) / 10,000 + (25 - t) * 0.0002`, with additional effects from interest rates, wages, tariffs, business confidence, wellbeing, and debt above 1,000. A direct spending-demand term, `(s - 200) * 0.1`, makes contractions possible even when output is low. Tax receipts use the previous turn's actual GDP, so a prolonged demand slump can shrink the revenue base.

- Output is limited by productive capacity multiplied by resource availability (`0.5 + reserves * 0.005`). Production consumes `GDP / 2,000` resource-index points each turn. Scarcity raises input-cost inflation and can constrain output.
- Spending below 250 gradually depreciates capacity. Spending of at least 350 schedules a capacity addition two turns later; its size depends on spending above 300 and business confidence. The investment is delayed and persistent rather than a one-off GDP bonus.
- Unemployment responds to realized output growth, unused capacity, wage costs, and interest rates. Average wages rise faster in tight labour markets, weaken when unemployment is high, and partly catch up with inflation; growth is bounded to -1%–2% per turn. Higher wages support household demand and wellbeing but can squeeze business margins. Worker support reflects wages, jobs, inflation, and wellbeing; business support reflects wage costs, taxes, tariffs, interest rates, unemployment, and growth. These group scores feed overall approval at `40% / 35% / 25%`.
- Inflation adds spending, tariff, wage, and resource-scarcity pressure; interest rates and energy subsidies reduce price pressure. Inflation and unemployment erode wellbeing and purchasing power, while public services, wages, and energy support can improve living standards.
- Unrest rises with weak approval, inflation, joblessness, low wellbeing, and contraction, and falls when those pressures ease. Wellbeing and unrest affect population growth; population cannot become negative.
- These are deliberately simplified mechanisms, not a full WORLD3, Keynesian, or Goodwin model. The game does not represent sectors, exchange rates, banking, expectations, or household balance sheets.

### Events, Reporting, And Outcomes

An event is considered every third turn, with a 40% chance. The random-number function is injectable into `advanceTurn` and `createApp` for deterministic tests. Events include energy shocks (player choice), recessions, public strikes, tax windfalls, trade disruptions, and borrowing shocks. Automatic effects and event descriptions are recorded in state history. Headlines are selected from the actual event and indicator thresholds; advisers use current fiscal, inflation, approval, and group data.

The simulation has no turn limit. Overthrow occurs after two consecutive turns with approval below 25 and unrest at least 80. At extreme unrest (95 or higher), sustained approval below 40, unemployment of at least 20%, wellbeing of 25 or less, inflation of at least 15%, or contraction of 5% or more is also sufficient political-crisis evidence. This allows a prolonged, severe crisis to trigger overthrow without treating one bad turn or unrest alone as an automatic defeat. Other defeats occur after two turns with treasury below -1,000, after three turns with GDP below 500, or immediately when population reaches zero. Population collapse has priority over overthrow, fiscal crisis, then economic collapse. Rules can be overridden when constructing an initial economy. An unresolved event or final outcome pauses automatic progression.

Achievements are state-earned and recorded once: non-deficit turn cash flow, inflation at or below 2%, surviving a recession through the following turn, and wellbeing at least 65 while treasury remains non-negative. The final report records changes from the starting state and the actual policy/event history; it does not infer unsupported causal claims.

## Architecture

- `backend/src/economy.ts` defines typed state, policy validation, effects, events, reporting, achievements, and pure turn transitions.
- `backend/src/app.ts` provides the in-memory Express API and injectable random source; `backend/src/server.ts` starts it.
- `frontend/src/App.tsx` renders indicators (including productive capacity and resource reserves), controls, warnings, events, advisers, milestones, and reports; it contains no economic formulas.
- `frontend/src/styles.css` provides the responsive editorial interface.

## Testing And Accessibility

Backend tests under `tests/backend/` exercise deterministic policy, event, delayed-effect, outcome, and achievement cases, and use Supertest to cover the API contract and decision validation. Frontend tests under `tests/frontend/` use React Testing Library and user-event to cover the timed loop, policy editing, event choices, warnings, and reports. `npm run test:coverage` is expected to report 100% statements, branches, functions, and lines.

The interface uses semantic sections and headings, labeled numeric controls with published ranges, keyboard-visible focus, status/alert regions, and responsive layouts. An open event pauses the timer until the player decides; a completed game stops normal progression.
