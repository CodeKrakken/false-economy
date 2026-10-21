import { existsSync } from "node:fs";
import express, { type ErrorRequestHandler } from "express";
import { resolve } from "node:path";
import {
  advanceTurn,
  createInitialEconomy,
  resolveEventDecision,
  startGame,
} from "./economy.js";

import { 
  type EventChoice,
  type PolicyInput,
} from '../shared.types.js'

const REQUIRED_POLICY_FIELDS = ["taxRate", "publicSpending", "interestRate"] as const;
const OPTIONAL_POLICY_FIELDS = ["minimumWage", "tariffRate", "energySubsidy"] as const;

function parsePolicyInput(body: unknown): { 
  policyInput: PolicyInput } | { error: string 
} {

  if (
    typeof body !== "object" || 
    body === null || 
    Array.isArray(body)
  ) {
    return { error: "Request body must be an object containing all three policy fields." };
  }

  const values = body as Record<string, unknown>;

  for (const field of REQUIRED_POLICY_FIELDS) {

    if (
      typeof values[field] !== "number" || 
      !Number.isFinite(values[field])
    ) {
      return { error: `${field} must be a finite number.` };
    }
  }

  for (const field of OPTIONAL_POLICY_FIELDS) {
    if (
      field in values &&
      (
        typeof values[field] !== "number" || 
        !Number.isFinite(values[field])
      )
    ) {
      return { error: `${field} must be a finite number.` };
    }
  }

  return {
    policyInput: {
      taxRate         : values.taxRate as number,
      publicSpending  : values.publicSpending as number,
      interestRate    : values.interestRate as number,
      ...(typeof values.minimumWage   === "number" ? { minimumWage    : values.minimumWage    } : {}),
      ...(typeof values.tariffRate    === "number" ? { tariffRate     : values.tariffRate     } : {}),
      ...(typeof values.energySubsidy === "number" ? { energySubsidy  : values.energySubsidy  } : {}),
    },
  };
}

export function createApp(
  random: () => number = Math.random
) {

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

  app.post("/api/economy/start", (request, response, next) => {

    const parsed = parsePolicyInput(request.body);

    if ("error" in parsed) {
      response.status(400).json({ error: parsed.error });
      return;
    }

    try {

      currentEconomy = startGame(currentEconomy, parsed.policyInput);
      response.json(currentEconomy);

    } catch (error) {

      if (error instanceof RangeError) {
        response.status(400).json({ error: error.message });
        return;
      }

      next(error);
    }
  });

  app.post("/api/economy/turn", (request, response, next) => {

    const parsed = parsePolicyInput(request.body);

    if ("error" in parsed) {
      response.status(400).json({ error: parsed.error });
      return;
    }

    if (!currentEconomy.started) {
      response.status(409).json({ error: "Start the game before advancing a turn." });
      return;
    }

    try {
      currentEconomy = advanceTurn(currentEconomy, parsed.policyInput, random);
      response.json(currentEconomy);

    } catch (error) {

      if (error instanceof RangeError) {
        response.status(400).json({ error: error.message });
        return;
      }

      next(error);
    }
  });

  app.post("/api/economy/event", (request, response, next) => {

    const body: unknown = request.body;

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      !("choice" in body) ||
      (body.choice !== "subsidise" && body.choice !== "passThrough")
    ) {
      response.status(400).json({ error: "choice must be subsidise or passThrough." });
      return;
    }

    try {
      currentEconomy = resolveEventDecision(currentEconomy, body.choice as EventChoice);
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
  return app;
}

const app = createApp();
export default app;
