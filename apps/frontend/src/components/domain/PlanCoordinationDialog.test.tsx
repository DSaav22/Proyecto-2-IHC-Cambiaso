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
      decidePlanVoting: vi.fn(),
      addPlanOption: vi.fn(),
      inviteToPlan: vi.fn(),
      trackEvent: vi.fn(),
    },
  };
});

const getCoordination = vi.mocked(api.getCoordination);
const votePlanOption = vi.mocked(api.votePlanOption);
const removePlanVote = vi.mocked(api.removePlanVote);
const decidePlanVoting = vi.mocked(api.decidePlanVoting);
const trackEvent = vi.mocked(api.trackEvent);

type Votes = { park: [number, boolean]; house: [number, boolean] };

function board(votes: Votes, votingClosed = false): CoordinationBoard {
  return {
    votingClosed,
    participants: [
      { name: "Usuario Uno", role: "Creador" },
      { name: "Usuario Dos", role: "Participante" },
    ],
    pendingInvites: [],
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
    trackEvent.mockResolvedValue({ ok: true });
  });

  it("shows an invited person as pending, not as a participant", async () => {
    const user = userEvent.setup();
    vi.mocked(api.inviteToPlan).mockResolvedValue({
      ...board(noVotes),
      pendingInvites: [{ name: "Usuario Tres" }],
    });
    renderDialog();

    await user.type(await screen.findByLabelText("Invitar por correo"), "usuario3@planazo.com");
    await user.click(screen.getByRole("button", { name: "Invitar" }));

    expect(await screen.findByRole("list", { name: "Invitaciones pendientes" })).toHaveTextContent(
      "Usuario Tres",
    );
    expect(screen.getByText(/Invitación enviada a Usuario Tres/)).toBeInTheDocument();
    expect(screen.queryByText("Usuario Tres (Participante)")).not.toBeInTheDocument();
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

  it("shows dates and places in separate sections", async () => {
    getCoordination.mockResolvedValue({
      ...board(noVotes),
      options: [
        {
          id: "date",
          kind: "fecha",
          label: "2026-11-08",
          authorName: "Usuario Uno",
          votes: 0,
          mine: false,
        },
        ...board(noVotes).options,
      ],
    });
    renderDialog();

    expect(await screen.findByRole("heading", { name: "Fechas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lugares" })).toBeInTheDocument();
    expect(screen.getByText("Fecha: 8 de noviembre de 2026")).toBeInTheDocument();
    expect(screen.getByText("Lugar: Parque central")).toBeInTheDocument();
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

  it("lets the creator confirm the plan after reviewing the vote", async () => {
    const user = userEvent.setup();
    decidePlanVoting.mockResolvedValue({
      ...board({ park: [1, true], house: [0, false] }, true),
      decision: {
        dateOption: null,
        placeOption: { id: "park", label: "Parque central" },
        reason: null,
        decidedAt: "2026-11-05T12:00:00.000Z",
        decidedBy: { id: "owner-1", name: "Usuario Uno" },
      },
    });
    getCoordination.mockResolvedValue(board({ park: [1, false], house: [0, false] }));
    renderDialog(true);

    await user.click(await screen.findByRole("button", { name: "Cerrar votación y confirmar plan" }));
    const confirm = await screen.findByRole("alertdialog", { name: "¿Confirmar el plan?" });
    await user.click(within(confirm).getByRole("button", { name: "Confirmar plan" }));

    expect(decidePlanVoting).toHaveBeenCalledWith("plan-1", {
      dateOptionId: undefined,
      placeOptionId: "park",
      reason: "",
    });
    expect(await screen.findByText("La votación está cerrada.")).toBeInTheDocument();
    expect(screen.getByText("Resultado confirmado")).toBeInTheDocument();
    const result = screen.getByText("Resultado confirmado").closest("section")!;
    expect(within(result).getByText("Parque central")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^(Votar|Quitar voto)/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Proponer" })).not.toBeInTheDocument();
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith("plan_confirmado", { via: "votacion" });
  });

  it("requires a selected winner and reason for a tie", async () => {
    const user = userEvent.setup();
    getCoordination.mockResolvedValue({
      ...board(noVotes),
      options: [
        { id: "park", kind: "lugar", label: "Parque central", authorName: "Usuario Uno", votes: 1, mine: false },
        { id: "house", kind: "lugar", label: "Casa de Ana", authorName: "Usuario Dos", votes: 1, mine: false },
      ],
    });
    renderDialog(true);

    await user.click(await screen.findByRole("button", { name: "Cerrar votación y confirmar plan" }));
    const confirm = await screen.findByRole("alertdialog", { name: "¿Confirmar el plan?" });
    await user.click(within(confirm).getByRole("button", { name: "Confirmar plan" }));
    expect(await within(confirm).findByRole("alert")).toHaveTextContent(
      "Escribe un motivo para resolver el empate.",
    );
    expect(decidePlanVoting).not.toHaveBeenCalled();
  });

  it("shows a server error when confirming the plan fails", async () => {
    const user = userEvent.setup();
    decidePlanVoting.mockRejectedValue(new ApiError(409, "La votación ya está cerrada."));
    getCoordination.mockResolvedValue(board({ park: [1, false], house: [0, false] }));
    renderDialog(true);

    await user.click(await screen.findByRole("button", { name: "Cerrar votación y confirmar plan" }));
    const confirm = await screen.findByRole("alertdialog", { name: "¿Confirmar el plan?" });
    await user.click(within(confirm).getByRole("button", { name: "Confirmar plan" }));

    expect(await within(confirm).findByRole("alert")).toHaveTextContent("La votación ya está cerrada.");
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("keeps the counts but offers no voting controls when the vote is closed", async () => {
    getCoordination.mockResolvedValue(board({ park: [2, true], house: [1, false] }, true));
    renderDialog(false);

    expect(
      await screen.findByText("Esta votación se cerró sin confirmar el plan. Selecciona los resultados para completar la confirmación."),
    ).toBeInTheDocument();
    const park = screen.getByText("Lugar: Parque central").closest("li")!;
    expect(within(park).getByText(/2 votos/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^(Votar|Quitar voto)/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar votación y confirmar plan" })).not.toBeInTheDocument();
  });

  it("does not offer closing the vote to a member", async () => {
    renderDialog(false);
    expect(await screen.findByRole("button", { name: "Votar por Lugar: Parque central" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar votación y confirmar plan" })).not.toBeInTheDocument();
  });

  it("shows the server message when the vote closed in the meantime", async () => {
    const user = userEvent.setup();
    votePlanOption.mockRejectedValue(new ApiError(409, "La votación está cerrada."));
    renderDialog(false);

    await user.click(await screen.findByRole("button", { name: "Votar por Lugar: Parque central" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La votación está cerrada.");
  });
});
