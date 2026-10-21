import { describe, expect, it } from "vitest";
import {
  formatIndicator,
  formatMoney,
  formatPercent,
  formatPopulation,
  formatWage,
} from "../../frontend/shared.functions.js";

import {
  INDICATORS
} from "../../frontend/shared.data.js";

describe("indicator formatting and metadata", () => {
  it("formats every indicator value and safely handles non-finite values", () => {
    expect(formatIndicator(1200, "money")).toBe("$1,200");
    expect(formatIndicator(2.5, "percent")).toBe("2.5%");
    expect(formatIndicator(15.25, "wage")).toBe("$15.25/hr");
    expect(formatIndicator(1234567, "population")).toBe("1,234,567");
    expect(formatIndicator(Number.NaN, "money")).toBe("N/A");
    expect(formatMoney(-1000)).toBe("-$1,000");
    expect(formatPercent(1)).toBe("1.0%");
    expect(formatWage(15)).toBe("$15.00/hr");
    expect(formatPopulation(1000)).toBe("1,000");
  });

  it("provides a card configuration for each economic indicator", () => {
    expect(INDICATORS).toHaveLength(12);
    expect(new Set(INDICATORS.map(({ key }) => key)).size).toBe(INDICATORS.length);
  });
});
