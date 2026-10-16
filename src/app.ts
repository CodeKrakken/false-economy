import { existsSync } from "node:fs";
import express, { type ErrorRequestHandler } from "express";
import { resolve } from "node:path";
import { advanceTurn, createInitialEconomy } from "./economy.js";

const app = express();
let currentEconomy = createInitialEconomy();

app.use(express.json());

app.get("/api/economy", (_request, response) => {
  response.json(currentEconomy);
});

app.post("/api/economy/reset", (_request, response) => {
  currentEconomy = createInitialEconomy();
  response.json(currentEconomy);
});

app.post("/api/economy/turn", (request, response, next) => {
  const body: unknown = request.body;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    response.status(400).json({
      error: "Request body must be an object containing all three policy fields.",
    });
    return;
  }

  const policies = body as Record<string, unknown>;
  for (const field of ["taxRate", "publicSpending", "interestRate"] as const) {
    if (typeof policies[field] !== "number" || !Number.isFinite(policies[field])) {
      response.status(400).json({ error: `${field} must be a finite number.` });
      return;
    }
  }

  try {
    currentEconomy = advanceTurn(currentEconomy, {
      taxRate: policies.taxRate as number,
      publicSpending: policies.publicSpending as number,
      interestRate: policies.interestRate as number,
    });
    response.json(currentEconomy);
  } catch (error) {
    if (error instanceof RangeError) {
      response.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

const clientDirectory = resolve(process.cwd(), "dist/client");
if (existsSync(clientDirectory)) {
  app.use(express.static(clientDirectory));
  app.use((request, response, next) => {
    if (request.path === "/api" || request.path.startsWith("/api/")) {
      next();
      return;
    }

    response.sendFile("index.html", { root: clientDirectory }, (error) => {
      if (error) next(error);
    });
  });
}

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found." });
});

const jsonErrorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.parse.failed"
  ) {
    response.status(400).json({ error: "Malformed JSON request body." });
    return;
  }

  next(error);
};

app.use(jsonErrorHandler);

export default app;