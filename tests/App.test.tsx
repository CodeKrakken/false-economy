import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";

const initialEconomy = {
  turn: 1,
  gdp: 1000,
  inflation: 2,
  unemployment: 5,
  treasury: 500,
  taxRate: 25,
  publicSpending: 200,
  interestRate: 3,
};

const policies = {
  taxRate: 30,
  publicSpending: 250,
  interestRate: 4,
};

const advancedEconomy = {
  turn: 2,
  gdp: 1025,
  inflation: 1.85,
  unemployment: 4.75,
  treasury: 550,
  ...policies,
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function mockFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  const fetchMock = vi.fn(handler);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Economy Simulator interface", () => {
  it("shows loading feedback before the initial economy arrives", async () => {
    let resolveRequest!: (response: Response) => void;
    mockFetch(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    render(<App />);

    expect(screen.getByRole("status").textContent).toMatch(/loading/i);
    resolveRequest(jsonResponse(initialEconomy));

    expect(await screen.findByText("$1,000")).toBeTruthy();
  });

  it("loads the dashboard and exposes accessible policy labels", async () => {
    mockFetch(async () => jsonResponse(initialEconomy));

    render(<App />);

    expect(await screen.findByRole("heading", { name: /economy dashboard/i })).toBeTruthy();
    expect(screen.getByText("$1,000")).toBeTruthy();
    expect(screen.getByText("2.0%")).toBeTruthy();
    expect(screen.getByText("5.0%")).toBeTruthy();
    expect(screen.getByText("Turn 1 of 5")).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: /tax rate/i })).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: /public spending/i })).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: /interest rate/i })).toBeTruthy();
  });

  it("updates policy inputs from user changes", async () => {
    const user = userEvent.setup();
    mockFetch(async () => jsonResponse(initialEconomy));

    render(<App />);

    const taxRate = await screen.findByRole("spinbutton", { name: /tax rate/i });
    await user.clear(taxRate);
    await user.type(taxRate, "35");
    const publicSpending = screen.getByRole("spinbutton", { name: /public spending/i });
    await user.clear(publicSpending);
    await user.type(publicSpending, "250");
    const interestRate = screen.getByRole("spinbutton", { name: /interest rate/i });
    await user.clear(interestRate);
    await user.type(interestRate, "4");

    expect((taxRate as HTMLInputElement).value).toBe("35");
    expect((publicSpending as HTMLInputElement).value).toBe("250");
    expect((interestRate as HTMLInputElement).value).toBe("4");
  });

  it("allows advancing a turn from the keyboard", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/turn")) {
        return jsonResponse(advancedEconomy);
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await screen.findByText("$1,000");
    const taxRate = screen.getByRole("spinbutton", { name: /tax rate/i });
    taxRate.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByText("$1,025")).toBeTruthy();
    expect(fetchMock.mock.calls.some(([input]) =>
      String(input).endsWith("/api/economy/turn"),
    )).toBe(true);
  });

  it("submits selected policies and displays the returned economy", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(async (input, init) => {
      if (String(input).endsWith("/api/economy/turn")) {
        return jsonResponse(advancedEconomy);
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await screen.findByText("$1,000");
    const taxRate = screen.getByRole("spinbutton", { name: /tax rate/i });
    await user.clear(taxRate);
    await user.type(taxRate, "30");
    const publicSpending = screen.getByRole("spinbutton", { name: /public spending/i });
    await user.clear(publicSpending);
    await user.type(publicSpending, "250");
    const interestRate = screen.getByRole("spinbutton", { name: /interest rate/i });
    await user.clear(interestRate);
    await user.type(interestRate, "4");
    await user.click(screen.getByRole("button", { name: /advance turn/i }));

    expect(await screen.findByText("$1,025")).toBeTruthy();
    const turnRequest = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/api/economy/turn"),
    );
    expect(turnRequest?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(turnRequest?.[1]?.body))).toStrictEqual({
      ...policies,
    });
  });

  it("resets economy values and policy controls", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(async (input, init) => {
      if (String(input).endsWith("/api/economy/reset")) {
        return jsonResponse(initialEconomy);
      }
      if (String(input).endsWith("/api/economy/turn")) {
        return jsonResponse(advancedEconomy);
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await screen.findByText("$1,000");
    await user.click(screen.getByRole("button", { name: /advance turn/i }));
    await screen.findByText("$1,025");
    await user.click(screen.getByRole("button", { name: /reset game/i }));

    expect(await screen.findByText("Turn 1 of 5")).toBeTruthy();
    expect((screen.getByRole("spinbutton", { name: /tax rate/i }) as HTMLInputElement).value)
      .toBe("25");
    expect((screen.getByRole("spinbutton", { name: /public spending/i }) as HTMLInputElement).value)
      .toBe("200");
    expect((screen.getByRole("spinbutton", { name: /interest rate/i }) as HTMLInputElement).value)
      .toBe("3");
    expect(fetchMock.mock.calls.some(([input]) =>
      String(input).endsWith("/api/economy/reset"),
    )).toBe(true);
  });

  it("prevents duplicate turn submissions while a request is pending", async () => {
    const user = userEvent.setup();
    let resolveTurn!: (response: Response) => void;
    const fetchMock = mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/turn")) {
        return new Promise((resolve) => {
          resolveTurn = resolve;
        });
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await screen.findByText("$1,000");
    const advanceButton = screen.getByRole("button", { name: /advance turn/i });
    await user.click(advanceButton);

    expect((advanceButton as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith("/api/economy/turn"),
    )).toHaveLength(1);

    resolveTurn(jsonResponse(advancedEconomy));
    await screen.findByText("$1,025");
  });

  it("shows a final assessment and disables advancing after turn five", async () => {
    const user = userEvent.setup();
    let economy = { ...initialEconomy };
    mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/turn")) {
        economy = { ...economy, turn: economy.turn + 1 };
      } else if (String(input).endsWith("/api/economy/reset")) {
        economy = { ...initialEconomy };
      }
      return jsonResponse(economy);
    });

    render(<App />);
    await screen.findByText("Turn 1 of 5");
    for (let turn = 1; turn < 5; turn += 1) {
      await user.click(screen.getByRole("button", { name: /advance turn/i }));
      await screen.findByText(`Turn ${turn + 1} of 5`);
    }

    expect(await screen.findByRole("heading", { name: /final assessment/i })).toBeTruthy();
    expect(screen.getByText(/resilient economy/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /advance turn/i })).toHaveProperty("disabled", true);
    expect(screen.getByText(/inflation.*5%.*unemployment.*8%.*GDP.*treasury/i)).toBeTruthy();
  });

  it("shows an API error when the initial economy cannot be loaded", async () => {
    mockFetch(async () => jsonResponse({ error: "Service unavailable" }, 503));

    render(<App />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Service unavailable");
  });

  it("shows an API error when advancing a turn fails", async () => {
    const user = userEvent.setup();
    mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/turn")) {
        return jsonResponse({ error: "taxRate must be between 0 and 60." }, 400);
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await screen.findByText("Turn 1 of 5");
    await user.click(screen.getByRole("button", { name: /advance turn/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("taxRate must be between");
    expect(screen.getByText("Turn 1 of 5")).toBeTruthy();
  });
});