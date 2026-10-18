import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp(() => 1);

const initialEconomy = {
  turn: 1,
  started: false,
  gdp: 1000,
  growthRate: 2,
  inflation: 2,
  unemployment: 5,
  treasury: 500,
  taxRate: 25,
  publicSpending: 200,
  interestRate: 3,
  minimumWage: 12,
  averageWage: 15,
  tariffRate: 5,
  energySubsidy: 0,
  approval: 60,
  debt: 0,
  population: 1_000_000,
  wellbeing: 60,
  unrest: 20,
  productiveCapacity: 1600,
  resourceReserves: 100,
  groups: { workers: 60, businesses: 60, publicSector: 60 },
  pendingEffects: [],
  pendingEvent: null,
  overthrowRiskTurns: 0,
  insolvencyTurns: 0,
  collapseTurns: 0,
  headline: "A new government inherits steady foundations",
  history: [],
  achievements: [],
  outcome: null,
  gameStart: { gdp: 1000, inflation: 2, treasury: 500, population: 1_000_000 },
  rules: {
    overthrowApproval: 25,
    overthrowUnrest: 80,
    overthrowGraceTurns: 2,
    insolvencyLimit: -1000,
    insolvencyGraceTurns: 2,
    collapseGdp: 500,
    collapseGraceTurns: 3,
  },
};

const policies = {
  taxRate: 30,
  publicSpending: 250,
  interestRate: 4,
};

async function startEconomy(
  targetApp = app,
  input = { ...policies, minimumWage: 12, tariffRate: 5, energySubsidy: 0 },
) {
  return request(targetApp).post("/api/economy/start").send(input);
}

