import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PolicyControl from "../src/PolicyControl";

describe("PolicyControl", () => {
  it("renders the policy input details and reports changed values", () => {
    const onChange = vi.fn();
    const onKeyDown = vi.fn();
    render(
      <PolicyControl
        id="tax-rate"
        label="Tax rate"
        unit="%"
        min={0}
        max={60}
        range="0—60%"
        note="Revenue for the state."
        value="25"
        disabled={false}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />,
    );

    const input = screen.getByRole("spinbutton", { name: "Tax rate (%)" });
    expect(input.getAttribute("min")).toBe("0");
    expect(input.getAttribute("max")).toBe("60");
    expect(input.getAttribute("step")).toBe("any");
    expect((input as HTMLInputElement).value).toBe("25");
    expect(screen.getByText("0—60%")).toBeTruthy();
    expect(screen.getByText("Revenue for the state.")).toBeTruthy();

    fireEvent.change(input, { target: { value: "35" } });
    expect(onChange).toHaveBeenCalledWith("35");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it("disables the policy input when requested", () => {
    render(
      <PolicyControl
        id="interest-rate"
        label="Interest rate"
        unit="%"
        min={0}
        max={20}
        range="0—20%"
        note="Can cool prices."
        value="4"
        disabled
        onChange={vi.fn()}
        onKeyDown={vi.fn()}
      />,
    );

    expect((screen.getByRole("spinbutton", { name: "Interest rate (%)" }) as HTMLInputElement)
      .disabled).toBe(true);
  });
});
