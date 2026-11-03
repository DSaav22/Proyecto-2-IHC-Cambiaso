import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, type CoordinationBoard } from "../../api/client";
import { PlanCoordinationDialog } from "./PlanCoordinationDialog";

vi.mock("../../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/client")>();
  return {
    ...actual,
    api: {
      getCoordination: vi.fn(),
      votePlanOption: vi.fn(),
      removePlanVote: vi.fn(),
      closePlanVoting: vi.fn(),
      addPlanOption: vi.fn(),
      inviteToPlan: vi.fn(),
    },
  };
});

const getCoordination = vi.mocked(api.getCoordination);
const votePlanOption = vi.mocked(api.votePlanOption);
const removePlanVote = vi.mocked(api.removePlanVote);
const closePlanVoting = vi.mocked(api.closePlanVoting);

type Votes = { park: [number, boolean]; house: [number, boolean] };

function board(votes: Votes, votingClosed = false): CoordinationBoard {
  return {
    votingClosed,
    participants: [
      { name: "Usuario Uno", role: "Creador" },
      { name: "Usuario Dos", role: "Participante" },
    ],
    options: [
      { id: "park", kind: "lugar", label: "Parque central", authorName: "Usuario Uno", votes: votes.park[0], mine: votes.park[1] },
      { id: "house", kind: "lugar", label: "Casa de Ana", authorName: "Usuario Dos", votes: votes.house[0], mine: votes.house[1] },
    ],
  };
}

const noVotes: Votes = { park: [0, false], house: [0, false] };

function renderDialog(isOwner = true) {
  render(
    <PlanCoordinationDialog
      planId="plan-1"
      planTitle="Cumpleaños"
      isOwner={isOwner}
      open
      onOpenChange={() => {}}
    />,
  );
}

describe("PlanCoordinationDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCoordination.mockResolvedValue(board(noVotes));
  });

  it("lets a participant vote for two options", async () => {
    const user = userEvent.setup();
    votePlanOption
      .mockResolvedValueOnce(board({ park: [1, true], house: [0, false] }))
      .mockResolvedValueOnce(board({ park: [1, true], house: [1, true] }));
    renderDialog();

    await user.click(await screen.findByRole("button", { name: "Votar por Lugar: Parque central" }));
    await user.click(await screen.findByRole("button", { name: "Votar por Lugar: Casa de Ana" }));

    expect(votePlanOption).toHaveBeenNthCalledWith(1, "plan-1", "park");
    expect(votePlanOption).toHaveBeenNthCalledWith(2, "plan-1", "house");
    expect(screen.getByRole("button", { name: "Quitar voto de Lugar: Parque central" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Quitar voto de Lugar: Casa de Ana" })).toBeInTheDocument();
  });

  it("removes a vote and shows the new count", async () => {
    const user = userEvent.setup();
    getCoordination.mockResolvedValue(board({ park: [2, true], house: [0, false] }));
    removePlanVote.mockResolvedValue(board({ park: [1, false], house: [0, false] }));
    renderDialog();

    await user.click(await screen.findByRole("button", { name: "Quitar voto de Lugar: Parque central" }));

    expect(removePlanVote).toHaveBeenCalledWith("plan-1", "park");
    const park = screen.getByText("Lugar: Parque central").closest("li")!;
    expect(within(park).getByText(/1 voto$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Votar por Lugar: Parque central" })).toBeInTheDocument();
  });

  it("lets the creator close the vote after confirming", async () => {
    const user = userEvent.setup();
    closePlanVoting.mockResolvedValue(board({ park: [1, true], house: [0, false] }, true));
    renderDialog(true);

    await user.click(await screen.findByRole("button", { name: "Cerrar votación" }));
    const confirm = await screen.findByRole("alertdialog", { name: "¿Cerrar la votación?" });
    await user.click(within(confirm).getByRole("button", { name: "Cerrar votación" }));

    expect(closePlanVoting).toHaveBeenCalledWith("plan-1");
    expect(await screen.findByText("La votación está cerrada.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^(Votar|Quitar voto)/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Proponer" })).not.toBeInTheDocument();
  });

  it("keeps the counts but offers no controls when the vote is closed", async () => {
    getCoordination.mockResolvedValue(board({ park: [2, true], house: [1, false] }, true));
    renderDialog(false);

    expect(await screen.findByText("La votación está cerrada.")).toBeInTheDocument();
    const park = screen.getByText("Lugar: Parque central").closest("li")!;
    expect(within(park).getByText(/2 votos/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^(Votar|Quitar voto)/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar votación" })).not.toBeInTheDocument();
  });

  it("does not offer closing the vote to a member", async () => {
    renderDialog(false);
    expect(await screen.findByRole("button", { name: "Votar por Lugar: Parque central" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar votación" })).not.toBeInTheDocument();
  });

  it("shows the server message when the vote closed in the meantime", async () => {
    const user = userEvent.setup();
    votePlanOption.mockRejectedValue(new ApiError(409, "La votación está cerrada."));
    renderDialog(false);

    await user.click(await screen.findByRole("button", { name: "Votar por Lugar: Parque central" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La votación está cerrada.");
  });
});
