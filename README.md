# Economy Simulator

A small full-stack policy simulator for exploring how tax, public spending, and interest-rate choices affect a simplified national economy over a five-turn cycle. The browser presents the current indicators and submits policy choices; the server owns all economic calculations and state.

## Features

- GDP, inflation, unemployment, treasury, and turn dashboard.
- Accessible policy inputs with server-side validation.
- Five-turn game cycle, reset action, and a final assessment with visible thresholds.
- Express JSON API and in-memory game state.
- Responsive React interface, with no UI component library.

## Tech Stack

- Node.js, TypeScript, Express 5.
- React 19, Vite 8.
- Vitest, Supertest, React Testing Library, user-event, and jsdom.

## Requirements

- Node.js 24.15 or newer. The project was verified with Node.js 24.20.0.
- npm 11 or newer. The project was verified with npm 11.19.0.

## Install And Run

From the repository root:

```sh
npm ci
```

For local development, run the API and frontend in separate terminals:

```sh
npm run dev:server
```

```sh
npm run dev
```

Open <http://localhost:5173/>. Vite proxies `/api` requests to the backend at `http://localhost:3000`.

Run all backend and frontend tests:

```sh
npm test
```

Build the backend and production frontend:

```sh
npm run build
```

Run the built application from the repository root:

```sh
npm start
```

Open <http://localhost:3000/>. Set `PORT` to use a different server port, for example `PORT=4000 npm start` on Linux or macOS.

## API

All routes use JSON. The server starts with this economy:

```json
{
	"turn": 1,
	"gdp": 1000,
	"inflation": 2,
	"unemployment": 5,
	"treasury": 500,
	"taxRate": 25,
	"publicSpending": 200,
	"interestRate": 3
}
```

### `GET /api/economy`

Returns the current economy.

```sh
curl http://localhost:3000/api/economy
```

### `POST /api/economy/turn`

Advances one turn using all three required policy values. Ranges are tax rate `0–60`, public spending `0–500`, and interest rate `0–20`.

```sh
curl -X POST http://localhost:3000/api/economy/turn \
	-H 'Content-Type: application/json' \
	-d '{"taxRate":30,"publicSpending":250,"interestRate":4}'
```

Example response:

```json
{
	"turn": 2,
	"gdp": 1025,
	"inflation": 1.85,
	"unemployment": 4.75,
	"treasury": 550,
	"taxRate": 30,
	"publicSpending": 250,
	"interestRate": 4
}
```

Invalid, missing, or non-numeric policies return HTTP `400` with a descriptive JSON error, for example:

```json
{"error":"taxRate must be a finite number between 0 and 60."}
```

### `POST /api/economy/reset`

Restores and returns the initial economy.

```sh
curl -X POST http://localhost:3000/api/economy/reset
```

Unknown API routes return HTTP `404` with a JSON error.

## Economic Model

The model is deterministic and intentionally illustrative rather than predictive. Policy values are bounded before a turn is calculated. Let `s` be public spending, `i` the interest rate, `t` the tax rate, and `G` the current GDP:

- GDP growth rate: `0.02 + (s - 200) / 10,000`; next GDP is current GDP multiplied by one plus that rate.
- Inflation: previous inflation plus `s / 1,000` minus `i * 0.1`.
- Unemployment: previous unemployment minus ten times the GDP growth rate, clamped to `0–100`.
- Treasury: previous treasury plus `G * t / 100` minus public spending.

GDP and treasury cannot fall below zero, unemployment is clamped to `0–100`, and calculated indicators are kept finite. The model does not represent sector-level output, debt financing, expectations, time lags, or interactions between households and firms; each relationship is a simple linear rule chosen for clear, repeatable gameplay.

## Architecture

- `src/economy.ts` contains the `Economy` type, initial values, policy validation, and deterministic turn calculation.
- `src/app.ts` defines the Express API, holds the current economy in process memory, and serves `dist/client` when a production build is present.
- `src/server.ts` starts the HTTP listener on `PORT` or `3000`.
- `src/App.tsx` renders the client and calls the API; it contains no economic calculations.
- `vite.config.ts` configures the React plugin, Vitest's jsdom environment, and the development `/api` proxy.

The intended production deployment is one Node service: build the project, then run `npm start`. Express serves both the API and the built frontend from the same origin. A separate frontend host would need to proxy `/api` to the backend (or add an API base URL and configure backend CORS); that deployment mode is not configured here. Economy state is in memory and resets whenever the server restarts, so this setup is suitable for a small simulator/demo rather than durable multi-user sessions.

## Testing And Accessibility

`npm test` runs three groups of tests:

- Economy unit tests cover initial values, deterministic turn results, policy effects, bounds, and invalid policies.
- API tests use Supertest to cover state, reset, turn advancement, malformed requests, errors, and 404s.
- UI tests use jsdom, React Testing Library, and user-event to cover loading, values, policy editing/submission, reset, completion, error states, and keyboard submission.

The interface uses semantic headings and sections, a definition list for indicators, associated labels for all numeric inputs, native form submission and buttons, visible keyboard focus, and status/alert roles for asynchronous feedback. Policy controls include their allowed ranges and are disabled when a request is pending or the cycle is complete.
