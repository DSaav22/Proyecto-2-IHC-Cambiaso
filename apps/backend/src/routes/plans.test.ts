import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { config } from "../lib/config.js";
import {
  INITIAL_PLAN_STATE,
  cancelPlan,
  canDelete,
  canEdit,
  confirmPlan,
  DeleteBlockedError,
  EditBlockedError,
} from "../lib/planState.js";
import { SESSION_COOKIE } from "../lib/session.js";
import {
  type PlansStore,
  type StoredPlan,
  AlreadyJoinedError,
  CreatorCannotJoinError,
  ForbiddenPlanActionError,
  PlanNotFoundError,
} from "./plans.js";

const users = vi.hoisted(
  () => new Map<string, { id: string; email: string; name: string; passwordHash: string }>(),
);

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => users.get(where.id) ?? null,
    },
  },
}));

function createMemoryStore(): PlansStore {
  const rows: Array<StoredPlan & { userId: string; members: string[] }> = [];
  let counter = 0;
  return {
    async summary() {
      return { total: 0, overdue: 0, nextDueDate: null };
    },
    async list(userId) {
      return rows
        .filter((row) => row.userId === userId || row.members.includes(userId))
        .map((row) => ({
          ...row,
          isOwner: row.userId === userId,
          ownerName: users.get(row.userId)?.name ?? "Usuario",
        }));
    },
    async create(userId, data) {
      counter += 1;
      const row = {
        id: randomUUID(),
        userId,
        titulo: data.titulo,
        description: data.description,
        dueDate: new Date(`${data.dueDate}T00:00:00.000Z`),
        estado: INITIAL_PLAN_STATE,
        shareCode: `PLZ-TEST0${counter}`,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, counter)),
        members: [] as string[],
        isOwner: true,
        ownerName: users.get(userId)?.name ?? "Usuario",
      };
      rows.push(row);
      return row;
    },
    async joinByCode(userId, code) {
      const plan = rows.find((r) => r.shareCode === code.trim().toUpperCase());
      if (!plan) throw new PlanNotFoundError();
      if (plan.userId === userId) throw new CreatorCannotJoinError();
      if (plan.members.includes(userId)) throw new AlreadyJoinedError();
      plan.members.push(userId);
      return {
        ...plan,
        isOwner: false,
        ownerName: users.get(plan.userId)?.name ?? "Usuario",
      };
    },
    async update(userId, planId, data) {
      const row = rows.find((r) => r.id === planId);
      if (!row) return null;
      if (row.userId !== userId) {
        if (row.members.includes(userId)) {
          throw new ForbiddenPlanActionError("Solo el creador puede editar este plan");
        }
        return null;
      }
      if (!canEdit(row)) {
        throw new EditBlockedError(row.estado as any);
      }
      row.titulo = data.titulo;
      row.description = data.description;
      row.dueDate = new Date(`${data.dueDate}T00:00:00.000Z`);
      return {
        ...row,
        isOwner: true,
        ownerName: users.get(row.userId)?.name ?? "Usuario",
      };
    },
    async confirm(userId, planId) {
      const row = rows.find((r) => r.id === planId);
      if (!row) return null;
      if (row.userId !== userId) {
        if (row.members.includes(userId)) {
          throw new ForbiddenPlanActionError("Solo el creador puede confirmar este plan");
        }
        return null;
      }
      row.estado = confirmPlan(row).estado;
      return {
        ...row,
        isOwner: true,
        ownerName: users.get(row.userId)?.name ?? "Usuario",
      };
    },
    async cancel(userId, planId) {
      const row = rows.find((r) => r.id === planId);
      if (!row) return null;
      if (row.userId !== userId) {
        if (row.members.includes(userId)) {
          throw new ForbiddenPlanActionError("Solo el creador puede cancelar este plan");
        }
        return null;
      }
      row.estado = cancelPlan(row).estado;
      return {
        ...row,
        isOwner: true,
        ownerName: users.get(row.userId)?.name ?? "Usuario",
      };
    },
    async delete(userId, planId) {
      const index = rows.findIndex((r) => r.id === planId);
      if (index === -1) return false;
      const row = rows[index];
      if (row.userId !== userId) {
        if (row.members.includes(userId)) {
          throw new ForbiddenPlanActionError("Solo el creador puede eliminar este plan");
        }
        return false;
      }
      if (!canDelete(row)) {
        throw new DeleteBlockedError("confirmado");
      }
      rows.splice(index, 1);
      return true;
    },
  };
}

