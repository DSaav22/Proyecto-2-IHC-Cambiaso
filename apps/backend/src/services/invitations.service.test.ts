import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.hoisted(() => vi.fn());
const findFirst = vi.hoisted(() => vi.fn());
const invitationDelete = vi.hoisted(() => vi.fn());
const memberCreate = vi.hoisted(() => vi.fn());
const transaction = vi.hoisted(() => vi.fn());
const record = vi.hoisted(() => vi.fn());
vi.mock("../lib/prisma.js", () => ({
  prisma: {
    planInvitation: { findMany, findFirst, delete: invitationDelete },
    planMember: { create: memberCreate },
    $transaction: transaction,
  },
}));
vi.mock("./activity.service.js", () => ({ recordActivity: record }));

import {
  acceptInvitation,
  declineInvitation,
  InvitationNotFoundError,
  listInvitations,
} from "./invitations.service.js";

const plan = {
  id: "plan-1",
  titulo: "Cena",
  description: "Cena de cumpleaños",
  dueDate: new Date("2026-11-20T00:00:00.000Z"),
  estado: "pendiente",
  createdAt: new Date("2026-11-12T20:00:00.000Z"),
  shareCode: "PLZ-AAAAAA",
  user: { name: "Ana" },
};

beforeEach(() => {
  vi.clearAllMocks();
  findFirst.mockResolvedValue({ id: "inv-1", plan });
  transaction.mockResolvedValue([]);
});

describe("listInvitations", () => {
  it("returns the plan details the person needs to decide", async () => {
    findMany.mockResolvedValue([{ id: "inv-1", plan }]);

    expect(await listInvitations("caro")).toEqual([
      {
        id: "inv-1",
        plan: { titulo: "Cena", description: "Cena de cumpleaños", dueDate: "2026-11-20", ownerName: "Ana" },
      },
    ]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "caro" } }));
  });
});

describe("acceptInvitation", () => {
  it("makes the person a member and removes the invitation", async () => {
    const joined = await acceptInvitation("caro", "inv-1");

    expect(memberCreate).toHaveBeenCalledWith({ data: { planId: "plan-1", userId: "caro" } });
    expect(invitationDelete).toHaveBeenCalledWith({ where: { id: "inv-1" } });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "joined", userId: "caro", planId: "plan-1" }),
    );
    expect(joined).toMatchObject({ id: "plan-1", isOwner: false, ownerName: "Ana", dueDate: "2026-11-20" });
  });

  it("does not accept someone else's invitation", async () => {
    findFirst.mockResolvedValue(null);

    await expect(acceptInvitation("beto", "inv-1")).rejects.toBeInstanceOf(InvitationNotFoundError);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "inv-1", userId: "beto" } }));
    expect(memberCreate).not.toHaveBeenCalled();
  });
});

describe("declineInvitation", () => {
  it("removes the invitation without joining the plan", async () => {
    await declineInvitation("caro", "inv-1");

    expect(invitationDelete).toHaveBeenCalledWith({ where: { id: "inv-1" } });
    expect(memberCreate).not.toHaveBeenCalled();
  });

  it("does not decline an invitation that does not exist", async () => {
    findFirst.mockResolvedValue(null);

    await expect(declineInvitation("caro", "inv-x")).rejects.toBeInstanceOf(InvitationNotFoundError);
    expect(invitationDelete).not.toHaveBeenCalled();
  });
});
