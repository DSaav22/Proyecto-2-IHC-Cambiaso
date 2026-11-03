import { beforeEach, describe, expect, it, vi } from "vitest";

const planFindUnique = vi.hoisted(() => vi.fn());
const planUpdate = vi.hoisted(() => vi.fn());
const optionFindMany = vi.hoisted(() => vi.fn());
const optionFindFirst = vi.hoisted(() => vi.fn());
const optionCreate = vi.hoisted(() => vi.fn());
const voteFindMany = vi.hoisted(() => vi.fn());
const voteUpsert = vi.hoisted(() => vi.fn());
const voteDeleteMany = vi.hoisted(() => vi.fn());
vi.mock("../lib/prisma.js", () => ({
  prisma: {
    plan: { findUnique: planFindUnique, update: planUpdate },
    planOption: { findMany: optionFindMany, findFirst: optionFindFirst, create: optionCreate },
    planVote: { findMany: voteFindMany, upsert: voteUpsert, deleteMany: voteDeleteMany },
  },
}));

import {
  addOption,
  castVote,
  closeVoting,
  CoordinationError,
  getCoordination,
  removeVote,
} from "./coordination.service.js";

const OWNER = "owner-1";
const MEMBER = "member-1";
const PLAN = "plan-1";

function storedPlan({ closed = false } = {}) {
  return {
    id: PLAN,
    userId: OWNER,
    votingClosedAt: closed ? new Date("2026-11-03T19:00:00.000Z") : null,
    user: { id: OWNER, name: "Usuario Uno" },
    members: [{ userId: MEMBER, user: { id: MEMBER, name: "Usuario Dos" } }],
  };
}

function storedOption(id: string, label: string, votes: number) {
  return {
    id,
    kind: "lugar",
    label,
    author: { name: "Usuario Uno" },
    _count: { votes },
  };
}

async function expectCoordinationError(promise: Promise<unknown>, status: number, message: string) {
  const error = await promise.catch((err: unknown) => err);
  expect(error).toBeInstanceOf(CoordinationError);
  expect(error).toMatchObject({ status, message });
}

beforeEach(() => {
  vi.clearAllMocks();
  planFindUnique.mockResolvedValue(storedPlan());
  optionFindFirst.mockResolvedValue({ id: "opt-1", planId: PLAN });
  optionFindMany.mockResolvedValue([]);
  voteFindMany.mockResolvedValue([]);
});

describe("getCoordination", () => {
  it("marks every option the user voted for as theirs", async () => {
    optionFindMany.mockResolvedValue([
      storedOption("opt-1", "Parque central", 2),
      storedOption("opt-2", "Casa de Ana", 1),
      storedOption("opt-3", "Cine", 0),
    ]);
    voteFindMany.mockResolvedValue([{ optionId: "opt-1" }, { optionId: "opt-2" }]);

    const board = await getCoordination(MEMBER, PLAN);

    expect(board.votingClosed).toBe(false);
    expect(board.options.map((option) => [option.id, option.votes, option.mine])).toEqual([
      ["opt-1", 2, true],
      ["opt-2", 1, true],
      ["opt-3", 0, false],
    ]);
  });

  it("reports a closed vote", async () => {
    planFindUnique.mockResolvedValue(storedPlan({ closed: true }));
    const board = await getCoordination(OWNER, PLAN);
    expect(board.votingClosed).toBe(true);
  });

  it("hides the plan from people outside it", async () => {
    await expectCoordinationError(getCoordination("stranger", PLAN), 404, "Plan no encontrado");
  });
});

describe("castVote", () => {
  it("adds a vote for the option without touching the user's other votes", async () => {
    await castVote(MEMBER, PLAN, "opt-1");

    expect(voteUpsert).toHaveBeenCalledWith({
      where: { optionId_userId: { optionId: "opt-1", userId: MEMBER } },
      create: { planId: PLAN, optionId: "opt-1", userId: MEMBER },
      update: {},
    });
    expect(voteDeleteMany).not.toHaveBeenCalled();
  });

  it("rejects an option from another plan", async () => {
    optionFindFirst.mockResolvedValue(null);
    await expectCoordinationError(castVote(MEMBER, PLAN, "opt-x"), 404, "Esa opción no está en el plan.");
    expect(voteUpsert).not.toHaveBeenCalled();
  });

  it("rejects votes once the vote is closed", async () => {
    planFindUnique.mockResolvedValue(storedPlan({ closed: true }));
    await expectCoordinationError(castVote(MEMBER, PLAN, "opt-1"), 409, "La votación está cerrada.");
    expect(voteUpsert).not.toHaveBeenCalled();
  });
});

describe("removeVote", () => {
  it("deletes only the user's vote on that option", async () => {
    await removeVote(MEMBER, PLAN, "opt-1");
    expect(voteDeleteMany).toHaveBeenCalledWith({ where: { optionId: "opt-1", userId: MEMBER } });
  });

  it("keeps the vote once the vote is closed", async () => {
    planFindUnique.mockResolvedValue(storedPlan({ closed: true }));
    await expectCoordinationError(removeVote(MEMBER, PLAN, "opt-1"), 409, "La votación está cerrada.");
    expect(voteDeleteMany).not.toHaveBeenCalled();
  });
});

describe("closeVoting", () => {
  it("lets the creator close the vote", async () => {
    await closeVoting(OWNER, PLAN);
    expect(planUpdate).toHaveBeenCalledWith({
      where: { id: PLAN },
      data: { votingClosedAt: expect.any(Date) },
    });
  });

  it("does not let a member close the vote", async () => {
    await expectCoordinationError(
      closeVoting(MEMBER, PLAN),
      403,
      "Solo quien creó el plan puede cerrar la votación.",
    );
    expect(planUpdate).not.toHaveBeenCalled();
  });

  it("rejects closing a vote twice", async () => {
    planFindUnique.mockResolvedValue(storedPlan({ closed: true }));
    await expectCoordinationError(closeVoting(OWNER, PLAN), 409, "La votación ya está cerrada.");
    expect(planUpdate).not.toHaveBeenCalled();
  });
});

describe("addOption", () => {
  it("rejects new proposals once the vote is closed", async () => {
    planFindUnique.mockResolvedValue(storedPlan({ closed: true }));
    await expectCoordinationError(
      addOption(MEMBER, PLAN, "lugar", "Parque central"),
      409,
      "La votación está cerrada.",
    );
    expect(optionCreate).not.toHaveBeenCalled();
  });
});
