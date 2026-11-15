import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AccountDeletionBlockedError,
  accountExportToCsv,
  deleteAccount,
  exportAccountData,
} from "./account.service";

const userFind = vi.fn();
const planFindMany = vi.fn();
const planCount = vi.fn();
const planDeleteMany = vi.fn();
const memberFindMany = vi.fn();
const memberDeleteMany = vi.fn();
const voteDeleteMany = vi.fn();
const inviteDeleteMany = vi.fn();
const userUpdate = vi.fn();
const getBalanceCents = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: (...a: unknown[]) => userFind(...a),
      update: (...a: unknown[]) => userUpdate(...a),
    },
    plan: {
      findMany: (...a: unknown[]) => planFindMany(...a),
      count: (...a: unknown[]) => planCount(...a),
      deleteMany: (...a: unknown[]) => planDeleteMany(...a),
    },
    planMember: {
      findMany: (...a: unknown[]) => memberFindMany(...a),
      deleteMany: (...a: unknown[]) => memberDeleteMany(...a),
    },
    planVote: { deleteMany: (...a: unknown[]) => voteDeleteMany(...a) },
    planInvitation: { deleteMany: (...a: unknown[]) => inviteDeleteMany(...a) },
  },
}));

vi.mock("./expenses.service.js", () => ({
  getBalanceCents: (...a: unknown[]) => getBalanceCents(...a),
}));

describe("account.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userFind.mockResolvedValue({
      name: "Ana",
      email: "ana@planazo.com",
      createdAt: new Date("2026-01-01"),
    });
    planFindMany.mockResolvedValue([{ titulo: "Asado", estado: "pendiente", dueDate: new Date("2026-11-20") }]);
    memberFindMany.mockResolvedValue([]);
    planCount.mockResolvedValue(0);
    getBalanceCents.mockResolvedValue(0);
  });

  it("exporta nombre y correo", async () => {
    const data = await exportAccountData("u1");
    expect(data.user.email).toBe("ana@planazo.com");
    expect(data.plansOwned[0].titulo).toBe("Asado");
  });

  it("arma un csv simple", async () => {
    const data = await exportAccountData("u1");
    const csv = accountExportToCsv(data);
    expect(csv).toContain("ana@planazo.com");
    expect(csv).toContain("Asado");
  });

  it("bloquea si hay planes abiertos", async () => {
    planCount.mockResolvedValue(1);
    await expect(deleteAccount("u1")).rejects.toMatchObject({ reason: "planes_abiertos" });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("bloquea si hay deuda", async () => {
    memberFindMany.mockResolvedValue([{ planId: "p1" }]);
    getBalanceCents.mockResolvedValue(-4500);
    await expect(deleteAccount("u1")).rejects.toBeInstanceOf(AccountDeletionBlockedError);
  });

  it("anonimiza cuando no hay bloqueos", async () => {
    await deleteAccount("u1");
    expect(userUpdate).toHaveBeenCalled();
    expect(memberDeleteMany).toHaveBeenCalled();
  });
});
