import { Router, type NextFunction, type Request, type Response } from "express";
import { config } from "../lib/config.js";
import { parseEvent } from "../lib/analytics.js";
import { getAnalyticsSummary, recordEvent } from "../services/analytics.service.js";

type Handler = (req: Request, res: Response) => Promise<void>;

const wrap = (handler: Handler) => (req: Request, res: Response, next: NextFunction) => {
  handler(req, res).catch(next);
};

export function createAnalyticsRouter() {
  const router = Router();

  router.post(
    "/events",
    wrap(async (req, res) => {
      const parsed = parseEvent(req.body);
      if (!parsed) {
        res.status(400).json({ message: "Evento no permitido." });
        return;
      }
      await recordEvent(parsed.event, parsed.props);
      res.status(201).json({ ok: true });
    }),
  );

  // The panel is only for development.
  router.get(
    "/summary",
    wrap(async (_req, res) => {
      if (config.isProduction) {
        res.status(404).json({ message: "Ruta no encontrada" });
        return;
      }
      res.status(200).json(await getAnalyticsSummary());
    }),
  );

  return router;
}
