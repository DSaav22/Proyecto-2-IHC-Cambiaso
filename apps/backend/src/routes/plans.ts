import { Router, type NextFunction, type Request, type Response } from "express";
import type { User } from "@prisma/client";
import { z } from "zod";
import { DeleteBlockedError, EditBlockedError, InvalidTransitionError } from "../lib/planState.js";
import { fieldErrors, planSchema } from "../lib/schemas.js";
import {
  type StoredPlan,
  type PlansStore,
  createPrismaPlansStore,
  AlreadyJoinedError,
  CreatorCannotJoinError,
  ForbiddenPlanActionError,
  PlanNotFoundError,
} from "../services/plans.service.js";

export {
  type StoredPlan,
  type PlansStore,
  createPrismaPlansStore,
  AlreadyJoinedError,
  CreatorCannotJoinError,
  ForbiddenPlanActionError,
  PlanNotFoundError,
};

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

function serialize(plan: StoredPlan) {
  return {
    id: plan.id,
    titulo: plan.titulo,
    description: plan.description,
    dueDate: toDateString(plan.dueDate),
    estado: plan.estado,
    createdAt: plan.createdAt.toISOString(),
    shareCode: plan.shareCode,
    isOwner: plan.isOwner ?? false,
    ownerName: plan.ownerName ?? "",
  };
}

function comparePlans(a: StoredPlan, b: StoredPlan): number {
  return (
    a.dueDate.getTime() - b.dueDate.getTime() || a.createdAt.getTime() - b.createdAt.getTime()
  );
}

const joinPlanSchema = z.object({
  code: z.string().trim().min(1, "El código es requerido"),
});

type Handler = (req: Request, res: Response) => Promise<void>;
const wrap = (handler: Handler) => (req: Request, res: Response, next: NextFunction) => {
  handler(req, res).catch(next);
};

export function createPlansRouter(store: PlansStore): Router {
  const router = Router();

  router.get(
    "/",
    wrap(async (_req, res) => {
      const user = res.locals.user as User;
      const plans = (await store.list(user.id)).slice().sort(comparePlans);
      res.status(200).json({ plans: plans.map(serialize) });
    }),
  );

  router.post(
    "/",
    wrap(async (req, res) => {
      const user = res.locals.user as User;
      const parsed = planSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ message: "Datos inválidos", errors: fieldErrors(parsed.error) });
        return;
      }
      const plan = await store.create(user.id, parsed.data);
      res.status(201).json({ plan: serialize(plan) });
    }),
  );

  router.post(
    "/join",
    wrap(async (req, res) => {
      const user = res.locals.user as User;
      const parsed = joinPlanSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ message: "Código inválido", errors: fieldErrors(parsed.error) });
        return;
      }
      try {
        const plan = await store.joinByCode(user.id, parsed.data.code);
        res.status(200).json({ plan: serialize(plan) });
      } catch (error) {
        if (error instanceof PlanNotFoundError) {
          res.status(404).json({ message: error.message });
          return;
        }
        if (error instanceof CreatorCannotJoinError) {
          res.status(400).json({ message: error.message });
          return;
        }
        if (error instanceof AlreadyJoinedError) {
          res.status(409).json({ message: error.message });
          return;
        }
        throw error;
      }
    }),
  );

  router.put(
    "/:id",
    wrap(async (req, res) => {
      const user = res.locals.user as User;
      const planId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const parsed = planSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ message: "Datos inválidos", errors: fieldErrors(parsed.error) });
        return;
      }
      try {
        const updated = await store.update(user.id, planId, parsed.data);
        if (!updated) {
          res.status(404).json({ message: "Plan no encontrado" });
          return;
        }
        res.status(200).json({ plan: serialize(updated) });
      } catch (error) {
        if (error instanceof ForbiddenPlanActionError) {
          res.status(403).json({ message: error.message });
          return;
        }
        if (error instanceof EditBlockedError) {
          res.status(409).json({ message: "No se puede editar un plan cancelado" });
          return;
        }
        throw error;
      }
    }),
  );

  router.post(
    "/:id/confirm",
    wrap(async (req, res) => {
      const user = res.locals.user as User;
      const planId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const confirmed = await store.confirm(user.id, planId);
        if (!confirmed) {
          res.status(404).json({ message: "Plan no encontrado" });
          return;
        }
        res.status(200).json({ plan: serialize(confirmed) });
      } catch (error) {
        if (error instanceof ForbiddenPlanActionError) {
          res.status(403).json({ message: error.message });
          return;
        }
        if (error instanceof InvalidTransitionError) {
          const message =
            error.from === "cancelado"
              ? "Un plan cancelado no puede confirmarse"
              : "El plan ya está confirmado";
          res.status(409).json({ message });
          return;
        }
        throw error;
      }
    }),
  );

  router.post(
    "/:id/cancel",
    wrap(async (req, res) => {
      const user = res.locals.user as User;
      const planId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const cancelled = await store.cancel(user.id, planId);
        if (!cancelled) {
          res.status(404).json({ message: "Plan no encontrado" });
          return;
        }
        res.status(200).json({ plan: serialize(cancelled) });
      } catch (error) {
        if (error instanceof ForbiddenPlanActionError) {
          res.status(403).json({ message: error.message });
          return;
        }
        if (error instanceof InvalidTransitionError) {
          res.status(409).json({ message: "Un plan cancelado no puede volver a cancelarse" });
          return;
        }
        throw error;
      }
    }),
  );

  router.delete(
    "/:id",
    wrap(async (req, res) => {
      const user = res.locals.user as User;
      const planId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const deleted = await store.delete(user.id, planId);
        if (!deleted) {
          res.status(404).json({ message: "Plan no encontrado" });
          return;
        }
        res.status(200).json({ message: "Plan eliminado" });
      } catch (error) {
        if (error instanceof ForbiddenPlanActionError) {
          res.status(403).json({ message: error.message });
          return;
        }
        if (error instanceof DeleteBlockedError) {
          res.status(409).json({ message: error.message });
          return;
        }
        throw error;
      }
    }),
  );

  return router;
}
