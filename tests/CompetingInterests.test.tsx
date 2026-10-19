import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CompetingInterests from "../src/CompetingInterests";

describe("CompetingInterests", () => {
  it("renders the formatted approval values for each group", () => {
    render(
      <CompetingInterests groups={{ workers: 50, businesses: 25.5, publicSector: 24.5 }} />,
    );

    expect(screen.getByRole("heading", { name: "Competing interests" })).toBeTruthy();
    expect(screen.getByText("Workers")).toBeTruthy();
    expect(screen.getByText("50.0%")).toBeTruthy();
    expect(screen.getByText("Businesses")).toBeTruthy();
    expect(screen.getByText("25.5%")).toBeTruthy();
    expect(screen.getByText("Public sector")).toBeTruthy();
    expect(screen.getByText("24.5%")).toBeTruthy();
  });
});
