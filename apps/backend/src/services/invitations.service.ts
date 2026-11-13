import { prisma } from "../lib/prisma.js";
import { recordActivity } from "./activity.service.js";

export class InvitationNotFoundError extends Error {
  constructor() {
    super("Invitación no encontrada");
    this.name = "InvitationNotFoundError";
  }
}

const withPlan = {
  plan: {
    select: {
      id: true,
      titulo: true,
      description: true,
      dueDate: true,
      estado: true,
      createdAt: true,
      shareCode: true,
      user: { select: { name: true } },
    },
  },
} as const;

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

export async function listInvitations(userId: string) {
  const invitations = await prisma.planInvitation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: withPlan,
  });
  return invitations.map(({ id, plan }) => ({
    id,
    plan: {
      titulo: plan.titulo,
      description: plan.description,
      dueDate: toDateString(plan.dueDate),
      ownerName: plan.user.name,
    },
  }));
}

// Someone else's invitation answers as missing, so ids can't be probed.
async function findOwnInvitation(userId: string, invitationId: string) {
  const invitation = await prisma.planInvitation.findFirst({
    where: { id: invitationId, userId },
    include: withPlan,
  });
  if (!invitation) throw new InvitationNotFoundError();
  return invitation;
}

export async function acceptInvitation(userId: string, invitationId: string) {
  const { plan } = await findOwnInvitation(userId, invitationId);
  await prisma.$transaction([
    prisma.planMember.create({ data: { planId: plan.id, userId } }),
    prisma.planInvitation.delete({ where: { id: invitationId } }),
  ]);
  await recordActivity(prisma, {
    planId: plan.id,
    userId,
    planTitle: plan.titulo,
    action: "joined",
    newState: plan.estado,
  });
  return {
    id: plan.id,
    titulo: plan.titulo,
    description: plan.description,
    dueDate: toDateString(plan.dueDate),
    estado: plan.estado,
    createdAt: plan.createdAt.toISOString(),
    shareCode: plan.shareCode,
    isOwner: false,
    ownerName: plan.user.name,
  };
}

export async function declineInvitation(userId: string, invitationId: string) {
  await findOwnInvitation(userId, invitationId);
  await prisma.planInvitation.delete({ where: { id: invitationId } });
}
