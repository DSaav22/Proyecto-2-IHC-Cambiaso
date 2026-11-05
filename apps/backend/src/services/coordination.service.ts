import { z } from "zod";
import { readProposal } from "../lib/coordination.js";
import { prisma } from "../lib/prisma.js";
import { recordActivity } from "./activity.service.js";

export class CoordinationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "CoordinationError";
    this.status = status;
  }
}

export interface VotingDecisionInput {
  dateOptionId?: string;
  placeOptionId?: string;
  reason?: string;
}

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Escribe un correo válido."));

async function requireParticipant(planId: string, userId: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      user: { select: { id: true, name: true } },
      winningDateOption: { select: { id: true, label: true } },
      winningPlaceOption: { select: { id: true, label: true } },
      decisionMaker: { select: { id: true, name: true } },
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

function requireOpenVote(plan: { votingClosedAt: Date | null }) {
  if (plan.votingClosedAt) throw new CoordinationError(409, "La votación está cerrada.");
}

export async function getCoordination(userId: string, planId: string) {
  const { plan } = await requireParticipant(planId, userId);
  const myVotes = await prisma.planVote.findMany({
    where: { planId, userId },
    select: { optionId: true },
  });
  const votedOptionIds = new Set(myVotes.map((vote) => vote.optionId));
  const options = await prisma.planOption.findMany({
    where: { planId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { name: true } },
      _count: { select: { votes: true } },
    },
  });

  return {
    votingClosed: plan.votingClosedAt !== null,
    decision: plan.decidedAt
      ? {
          dateOption: plan.winningDateOption,
          placeOption: plan.winningPlaceOption,
          reason: plan.decisionReason,
          decidedAt: plan.decidedAt,
          decidedBy: plan.decisionMaker,
        }
      : null,
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
      mine: votedOptionIds.has(option.id),
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
  const { plan } = await requireParticipant(planId, userId);
  requireOpenVote(plan);
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

async function requireOption(planId: string, optionId: string) {
  const option = await prisma.planOption.findFirst({
    where: { id: optionId, planId },
  });
  if (!option) throw new CoordinationError(404, "Esa opción no está en el plan.");
}

// A person can vote for several options of a plan, but only once per option.
export async function castVote(userId: string, planId: string, optionId: string) {
  const { plan } = await requireParticipant(planId, userId);
  requireOpenVote(plan);
  await requireOption(planId, optionId);

  await prisma.planVote.upsert({
    where: { optionId_userId: { optionId, userId } },
    create: { planId, optionId, userId },
    update: {},
  });
  return getCoordination(userId, planId);
}

export async function removeVote(userId: string, planId: string, optionId: string) {
  const { plan } = await requireParticipant(planId, userId);
  requireOpenVote(plan);
  await requireOption(planId, optionId);

  await prisma.planVote.deleteMany({ where: { optionId, userId } });
  return getCoordination(userId, planId);
}

export async function closeVoting(userId: string, planId: string) {
  const { isOwner } = await requireParticipant(planId, userId);
  if (!isOwner) {
    throw new CoordinationError(403, "Solo quien creó el plan puede cerrar la votación.");
  }
  throw new CoordinationError(
    409,
    "La votación debe cerrarse al confirmar el plan y seleccionar sus resultados.",
  );
}

export async function decideVoting(
  userId: string,
  planId: string,
  input: VotingDecisionInput,
) {
  const { plan, isOwner } = await requireParticipant(planId, userId);
  if (!isOwner) {
    throw new CoordinationError(403, "Solo quien creó el plan puede confirmar la votación.");
  }
  if (plan.decidedAt) {
    throw new CoordinationError(409, "El plan ya fue confirmado.");
  }

  const options = await prisma.planOption.findMany({
    where: { planId },
    include: { _count: { select: { votes: true } } },
  });
  const chooseWinner = (kind: "fecha" | "lugar", selectedId?: string) => {
    const candidates = options.filter((option) => option.kind === kind);
    if (candidates.length === 0) return null;
    const maxVotes = Math.max(...candidates.map((option) => option._count.votes));
    const leaders = candidates.filter((option) => option._count.votes === maxVotes);
    if (selectedId && !leaders.some((option) => option.id === selectedId)) {
      throw new CoordinationError(
        400,
        `La opción elegida no está entre las líderes de ${kind === "fecha" ? "Fechas" : "Lugares"}.`,
      );
    }
    const chosenId = selectedId ?? (leaders.length === 1 ? leaders[0].id : undefined);
    if (!chosenId) {
      throw new CoordinationError(
        409,
        `Hay un empate en ${kind === "fecha" ? "Fechas" : "Lugares"}. Elige una opción.`,
      );
    }
    return { id: chosenId, tied: leaders.length > 1 };
  };

  const dateWinner = chooseWinner("fecha", input.dateOptionId);
  const placeWinner = chooseWinner("lugar", input.placeOptionId);
  const hasTie = Boolean(dateWinner?.tied || placeWinner?.tied);
  const reason = input.reason?.trim() ?? "";
  if (hasTie && !reason) {
    throw new CoordinationError(400, "Escribe un motivo para resolver el empate.");
  }

  const decidedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.plan.update({
      where: { id: planId },
      data: {
        winningDateOptionId: dateWinner?.id ?? null,
        winningPlaceOptionId: placeWinner?.id ?? null,
        decisionReason: reason || null,
        decidedAt,
        decidedBy: userId,
        votingClosedAt: decidedAt,
        estado: "confirmado",
      },
    });
  });

  await recordActivity(prisma, {
    planId,
    userId,
    planTitle: plan.titulo,
    action: "confirmed",
    previousState: plan.estado,
    newState: "confirmado",
    details: {
      winningDateOptionId: dateWinner?.id ?? null,
      winningPlaceOptionId: placeWinner?.id ?? null,
      reason: reason || null,
    },
  });

  return getCoordination(userId, planId);
}