describe("Economy API", () => {
  beforeEach(async () => {
    await request(app).post("/api/economy/reset");
  });

  it("returns the initial economy", async () => {
    const response = await request(app).get("/api/economy");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(initialEconomy);
  });

  it("resets the economy to its initial state", async () => {
    await startEconomy();
    await request(app).post("/api/economy/turn").send(policies);

    const response = await request(app).post("/api/economy/reset");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(initialEconomy);
  });

  it("accepts policies and returns the advanced economy", async () => {
    await startEconomy();
    const response = await request(app)
      .post("/api/economy/turn")
      .send(policies);

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      turn: 2,
      started: true,
      gdp: 1028.9940000000001,
      growthRate: 2.9,
      inflation: 1.85,
      unemployment: 4.710059999999999,
      treasury: 550,
      approval: 60.3,
      averageWage: 15.09,
      debt: 0,
      population: 1_000_254,
      wellbeing: 60.8,
      unrest: 19.2,
      productiveCapacity: 1600,
      resourceReserves: 99.485503,
      groups: { workers: 60.1, businesses: 59.6, publicSector: 61.6 },
      pendingEffects: [],
      pendingEvent: null,
      overthrowRiskTurns: 0,
      insolvencyTurns: 0,
      collapseTurns: 0,
      headline: "Growth steadies as the policy experiment continues",
      history: [{
        turn: 1,
        type: "policy",
        text: "Policy changed: taxes 25 to 30, public spending 200 to 250, interest rates 3 to 4.",
      }],
      achievements: ["balancedBudget", "priceStability"],
      outcome: null,
      gameStart: { gdp: 1000, inflation: 2, treasury: 500, population: 1_000_000 },
      rules: initialEconomy.rules,
      minimumWage: 12,
      tariffRate: 5,
      energySubsidy: 0,
      ...policies,
    });
  });

  it("accepts all six policy areas and validates the added ranges", async () => {
    await startEconomy();
    const response = await request(app)
      .post("/api/economy/turn")
      .send({ ...policies, minimumWage: 18, tariffRate: 20, energySubsidy: 80 });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ minimumWage: 18, tariffRate: 20, energySubsidy: 80 });

    const invalid = await request(app)
      .post("/api/economy/turn")
      .send({ ...policies, minimumWage: 31 });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toMatch(/minimumWage.*0.*30/);

    const malformed = await request(app)
      .post("/api/economy/turn")
      .send({ ...policies, tariffRate: "protective" });
    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toBe("tariffRate must be a finite number.");
  });

  it("allows an event response only when a decision is pending", async () => {
    const eventApp = createApp(() => 0);
    const completePolicies = { ...policies, minimumWage: 12, tariffRate: 5, energySubsidy: 0 };
    await startEconomy(eventApp, completePolicies);
    await request(eventApp).post("/api/economy/turn").send(completePolicies);
    const eventResponse = await request(eventApp).post("/api/economy/turn").send(completePolicies);
    expect(eventResponse.body.pendingEvent.type).toBe("energyShock");

    const decision = await request(eventApp)
      .post("/api/economy/event")
      .send({ choice: "subsidize" });
    expect(decision.status).toBe(200);
    expect(decision.body.pendingEvent).toBeNull();
    expect(decision.body.treasury).toBe(eventResponse.body.treasury - 100);

    const noPendingEvent = await request(eventApp)
      .post("/api/economy/event")
      .send({ choice: "subsidize" });
    expect(noPendingEvent.status).toBe(400);
    expect(noPendingEvent.body.error).toMatch(/no event is waiting/i);

    const invalidChoice = await request(eventApp)
      .post("/api/economy/event")
      .send({ choice: "ignore" });
    expect(invalidChoice.status).toBe(400);

    const missingChoice = await request(eventApp).post("/api/economy/event").send({});
    expect(missingChoice.status).toBe(400);
    expect(missingChoice.body.error).toMatch(/choice must be/i);
  });

  it("continues advancing beyond the former 20-turn term", async () => {
    await startEconomy();
    let response;
    for (let turn = 0; turn < 25; turn += 1) {
      response = await request(app).post("/api/economy/turn").send(policies);
      expect(response.status).toBe(200);
    }

    expect(response?.body.turn).toBe(26);
    expect(response?.body.outcome).toBeNull();
  });

  it("returns a terminal overthrow from turn advancement and ignores later turn requests", async () => {
    const crisisApp = createApp(() => 1);
    const crisisPolicies = {
      taxRate: 60,
      publicSpending: 0,
      interestRate: 20,
      minimumWage: 30,
      tariffRate: 40,
      energySubsidy: 0,
    };
    let response = await startEconomy(crisisApp, crisisPolicies);

    for (let turn = 0; turn < 30 && !response.body.outcome; turn += 1) {
      response = await request(crisisApp)
        .post("/api/economy/turn")
        .send(crisisPolicies);
    }

    expect(response.body.outcome).toMatchObject({
      kind: "defeat",
      reason: /overthrown the government/i,
    });
    const finalEconomy = response.body;
    const laterTurn = await request(crisisApp)
      .post("/api/economy/turn")
      .send(crisisPolicies);
    expect(laterTurn.body).toStrictEqual(finalEconomy);
  });

  it("returns a descriptive 400 error for invalid policy values", async () => {
    await startEconomy();
    const response = await request(app)
      .post("/api/economy/turn")
      .send({ ...policies, taxRate: 61 });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/taxRate.*0.*60/);
  });

  it("returns 400 when a policy field is missing", async () => {
    const response = await request(app)
      .post("/api/economy/turn")
      .send({ taxRate: 30, publicSpending: 250 });

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
  });

  it.each([null, [], "not an object"])(
    "returns 400 when the request body is %s",
    async (body) => {
      const response = await request(app).post("/api/economy/turn").send(body);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/body must be an object/i);
    },
  );

  it.each([
    ["taxRate", "{\"taxRate\":1e400,\"publicSpending\":250,\"interestRate\":4}"],
    ["publicSpending", "{\"taxRate\":30,\"publicSpending\":1e400,\"interestRate\":4}"],
    ["interestRate", "{\"taxRate\":30,\"publicSpending\":250,\"interestRate\":1e400}"],
  ])("rejects a non-finite %s", async (field, body) => {
    const response = await request(app)
      .post("/api/economy/turn")
      .set("Content-Type", "application/json")
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(`${field} must be a finite number.`);
  });

  it.each([
    ["publicSpending", 501],
    ["interestRate", 21],
  ])("returns a range error for %s", async (field, value) => {
    await startEconomy();
    const response = await request(app)
      .post("/api/economy/turn")
      .send({ ...policies, [field]: value });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(new RegExp(field));
  });

  it("returns 400 with a JSON error for malformed JSON", async () => {
    const response = await request(app)
      .post("/api/economy/turn")
      .set("Content-Type", "application/json")
      .send("{invalid");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
  });

  it("returns 404 for unsupported routes", async () => {
    const response = await request(app).get("/api/unsupported");

    expect(response.status).toBe(404);
  });

  it("requires an explicit start before advancing", async () => {
    const response = await request(app).post("/api/economy/turn").send(policies);

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/start the game/i);
  });

  it("starts with the selected policies and does not advance the turn", async () => {
    const selectedPolicies = {
      taxRate: 35,
      publicSpending: 300,
      interestRate: 5,
      minimumWage: 16,
      tariffRate: 12,
      energySubsidy: 40,
    };
    const response = await startEconomy(app, selectedPolicies);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      started: true,
      turn: 1,
      ...selectedPolicies,
    });
    expect(response.body.history).toHaveLength(1);
  });

  it("validates policy fields submitted to start", async () => {
    const missingPolicy = await request(app)
      .post("/api/economy/start")
      .send({ taxRate: 30, publicSpending: 250 });
    expect(missingPolicy.status).toBe(400);

    const invalidRange = await startEconomy(app, { ...policies, taxRate: 61 });
    expect(invalidRange.status).toBe(400);
    expect(invalidRange.body.error).toMatch(/taxRate.*0.*60/);
  });
});