import { Router, type NextFunction, type Request, type Response } from "express";
import type { User } from "@prisma/client";
import {
  acceptInvitation,
  declineInvitation,
  InvitationNotFoundError,
  listInvitations,
} from "../services/invitations.service.js";

type Handler = (req: Request, res: Response) => Promise<void>;
const wrap = (handler: Handler) => (req: Request, res: Response, next: NextFunction) => {
  handler(req, res).catch((error: unknown) => {
    if (error instanceof InvitationNotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }
    next(error);
  });
};

const invitationId = (req: Request) => String(req.params.id);

export function createInvitationsRouter(): Router {
  const router = Router();

  router.get(
    "/",
    wrap(async (_req, res) => {
      const user = res.locals.user as User;
      res.status(200).json(await listInvitations(user.id));
    }),
  );

  router.post(
    "/:id/accept",
    wrap(async (req, res) => {
      const user = res.locals.user as User;
      res.status(200).json(await acceptInvitation(user.id, invitationId(req)));
    }),
  );

  router.post(
    "/:id/decline",
    wrap(async (req, res) => {
      const user = res.locals.user as User;
      await declineInvitation(user.id, invitationId(req));
      res.status(200).json({ message: "Invitación rechazada." });
    }),
  );

  return router;
}
