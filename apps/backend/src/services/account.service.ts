import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { accountDeletionBlock, type AccountDeletionReason } from "../lib/accountDeletion.js";
import { getBalanceCents } from "./expenses.service.js";

export class AccountDeletionBlockedError extends Error {
  status = 409;
  reason: AccountDeletionReason;
  constructor(reason: AccountDeletionReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

async function debtCents(userId: string) {
  const members = await prisma.planMember.findMany({ where: { userId }, select: { planId: true } });
  let total = 0;
  for (const { planId } of members) {
    const balance = await getBalanceCents(userId, planId);
    if (balance < 0) total += -balance;
  }
  return total;
}

/** Datos de la cuenta para ver y descargar. */
export async function exportAccountData(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, createdAt: true },
  });
  const owned = await prisma.plan.findMany({
    where: { userId },
    select: { titulo: true, estado: true, dueDate: true },
    orderBy: { createdAt: "desc" },
  });
  const joined = await prisma.planMember.findMany({
    where: { userId },
    select: { plan: { select: { titulo: true, estado: true, user: { select: { name: true } } } } },
  });

  return {
    exportedAt: new Date().toISOString(),
    user: { name: user.name, email: user.email, createdAt: user.createdAt.toISOString() },
    plansOwned: owned.map((p) => ({
      titulo: p.titulo,
      estado: p.estado,
      dueDate: p.dueDate.toISOString().slice(0, 10),
    })),
    plansJoined: joined.map((m) => ({
      titulo: m.plan.titulo,
      estado: m.plan.estado,
      ownerName: m.plan.user.name,
    })),
  };
}

export type AccountExport = Awaited<ReturnType<typeof exportAccountData>>;

/** CSV corto: una fila por dato. */
export function accountExportToCsv(data: AccountExport) {
  const lines = [
    "campo,valor",
    `nombre,${data.user.name}`,
    `correo,${data.user.email}`,
    `planes_propios,${data.plansOwned.length}`,
    `planes_unidos,${data.plansJoined.length}`,
  ];
  for (const p of data.plansOwned) lines.push(`plan_propio,${p.titulo} (${p.estado})`);
  for (const p of data.plansJoined) lines.push(`plan_unido,${p.titulo} — ${p.ownerName}`);
  return lines.join("\n") + "\n";
}

/** Anonimiza la cuenta si no hay planes abiertos ni deudas. */
export async function deleteAccount(userId: string) {
  const open = await prisma.plan.count({ where: { userId, estado: { not: "cancelado" } } });
  const block = accountDeletionBlock(open, await debtCents(userId));
  if (block) throw new AccountDeletionBlockedError(block.reason, block.message);

  await prisma.planInvitation.deleteMany({ where: { OR: [{ userId }, { invitedById: userId }] } });
  await prisma.planVote.deleteMany({ where: { userId } });
  await prisma.planMember.deleteMany({ where: { userId } });
  await prisma.plan.deleteMany({ where: { userId, estado: "cancelado" } });
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: "Usuario eliminado",
      email: `eliminado-${userId}@planazo.invalid`,
      passwordHash: await bcrypt.hash(randomBytes(16).toString("hex"), 10),
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    },
  });
}
