import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Express } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const policies = {
  taxRate: 30,
  publicSpending: 250,
  interestRate: 4,
};

afterEach(() => {
  vi.doUnmock("../src/economy.js");
  vi.resetModules();
});

describe("server bootstrap", () => {
  it("serves static fallback paths and forwards unexpected errors", async () => {
    const root = mkdtempSync(join(tmpdir(), "false-economy-"));
    const clientDirectory = join(root, "dist", "client");
    const indexFile = join(clientDirectory, "index.html");
    mkdirSync(clientDirectory, { recursive: true });
    writeFileSync(indexFile, "<!doctype html><title>Economy</title>");
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(root);
    vi.doMock("../src/economy.js", () => ({
      createInitialEconomy: () => ({
        turn: 1,
        gdp: 1000,
        inflation: 2,
        unemployment: 5,
        treasury: 500,
        taxRate: 25,
        publicSpending: 200,
        interestRate: 3,
      }),
      advanceTurn: () => {
        throw new Error("Unexpected simulation failure");
      },
    }));

    try {
      vi.resetModules();
      const { default: app }: { default: Express } = await import("../src/app.js");
      cwd.mockRestore();

      const home = await request(app).get("/");
      expect(home.status).toBe(200);
      expect(home.text).toContain("Economy");

      const spaFallback = await request(app).get("/dashboard");
      expect(spaFallback.status).toBe(200);
      expect(spaFallback.text).toContain("Economy");

      const apiFallback = await request(app).get("/api/unsupported");
      expect(apiFallback.status).toBe(404);

      rmSync(indexFile);
      const staticFallbackError = await request(app).get("/dashboard");
      expect(staticFallbackError.status).toBe(404);

      const unexpectedTurnError = await request(app)
        .post("/api/economy/turn")
        .send(policies);
      expect(unexpectedTurnError.status).toBe(500);

      vi.doUnmock("../src/economy.js");
      const noClientRoot = mkdtempSync(join(tmpdir(), "false-economy-no-client-"));
      const noClientCwd = vi.spyOn(process, "cwd").mockReturnValue(noClientRoot);
      try {
        vi.resetModules();
        const { default: serverOnlyApp }: { default: Express } = await import("../src/app.js");
        noClientCwd.mockRestore();
        const notFound = await request(serverOnlyApp).get("/api/unsupported");
        expect(notFound.status).toBe(404);
      } finally {
        noClientCwd.mockRestore();
        rmSync(noClientRoot, { recursive: true, force: true });
      }
    } finally {
      cwd.mockRestore();
      rmSync(root, { recursive: true, force: true });
    }
  });
});