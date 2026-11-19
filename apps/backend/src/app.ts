import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "./lib/config.js";
import { createAccountRouter } from "./routes/account.js";
import { createAnalyticsRouter } from "./routes/analytics.js";
import { authRouter } from "./routes/auth.js";
import { createInvitationsRouter } from "./routes/invitations.js";
import { createPlansRouter } from "./routes/plans.js";
import { createPrismaActivityStore, type ActivityStore } from "./services/activity.service.js";
import { createPrismaPlansStore, type PlansStore } from "./services/plans.service.js";

import { requireAuth } from "./middleware/requireAuth.js";

export interface AppOptions {
  plansStore?: PlansStore;
  activityStore?: ActivityStore;
}

function mountFrontend(app: express.Express): void {
  const dist = config.frontendDist;
  if (!dist || !fs.existsSync(dist)) {
    app.use((_req, res) => {
      res.status(404).json({ message: "Ruta no encontrada" });
    });
    return;
  }

  app.use(express.static(dist));
  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(dist, "index.html"));
  });
}

export function createApp(options: AppOptions = {}) {
  const app = express();

  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  app.use("/api/auth", authRouter);
  app.use("/api/account", requireAuth, createAccountRouter());
  app.use("/api/analytics", requireAuth, createAnalyticsRouter());
  app.use("/api/invitations", requireAuth, createInvitationsRouter());
  app.use(
    "/api/plans",
    requireAuth,
    createPlansRouter(
      options.plansStore ?? createPrismaPlansStore(),
      options.activityStore ?? createPrismaActivityStore(),
    ),
  );

  mountFrontend(app);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && "body" in err) {
      res.status(400).json({ message: "JSON inválido" });
      return;
    }
    console.error(err);
    res.status(500).json({ message: "Error interno del servidor" });
  });

  return app;
}
