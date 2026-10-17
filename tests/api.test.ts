import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";

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
    await request(app).post("/api/economy/turn").send(policies);

    const response = await request(app).post("/api/economy/reset");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(initialEconomy);
  });

  it("accepts policies and returns the advanced economy", async () => {
    const response = await request(app)
      .post("/api/economy/turn")
      .send(policies);

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      turn: 2,
      gdp: 1025,
      inflation: 1.85,
      unemployment: 4.75,
      treasury: 550,
      ...policies,
    });
  });

  it("returns a descriptive 400 error for invalid policy values", async () => {
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
});