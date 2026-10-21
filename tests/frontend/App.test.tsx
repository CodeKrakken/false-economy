import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../frontend/src/App";
import { createInitialEconomy } from "../../backend/src/economy.js";

vi.mock("recharts", async () => {
  const React = await import("react");
  const passthrough = ({ children }: { children?: React.ReactNode }) => children ?? null;
  return {
    CartesianGrid: passthrough,
    Line: passthrough,
    LineChart: ({ children, data }: { children?: React.ReactNode; data?: unknown[] }) => React.createElement(
      "svg",
      { className: "recharts-surface", "data-points": data?.length },
      React.createElement("path", { className: "recharts-line-curve" }),
      children,
    ),
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => React.createElement(
      "div",
      { className: "recharts-responsive-container" },
      children,
    ),
    Tooltip: (props: {
      labelFormatter?: (turn: number) => string;
      formatter?: (value: number) => string;
    }) => {
      props.labelFormatter?.(1);
      props.formatter?.(1);
      return null;
    },
    XAxis: passthrough,
    YAxis: passthrough,
  };
});

const initialEconomy = createInitialEconomy();

const policies = {
  taxRate: 30,
  publicSpending: 250,
  interestRate: 4,
  minimumWage: 12,
  tariffRate: 5,
  energySubsidy: 0,
};

