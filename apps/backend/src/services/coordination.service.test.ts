import { beforeEach, describe, expect, it, vi } from "vitest";

const planFindUnique = vi.hoisted(() => vi.fn());
const planUpdate = vi.hoisted(() => vi.fn());
const optionFindMany = vi.hoisted(() => vi.fn());
const optionFindFirst = vi.hoisted(() => vi.fn());
const optionCreate = vi.hoisted(() => vi.fn());
const voteFindMany = vi.hoisted(() => vi.fn());
const voteUpsert = vi.hoisted(() => vi.fn());
const voteDeleteMany = vi.hoisted(() => vi.fn());
const transaction = vi.hoisted(() => vi.fn());
const userFindUnique = vi.hoisted(() => vi.fn());
const invitationCreate = vi.hoisted(() => vi.fn());
const memberCreate = vi.hoisted(() => vi.fn());
vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    planInvitation: { create: invitationCreate },
    planMember: { create: memberCreate },
    plan: { findUnique: planFindUnique, update: planUpdate },
    planOption: { findMany: optionFindMany, findFirst: optionFindFirst, create: optionCreate },
    planVote: { findMany: voteFindMany, upsert: voteUpsert, deleteMany: voteDeleteMany },
    $transaction: transaction,
  },
}));

import {
  addOption,
  castVote,
  closeVoting,
  CoordinationError,
  decideVoting,
  getCoordination,
  inviteByEmail,
  removeVote,
} from "./coordination.service.js";

const OWNER = "owner-1";
const MEMBER = "member-1";
const GUEST = "guest-1";
const PLAN = "plan-1";

function storedPlan({ closed = false, invited = false } = {}) {
  return {
    id: PLAN,
    userId: OWNER,
    votingClosedAt: closed ? new Date("2026-11-03T19:00:00.000Z") : null,
    decidedAt: null,
    decisionReason: null,
    winningDateOption: null,
    winningPlaceOption: null,
    decisionMaker: null,
    user: { id: OWNER, name: "Usuario Uno" },
    members: [{ userId: MEMBER, user: { id: MEMBER, name: "Usuario Dos" } }],
    invitations: invited ? [{ userId: GUEST, user: { id: GUEST, name: "Usuario Tres" } }] : [],
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
  transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({ plan: { update: planUpdate } }),
  );
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

  it("shows pending invitations only to the owner", async () => {
    planFindUnique.mockResolvedValue(storedPlan({ invited: true }));

    expect((await getCoordination(OWNER, PLAN)).pendingInvites).toEqual([{ name: "Usuario Tres" }]);
    expect((await getCoordination(MEMBER, PLAN)).pendingInvites).toEqual([]);
  });

  it("does not let an invited person in before accepting", async () => {
    planFindUnique.mockResolvedValue(storedPlan({ invited: true }));
    await expectCoordinationError(getCoordination(GUEST, PLAN), 404, "Plan no encontrado");
  });
});

