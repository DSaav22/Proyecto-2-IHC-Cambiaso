import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../api/client";
import type { Plan } from "../api/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { getDueStatus } from "../lib/plans";
import MyPlansPage from "./MyPlansPage";

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Ana", email: "a@x.com", createdAt: "" } }),
}));

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    api: {
      listPlans: vi.fn(),
      createPlan: vi.fn(),
      updatePlan: vi.fn(),
      confirmPlan: vi.fn(),
      cancelPlan: vi.fn(),
      deletePlan: vi.fn(),
      leavePlan: vi.fn(),
    },
  };
});

const noSummary = { total: 0, overdue: 0, nextDueDate: null };
const oneSummary = { total: 1, overdue: 0, nextDueDate: null };
const listPlans = vi.mocked(api.listPlans);
const createPlan = vi.mocked(api.createPlan);
const cancelPlan = vi.mocked(api.cancelPlan);
const leavePlan = vi.mocked(api.leavePlan);

const saved: Plan = {
  id: "3f2a9c1e-7b4d-4e8a-9c21-5d6e7f8a9b0c",
  titulo: "Cena de grupo",
  description: "Cena de grupo con amigos",
  dueDate: "2026-12-24",
  estado: "pendiente",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function LocationProbe() {
  return <span data-testid="search">{useLocation().search}</span>;
}

function renderPage(initialEntry = "/mis-planes") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MyPlansPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function statValue(label: string): string {
  return screen.getByText(label, { selector: "p" }).nextElementSibling?.textContent ?? "";
}

async function createViaForm() {
  await userEvent.click(screen.getByRole("button", { name: "Nuevo plan" }));
  await userEvent.type(screen.getByLabelText("Título"), "Cena de grupo");
  await userEvent.type(screen.getByLabelText("Descripción"), "Cena de grupo con amigos");
  await userEvent.type(within(screen.getByRole("dialog")).getByLabelText("Fecha límite"), "2026-12-24");
  await userEvent.click(screen.getByRole("button", { name: "Crear plan" }));
}

/** Text of every live status region (notice + result count live side by side). */
const statusText = () =>
  screen
    .getAllByRole("status")
    .map((node) => node.textContent)
    .join(" ");

describe("MyPlansPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("greets the user and shows the empty state with no logout button in the body", async () => {
    listPlans.mockResolvedValue({ plans: [], summary: noSummary });
    renderPage();
    expect(screen.getByRole("heading", { name: "Hola, Ana" })).toBeInTheDocument();
    expect(await screen.findByText(/todavía no tienes planes/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).not.toBeInTheDocument();
  });

  it("hides the filter bar and no-match copy when the user has no plans at all", async () => {
    listPlans.mockResolvedValue({ plans: [], summary: noSummary });
    renderPage("/mis-planes?estado=confirmado");
    expect(await screen.findByText(/todavía no tienes planes/i)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /filtros y búsqueda/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/no hay planes que coincidan/i)).not.toBeInTheDocument();
  });

  it("opens the form, creates a plan and shows its card, then refetches in the background", async () => {
    listPlans
      .mockResolvedValueOnce({ plans: [], summary: noSummary })
      .mockResolvedValue({ plans: [saved], summary: oneSummary });
    createPlan.mockResolvedValue({ plan: saved });
    renderPage();
    await screen.findByText(/todavía no tienes planes/i);
    expect(screen.queryByLabelText("ID del plan")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Nuevo plan" }));
    expect(screen.queryByLabelText("ID del plan")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await createViaForm();

    expect(await screen.findByRole("article")).toHaveTextContent("Cena de grupo");
    expect(screen.getByText("24 de diciembre de 2026")).toBeInTheDocument();
    expect(statusText()).toContain("Plan creado");
    expect(screen.queryByLabelText("ID del plan")).not.toBeInTheDocument();
    expect(createPlan).toHaveBeenCalledWith({
      titulo: "Cena de grupo",
      description: "Cena de grupo con amigos",
      dueDate: "2026-12-24",
    });
    await waitFor(() => expect(listPlans).toHaveBeenCalledTimes(2));
  });

  it("still shows the card after a remount with the persisted list", async () => {
    listPlans.mockResolvedValue({ plans: [saved], summary: oneSummary });
    const first = renderPage();
    expect(await screen.findByRole("article")).toHaveTextContent("Cena de grupo");
    first.unmount();

    renderPage();
    expect(await screen.findByRole("article")).toHaveTextContent("Cena de grupo");
  });

  it("confirms a draft through the dialog and shows the confirmed badge", async () => {
    listPlans
      .mockResolvedValueOnce({ plans: [saved], summary: oneSummary })
      .mockResolvedValue({ plans: [{ ...saved, estado: "confirmado" }], summary: oneSummary });
    const confirmMock = vi.mocked(api.confirmPlan);
    confirmMock.mockResolvedValue({ plan: { ...saved, estado: "confirmado" } });

    renderPage();
    expect(await screen.findByTestId("plan-status-badge")).toHaveTextContent("Pendiente");

    await userEvent.click(screen.getByRole("button", { name: "Confirmar plan" }));
    expect(confirmMock).not.toHaveBeenCalled();
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Confirmar" }),
    );

    expect(confirmMock).toHaveBeenCalledWith(saved.id);
    await waitFor(() =>
      expect(screen.getByTestId("plan-status-badge")).toHaveTextContent("Confirmado"),
    );
    expect(screen.queryByRole("button", { name: "Confirmar plan" })).not.toBeInTheDocument();
    expect(statusText()).toContain("Plan confirmado");
  });

  it("shows an error and keeps the draft when confirming fails", async () => {
    listPlans.mockResolvedValue({ plans: [saved], summary: oneSummary });
    const { ApiError } = await import("../api/client");
    vi.mocked(api.confirmPlan).mockRejectedValue(new ApiError(409, "El plan ya está confirmado"));

    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Confirmar plan" }));
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Confirmar" }),
    );

    // The page alert stays exposed too (the live region keeps siblings out of aria-hidden), so scope to the dialog.
    const dialogAlert = await within(screen.getByRole("alertdialog")).findByRole("alert");
    expect(dialogAlert).toHaveTextContent("El plan ya está confirmado");
    expect(screen.getByTestId("plan-status-badge")).toHaveTextContent("Pendiente");
  });

  it("deletes a plan from the actions menu after confirmation", async () => {
    listPlans
      .mockResolvedValueOnce({ plans: [saved], summary: oneSummary })
      .mockResolvedValue({ plans: [], summary: noSummary });
    const deleteMock = vi.mocked(api.deletePlan);
    deleteMock.mockResolvedValue({ message: "Plan eliminado" });

    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Más acciones" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Eliminar" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Cena de grupo");
    expect(deleteMock).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(deleteMock).toHaveBeenCalledWith(saved.id);
    await waitFor(() => expect(screen.queryByRole("article")).not.toBeInTheDocument());
  });

  it("keeps the form open with an error when the server rejects the plan", async () => {
    listPlans.mockResolvedValue({ plans: [saved], summary: oneSummary });
    const { ApiError } = await import("../api/client");
    createPlan.mockRejectedValue(new ApiError(400, "inválido", { dueDate: "Ingresa una fecha válida" }));
    renderPage();
    await screen.findByRole("article");

    await createViaForm();

    await waitFor(() =>
      expect(screen.getByText("Ingresa una fecha válida", { selector: "p" })).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Título")).toHaveValue("Cena de grupo");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Cena de grupo con amigos");
    // The modal hides the page behind it from the accessibility tree, hence `hidden: true`.
    expect(screen.getAllByRole("article", { hidden: true })).toHaveLength(1);
  });

  it("closes the form on cancel without creating a plan", async () => {
    listPlans.mockResolvedValue({ plans: [], summary: noSummary });
    renderPage();
    await screen.findByText(/todavía no tienes planes/i);
    await userEvent.click(screen.getByRole("button", { name: "Nuevo plan" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByLabelText("ID del plan")).not.toBeInTheDocument();
    expect(createPlan).not.toHaveBeenCalled();
  });

  it("edits a plan through the edit dialog and updates the card", async () => {
    const updatedPlan: Plan = {
      ...saved,
      titulo: "Cena modificada",
      description: "Cena de grupo modificada",
      dueDate: "2026-12-25",
    };
    listPlans
      .mockResolvedValueOnce({ plans: [saved], summary: oneSummary })
      .mockResolvedValue({ plans: [updatedPlan], summary: oneSummary });
    const updateMock = vi.mocked(api.updatePlan);
    updateMock.mockResolvedValue({ plan: updatedPlan });

    renderPage();
    await screen.findByRole("article");

    await userEvent.click(screen.getByRole("button", { name: "Más acciones" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Editar" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Editar plan");
    expect(screen.getByLabelText("Título")).toHaveValue("Cena de grupo");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Cena de grupo con amigos");
    expect(within(dialog).getByLabelText("Fecha límite")).toHaveValue("2026-12-24");

    await userEvent.clear(screen.getByLabelText("Título"));
    await userEvent.type(screen.getByLabelText("Título"), "Cena modificada");
    await userEvent.clear(screen.getByLabelText("Descripción"));
    await userEvent.type(screen.getByLabelText("Descripción"), "Cena de grupo modificada");
    await userEvent.clear(within(dialog).getByLabelText("Fecha límite"));
    await userEvent.type(within(dialog).getByLabelText("Fecha límite"), "2026-12-25");

    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(updateMock).toHaveBeenCalledWith(saved.id, {
      titulo: "Cena modificada",
      description: "Cena de grupo modificada",
      dueDate: "2026-12-25",
    });
    expect(await screen.findByRole("article")).toHaveTextContent("Cena de grupo modificada");
    expect(statusText()).toContain("Plan actualizado");
  });

  it("cancels a confirmed plan through the cancel dialog", async () => {
    const confirmedPlan: Plan = { ...saved, estado: "confirmado" };
    listPlans
      .mockResolvedValueOnce({ plans: [confirmedPlan], summary: oneSummary })
      .mockResolvedValue({ plans: [{ ...confirmedPlan, estado: "cancelado" }], summary: oneSummary });
    const cancelMock = vi.mocked(api.cancelPlan);
    cancelMock.mockResolvedValue({ plan: { ...confirmedPlan, estado: "cancelado" } });

    renderPage();
    await screen.findByRole("article");

    await userEvent.click(screen.getByRole("button", { name: "Cancelar plan" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("¿Cancelar este plan?");

    await userEvent.click(within(dialog).getByRole("button", { name: "Sí, cancelar plan" }));

    expect(cancelMock).toHaveBeenCalledWith(confirmedPlan.id);
    await waitFor(() =>
      expect(screen.getByTestId("plan-status-badge")).toHaveTextContent("Cancelado"),
    );
    expect(statusText()).toContain("Plan cancelado");
  });

  it("shows caution warning when editing a confirmed plan", async () => {
    const confirmedPlan: Plan = { ...saved, estado: "confirmado" };
    listPlans.mockResolvedValue({ plans: [confirmedPlan], summary: oneSummary });

    renderPage();
    await screen.findByRole("article");

    await userEvent.click(screen.getByRole("button", { name: "Más acciones" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Editar" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Editar plan");
    expect(screen.getByRole("note")).toHaveTextContent("Este plan ya está confirmado");
  });

  it("sends the search to the server after the debounce and shows the no-match state", async () => {
    listPlans.mockImplementation(async (params) =>
      params?.q ? { plans: [], summary: oneSummary } : { plans: [saved], summary: oneSummary },
    );
    renderPage();
    await screen.findByRole("article");

    const searchInput = screen.getByLabelText("Buscar planes por título");
    await userEvent.type(searchInput, "Playa");

    expect(
      await screen.findByText("No hay planes que coincidan con los filtros"),
    ).toBeInTheDocument();
    expect(listPlans).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "Playa" }),
      expect.anything(),
    );
    expect(listPlans.mock.calls.filter(([params]) => params?.q)).toHaveLength(1);
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByTestId("search")).toHaveTextContent("?q=Playa");

    // Both the bar and the no-match state offer the action; use the one inside the empty state.
    await userEvent.click(
      within(screen.getByRole("region", { name: "Tus planes" })).getByRole("button", {
        name: "Limpiar filtros",
      }),
    );
    expect(await screen.findByRole("article")).toBeInTheDocument();
    expect(searchInput).toHaveValue("");
    expect(screen.getByTestId("search")).toBeEmptyDOMElement();
  });

  it("reads the initial filters from the URL and requests them from the server", async () => {
    listPlans.mockResolvedValue({ plans: [saved], summary: oneSummary });
    renderPage("/mis-planes?estado=confirmado&fecha=next7&q=cena");

    await screen.findByRole("article");
    expect(listPlans).toHaveBeenCalledWith(
      expect.objectContaining({ q: "cena", estado: "confirmado", fecha: "next7" }),
      expect.anything(),
    );
    expect(screen.getByLabelText("Buscar planes por título")).toHaveValue("cena");
    expect(screen.getByLabelText("Estado")).toHaveValue("confirmado");
    expect(screen.getByLabelText("Fecha límite")).toHaveValue("next7");
  });

  it("ignores corrupted URL values and rewrites the URL to its canonical form", async () => {
    listPlans.mockResolvedValue({ plans: [saved], summary: oneSummary });
    renderPage("/mis-planes?estado=zzz&fecha=next7&foo=1");

    await screen.findByRole("article");
    expect(listPlans).not.toHaveBeenCalledWith(
      expect.objectContaining({ estado: expect.anything() }),
      expect.anything(),
    );
    expect(listPlans).toHaveBeenCalledWith(
      expect.objectContaining({ fecha: "next7" }),
      expect.anything(),
    );
    await waitFor(() => expect(screen.getByTestId("search")).toHaveTextContent(/^\?fecha=next7$/));
  });

  it("writes select changes to the URL and omits defaults", async () => {
    listPlans.mockResolvedValue({ plans: [saved], summary: oneSummary });
    renderPage();
    await screen.findByRole("article");

    await userEvent.selectOptions(screen.getByLabelText("Estado"), "cancelado");
    expect(screen.getByTestId("search")).toHaveTextContent(/^\?estado=cancelado$/);
    await waitFor(() =>
      expect(listPlans).toHaveBeenLastCalledWith(
        expect.objectContaining({ estado: "cancelado" }),
        expect.anything(),
      ),
    );

    await userEvent.selectOptions(screen.getByLabelText("Estado"), "all");
    expect(screen.getByTestId("search")).toBeEmptyDOMElement();
  });

  it("shows the stat cards from the server summary, not from the visible plans", async () => {
    const summary = { total: 5, overdue: 2, nextDueDate: "2099-01-01" };
    listPlans.mockResolvedValue({ plans: [saved], summary });
    renderPage();
    await screen.findByRole("article");

    expect(statValue("Planes")).toBe("5");
    expect(statValue("Vencidos")).toBe("2");
    expect(statValue("Próximo plan")).toBe(getDueStatus("2099-01-01").label);
  });

  it("shows \"Sin pendientes\" when the summary has no next due date", async () => {
    listPlans.mockResolvedValue({
      plans: [saved],
      summary: { total: 1, overdue: 0, nextDueDate: null },
    });
    renderPage();
    await screen.findByRole("article");

    expect(statValue("Próximo plan")).toBe("Sin pendientes");
    expect(statValue("Vencidos")).toBe("0");
  });

  it("keeps the stat cards unchanged while filters narrow the list", async () => {
    const summary = { total: 4, overdue: 1, nextDueDate: "2099-01-01" };
    listPlans.mockImplementation(async (params) =>
      params?.estado ? { plans: [], summary } : { plans: [saved], summary },
    );
    renderPage();
    await screen.findByRole("article");

    await userEvent.selectOptions(screen.getByLabelText("Estado"), "cancelado");
    await screen.findByText("No hay planes que coincidan con los filtros");

    expect(statValue("Planes")).toBe("4");
    expect(statValue("Vencidos")).toBe("1");
  });

  it("hides the stat cards when the user has no plans at all", async () => {
    listPlans.mockResolvedValue({ plans: [], summary: noSummary });
    renderPage();
    await screen.findByText(/todavía no tienes planes/i);

    expect(screen.queryByText("Próximo plan")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Buscar planes por título")).not.toBeInTheDocument();
  });

  it("shows only the page loader on the first load", async () => {
    listPlans.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText("Cargando tus planes…")).toBeInTheDocument();
    expect(screen.queryByLabelText("Buscar planes por título")).not.toBeInTheDocument();
  });

  it("keeps the search input mounted and focused while results refresh", async () => {
    let release: (value: { plans: Plan[]; summary: typeof oneSummary }) => void = () => {};
    listPlans.mockImplementation((params) =>
      params?.q
        ? new Promise((resolve) => {
            release = resolve;
          })
        : Promise.resolve({ plans: [saved], summary: oneSummary }),
    );
    renderPage();
    await screen.findByRole("article");

    const searchInput = screen.getByLabelText("Buscar planes por título");
    await userEvent.type(searchInput, "ce");
    const results = screen.getByRole("region", { name: "Tus planes" });
    await waitFor(() => expect(results).toHaveAttribute("aria-busy", "true"));

    expect(screen.queryByText("Cargando tus planes…")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Buscar planes por título")).toBe(searchInput);
    expect(searchInput).toHaveFocus();

    release({ plans: [saved], summary: oneSummary });
    await waitFor(() => expect(results).toHaveAttribute("aria-busy", "false"));
    expect(searchInput).toHaveFocus();
  });

  it("shows the load error with a retry button instead of the empty state", async () => {
    const { ApiError } = await import("../api/client");
    listPlans
      .mockRejectedValueOnce(new ApiError(500, "Error del servidor"))
      .mockResolvedValue({ plans: [saved], summary: oneSummary });
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Error del servidor");
    expect(screen.queryByText(/todavía no tienes planes/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("article")).toHaveTextContent("Cena de grupo");
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it("keeps the previous plans visible when a refresh fails and retries on demand", async () => {
    const { ApiError } = await import("../api/client");
    listPlans
      .mockResolvedValueOnce({ plans: [saved], summary: oneSummary })
      .mockRejectedValueOnce(new ApiError(500, "Error del servidor"))
      .mockResolvedValue({ plans: [saved], summary: oneSummary });
    renderPage();
    await screen.findByRole("article");

    await userEvent.selectOptions(screen.getByLabelText("Estado"), "confirmado");
    expect(await screen.findByRole("alert")).toHaveTextContent("Error del servidor");
    expect(screen.getByRole("article")).toHaveTextContent("Cena de grupo");

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("renders floating viewport-anchored success toast after cancelling a plan", async () => {
    listPlans.mockResolvedValue({ plans: [saved], summary: oneSummary });
    cancelPlan.mockResolvedValue({ plan: { ...saved, estado: "cancelado" } });
    renderPage();

    await screen.findByRole("article");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar plan" }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Sí, cancelar plan" }));

    await waitFor(() => expect(cancelPlan).toHaveBeenCalledWith(saved.id));

    const noticeText = await screen.findByText("Plan cancelado correctamente.");
    expect(noticeText).toBeInTheDocument();

    const toastContainer = noticeText.closest("div.fixed");
    expect(toastContainer).not.toBeNull();
    expect(toastContainer).toHaveClass("fixed", "bottom-5", "right-5", "z-50");
  });

  it("allows a guest to leave a plan from the actions menu, removing it and showing success notice", async () => {
    const guestPlan: Plan = { ...saved, isOwner: false };
    listPlans
      .mockResolvedValueOnce({ plans: [guestPlan], summary: oneSummary })
      .mockResolvedValue({ plans: [], summary: noSummary });
    leavePlan.mockResolvedValue({ message: "Has abandonado el plan." });

    renderPage();
    await waitFor(() => expect(screen.getByRole("article")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Más acciones" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Abandonar plan" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Cena de grupo");
    await userEvent.click(within(dialog).getByRole("button", { name: "Abandonar" }));

    expect(leavePlan).toHaveBeenCalledWith(guestPlan.id);
    expect(await screen.findByText("Has abandonado el plan.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("article")).not.toBeInTheDocument());
  });

  it("keeps leave dialog open with error message when leaving fails", async () => {
    const guestPlan: Plan = { ...saved, isOwner: false };
    listPlans.mockResolvedValue({
      plans: [guestPlan],
      summary: oneSummary,
    });
    leavePlan.mockRejectedValue(new ApiError(400, "Error al abandonar el plan"));

    renderPage();
    await waitFor(() => expect(screen.getByRole("article")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Más acciones" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Abandonar plan" }));

    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Abandonar" }));

    const dialogAlert = await within(screen.getByRole("alertdialog")).findByRole("alert");
    expect(dialogAlert).toHaveTextContent("Error al abandonar el plan");
  });
});

