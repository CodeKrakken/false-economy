# False Economy

A satirical, deterministic policy-strategy game about the trade-offs behind taxation, public services, monetary policy, wages, trade, and energy costs. Choose policies before starting; the live simulation then advances once per second until defeat.

Built to demonstrate my agentic AI skills. Based on WORLD3, Keynesian economics and Goodwin's class-struggle model. 

## Features

- Six policy levers with bounded inputs and immediate, delayed, and distributional effects.
- GDP, growth, inflation, unemployment, treasury, debt, population, wellbeing, approval, and unrest.
- Separate worker, business, and public-sector approval.
- Scheduled public-investment returns and interval-based economic/political events.
- State-based newspaper headlines, treasury and political advisers, warnings, milestones, and a final defeat report.
- Configurable defeat thresholds, plus grace periods for recoverable crises.
- Responsive React dashboard and Express JSON API; the server owns game state and calculations.
- An open event pauses the game for a user decision.
- The game ends when the economy is no longer sustainable.

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

| Indicator  | Tips |
| --- | --- | --- |
| GDP | If GDP falls, raise public spending and lower taxes |
| Inflation | If inflation climbs too high, lower public spending, raise taxes, lower minimum wage and reduce tariffs |
| Unemployment | If unemployment rises, raise public spending and lower taxes |
| Average wage | If wages are falling, raise the minimum wage gradually |
| Treasury | If the treasury is shrinking, cut public spending and raise taxes |
| Public debt | If debt keeps rising, raise taxes, cut public spending, and raise the interest rate |
| Public approval | If approval drops, lower taxes, raise public spending, and increase the minimum wage. |
| Population | If population falls, raise the minimum wage, lower taxes, increase public spending and increase energy subsidies |
| Wellbeing | If wellbeing falls, raise the minimum wage, increase public spending, lower taxes and increase energy subsidies |
| Productive capacity | If capacity falls, raise public spending, lower taxes, and increase energy subsidies |
| Resource reserves | If reserves fall, increase energy subsidies, reduce tariffs, and lower public spending |
| Social unrest | If unrest rises, lower taxes, raise public spending, raise the minimum wage and reduce tariffs |