describe("inviteByEmail", () => {
  it("creates a pending invitation instead of adding the person to the plan", async () => {
    userFindUnique.mockResolvedValue({ id: GUEST });

    await inviteByEmail(OWNER, PLAN, "tres@planazo.com");

    expect(invitationCreate).toHaveBeenCalledWith({
      data: { planId: PLAN, userId: GUEST, invitedById: OWNER },
    });
    expect(memberCreate).not.toHaveBeenCalled();
  });

  it("rejects someone who is already in the plan", async () => {
    userFindUnique.mockResolvedValue({ id: MEMBER });
    await expectCoordinationError(
      inviteByEmail(OWNER, PLAN, "dos@planazo.com"),
      409,
      "Esa persona ya está en el plan.",
    );
    expect(invitationCreate).not.toHaveBeenCalled();
  });

  it("rejects a second invitation while the first one is pending", async () => {
    planFindUnique.mockResolvedValue(storedPlan({ invited: true }));
    userFindUnique.mockResolvedValue({ id: GUEST });
    await expectCoordinationError(
      inviteByEmail(OWNER, PLAN, "tres@planazo.com"),
      409,
      "Esa persona ya tiene una invitación pendiente.",
    );
    expect(invitationCreate).not.toHaveBeenCalled();
  });

  it("only lets the owner invite", async () => {
    await expectCoordinationError(
      inviteByEmail(MEMBER, PLAN, "tres@planazo.com"),
      403,
      "Solo quien creó el plan puede invitar.",
    );
    expect(invitationCreate).not.toHaveBeenCalled();
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
  it("requires the creator to use the decision flow", async () => {
    await expectCoordinationError(
      closeVoting(OWNER, PLAN),
      409,
      "La votación debe cerrarse al confirmar el plan y seleccionar sus resultados.",
    );
    expect(planUpdate).not.toHaveBeenCalled();
  });

  it("does not let a member close the vote", async () => {
    await expectCoordinationError(
      closeVoting(MEMBER, PLAN),
      403,
      "Solo quien creó el plan puede cerrar la votación.",
    );
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

  describe("decideVoting", () => {
    it("persists the unique leader for each category", async () => {
      const date = {
        id: "date-1",
        kind: "fecha",
        label: "2026-11-08",
        author: { name: "Usuario Uno" },
        _count: { votes: 3 },
      };
      const place = storedOption("place-1", "Parque central", 2);
      optionFindMany
        .mockResolvedValueOnce([date, place])
        .mockResolvedValueOnce([date, place]);
      planFindUnique.mockResolvedValueOnce(storedPlan()).mockResolvedValueOnce({
        ...storedPlan(),
        decidedAt: new Date("2026-11-05T12:00:00.000Z"),
        winningDateOption: { id: date.id, label: date.label },
        winningPlaceOption: { id: place.id, label: place.label },
        decisionMaker: { id: OWNER, name: "Usuario Uno" },
      });

      await decideVoting(OWNER, PLAN, {});

      expect(planUpdate).toHaveBeenCalledWith({
        where: { id: PLAN },
        data: expect.objectContaining({
          winningDateOptionId: "date-1",
          winningPlaceOptionId: "place-1",
          votingClosedAt: expect.any(Date),
          estado: "confirmado",
        }),
      });
    });

    it("requires a winner when a category is tied", async () => {
      optionFindMany.mockResolvedValue([
        storedOption("place-1", "Parque central", 1),
        storedOption("place-2", "Casa de Ana", 1),
      ]);

      await expectCoordinationError(
        decideVoting(OWNER, PLAN, {}),
        409,
        "Hay un empate en Lugares. Elige una opción.",
      );
      expect(transaction).not.toHaveBeenCalled();
    });

    it("requires a reason to resolve a tie", async () => {
      optionFindMany.mockResolvedValue([
        storedOption("place-1", "Parque central", 1),
        storedOption("place-2", "Casa de Ana", 1),
      ]);

      await expectCoordinationError(
        decideVoting(OWNER, PLAN, { placeOptionId: "place-1" }),
        400,
        "Escribe un motivo para resolver el empate.",
      );
      expect(transaction).not.toHaveBeenCalled();
    });

    it("rejects a non-owner decision", async () => {
      await expectCoordinationError(
        decideVoting(MEMBER, PLAN, {}),
        403,
        "Solo quien creó el plan puede confirmar la votación.",
      );
      expect(optionFindMany).not.toHaveBeenCalled();
    });

    it("rejects a decision after the vote is closed", async () => {
      planFindUnique.mockResolvedValue({
        ...storedPlan({ closed: true }),
        decidedAt: new Date("2026-11-05T12:00:00.000Z"),
      });

      await expectCoordinationError(
        decideVoting(OWNER, PLAN, {}),
        409,
        "El plan ya fue confirmado.",
      );
      expect(optionFindMany).not.toHaveBeenCalled();
    });

    it("rejects a selected option that is not a leader", async () => {
      optionFindMany.mockResolvedValue([
        storedOption("place-1", "Parque central", 2),
        storedOption("place-2", "Casa de Ana", 1),
      ]);

      await expectCoordinationError(
        decideVoting(OWNER, PLAN, { placeOptionId: "place-2" }),
        400,
        "La opción elegida no está entre las líderes de Lugares.",
      );
      expect(transaction).not.toHaveBeenCalled();
    });

    it("allows an empty category while selecting the available category", async () => {
      optionFindMany
        .mockResolvedValueOnce([storedOption("place-1", "Parque central", 1)])
        .mockResolvedValueOnce([storedOption("place-1", "Parque central", 1)]);
      planFindUnique.mockResolvedValueOnce(storedPlan()).mockResolvedValueOnce(storedPlan());

      await decideVoting(OWNER, PLAN, {});

      expect(planUpdate).toHaveBeenCalledWith({
        where: { id: PLAN },
        data: expect.objectContaining({
          winningDateOptionId: null,
          winningPlaceOptionId: "place-1",
        }),
      });
    });

    it("can complete a legacy closed vote that has no decision", async () => {
      const place = storedOption("place-1", "Parque central", 2);
      optionFindMany
        .mockResolvedValueOnce([place])
        .mockResolvedValueOnce([place]);
      planFindUnique
        .mockResolvedValueOnce(storedPlan({ closed: true }))
        .mockResolvedValueOnce({
          ...storedPlan({ closed: true }),
          decidedAt: new Date("2026-11-05T12:00:00.000Z"),
          winningPlaceOption: { id: place.id, label: place.label },
          decisionMaker: { id: OWNER, name: "Usuario Uno" },
        });

      await decideVoting(OWNER, PLAN, {});

      expect(planUpdate).toHaveBeenCalledWith({
        where: { id: PLAN },
        data: expect.objectContaining({
          winningPlaceOptionId: "place-1",
          estado: "confirmado",
        }),
      });
    });
  });
});
