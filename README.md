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

Resolves a pending energy-price shock with `{"choice":"subsidise"}` or `{"choice":"passThrough"}`. The endpoint rejects choices when no decision is pending.

### `POST /api/economy/reset`

Restores the initial economy, rules, history, and achievement state.

## Reading The Indicators

This game is about keeping several pressures under control at the same time. If one number starts sliding badly, it usually means a broader problem is building: weak growth, rising prices, falling approval, or a budget crisis.

| Indicator | What it means | If it starts going the wrong way |
| --- | --- | --- |
| GDP | Total output of the economy. A higher number means more goods and services are being produced. | If GDP is falling for several turns, the economy is shrinking. Raise spending a bit, lower tax pressure, and avoid sudden austerity. |
| Inflation | How fast prices are rising. | If inflation climbs too high, reduce pressure on households and businesses: lower spending, protect supply, and avoid overloading wages or tariffs. |
| Unemployment | Share of workers without jobs. | If unemployment rises, support hiring and output. Increase spending, avoid high taxes, and keep productive capacity from collapsing. |
| Average wage | Typical earnings per hour. | If wages are falling, people lose purchasing power. Raise the minimum wage carefully and protect living standards without creating runaway inflation. |
| Treasury | Government cash balance. | If the treasury is shrinking or goes negative, cut wasteful spending, raise revenue, or reduce borrowing. |
| Debt | Money the state owes. | If debt keeps rising, do not keep spending as if revenue is guaranteed. Slow the debt build-up and return to a stable budget. |
| Approval | Public support for the government. | If approval drops, people feel the economy is not working. Lower taxes or costs, improve wellbeing, and reduce unrest before it becomes a political crisis. |
| Population | Total citizens. | If population falls, the economy is in a deep social crisis. Protect wages, wellbeing, public services, and avoid conditions that create collapse. |
| Wellbeing | Broad living-standard and public-satisfaction measure. | If wellbeing falls, inflation, unemployment, and low output are likely hurting daily life. Restore public services, wages, and stability. |
| Productive capacity | The economy's maximum sustainable output. | If capacity falls, investment is too low or the economy is being strained. Restore public investment and avoid prolonged under-spending. |
| Resource reserves | How much energy and material supply remains. | If reserves fall, shortages or rising costs are coming. Protect supply, avoid excessive demand, and respond to shocks before they hit output. |
| Unrest | Social tension and protest risk. | If unrest rises, it is a warning sign. Cut the causes: inflation, low approval, weak wellbeing, and rising unemployment. |

### A simple rule when the economy starts to go bad

Do not chase every indicator at once. Pick the bottleneck that is causing the others to worsen:

- If inflation is high, reduce price pressure before it drives unrest and approval down.
- If GDP or capacity is falling, restore output and investment before the budget crisis deepens.
- If treasury is draining, fix the balance sheet before the political system breaks.
- If approval or unrest is collapsing, protect living standards and jobs quickly.

A losing direction usually means several indicators are moving together. The safest response is to fix the root pressure first, then stabilize the rest.

## Architecture

- `backend/src/economy.ts` defines typed state, policy validation, effects, events, reporting, achievements, and pure turn transitions.
- `backend/src/app.ts` provides the in-memory Express API and injectable random source; `backend/src/server.ts` starts it.
- `frontend/src/App.tsx` renders indicators (including productive capacity and resource reserves), controls, warnings, events, advisers, milestones, and reports; it contains no economic formulas.
- `frontend/src/styles.css` provides the responsive editorial interface.

## Testing And Accessibility

Backend tests under `tests/backend/` exercise deterministic policy, event, delayed-effect, outcome, and achievement cases, and use Supertest to cover the API contract and decision validation. Frontend tests under `tests/frontend/` use React Testing Library and user-event to cover the timed loop, policy editing, event choices, warnings, and reports. `npm run test:coverage` is expected to report 100% statements, branches, functions, and lines.

The interface uses semantic sections and headings, labeled numeric controls with published ranges, keyboard-visible focus, status/alert regions, and responsive layouts. An open event pauses the timer until the player decides; a completed game stops normal progression.
