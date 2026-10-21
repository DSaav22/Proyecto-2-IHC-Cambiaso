import { describe, expect, it, vi } from "vitest";
import { getUserActivity, recordActivity, type ActivityDb } from "./activity.service.js";

function createDb() {
  const create = vi.fn().mockResolvedValue({});
  const findMany = vi.fn().mockResolvedValue([]);
  const db = { planActivity: { create, findMany } } as unknown as ActivityDb;
  return { db, create, findMany };
}

const row = (id: string, action: string, createdAt: string) => ({
  id,
  action,
  planId: "p1",
  planTitle: "Cena",
  previousState: null,
  newState: "pendiente",
  createdAt: new Date(createdAt),
  user: { name: "Ana" },
  plan: { estado: "pendiente" },
});

describe("recordActivity", () => {
  it("persists the plan snapshot, actor, action and states", async () => {
    const { db, create } = createDb();
    await recordActivity(db, {
      planId: "p1",
      userId: "u1",
      planTitle: "Cena",
      action: "created",
      newState: "pendiente",
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        planId: "p1",
        userId: "u1",
        planTitle: "Cena",
        action: "created",
        previousState: null,
        newState: "pendiente",
        details: undefined,
      },
    });
  });

  it("persists confirm transitions with previous and new state", async () => {
    const { db, create } = createDb();
    await recordActivity(db, {
      planId: "p1",
      userId: "u1",
      planTitle: "Cena",
      action: "confirmed",
      previousState: "pendiente",
      newState: "confirmado",
    });
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({ action: "confirmed", previousState: "pendiente", newState: "confirmado" });
  });

  it("never throws when persistence fails so the plan operation is not aborted", async () => {
    const { db, create } = createDb();
    create.mockRejectedValueOnce(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      recordActivity(db, { planId: "p1", userId: "u1", planTitle: "x", action: "left" }),
    ).resolves.toBeUndefined();
    spy.mockRestore();
  });
});

describe("getUserActivity", () => {
  it("isolates events to plans the user owns or belongs to, or events the user triggered", async () => {
    const { db, findMany } = createDb();
    await getUserActivity(db, "u1");
    const { where } = findMany.mock.calls[0][0];
    expect(where.AND[0]).toEqual({
      OR: [
        { userId: "u1" },
        { plan: { OR: [{ userId: "u1" }, { members: { some: { userId: "u1" } } }] } },
      ],
    });
  });

  it("orders events by createdAt descending", async () => {
    const { db, findMany } = createDb();
    await getUserActivity(db, "u1");
    expect(findMany.mock.calls[0][0].orderBy).toEqual([{ createdAt: "desc" }]);
  });

  it("applies no action restriction for todos", async () => {
    const { db, findMany } = createDb();
    await getUserActivity(db, "u1", "todos");
    expect(findMany.mock.calls[0][0].where.AND).toHaveLength(1);
  });

  it("filters by action for estados, creaciones and participacion", async () => {
    const { db, findMany } = createDb();
    await getUserActivity(db, "u1", "estados");
    await getUserActivity(db, "u1", "creaciones");
    await getUserActivity(db, "u1", "participacion");
    const actions = findMany.mock.calls.map((c) => c[0].where.AND[1]);
    expect(actions[0]).toEqual({ action: { in: ["confirmed", "cancelled"] } });
    expect(actions[1]).toEqual({ action: { in: ["created"] } });
    expect(actions[2]).toEqual({ action: { in: ["joined", "left"] } });
  });

  it("maps rows to events with actor name and current plan state", async () => {
    const { db, findMany } = createDb();
    findMany.mockResolvedValueOnce([row("a2", "confirmed", "2026-10-21T12:00:00Z")]);
    const [event] = await getUserActivity(db, "u1");
    expect(event).toMatchObject({
      id: "a2",
      action: "confirmed",
      planTitle: "Cena",
      actorName: "Ana",
      planEstado: "pendiente",
    });
  });

  it("returns null planEstado when the plan was deleted", async () => {
    const { db, findMany } = createDb();
    findMany.mockResolvedValueOnce([{ ...row("a1", "created", "2026-10-21T10:00:00Z"), planId: null, plan: null }]);
    const [event] = await getUserActivity(db, "u1");
    expect(event.planId).toBeNull();
    expect(event.planEstado).toBeNull();
  });
});
