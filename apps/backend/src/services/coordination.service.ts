import { z } from "zod";
import { readProposal } from "../lib/coordination.js";
import { prisma } from "../lib/prisma.js";

export class CoordinationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "CoordinationError";
    this.status = status;
  }
}

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Escribe un correo válido."));

async function requireParticipant(planId: string, userId: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      user: { select: { id: true, name: true } },
      members: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!plan) throw new CoordinationError(404, "Plan no encontrado");

  const isOwner = plan.userId === userId;
  const isMember = plan.members.some((member) => member.userId === userId);
  if (!isOwner && !isMember) throw new CoordinationError(404, "Plan no encontrado");

  return { plan, isOwner };
}

export async function getCoordination(userId: string, planId: string) {
  const { plan } = await requireParticipant(planId, userId);
  const myVote = await prisma.planVote.findUnique({
    where: { planId_userId: { planId, userId } },
  });
  const options = await prisma.planOption.findMany({
    where: { planId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { name: true } },
      _count: { select: { votes: true } },
    },
  });

  return {
    participants: [
      { name: plan.user.name, role: "Creador" as const },
      ...plan.members.map((member) => ({ name: member.user.name, role: "Participante" as const })),
    ],
    options: options.map((option) => ({
      id: option.id,
      kind: option.kind,
      label: option.label,
      authorName: option.author.name,
      votes: option._count.votes,
      mine: myVote?.optionId === option.id,
    })),
  };
}

export async function inviteByEmail(userId: string, planId: string, rawEmail: string) {
  const { plan, isOwner } = await requireParticipant(planId, userId);
  if (!isOwner) {
    throw new CoordinationError(403, "Solo quien creó el plan puede invitar.");
  }

  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) throw new CoordinationError(400, "Escribe un correo válido.");

  const person = await prisma.user.findUnique({ where: { email: parsed.data } });
  if (!person) throw new CoordinationError(404, "No hay una cuenta con ese correo.");
  if (person.id === plan.userId) {
    throw new CoordinationError(400, "Esa cuenta es de quien creó el plan.");
  }
  if (plan.members.some((member) => member.userId === person.id)) {
    throw new CoordinationError(409, "Esa persona ya está en el plan.");
  }

  await prisma.planMember.create({
    data: { planId, userId: person.id },
  });
  return getCoordination(userId, planId);
}

export async function addOption(userId: string, planId: string, kind: string, label: string) {
  await requireParticipant(planId, userId);
  const proposal = readProposal(kind, label);
  if (!proposal.ok) throw new CoordinationError(400, proposal.message);

  await prisma.planOption.create({
    data: {
      planId,
      kind: proposal.kind,
      label: proposal.label,
      createdBy: userId,
    },
  });
  return getCoordination(userId, planId);
}

// Cada persona tiene un solo voto en el plan. Si vota otra vez, el voto se mueve.
export async function castVote(userId: string, planId: string, optionId: string) {
  await requireParticipant(planId, userId);
  const option = await prisma.planOption.findFirst({
    where: { id: optionId, planId },
  });
  if (!option) throw new CoordinationError(404, "Esa opción no está en el plan.");

  await prisma.planVote.upsert({
    where: { planId_userId: { planId, userId } },
    create: { planId, optionId, userId },
    update: { optionId },
  });
  return getCoordination(userId, planId);
}