const advancedEconomy = {
  ...initialEconomy,
  turn: 2,
  gdp: 1025,
  growthRate: 2.5,
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

function startedResponse(input: RequestInfo | URL, init?: RequestInit): Response {
  const selected = JSON.parse(String(init?.body)) as typeof policies;
  return jsonResponse({ ...initialEconomy, ...selected, started: true });
}

function mockFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  const fetchMock = vi.fn(handler);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function flushPendingPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Economy Simulator interface", () => {
  it("shows loading feedback before the initial economy arrives", async () => {
    vi.useFakeTimers();
    let resolveRequest!: (response: Response) => void;
    const fetchMock = mockFetch(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    render(<App />);

    expect(screen.getByRole("status").textContent).toMatch(/loading/i);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest(jsonResponse(initialEconomy));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("$1,000")).toBeTruthy();
  });

  it("loads the dashboard and exposes accessible policy labels", async () => {
    mockFetch(async () => jsonResponse(initialEconomy));

    render(<App />);

    expect(await screen.findByRole("heading", { name: /False Economy/i })).toBeTruthy();
    expect(await screen.findByRole("heading", { name: /It's the economy, stupid/i })).toBeTruthy();
    expect(screen.getByText("$1,000")).toBeTruthy();
    expect(screen.getByText("Productive capacity")).toBeTruthy();
    expect(screen.getByText("$1,600")).toBeTruthy();
    expect(screen.getByText("Resource reserves")).toBeTruthy();
    expect(screen.getByText("100.0%")).toBeTruthy();
    expect(screen.getByText("2.0%")).toBeTruthy();
    expect(screen.getByText("5.0%")).toBeTruthy();
    expect(screen.getByText("Average wage")).toBeTruthy();
    expect(screen.getByText("$15.00/hr")).toBeTruthy();
    expect(screen.getByLabelText("Turn 1")).toBeTruthy();
    expect(screen.getByText("NOT STARTED")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start game" })).toBeTruthy();
    expect(screen.queryByText("Turn 1")).toBeNull();
    expect(screen.queryByText("Current turn")).toBeNull();
    expect(screen.getByRole("spinbutton", { name: /tax rate/i })).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: /public spending/i })).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: /interest rate/i })).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: /minimum wage/i })).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: /tariff rate/i })).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: /energy subsidy/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /current outlook/i })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Resilient economy");
    expect(screen.getByText("2.0% growth")).toBeTruthy();
    expect(screen.getByText(/Treasury adviser:/i)).toBeTruthy();
    expect(screen.getByText(/Political adviser:/i)).toBeTruthy();
    expect(screen.getByText("No milestones recorded yet.")).toBeTruthy();
    expect(screen.getAllByRole("img", { name: /history through turn 1/i })).toHaveLength(12);
    expect(screen.getByRole("img", { name: /Gross domestic product history through turn 1/i }))
      .toBeTruthy();
    const graphs = document.getElementById("indicators-title")!.closest("section")!;
    const policy = document.getElementById("policy-title")!.closest("section")!;
    const interests = document.getElementById("groups-title")!.closest("section")!;
    expect(graphs.compareDocumentPosition(policy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(policy.compareDocumentPosition(interests) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("updates policy inputs from user changes", async () => {
    const user = userEvent.setup();
    mockFetch(async () => jsonResponse(initialEconomy));

    render(<App />);

    const taxRate = await screen.findByRole("spinbutton", { name: /tax rate/i });
    await user.clear(taxRate);
    expect((taxRate as HTMLInputElement).value).toBe("");
    await user.type(taxRate, "35");
    const publicSpending = screen.getByRole("spinbutton", { name: /public spending/i });
    await user.clear(publicSpending);
    expect((publicSpending as HTMLInputElement).value).toBe("");
    await user.type(publicSpending, "250");
    const interestRate = screen.getByRole("spinbutton", { name: /interest rate/i });
    await user.clear(interestRate);
    expect((interestRate as HTMLInputElement).value).toBe("");
    await user.type(interestRate, "0");
    expect((interestRate as HTMLInputElement).value).toBe("0");
    await user.clear(interestRate);
    expect((interestRate as HTMLInputElement).value).toBe("");
    await user.type(interestRate, "4");
    const minimumWage = screen.getByRole("spinbutton", { name: /minimum wage/i });
    await user.clear(minimumWage);
    await user.type(minimumWage, "15");
    const tariffRate = screen.getByRole("spinbutton", { name: /tariff rate/i });
    await user.clear(tariffRate);
    await user.type(tariffRate, "10");
    const energySubsidy = screen.getByRole("spinbutton", { name: /energy subsidy/i });
    await user.clear(energySubsidy);
    await user.type(energySubsidy, "20");

    expect((taxRate as HTMLInputElement).value).toBe("35");
    expect((publicSpending as HTMLInputElement).value).toBe("250");
    expect((interestRate as HTMLInputElement).value).toBe("4");
    expect((minimumWage as HTMLInputElement).value).toBe("15");
    expect((tariffRate as HTMLInputElement).value).toBe("10");
    expect((energySubsidy as HTMLInputElement).value).toBe("20");
  });

  it("shows warnings when indicators approach crisis conditions", async () => {
    const pressured = {
      ...initialEconomy,
      inflation: 6,
      unemployment: 9,
      treasury: -1,
      gdp: 550,
      population: 500_000,
      approval: 30,
      unrest: 60,
    };
    mockFetch(async () => jsonResponse(pressured));

    render(<App />);

    expect((await screen.findByRole("region", { name: /warnings/i })).textContent)
      .toContain("Low approval and high unrest");
    expect(screen.getByText(/GDP is close to collapse/i)).toBeTruthy();
  });

  it("formats invalid indicator values safely and renders a graph for each indicator", async () => {
    const unusualEconomy = {
      ...initialEconomy,
      gdp: -1250,
      inflation: Number.NaN,
      started: true,
    };
    mockFetch(async () => jsonResponse(unusualEconomy));

    const { container } = render(<App />);

    expect(await screen.findByText("-$1,250")).toBeTruthy();
    expect(screen.getByText("N/A")).toBeTruthy();
    expect(container.querySelectorAll("svg.recharts-surface")).toHaveLength(12);
  });

  it("renders persisted multi-turn history with the latest value", async () => {
    const firstSnapshot = {
      turn: 1,
      gdp: 1000,
      inflation: 2,
      unemployment: 5,
      averageWage: 15,
      treasury: 500,
      debt: 0,
      approval: 60,
      population: 1_000_000,
      wellbeing: 60,
      productiveCapacity: 1600,
      resourceReserves: 100,
      unrest: 20,
    };
    const secondSnapshot = {
      ...firstSnapshot,
      turn: 2,
      gdp: advancedEconomy.gdp,
    };
    mockFetch(async () => jsonResponse({
      ...advancedEconomy,
      indicatorHistory: [firstSnapshot, secondSnapshot],
    }));

    const { container } = render(<App />);

    expect(await screen.findByText("$1,025")).toBeTruthy();
    expect(screen.getByRole("img", {
      name: "Gross domestic product history through turn 2",
    })).toBeTruthy();
    expect(container.querySelectorAll('svg[data-points="2"]')).toHaveLength(12);
  });

  it("lets the player resolve a pending energy event", async () => {
    const user = userEvent.setup();
    const pendingEconomy = {
      ...initialEconomy,
      started: true,
      pendingEvent: {
        type: "energyShock" as const,
        title: "Energy prices jump",
        description: "A global supply squeeze pushes household energy costs higher.",
        requiresDecision: true,
      },
    };
    const resolvedEconomy = { ...pendingEconomy, pendingEvent: null, treasury: 400 };
    const fetchMock = mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/event")) return jsonResponse(resolvedEconomy);
      return jsonResponse(pendingEconomy);
    });

    render(<App />);
    expect(await screen.findByRole("heading", { name: /energy prices jump/i })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /subsidise household bills/i }));

    expect(await screen.findByText("$400")).toBeTruthy();
    const decisionCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/api/economy/event"),
    );
    expect(JSON.parse(String(decisionCall?.[1]?.body))).toStrictEqual({ choice: "subsidise" });
  });

  it("lets the player pass energy costs through to households", async () => {
    const user = userEvent.setup();
    const pendingEconomy = {
      ...initialEconomy,
      started: true,
      pendingEvent: {
        type: "energyShock" as const,
        title: "Energy prices jump",
        description: "A global supply squeeze pushes household energy costs higher.",
        requiresDecision: true,
      },
    };
    const fetchMock = mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/event")) {
        return jsonResponse({ ...pendingEconomy, pendingEvent: null });
      }
      return jsonResponse(pendingEconomy);
    });

    render(<App />);
    await screen.findByRole("heading", { name: /energy prices jump/i });
    await user.click(screen.getByRole("button", { name: /pass costs through/i }));

    const decisionCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/api/economy/event"),
    );
    expect(JSON.parse(String(decisionCall?.[1]?.body))).toStrictEqual({ choice: "passThrough" });
  });

  it("shows event decision errors from the server", async () => {
    const user = userEvent.setup();
    const pendingEconomy = {
      ...initialEconomy,
      started: true,
      pendingEvent: {
        type: "energyShock" as const,
        title: "Energy prices jump",
        description: "A global supply squeeze pushes household energy costs higher.",
        requiresDecision: true,
      },
    };
    mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/event")) {
        return jsonResponse({ error: "Decision unavailable" }, 503);
      }
      return jsonResponse(pendingEconomy);
    });

    render(<App />);
    await screen.findByRole("heading", { name: /energy prices jump/i });
    await user.click(screen.getByRole("button", { name: /subsidise household bills/i }));

    expect((await screen.findByRole("alert")).textContent).toContain("Decision unavailable");
  });

  it("uses a fallback message for a non-Error event request failure", async () => {
    const user = userEvent.setup();
    const pendingEconomy = {
      ...initialEconomy,
      started: true,
      pendingEvent: {
        type: "energyShock" as const,
        title: "Energy prices jump",
        description: "A global supply squeeze pushes household energy costs higher.",
        requiresDecision: true,
      },
    };
    mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/event")) return Promise.reject("offline");
      return jsonResponse(pendingEconomy);
    });

    render(<App />);
    await screen.findByRole("heading", { name: /energy prices jump/i });
    await user.click(screen.getByRole("button", { name: /subsidise household bills/i }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Unable to apply the event decision.",
    );
  });

  it("ignores a duplicate event decision while the first is pending", async () => {
    let resolveDecision!: (response: Response) => void;
    const pendingEconomy = {
      ...initialEconomy,
      started: true,
      pendingEvent: {
        type: "energyShock" as const,
        title: "Energy prices jump",
        description: "A global supply squeeze pushes household energy costs higher.",
        requiresDecision: true,
      },
    };
    const fetchMock = mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/event")) {
        return new Promise((resolve) => {
          resolveDecision = resolve;
        });
      }
      return jsonResponse(pendingEconomy);
    });

    render(<App />);
    await screen.findByRole("heading", { name: /energy prices jump/i });
    const subsidise = screen.getByRole("button", { name: /subsidise household bills/i });
    const passThrough = screen.getByRole("button", { name: /pass costs through/i });
    act(() => {
      fireEvent.click(subsidise);
      fireEvent.click(passThrough);
    });

    expect(fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith("/api/economy/event"),
    )).toHaveLength(1);
    resolveDecision(jsonResponse({ ...pendingEconomy, pendingEvent: null }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it("shows achievements and the final report after a game outcome", async () => {
    const completedEconomy = {
      ...initialEconomy,
      started: true,
      achievements: ["balancedBudget", "priceStability"],
      outcome: {
        kind: "defeat" as const,
        reason: "Sustained severe public anger and economic crisis have overthrown the government.",
        endedTurn: 4,
        report: {
          reason: "Sustained severe public anger and economic crisis have overthrown the government.",
          gdpChange: -100,
          inflationChange: 3,
          treasuryChange: -1200,
          populationChange: -5000,
          approval: 28,
          unrest: 74,
          history: [{ turn: 3, type: "event" as const, text: "Tax windfall", eventType: "taxWindfall" as const }],
        },
      },
    };
    mockFetch(async () => jsonResponse(completedEconomy));

    render(<App />);

    expect(await screen.findByRole("heading", { name: /final report/i })).toBeTruthy();
    expect(screen.getByText(/overthrown the government/i)).toBeTruthy();
    expect(screen.getByText("Balanced budget")).toBeTruthy();
    expect(screen.getByText("Price stability")).toBeTruthy();
    expect(screen.getByText(/Population change/i)).toBeTruthy();
  });

  it("keeps focus on empty or invalid inputs and blurs valid values on Enter", async () => {
    const user = userEvent.setup();
    mockFetch(async () => jsonResponse(initialEconomy));

    render(<App />);
    const taxRate = await screen.findByRole("spinbutton", { name: /tax rate/i });

    taxRate.focus();
    await user.clear(taxRate);
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(taxRate);

    fireEvent.change(taxRate, { target: { value: "99" } });
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(taxRate);

    fireEvent.change(taxRate, { target: { value: "25" } });
    await user.keyboard("{Enter}");
    expect(document.activeElement).not.toBe(taxRate);
  });

  it("does not advance until the player starts with the selected policies", async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetch(async (input, init) => {
      if (String(input).endsWith("/api/economy/start")) return startedResponse(input, init);
      if (String(input).endsWith("/api/economy/turn")) {
        return jsonResponse({ ...advancedEconomy, started: true });
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await flushPendingPromises();
    fireEvent.change(screen.getByRole("spinbutton", { name: /tax rate/i }), {
      target: { value: "35" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith("/api/economy/turn"),
    )).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    await flushPendingPromises();
    const startRequest = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/api/economy/start"),
    );
    expect(JSON.parse(String(startRequest?.[1]?.body))).toMatchObject({ taxRate: 35 });
    expect(screen.queryByRole("button", { name: "Start game" })).toBeNull();
    expect(screen.getByText("LIVE CYCLE")).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith("/api/economy/turn"),
    )).toHaveLength(1);
  });

  it("shows start errors returned by the API", async () => {
    const user = userEvent.setup();
    mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/start")) {
        return jsonResponse({ error: "Policy rejected" }, 400);
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await screen.findByLabelText("Turn 1");
    await user.click(screen.getByRole("button", { name: "Start game" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Policy rejected");
    expect(screen.getByRole("button", { name: "Start game" })).toBeTruthy();
  });

  it("shows a fallback when starting fails without an Error object", async () => {
    const user = userEvent.setup();
    mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/start")) return Promise.reject("offline");
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await screen.findByLabelText("Turn 1");
    await user.click(screen.getByRole("button", { name: "Start game" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Unable to start the game.");
  });

  it("ignores a duplicate start while the first request is pending", async () => {
    let resolveStart!: (response: Response) => void;
    const fetchMock = mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/start")) {
        return new Promise((resolve) => {
          resolveStart = resolve;
        });
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await screen.findByLabelText("Turn 1");
    const startButton = screen.getByRole("button", { name: "Start game" });
    act(() => {
      fireEvent.click(startButton);
      fireEvent.click(startButton);
    });

    expect(fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith("/api/economy/start"),
    )).toHaveLength(1);
    await act(async () => {
      resolveStart(jsonResponse({ ...initialEconomy, started: true }));
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it("advances once per second with current policies and no turn limit", async () => {
    vi.useFakeTimers();
    let turn = 1;
    let inflation = initialEconomy.inflation;
    const fetchMock = mockFetch(async (input, init) => {
      if (String(input).endsWith("/api/economy/start")) return startedResponse(input, init);
      if (String(input).endsWith("/api/economy/turn")) {
        turn += 1;
        const submittedPolicies = JSON.parse(String(init?.body)) as typeof policies;
        return jsonResponse({ ...initialEconomy, ...submittedPolicies, turn, inflation, started: true });
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await flushPendingPromises();
    expect(screen.getByLabelText("Turn 1")).toBeTruthy();

    fireEvent.change(screen.getByRole("spinbutton", { name: /tax rate/i }), {
      target: { value: "35" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start game" }));
      await flushPendingPromises();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith("/api/economy/turn"),
    )).toHaveLength(0);

    inflation = 9;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByLabelText("Turn 2")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Economy under pressure");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({
      taxRate: 35,
    });

    inflation = 2;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(screen.getByLabelText("Turn 8")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Resilient economy");
    expect(screen.getByRole("img", { name: /Gross domestic product history through turn 8/i }))
      .toBeTruthy();
    expect(fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith("/api/economy/turn"),
    )).toHaveLength(7);
  });

  it("submits selected policies on the next timed turn", async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetch(async (input, init) => {
      if (String(input).endsWith("/api/economy/start")) return startedResponse(input, init);
      if (String(input).endsWith("/api/economy/turn")) {
        const submittedPolicies = JSON.parse(String(init?.body)) as typeof policies;
        return jsonResponse({ ...advancedEconomy, ...submittedPolicies, started: true });
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await flushPendingPromises();
    const taxRate = screen.getByRole("spinbutton", { name: /tax rate/i });
    fireEvent.change(taxRate, { target: { value: "" } });
    const publicSpending = screen.getByRole("spinbutton", { name: /public spending/i });
    fireEvent.change(publicSpending, { target: { value: "250" } });
    const interestRate = screen.getByRole("spinbutton", { name: /interest rate/i });
    fireEvent.change(interestRate, { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    await flushPendingPromises();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByText("$1,025")).toBeTruthy();
    expect((taxRate as HTMLInputElement).value).toBe("");
    const turnRequest = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/api/economy/turn"),
    );
    expect(turnRequest?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(turnRequest?.[1]?.body))).toStrictEqual({
      ...policies,
      taxRate: 0,
    });
  });

  it("resets economy values and policy controls", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(async (input, init) => {
      if (String(input).endsWith("/api/economy/start")) return startedResponse(input, init);
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
    await user.click(screen.getByRole("button", { name: /reset game/i }));

    expect(await screen.findByLabelText("Turn 1")).toBeTruthy();
    expect((screen.getByRole("spinbutton", { name: /tax rate/i }) as HTMLInputElement).value)
      .toBe("25");
    expect((screen.getByRole("spinbutton", { name: /public spending/i }) as HTMLInputElement).value)
      .toBe("200");
    expect((screen.getByRole("spinbutton", { name: /interest rate/i }) as HTMLInputElement).value)
      .toBe("3");
    expect(screen.getAllByRole("img", { name: /history through turn 1/i })).toHaveLength(12);
    expect(fetchMock.mock.calls.some(([input]) =>
      String(input).endsWith("/api/economy/reset"),
    )).toBe(true);
  });

  it("does not overlap timed turns while a request is pending", async () => {
    vi.useFakeTimers();
    let resolveTurn!: (response: Response) => void;
    const fetchMock = mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/start")) {
        return jsonResponse({ ...initialEconomy, started: true });
      }
      if (String(input).endsWith("/api/economy/turn")) {
        return new Promise((resolve) => {
          resolveTurn = resolve;
        });
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await flushPendingPromises();
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    await flushPendingPromises();
    const resetButton = screen.getByRole("button", { name: /reset game/i });
    const taxRate = screen.getByRole("spinbutton", { name: /tax rate/i });
    taxRate.focus();
    act(() => {
      vi.advanceTimersByTime(1000);
      fireEvent.click(resetButton);
    });
    expect((taxRate as HTMLInputElement).disabled).toBe(false);
    fireEvent.change(taxRate, { target: { value: "35" } });
    expect(document.activeElement).toBe(taxRate);
    expect(fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith("/api/economy/turn"),
    )).toHaveLength(1);
    expect((resetButton as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock.mock.calls.some(([input]) =>
      String(input).endsWith("/api/economy/reset"),
    )).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith("/api/economy/turn"),
    )).toHaveLength(1);

    resolveTurn(jsonResponse(advancedEconomy));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect((taxRate as HTMLInputElement).value).toBe("35");
    expect(document.activeElement).toBe(taxRate);
  });

  it("shows an API error when the initial economy cannot be loaded", async () => {
    mockFetch(async () => jsonResponse({ error: "Service unavailable" }, 503));

    render(<App />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Service unavailable");
  });

  it("does not start the timed loop when the initial load fails", async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetch(async () => jsonResponse({ error: "Unavailable" }, 503));

    render(<App />);
    await flushPendingPromises();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses the status fallback when an error response has no string message", async () => {
    mockFetch(async () => jsonResponse({ error: 42 }, 503));

    render(<App />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Request failed with status 503.",
    );
  });

  it("reports unreadable JSON from the server", async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("invalid JSON");
      },
    }) as Response);

    render(<App />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "The server returned an unreadable response.",
    );
  });

  it("uses a fallback message for a non-Error initial request failure", async () => {
    mockFetch(async () => Promise.reject("offline"));

    render(<App />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Unable to load the economy.",
    );
  });

  it("uses the unavailable fallback for an empty initial request error", async () => {
    mockFetch(async () => Promise.reject(new Error("")));

    render(<App />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Economy unavailable.",
    );
  });

  it("ignores the initial response when the component unmounts", async () => {
    let resolveRequest!: (response: Response) => void;
    mockFetch(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const { unmount } = render(<App />);
    unmount();

    await act(async () => {
      resolveRequest(jsonResponse(initialEconomy));
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it("ignores an initial request failure when the component unmounts", async () => {
    let rejectRequest!: (error: unknown) => void;
    mockFetch(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject;
        }),
    );

    const { unmount } = render(<App />);
    unmount();

    await act(async () => {
      rejectRequest("offline");
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it("shows an API error when advancing a turn fails", async () => {
    vi.useFakeTimers();
    mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/start")) {
        return jsonResponse({ ...initialEconomy, started: true });
      }
      if (String(input).endsWith("/api/economy/turn")) {
        return jsonResponse({ error: "taxRate must be between 0 and 60." }, 400);
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await flushPendingPromises();
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    await flushPendingPromises();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("taxRate must be between");
    expect(screen.getByLabelText("Turn 1")).toBeTruthy();
  });

  it("uses a fallback message for a non-Error turn failure", async () => {
    vi.useFakeTimers();
    mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/start")) {
        return jsonResponse({ ...initialEconomy, started: true });
      }
      if (String(input).endsWith("/api/economy/turn")) {
        return Promise.reject("offline");
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await flushPendingPromises();
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    await flushPendingPromises();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByRole("alert").textContent).toContain(
      "Unable to advance the economy.",
    );
  });

  it("uses a fallback message when resetting fails with a non-Error", async () => {
    const user = userEvent.setup();
    mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/reset")) {
        return Promise.reject("offline");
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await screen.findByLabelText("Turn 1");
    await user.click(screen.getByRole("button", { name: /reset game/i }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Unable to reset the economy.",
    );
  });

  it("shows the server message when resetting fails", async () => {
    const user = userEvent.setup();
    mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/reset")) {
        return jsonResponse({ error: "Reset unavailable" }, 503);
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await screen.findByLabelText("Turn 1");
    await user.click(screen.getByRole("button", { name: /reset game/i }));

    expect((await screen.findByRole("alert")).textContent).toContain("Reset unavailable");
  });

  it("activates the retry control after the initial request fails", async () => {
    mockFetch(async () => jsonResponse({ error: "Service unavailable" }, 503));

    render(<App />);
    await screen.findByRole("alert");
    const reload = vi.fn();
    vi.stubGlobal("window", new Proxy(window, {
      get(target, property, receiver) {
        if (property === "location") return { reload };
        return Reflect.get(target, property, receiver);
      },
    }));
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(reload).toHaveBeenCalledOnce();
  });

  it("clears the timed loop when the dashboard unmounts", async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetch(async (input, init) => {
      if (String(input).endsWith("/api/economy/start")) return startedResponse(input, init);
      return jsonResponse(initialEconomy);
    });

    const { unmount } = render(<App />);
    await flushPendingPromises();
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    await flushPendingPromises();
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith("/api/economy/turn"),
    )).toHaveLength(0);
  });
});