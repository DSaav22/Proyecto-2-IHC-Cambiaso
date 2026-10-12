import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { generateShareCode } from "../lib/shareCode.js";
import {
  INITIAL_PLAN_STATE,
  cancelPlan,
  canDelete,
  canEdit,
  confirmPlan,
  DeleteBlockedError,
  EditBlockedError,
  type PlanState,
} from "../lib/planState.js";
import type { PlanDateFilter, PlanInput } from "../lib/schemas.js";

export class PlanNotFoundError extends Error {
  constructor(message = "Plan no encontrado con este código") {
    super(message);
    this.name = "PlanNotFoundError";
  }
}

export class CreatorCannotJoinError extends Error {
  constructor(message = "Ya eres el creador de este plan") {
    super(message);
    this.name = "CreatorCannotJoinError";
  }
}

export class AlreadyJoinedError extends Error {
  constructor(message = "Ya te has unido a este plan") {
    super(message);
    this.name = "AlreadyJoinedError";
  }
}

export class ForbiddenPlanActionError extends Error {
  constructor(message = "Solo el creador puede realizar esta acción en el plan") {
    super(message);
    this.name = "ForbiddenPlanActionError";
  }
}

export interface StoredPlan {
  id: string;
  titulo: string;
  description: string;
  dueDate: Date;
  estado: string;
  createdAt: Date;
  shareCode: string;
  isOwner?: boolean;
  ownerName?: string;
}

export interface PlanListFilter {
  q?: string;
  estado?: PlanState;
  fecha?: PlanDateFilter;
}

export interface PlanSummary {
  total: number;
  overdue: number;
  nextDueDate: Date | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Converts a `YYYY-MM-DD` calendar date to UTC midnight (matches `@db.Date` columns). */
export function toUtcDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * MS_PER_DAY);

/**
 * Builds the Prisma `where` for the plan list. The owner-or-member scope is always the first
 * `AND` clause. Date filters exclude `cancelado` plans unless `estado` is set explicitly.
 */
export function buildPlanWhere(
  userId: string,
  filter: PlanListFilter,
  todayUtc: Date,
): Prisma.PlanWhereInput {
  const and: Prisma.PlanWhereInput[] = [
    { OR: [{ userId }, { members: { some: { userId } } }] },
  ];
  if (filter.q) {
    and.push({ titulo: { contains: filter.q, mode: "insensitive" } });
  }
  if (filter.estado) {
    and.push({ estado: filter.estado });
  }
  if (filter.fecha) {
    switch (filter.fecha) {
      case "today":
        and.push({ dueDate: { gte: todayUtc, lte: todayUtc } });
        break;
      case "next7":
        and.push({ dueDate: { gte: todayUtc, lte: addDays(todayUtc, 7) } });
        break;
      case "next30":
        and.push({ dueDate: { gte: todayUtc, lte: addDays(todayUtc, 30) } });
        break;
      case "overdue":
        and.push({ dueDate: { lt: todayUtc } });
        break;
    }
    if (!filter.estado) {
      and.push({ estado: { not: "cancelado" } });
    }
  }
  return { AND: and };
}

/**
 * Summarizes the whole scope (never filtered). `total` counts every plan; `overdue` and
 * `nextDueDate` ignore `cancelado` plans.
 */
export function computePlanSummary(
  rows: { dueDate: Date; estado: string }[],
  todayUtc: Date,
): PlanSummary {
  let overdue = 0;
  let nextDueDate: Date | null = null;
  for (const row of rows) {
    if (row.estado === "cancelado") continue;
    if (row.dueDate.getTime() < todayUtc.getTime()) {
      overdue += 1;
    } else if (nextDueDate === null || row.dueDate.getTime() < nextDueDate.getTime()) {
      nextDueDate = row.dueDate;
    }
  }
  return { total: rows.length, overdue, nextDueDate };
}

export interface PlansStore {
  list(userId: string): Promise<StoredPlan[]>;
  /** The store generates the plan id and shareCode. */
  create(userId: string, data: PlanInput): Promise<StoredPlan>;
  /** Joins a plan using a share code. */
  joinByCode(userId: string, code: string): Promise<StoredPlan>;
  /**
   * Updates titulo, description and dueDate for an owned plan. Resolves null if not found.
   * Throws ForbiddenPlanActionError if caller is a guest member; throws EditBlockedError when the plan is `cancelado`.
   */
  update(userId: string, planId: string, data: PlanInput): Promise<StoredPlan | null>;
  /**
   * Moves an owned `pendiente` plan to `confirmado`. Resolves `null` when not found;
   * throws ForbiddenPlanActionError if caller is a guest member; rejects with `InvalidTransitionError` when `confirmado` or `cancelado`.
   */
  confirm(userId: string, planId: string): Promise<StoredPlan | null>;
  /**
   * Moves an owned `pendiente` or `confirmado` plan to `cancelado`. Resolves `null` when not found;
   * throws ForbiddenPlanActionError if caller is a guest member; rejects with `InvalidTransitionError` when already `cancelado`.
   */
  cancel(userId: string, planId: string): Promise<StoredPlan | null>;
  /**
   * Deletes an owned plan. Throws `DeleteBlockedError` if confirmed; throws ForbiddenPlanActionError if caller is a guest member.
   * Resolves `false` if the plan does not exist.
   */
  delete(userId: string, planId: string): Promise<boolean>;
}

