import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { config } from "../lib/config.js";
import { SESSION_COOKIE } from "../lib/session.js";
import type { ActivityStore } from "../services/activity.service.js";
import type { ActivityEvent } from "../lib/schemas.js";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        email: `${where.id}@x.com`,
        name: where.id,
        passwordHash: "x",
      }),
    },
  },
}));

const cookieFor = (userId: string) =>
  `${SESSION_COOKIE}=${jwt.sign({ sub: userId }, config.jwtSecret)}`;

const event = (id: string, overrides: Partial<ActivityEvent> = {}): ActivityEvent => ({
  id,
  action: "created",
  planId: "p1",
  planTitle: "Cena",
  previousState: null,
  newState: "pendiente",
  planEstado: "pendiente",
  actorName: "u1",
  createdAt: new Date("2026-10-21T12:00:00.000Z"),
  ...overrides,
});

describe("GET /api/plans/activity", () => {
  const list = vi.fn<ActivityStore["list"]>();
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    list.mockReset();
    list.mockResolvedValue([]);
    app = createApp({ activityStore: { list } });
  });

  it("responds 401 without a session and never queries the store", async () => {
    const res = await request(app).get("/api/plans/activity");
    expect(res.status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });

  it("queries only the authenticated user's activity with todos by default", async () => {
    await request(app).get("/api/plans/activity").set("Cookie", cookieFor("u1"));
    expect(list).toHaveBeenCalledWith("u1", "todos");
  });

  it("passes a valid tipo through to the store", async () => {
    await request(app).get("/api/plans/activity?tipo=estados").set("Cookie", cookieFor("u2"));
    expect(list).toHaveBeenCalledWith("u2", "estados");
  });

  it("rejects an invalid tipo with 400 and a Spanish message", async () => {
    const res = await request(app).get("/api/plans/activity?tipo=invalido").set("Cookie", cookieFor("u1"));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/inválid/i);
    expect(list).not.toHaveBeenCalled();
  });

  it("serializes events with ISO dates", async () => {
    list.mockResolvedValueOnce([event("a1", { action: "confirmed" })]);
    const res = await request(app).get("/api/plans/activity").set("Cookie", cookieFor("u1"));
    expect(res.status).toBe(200);
    expect(res.body.activities).toHaveLength(1);
    expect(res.body.activities[0]).toMatchObject({
      id: "a1",
      action: "confirmed",
      planTitle: "Cena",
      createdAt: "2026-10-21T12:00:00.000Z",
    });
  });

  it("is not captured by the plan id routes", async () => {
    const res = await request(app).get("/api/plans/activity").set("Cookie", cookieFor("u1"));
    expect(res.body).toEqual({ activities: [] });
  });
});
