import type { NextFunction, Request, Response, Router } from "express";
import type { User } from "@prisma/client";
import type { z } from "zod";
import { expenseInputSchema, paymentInputSchema, rejectInputSchema } from "../lib/expenses.js";
import { fieldErrors } from "../lib/schemas.js";
import {
  addExpense,
  confirmPayment,
  ExpenseError,
  getExpenses,
  registerPayment,
  rejectPayment,
} from "../services/expenses.service.js";

type Handler = (req: Request, res: Response) => Promise<void>;

const param = (req: Request, name: string) => {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
};

/** Runs the handler and maps ExpenseError to its HTTP status. */
const handle = (handler: Handler) => (req: Request, res: Response, next: NextFunction) => {
  handler(req, res).catch((error: unknown) => {
    if (error instanceof ExpenseError) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    next(error);
  });
};

function parseBody<T extends z.ZodType>(schema: T, req: Request, res: Response): z.infer<T> | null {
  const parsed = schema.safeParse(req.body ?? {});
  if (parsed.success) return parsed.data;
  const errors = fieldErrors(parsed.error);
  res.status(400).json({ message: Object.values(errors)[0] ?? "Datos inválidos", errors });
  return null;
}

export function registerExpenseRoutes(router: Router) {
  router.get(
    "/:id/expenses",
    handle(async (req, res) => {
      const user = res.locals.user as User;
      res.status(200).json(await getExpenses(user.id, param(req, "id")));
    }),
  );

  router.post(
    "/:id/expenses",
    handle(async (req, res) => {
      const user = res.locals.user as User;
      const input = parseBody(expenseInputSchema, req, res);
      if (!input) return;
      res.status(201).json(await addExpense(user.id, param(req, "id"), input));
    }),
  );

  router.post(
    "/:id/payments",
    handle(async (req, res) => {
      const user = res.locals.user as User;
      const input = parseBody(paymentInputSchema, req, res);
      if (!input) return;
      res.status(201).json(await registerPayment(user.id, param(req, "id"), input));
    }),
  );

  router.post(
    "/:id/payments/:paymentId/confirm",
    handle(async (req, res) => {
      const user = res.locals.user as User;
      res
        .status(200)
        .json(await confirmPayment(user.id, param(req, "id"), param(req, "paymentId")));
    }),
  );

  router.post(
    "/:id/payments/:paymentId/reject",
    handle(async (req, res) => {
      const user = res.locals.user as User;
      const input = parseBody(rejectInputSchema, req, res);
      if (!input) return;
      res
        .status(200)
        .json(await rejectPayment(user.id, param(req, "id"), param(req, "paymentId"), input.reason));
    }),
  );
}