const cookieFor = (userId: string) =>
  `${SESSION_COOKIE}=${jwt.sign({ sub: userId }, config.jwtSecret)}`;

const body = { titulo: "Cena de Navidad", description: "Cena de grupo", dueDate: "2026-12-24" };

describe("plans router", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    users.clear();
    users.set("u1", { id: "u1", email: "a@x.com", name: "Ana", passwordHash: "x" });
    users.set("u2", { id: "u2", email: "b@x.com", name: "Beto", passwordHash: "x" });
    app = createApp({ plansStore: createMemoryStore() });
  });

  it("creates a plan (201) and lists it with a YYYY-MM-DD due date", async () => {
    const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
    expect(created.status).toBe(201);
    expect(created.body.plan).toMatchObject(body);
    expect(created.body.plan.id).toBeTypeOf("string");

    const listed = await request(app).get("/api/plans").set("Cookie", cookieFor("u1"));
    expect(listed.status).toBe(200);
    expect(listed.body.plans).toHaveLength(1);
    expect(listed.body.plans[0]).toMatchObject(body);
  });

  it("generates the id server-side and ignores any client-sent id or code", async () => {
    const res = await request(app)
      .post("/api/plans")
      .set("Cookie", cookieFor("u1"))
      .send({ ...body, id: "client-id", code: "PLAN-001" });
    expect(res.status).toBe(201);
    expect(res.body.plan.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(res.body.plan.id).not.toBe("client-id");
    expect(res.body.plan).not.toHaveProperty("code");
  });

  it("generates a distinct id for each plan, even with identical content", async () => {
    const a = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
    const b = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.plan.id).not.toBe(b.body.plan.id);
  });

  it("trims input before saving", async () => {
    const res = await request(app)
      .post("/api/plans")
      .set("Cookie", cookieFor("u1"))
      .send({ titulo: "  Plan fiesta  ", description: " hola ", dueDate: "2026-01-02" });
    expect(res.status).toBe(201);
    expect(res.body.plan).toMatchObject({ titulo: "Plan fiesta", description: "hola" });
  });

  it("rejects invalid bodies with 400 and errors keyed by field", async () => {
    const res = await request(app)
      .post("/api/plans")
      .set("Cookie", cookieFor("u1"))
      .send({ titulo: " ", description: "   ", dueDate: "2026-02-30" });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.errors).sort()).toEqual(["description", "dueDate", "titulo"]);
  });

  it("responds 401 without a session", async () => {
    expect((await request(app).get("/api/plans")).status).toBe(401);
    const post = await request(app).post("/api/plans").send(body);
    expect(post.status).toBe(401);
    const listed = await request(app).get("/api/plans").set("Cookie", cookieFor("u1"));
    expect(listed.body.plans).toEqual([]);
  });

  it("isolates plans per user and allows identical content for different users", async () => {
    await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
    const other = await request(app).post("/api/plans").set("Cookie", cookieFor("u2")).send(body);
    expect(other.status).toBe(201);

    const first = await request(app).get("/api/plans").set("Cookie", cookieFor("u1"));
    const second = await request(app).get("/api/plans").set("Cookie", cookieFor("u2"));
    expect(first.body.plans).toHaveLength(1);
    expect(second.body.plans).toHaveLength(1);
    expect(first.body.plans[0].id).not.toBe(second.body.plans[0].id);
  });

  it("orders by due date, then by creation time", async () => {
    const send = (description: string, dueDate: string) =>
      request(app)
        .post("/api/plans")
        .set("Cookie", cookieFor("u1"))
        .send({ titulo: "Plan " + description, description, dueDate });
    await send("late", "2026-12-01");
    await send("early-first", "2026-03-01");
    await send("early-second", "2026-03-01");
    const listed = await request(app).get("/api/plans").set("Cookie", cookieFor("u1"));
    expect(listed.body.plans.map((p: { description: string }) => p.description)).toEqual([
      "early-first",
      "early-second",
      "late",
    ]);
  });

  it("creates every plan as 'pendiente'", async () => {
    const res = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
    expect(res.status).toBe(201);
    expect(res.body.plan.estado).toBe("pendiente");
  });

  it("ignores a client-sent estado on creation", async () => {
    const res = await request(app)
      .post("/api/plans")
      .set("Cookie", cookieFor("u1"))
      .send({ ...body, estado: "confirmado" });
    expect(res.status).toBe(201);
    expect(res.body.plan.estado).toBe("pendiente");
  });

  describe("POST /api/plans/:id/confirm", () => {
    const create = async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      return created.body.plan.id as string;
    };

    it("confirms a draft and persists the new state", async () => {
      const planId = await create();
      const res = await request(app)
        .post(`/api/plans/${planId}/confirm`)
        .set("Cookie", cookieFor("u1"));
      expect(res.status).toBe(200);
      expect(res.body.plan).toMatchObject({ id: planId, estado: "confirmado", ...body });

      const listed = await request(app).get("/api/plans").set("Cookie", cookieFor("u1"));
      expect(listed.body.plans[0].estado).toBe("confirmado");
    });

    it("rejects a second confirmation with 409", async () => {
      const planId = await create();
      await request(app).post(`/api/plans/${planId}/confirm`).set("Cookie", cookieFor("u1"));
      const res = await request(app)
        .post(`/api/plans/${planId}/confirm`)
        .set("Cookie", cookieFor("u1"));
      expect(res.status).toBe(409);
    });

    it("explains that an already confirmed plan cannot be confirmed again", async () => {
      const planId = await create();
      await request(app).post(`/api/plans/${planId}/confirm`).set("Cookie", cookieFor("u1"));
      const res = await request(app)
        .post(`/api/plans/${planId}/confirm`)
        .set("Cookie", cookieFor("u1"));
      expect(res.status).toBe(409);
      expect(res.body.message).toBe("El plan ya está confirmado");
    });

    it("rejects confirming a cancelled plan with a distinct 409 message", async () => {
      const planId = await create();
      await request(app).post(`/api/plans/${planId}/cancel`).set("Cookie", cookieFor("u1"));
      const res = await request(app)
        .post(`/api/plans/${planId}/confirm`)
        .set("Cookie", cookieFor("u1"));
      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Un plan cancelado no puede confirmarse");
    });

    it("returns 404 if plan does not exist or belongs to another user", async () => {
      const planId = await create();
      const otherUser = await request(app)
        .post(`/api/plans/${planId}/confirm`)
        .set("Cookie", cookieFor("u2"));
      expect(otherUser.status).toBe(404);

      const missing = await request(app)
        .post("/api/plans/00000000-0000-0000-0000-000000000000/confirm")
        .set("Cookie", cookieFor("u1"));
      expect(missing.status).toBe(404);
    });

    it("requires authentication returning 401 without cookie", async () => {
      const res = await request(app).post("/api/plans/fake-id/confirm");
      expect(res.status).toBe(401);
    });

    it("no longer exposes PATCH to set arbitrary states", async () => {
      const planId = await create();
      const res = await request(app)
        .patch(`/api/plans/${planId}`)
        .set("Cookie", cookieFor("u1"))
        .send({ estado: "hecho" });
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/plans/:id", () => {
    it("updates a plan and returns 200 with the updated plan", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;

      const updateData = { titulo: "Cena fin de año", description: "Cena de fin de año actualizada", dueDate: "2026-12-31" };
      const res = await request(app)
        .put(`/api/plans/${planId}`)
        .set("Cookie", cookieFor("u1"))
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.plan).toMatchObject({
        id: planId,
        titulo: updateData.titulo,
        description: updateData.description,
        dueDate: updateData.dueDate,
        estado: "pendiente",
      });

      const listRes = await request(app).get("/api/plans").set("Cookie", cookieFor("u1"));
      expect(listRes.body.plans[0]).toMatchObject(updateData);
    });

    it("allows updating a confirmed plan", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;
      await request(app).post(`/api/plans/${planId}/confirm`).set("Cookie", cookieFor("u1"));

      const updateData = { titulo: "Nuevo título", description: "Nueva descripción", dueDate: "2026-12-25" };
      const res = await request(app)
        .put(`/api/plans/${planId}`)
        .set("Cookie", cookieFor("u1"))
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.plan.estado).toBe("confirmado");
      expect(res.body.plan.titulo).toBe("Nuevo título");
      expect(res.body.plan.description).toBe("Nueva descripción");
    });

    it("rejects updating a cancelled plan with 409", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;
      await request(app).post(`/api/plans/${planId}/confirm`).set("Cookie", cookieFor("u1"));
      await request(app).post(`/api/plans/${planId}/cancel`).set("Cookie", cookieFor("u1"));

      const updateData = { titulo: "Título cancelado", description: "Intentando editar cancelado", dueDate: "2026-12-25" };
      const res = await request(app)
        .put(`/api/plans/${planId}`)
        .set("Cookie", cookieFor("u1"))
        .send(updateData);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("cancelado");
    });

    it("rejects invalid bodies with 400 and field errors", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;

      const res = await request(app)
        .put(`/api/plans/${planId}`)
        .set("Cookie", cookieFor("u1"))
        .send({ titulo: "AB", description: "", dueDate: "fecha-invalida" });

      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveProperty("titulo");
      expect(res.body.errors).toHaveProperty("description");
      expect(res.body.errors).toHaveProperty("dueDate");
    });

    it("returns 404 when plan belongs to another user or does not exist", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;

      const otherUser = await request(app)
        .put(`/api/plans/${planId}`)
        .set("Cookie", cookieFor("u2"))
        .send(body);
      expect(otherUser.status).toBe(404);

      const notFound = await request(app)
        .put("/api/plans/00000000-0000-0000-0000-000000000000")
        .set("Cookie", cookieFor("u1"))
        .send(body);
      expect(notFound.status).toBe(404);
    });

    it("requires authentication returning 401 without cookie", async () => {
      const res = await request(app).put("/api/plans/any-id").send(body);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/plans/:id/cancel", () => {
    it("cancels a confirmed plan and returns 200", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;

      await request(app).post(`/api/plans/${planId}/confirm`).set("Cookie", cookieFor("u1"));

      const res = await request(app)
        .post(`/api/plans/${planId}/cancel`)
        .set("Cookie", cookieFor("u1"));

      expect(res.status).toBe(200);
      expect(res.body.plan.estado).toBe("cancelado");

      const listRes = await request(app).get("/api/plans").set("Cookie", cookieFor("u1"));
      expect(listRes.body.plans[0].estado).toBe("cancelado");
    });

    it("cancels a draft plan and returns 200", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;

      const res = await request(app)
        .post(`/api/plans/${planId}/cancel`)
        .set("Cookie", cookieFor("u1"));

      expect(res.status).toBe(200);
      expect(res.body.plan.estado).toBe("cancelado");

      const listRes = await request(app).get("/api/plans").set("Cookie", cookieFor("u1"));
      expect(listRes.body.plans[0].estado).toBe("cancelado");
    });

    it("rejects cancelling an already cancelled plan with 409", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;

      await request(app).post(`/api/plans/${planId}/cancel`).set("Cookie", cookieFor("u1"));

      const res = await request(app)
        .post(`/api/plans/${planId}/cancel`)
        .set("Cookie", cookieFor("u1"));

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("cancelado");
    });

    it("returns 404 when plan belongs to another user or does not exist", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;

      const otherUser = await request(app)
        .post(`/api/plans/${planId}/cancel`)
        .set("Cookie", cookieFor("u2"));
      expect(otherUser.status).toBe(404);

      const notFound = await request(app)
        .post("/api/plans/00000000-0000-0000-0000-000000000000/cancel")
        .set("Cookie", cookieFor("u1"));
      expect(notFound.status).toBe(404);
    });

    it("requires authentication returning 401 without cookie", async () => {
      const res = await request(app).post("/api/plans/any-id/cancel");
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/plans/:id", () => {
    it("deletes a draft plan successfully returning 200 and removes it from list", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;

      const deleteRes = await request(app)
        .delete(`/api/plans/${planId}`)
        .set("Cookie", cookieFor("u1"));
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe("Plan eliminado");

      const listRes = await request(app).get("/api/plans").set("Cookie", cookieFor("u1"));
      expect(listRes.body.plans).toEqual([]);
    });

    it("blocks deleting a confirmed plan returning 409 with explanatory message", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;

      await request(app).post(`/api/plans/${planId}/confirm`).set("Cookie", cookieFor("u1"));

      const deleteRes = await request(app)
        .delete(`/api/plans/${planId}`)
        .set("Cookie", cookieFor("u1"));
      expect(deleteRes.status).toBe(409);
      expect(deleteRes.body.message).toContain("cancelarse");

      // Verify the plan is still intact
      const listRes = await request(app).get("/api/plans").set("Cookie", cookieFor("u1"));
      expect(listRes.body.plans).toHaveLength(1);
      expect(listRes.body.plans[0].estado).toBe("confirmado");
    });

    it("allows deleting a cancelled plan returning 200", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;

      await request(app).post(`/api/plans/${planId}/confirm`).set("Cookie", cookieFor("u1"));
      await request(app).post(`/api/plans/${planId}/cancel`).set("Cookie", cookieFor("u1"));

      const deleteRes = await request(app)
        .delete(`/api/plans/${planId}`)
        .set("Cookie", cookieFor("u1"));
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe("Plan eliminado");

      const listRes = await request(app).get("/api/plans").set("Cookie", cookieFor("u1"));
      expect(listRes.body.plans).toEqual([]);
    });

    it("returns 404 if plan does not exist", async () => {
      const res = await request(app)
        .delete(`/api/plans/00000000-0000-0000-0000-000000000000`)
        .set("Cookie", cookieFor("u1"));
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Plan no encontrado");
    });

    it("returns 404 if trying to delete another user's plan", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;

      const res = await request(app)
        .delete(`/api/plans/${planId}`)
        .set("Cookie", cookieFor("u2"));
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Plan no encontrado");

      // Verify u1 still has the plan
      const listRes = await request(app).get("/api/plans").set("Cookie", cookieFor("u1"));
      expect(listRes.body.plans).toHaveLength(1);
    });

    it("requires authentication returning 401 without cookie", async () => {
      const res = await request(app).delete("/api/plans/any-id");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/plans/join and guest permissions", () => {
    it("allows a second user to join with valid share code and returns isOwner false", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const shareCode = created.body.plan.shareCode;
      expect(shareCode).toBeDefined();

      const joinRes = await request(app)
        .post("/api/plans/join")
        .set("Cookie", cookieFor("u2"))
        .send({ code: shareCode });

      expect(joinRes.status).toBe(200);
      expect(joinRes.body.plan.isOwner).toBe(false);
      expect(joinRes.body.plan.ownerName).toBe("Ana");

      const listRes = await request(app).get("/api/plans").set("Cookie", cookieFor("u2"));
      expect(listRes.status).toBe(200);
      expect(listRes.body.plans).toHaveLength(1);
      expect(listRes.body.plans[0].id).toBe(created.body.plan.id);
      expect(listRes.body.plans[0].isOwner).toBe(false);
    });

    it("returns 404 if share code does not match any plan", async () => {
      const res = await request(app)
        .post("/api/plans/join")
        .set("Cookie", cookieFor("u2"))
        .send({ code: "PLZ-NONEXIST" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Plan no encontrado con este código");
    });

    it("returns 400 if plan creator attempts to join their own plan", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const shareCode = created.body.plan.shareCode;

      const res = await request(app)
        .post("/api/plans/join")
        .set("Cookie", cookieFor("u1"))
        .send({ code: shareCode });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Ya eres el creador de este plan");
    });

    it("returns 409 if user has already joined the plan", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const shareCode = created.body.plan.shareCode;

      await request(app)
        .post("/api/plans/join")
        .set("Cookie", cookieFor("u2"))
        .send({ code: shareCode });

      const secondJoin = await request(app)
        .post("/api/plans/join")
        .set("Cookie", cookieFor("u2"))
        .send({ code: shareCode });

      expect(secondJoin.status).toBe(409);
      expect(secondJoin.body.message).toBe("Ya te has unido a este plan");
    });

    it("requires authentication returning 401 without cookie", async () => {
      const res = await request(app)
        .post("/api/plans/join")
        .send({ code: "PLZ-123456" });

      expect(res.status).toBe(401);
    });

    it("rejects guest attempts to confirm plan with 403 Forbidden", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;
      const shareCode = created.body.plan.shareCode;

      await request(app)
        .post("/api/plans/join")
        .set("Cookie", cookieFor("u2"))
        .send({ code: shareCode });

      const confirmRes = await request(app)
        .post(`/api/plans/${planId}/confirm`)
        .set("Cookie", cookieFor("u2"));

      expect(confirmRes.status).toBe(403);
      expect(confirmRes.body.message).toBe("Solo el creador puede confirmar este plan");
    });

    it("rejects guest attempts to cancel plan with 403 and keeps the plan state", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;
      const shareCode = created.body.plan.shareCode;

      await request(app)
        .post("/api/plans/join")
        .set("Cookie", cookieFor("u2"))
        .send({ code: shareCode });

      const cancelRes = await request(app)
        .post(`/api/plans/${planId}/cancel`)
        .set("Cookie", cookieFor("u2"));

      expect(cancelRes.status).toBe(403);
      expect(cancelRes.body.message).toBe("Solo el creador puede cancelar este plan");

      const listRes = await request(app).get("/api/plans").set("Cookie", cookieFor("u1"));
      expect(listRes.body.plans[0].estado).toBe("pendiente");
    });

    it("rejects guest attempts to delete plan with 403 Forbidden", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;
      const shareCode = created.body.plan.shareCode;

      await request(app)
        .post("/api/plans/join")
        .set("Cookie", cookieFor("u2"))
        .send({ code: shareCode });

      const deleteRes = await request(app)
        .delete(`/api/plans/${planId}`)
        .set("Cookie", cookieFor("u2"));

      expect(deleteRes.status).toBe(403);
      expect(deleteRes.body.message).toBe("Solo el creador puede eliminar este plan");
    });

    it("rejects guest attempts to edit plan with 403 Forbidden", async () => {
      const created = await request(app).post("/api/plans").set("Cookie", cookieFor("u1")).send(body);
      const planId = created.body.plan.id;
      const shareCode = created.body.plan.shareCode;

      await request(app)
        .post("/api/plans/join")
        .set("Cookie", cookieFor("u2"))
        .send({ code: shareCode });

      const editRes = await request(app)
        .put(`/api/plans/${planId}`)
        .set("Cookie", cookieFor("u2"))
        .send({ titulo: "Plan invitado", description: "Intento de edición por invitado", dueDate: "2026-12-25" });

      expect(editRes.status).toBe(403);
      expect(editRes.body.message).toBe("Solo el creador puede editar este plan");
    });
  });
});



