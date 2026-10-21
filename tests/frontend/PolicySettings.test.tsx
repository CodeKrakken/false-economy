import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PolicySettings from "../../frontend/src/PolicySettings";
import type { PolicyInputs } from "../../frontend/shared.types.js";

const policies: PolicyInputs = {
  taxRate: "25",
  publicSpending: "200",
  interestRate: "3",
  minimumWage: "12",
  tariffRate: "5",
  energySubsidy: "0",
};

afterEach(cleanup);

describe("PolicySettings", () => {
  it("renders policy controls and invokes policy and game callbacks", () => {
    const onPolicyChange = vi.fn();
    const onPolicyKeyDown = vi.fn();
    const onStart = vi.fn();
    const onReset = vi.fn();
    render(
      <PolicySettings
        policies={policies}
        started={false}
        activeRequest={null}
        onPolicyChange={onPolicyChange}
        onPolicyKeyDown={onPolicyKeyDown}
        onStart={onStart}
        onReset={onReset}
      />,
    );

    expect(screen.getByText("POLICY DESK / SET BEFORE START")).toBeTruthy();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(6);
    fireEvent.change(screen.getByRole("spinbutton", { name: /tax rate/i }), {
      target: { value: "30" },
    });
    fireEvent.keyDown(screen.getByRole("spinbutton", { name: /tax rate/i }), { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset game" }));

    expect(onPolicyChange).toHaveBeenCalledWith("taxRate", "30");
    expect(onPolicyKeyDown).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("reflects running and busy request states", () => {
    const { rerender } = render(
      <PolicySettings
        policies={policies}
        started={false}
        activeRequest="start"
        onPolicyChange={vi.fn()}
        onPolicyKeyDown={vi.fn()}
        onStart={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Starting..." })).toBeTruthy();
    expect((screen.getByRole("spinbutton", { name: /tax rate/i }) as HTMLInputElement).disabled)
      .toBe(true);
    expect((screen.getByRole("button", { name: "Reset game" }) as HTMLButtonElement).disabled)
      .toBe(true);

    rerender(
      <PolicySettings
        policies={policies}
        started
        activeRequest="reset"
        onPolicyChange={vi.fn()}
        onPolicyKeyDown={vi.fn()}
        onStart={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("POLICY DESK / LIVE LEVERS")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /start game/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Resetting..." })).toBeTruthy();
    expect((screen.getByRole("spinbutton", { name: /tax rate/i }) as HTMLInputElement).disabled)
      .toBe(true);
  });

  it("keeps controls editable during a timed turn and disables buttons", () => {
    render(
      <PolicySettings
        policies={policies}
        started
        activeRequest="advance"
        onPolicyChange={vi.fn()}
        onPolicyKeyDown={vi.fn()}
        onStart={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect((screen.getByRole("spinbutton", { name: /tax rate/i }) as HTMLInputElement).disabled)
      .toBe(false);
    expect((screen.getByRole("button", { name: "Reset game" }) as HTMLButtonElement).disabled)
      .toBe(true);
  });
});
