import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EconomicIndicators from "../src/EconomicIndicators";
import { createInitialEconomy } from "../src/economy.js";

describe("EconomicIndicators", () => {
  it("renders the complete indicator grid from supplied economy history", () => {
    const economy = createInitialEconomy();
    render(<EconomicIndicators economy={economy} history={economy.indicatorHistory} />);

    expect(screen.getByRole("heading", { name: "Economic indicators" })).toBeTruthy();
    expect(screen.getAllByRole("img", { name: /history through turn 1/ })).toHaveLength(12);
    expect(screen.getByText("$1,000")).toBeTruthy();
  });
});