describe("GET /api/plans query and summary", () => {
  const listCalls: Array<{ userId: string; filter: unknown; todayUtc: unknown }> = [];
  const summaryCalls: Array<{ userId: string; todayUtc: Date }> = [];
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    users.clear();
    users.set("u1", { id: "u1", email: "a@x.com", name: "Ana", passwordHash: "x" });
    listCalls.length = 0;
    summaryCalls.length = 0;
    const base = createMemoryStore();
    const store: PlansStore = {
      ...base,
      async list(userId, filter, todayUtc) {
        listCalls.push({ userId, filter, todayUtc });
        return base.list(userId);
      },
      async summary(userId, todayUtc) {
        summaryCalls.push({ userId, todayUtc });
        return { total: 3, overdue: 1, nextDueDate: new Date("2026-06-18T00:00:00.000Z") };
      },
    };
    app = createApp({ plansStore: store });
  });

  const get = (query: string) =>
    request(app).get(`/api/plans${query}`).set("Cookie", cookieFor("u1"));

  it("forwards the parsed filter and todayUtc to list and summary", async () => {
    const res = await get("?q=%20cena%20&estado=pendiente&fecha=next7&today=2026-06-15");
    expect(res.status).toBe(200);
    expect(listCalls).toEqual([
      {
        userId: "u1",
        filter: { q: "cena", estado: "pendiente", fecha: "next7" },
        todayUtc: new Date("2026-06-15T00:00:00.000Z"),
      },
    ]);
    expect(summaryCalls).toEqual([{ userId: "u1", todayUtc: new Date("2026-06-15T00:00:00.000Z") }]);
  });

  it("returns plans and a serialized summary with nextDueDate as YYYY-MM-DD", async () => {
    const res = await get("");
    expect(res.status).toBe(200);
    expect(res.body.plans).toEqual([]);
    expect(res.body.summary).toEqual({ total: 3, overdue: 1, nextDueDate: "2026-06-18" });
  });

  it("serializes a missing next due date as null", async () => {
    const base = createMemoryStore();
    const nullApp = createApp({
      plansStore: { ...base, summary: async () => ({ total: 0, overdue: 0, nextDueDate: null }) },
    });
    const res = await request(nullApp).get("/api/plans").set("Cookie", cookieFor("u1"));
    expect(res.body.summary).toEqual({ total: 0, overdue: 0, nextDueDate: null });
  });

  it("uses the Bolivia date, not the UTC date, when today is missing", async () => {
    // 02:00 UTC on Jun 16 is still 22:00 on Jun 15 in Bolivia (UTC-4)
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-06-16T02:00:00.000Z") });
    try {
      const res = await get("?fecha=today");
      expect(res.status).toBe(200);
      const expected = new Date("2026-06-15T00:00:00.000Z");
      expect(listCalls[0].todayUtc).toEqual(expected);
      expect(summaryCalls[0].todayUtc).toEqual(expected);
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses the client-sent today as is, ignoring the server clock", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-06-16T02:00:00.000Z") });
    try {
      await get("?fecha=today&today=2026-03-01");
      expect(listCalls[0].todayUtc).toEqual(new Date("2026-03-01T00:00:00.000Z"));
    } finally {
      vi.useRealTimers();
    }
  });

  it("passes an empty filter when no params are sent", async () => {
    await get("");
    expect(listCalls[0].filter).toEqual({});
  });

  it("rejects invalid params with 400, a message and field errors, without hitting the store", async () => {
    const res = await get("?estado=borrador&fecha=tomorrow&today=2026-02-30");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Parámetros de búsqueda inválidos");
    expect(Object.keys(res.body.errors).sort()).toEqual(["estado", "fecha", "today"]);
    expect(listCalls).toHaveLength(0);
    expect(summaryCalls).toHaveLength(0);
  });

  it("rejects repeated q and over-long q with 400", async () => {
    expect((await get("?q=a&q=b")).status).toBe(400);
    const tooLong = await get(`?q=${"a".repeat(101)}`);
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.errors.q).toBe("La búsqueda debe tener máximo 100 caracteres");
  });

  it("answers PUT on a cancelled plan with 409", async () => {
    const memory = createMemoryStore();
    const putApp = createApp({ plansStore: memory });
    const created = await request(putApp)
      .post("/api/plans")
      .set("Cookie", cookieFor("u1"))
      .send({ titulo: "Cena de Navidad", description: "Cena", dueDate: "2026-12-24" });
    const id = created.body.plan.id;
    await request(putApp).post(`/api/plans/${id}/cancel`).set("Cookie", cookieFor("u1"));
    const res = await request(putApp)
      .put(`/api/plans/${id}`)
      .set("Cookie", cookieFor("u1"))
      .send({ titulo: "Otro titulo", description: "Cena", dueDate: "2026-12-25" });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("No se puede editar un plan cancelado");
  });
});
