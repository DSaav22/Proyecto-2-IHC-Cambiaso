import { Router, type NextFunction, type Request, type Response } from "express";
import type { User } from "@prisma/client";
import { clearSession } from "../lib/session.js";
import {
  AccountDeletionBlockedError,
  accountExportToCsv,
  deleteAccount,
  exportAccountData,
} from "../services/account.service.js";
import { recordEvent } from "../services/analytics.service.js";

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

export function createAccountRouter() {
  const router = Router();

  router.get(
    "/data",
    wrap(async (req, res) => {
      const user = res.locals.user as User;
      const data = await exportAccountData(user.id);
      if (req.query.format === "csv") {
        res.type("text/csv").attachment("mis-datos-planazo.csv").send(accountExportToCsv(data));
        return;
      }
      res.json(data);
    }),
  );

  router.delete(
    "/",
    wrap(async (_req, res) => {
      const user = res.locals.user as User;
      try {
        await deleteAccount(user.id);
      } catch (err) {
        if (err instanceof AccountDeletionBlockedError) {
          res.status(409).json({ message: err.message, reason: err.reason });
          return;
        }
        throw err;
      }
      await recordEvent("cuenta_eliminada", {});
      clearSession(res);
      res.json({ message: "Tu cuenta fue eliminada." });
    }),
  );

  return router;
}
