import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import IndicatorCard from "../../frontend/src/IndicatorCard";
import { createInitialEconomy } from "../../backend/src/economy.js";
import { INDICATORS } from "../../frontend/src/indicators";

vi.mock("recharts", async () => {
  const React = await import("react");
  const passthrough = ({ children }: { children?: React.ReactNode }) => children ?? null;
  return {
    CartesianGrid: passthrough,
    Line: passthrough,
    LineChart: ({ children, data }: { children?: React.ReactNode; data?: unknown[] }) =>
      React.createElement("svg", { "data-points": data?.length }, children),
    ResponsiveContainer: passthrough,
    Tooltip: (props: { labelFormatter?: (turn: number) => string; formatter?: (value: number) => string }) => {
      props.labelFormatter?.(1);
      props.formatter?.(1);
      return null;
    },
    XAxis: passthrough,
    YAxis: passthrough,
  };
});

afterEach(cleanup);

describe("IndicatorCard", () => {
  it("renders a GDP chart with a point for one history entry", () => {
    const economy = createInitialEconomy();
    render(
      <dl>
        <IndicatorCard
          economy={{ ...economy, growthRate: 2 }}
          history={economy.indicatorHistory}
          indicator={INDICATORS[0]}
        />
      </dl>,
    );

    expect(screen.getByRole("img", {
      name: "Gross domestic product history through turn 1",
    })).toBeTruthy();
    expect(screen.getByText("$1,000")).toBeTruthy();
    expect(screen.getByText("GDP")).toBeTruthy();
    expect(screen.getByText("2.0% growth")).toBeTruthy();
  });

  it("renders a non-GDP card with multiple history entries and no growth readout", () => {
    const economy = createInitialEconomy();
    const history = [
      ...economy.indicatorHistory,
      { ...economy.indicatorHistory[0], turn: 2, inflation: 3 },
    ];
    render(
      <dl>
        <IndicatorCard
          economy={{ ...economy, turn: 2 }}
          history={history}
          indicator={INDICATORS[1]}
        />
      </dl>,
    );

    expect(screen.getByRole("img", { name: "Inflation history through turn 2" })).toBeTruthy();
    expect(screen.getByText("2.0%")).toBeTruthy();
    expect(screen.queryByText(/growth/)).toBeNull();
  });
});
