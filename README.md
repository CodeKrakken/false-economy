# False Economy

A satirical, deterministic policy-strategy game about the trade-offs behind taxation, public services, monetary policy, wages, trade, and energy costs. Choose policies before starting; the live simulation then advances once per second until defeat.

Built to demonstrate my agentic AI skills.

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

## Install and run

```sh
git clone https://github.com/CodeKrakken/false-economy
cd false-economy
npm install
npm run build
npm start
```

## Playing the game

This game is about keeping several pressures under control at the same time. If one number starts sliding badly, it usually means a broader problem is building: weak growth, rising prices, falling approval, or a budget crisis.

| Indicator | Purpose | Tips |
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

A losing direction usually means several indicators are moving together. The safest response is to fix the root pressure first, then stabilise the rest.

An open event pauses the timer until the player decides; a completed game stops normal progression.