export function createPrismaPlansStore(): PlansStore {
  return {
    list: async (userId: string) => {
      const plans = await prisma.plan.findMany({
        where: {
          OR: [{ userId }, { members: { some: { userId } } }],
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
        include: {
          user: { select: { name: true } },
        },
      });
      return plans.map((p) => ({
        id: p.id,
        titulo: p.titulo,
        description: p.description,
        dueDate: p.dueDate,
        estado: p.estado,
        createdAt: p.createdAt,
        shareCode: p.shareCode,
        isOwner: p.userId === userId,
        ownerName: p.user.name,
      }));
    },
    create: async (userId: string, data: PlanInput) => {
      let attempts = 0;
      while (attempts < 5) {
        try {
          const shareCode = generateShareCode();
          const plan = await prisma.plan.create({
            data: {
              userId,
              titulo: data.titulo,
              description: data.description,
              dueDate: new Date(`${data.dueDate}T00:00:00.000Z`),
              estado: INITIAL_PLAN_STATE,
              shareCode,
            },
            include: {
              user: { select: { name: true } },
            },
          });
          return {
            id: plan.id,
            titulo: plan.titulo,
            description: plan.description,
            dueDate: plan.dueDate,
            estado: plan.estado,
            createdAt: plan.createdAt,
            shareCode: plan.shareCode,
            isOwner: true,
            ownerName: plan.user.name,
          };
        } catch (err: any) {
          if (err?.code === "P2002" && err?.meta?.target?.includes("shareCode")) {
            attempts++;
            continue;
          }
          throw err;
        }
      }
      throw new Error("No se pudo generar un código único para compartir");
    },
    joinByCode: async (userId: string, code: string) => {
      const normalizedCode = code.trim().toUpperCase();
      const plan = await prisma.plan.findUnique({
        where: { shareCode: normalizedCode },
        include: {
          user: { select: { name: true } },
          members: { where: { userId } },
        },
      });
      if (!plan) {
        throw new PlanNotFoundError();
      }
      if (plan.userId === userId) {
        throw new CreatorCannotJoinError();
      }
      if (plan.members.length > 0) {
        throw new AlreadyJoinedError();
      }
      await prisma.planMember.create({
        data: {
          planId: plan.id,
          userId,
        },
      });
      return {
        id: plan.id,
        titulo: plan.titulo,
        description: plan.description,
        dueDate: plan.dueDate,
        estado: plan.estado,
        createdAt: plan.createdAt,
        shareCode: plan.shareCode,
        isOwner: false,
        ownerName: plan.user.name,
      };
    },
    update: async (userId: string, planId: string, data: PlanInput) => {
      const existing = await prisma.plan.findUnique({
        where: { id: planId },
        include: { user: { select: { name: true } } },
      });
      if (!existing) return null;
      if (existing.userId !== userId) {
        const isMember = await prisma.planMember.findUnique({
          where: { planId_userId: { planId, userId } },
        });
        if (isMember) {
          throw new ForbiddenPlanActionError("Solo el creador puede editar este plan");
        }
        return null;
      }
      if (!canEdit(existing)) {
        throw new EditBlockedError(existing.estado as any);
      }
      const updated = await prisma.plan.update({
        where: { id: planId },
        data: {
          titulo: data.titulo,
          description: data.description,
          dueDate: new Date(`${data.dueDate}T00:00:00.000Z`),
        },
      });
      return {
        id: updated.id,
        titulo: updated.titulo,
        description: updated.description,
        dueDate: updated.dueDate,
        estado: updated.estado,
        createdAt: updated.createdAt,
        shareCode: updated.shareCode,
        isOwner: true,
        ownerName: existing.user.name,
      };
    },
    confirm: async (userId: string, planId: string) => {
      const existing = await prisma.plan.findUnique({
        where: { id: planId },
        include: { user: { select: { name: true } } },
      });
      if (!existing) return null;
      if (existing.userId !== userId) {
        const isMember = await prisma.planMember.findUnique({
          where: { planId_userId: { planId, userId } },
        });
        if (isMember) {
          throw new ForbiddenPlanActionError("Solo el creador puede confirmar este plan");
        }
        return null;
      }
      const next = confirmPlan(existing);
      await prisma.plan.update({
        where: { id: planId },
        data: { estado: next.estado },
      });
      return {
        id: existing.id,
        titulo: existing.titulo,
        description: existing.description,
        dueDate: existing.dueDate,
        estado: next.estado,
        createdAt: existing.createdAt,
        shareCode: existing.shareCode,
        isOwner: true,
        ownerName: existing.user.name,
      };
    },
    cancel: async (userId: string, planId: string) => {
      const existing = await prisma.plan.findUnique({
        where: { id: planId },
        include: { user: { select: { name: true } } },
      });
      if (!existing) return null;
      if (existing.userId !== userId) {
        const isMember = await prisma.planMember.findUnique({
          where: { planId_userId: { planId, userId } },
        });
        if (isMember) {
          throw new ForbiddenPlanActionError("Solo el creador puede cancelar este plan");
        }
        return null;
      }
      const next = cancelPlan(existing);
      await prisma.plan.update({
        where: { id: planId },
        data: { estado: next.estado },
      });
      return {
        id: existing.id,
        titulo: existing.titulo,
        description: existing.description,
        dueDate: existing.dueDate,
        estado: next.estado,
        createdAt: existing.createdAt,
        shareCode: existing.shareCode,
        isOwner: true,
        ownerName: existing.user.name,
      };
    },
    delete: async (userId: string, planId: string) => {
      const existing = await prisma.plan.findUnique({
        where: { id: planId },
      });
      if (!existing) return false;
      if (existing.userId !== userId) {
        const isMember = await prisma.planMember.findUnique({
          where: { planId_userId: { planId, userId } },
        });
        if (isMember) {
          throw new ForbiddenPlanActionError("Solo el creador puede eliminar este plan");
        }
        return false;
      }
      if (!canDelete(existing)) {
        throw new DeleteBlockedError("confirmado");
      }
      await prisma.plan.delete({
        where: { id: planId },
      });
      return true;
    },
  };
}
