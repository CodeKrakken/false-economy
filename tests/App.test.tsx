import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getByText("2.0%")).toBeTruthy();
    expect(screen.getByText("5.0%")).toBeTruthy();
    expect(screen.getByText("Turn 1")).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: /tax rate/i })).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: /public spending/i })).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: /interest rate/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /current outlook/i })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Resilient economy");
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

    expect((taxRate as HTMLInputElement).value).toBe("35");
    expect((publicSpending as HTMLInputElement).value).toBe("250");
    expect((interestRate as HTMLInputElement).value).toBe("4");
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

  it("advances once per second with current policies and no turn limit", async () => {
    vi.useFakeTimers();
    let turn = 1;
    let inflation = initialEconomy.inflation;
    const fetchMock = mockFetch(async (input, init) => {
      if (String(input).endsWith("/api/economy/turn")) {
        turn += 1;
        const submittedPolicies = JSON.parse(String(init?.body)) as typeof policies;
        return jsonResponse({ ...initialEconomy, ...submittedPolicies, turn, inflation });
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await flushPendingPromises();
    expect(screen.getByText("Turn 1")).toBeTruthy();

    fireEvent.change(screen.getByRole("spinbutton", { name: /tax rate/i }), {
      target: { value: "35" },
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
    expect(screen.getByText("Turn 2")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Economy under pressure");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({
      taxRate: 35,
    });

    inflation = 2;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(screen.getByText("Turn 8")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Resilient economy");
    expect(fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith("/api/economy/turn"),
    )).toHaveLength(7);
  });

  it("submits selected policies on the next timed turn", async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetch(async (input, init) => {
      if (String(input).endsWith("/api/economy/turn")) {
        const submittedPolicies = JSON.parse(String(init?.body)) as typeof policies;
        return jsonResponse({ ...advancedEconomy, ...submittedPolicies });
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

    expect(await screen.findByText("Turn 1")).toBeTruthy();
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

  it("does not overlap timed turns while a request is pending", async () => {
    vi.useFakeTimers();
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
      if (String(input).endsWith("/api/economy/turn")) {
        return jsonResponse({ error: "taxRate must be between 0 and 60." }, 400);
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
    await flushPendingPromises();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("taxRate must be between");
    expect(screen.getByText("Turn 1")).toBeTruthy();
  });

  it("uses a fallback message for a non-Error turn failure", async () => {
    vi.useFakeTimers();
    mockFetch(async (input) => {
      if (String(input).endsWith("/api/economy/turn")) {
        return Promise.reject("offline");
      }
      return jsonResponse(initialEconomy);
    });

    render(<App />);
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
    await screen.findByText("Turn 1");
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
    await screen.findByText("Turn 1");
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
    const fetchMock = mockFetch(async () => jsonResponse(initialEconomy));

    const { unmount } = render(<App />);
    await flushPendingPromises();
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});