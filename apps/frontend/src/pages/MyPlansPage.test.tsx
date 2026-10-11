import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import type { Plan } from "../api/client";
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
    },
  };
});

const listPlans = vi.mocked(api.listPlans);
const createPlan = vi.mocked(api.createPlan);

const saved: Plan = {
  id: "3f2a9c1e-7b4d-4e8a-9c21-5d6e7f8a9b0c",
  titulo: "Cena de grupo",
  description: "Cena de grupo con amigos",
  dueDate: "2026-12-24",
  estado: "borrador",
  createdAt: "2026-01-01T00:00:00.000Z",
};

async function createViaForm() {
  await userEvent.click(screen.getByRole("button", { name: "Nuevo plan" }));
  await userEvent.type(screen.getByLabelText("Título"), "Cena de grupo");
  await userEvent.type(screen.getByLabelText("Descripción"), "Cena de grupo con amigos");
  await userEvent.type(screen.getByLabelText("Fecha límite"), "2026-12-24");
  await userEvent.click(screen.getByRole("button", { name: "Crear plan" }));
}

describe("MyPlansPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("greets the user and shows the empty state with no logout button in the body", async () => {
    listPlans.mockResolvedValue({ plans: [] });
    render(<MyPlansPage />);
    expect(screen.getByRole("heading", { name: "Hola, Ana" })).toBeInTheDocument();
    expect(await screen.findByText(/todavía no tienes planes/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).not.toBeInTheDocument();
  });

  it("opens the form, creates a plan and shows its card without reloading", async () => {
    listPlans.mockResolvedValue({ plans: [] });
    createPlan.mockResolvedValue({ plan: saved });
    render(<MyPlansPage />);
    await screen.findByText(/todavía no tienes planes/i);
    expect(screen.queryByLabelText("ID del plan")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Nuevo plan" }));
    expect(screen.queryByLabelText("ID del plan")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await createViaForm();

    expect(await screen.findByRole("article")).toHaveTextContent("Cena de grupo");
    expect(screen.getByText("24 de diciembre de 2026")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Plan creado");
    expect(screen.queryByLabelText("ID del plan")).not.toBeInTheDocument();
    expect(createPlan).toHaveBeenCalledWith({
      titulo: "Cena de grupo",
      description: "Cena de grupo con amigos",
      dueDate: "2026-12-24",
    });
    expect(listPlans).toHaveBeenCalledTimes(1);
  });

  it("still shows the card after a remount with the persisted list", async () => {
    listPlans.mockResolvedValue({ plans: [saved] });
    const first = render(<MyPlansPage />);
    expect(await screen.findByRole("article")).toHaveTextContent("Cena de grupo");
    first.unmount();

    render(<MyPlansPage />);
    expect(await screen.findByRole("article")).toHaveTextContent("Cena de grupo");
  });

  it("confirms a draft through the dialog and shows the confirmed badge", async () => {
    listPlans.mockResolvedValue({ plans: [saved] });
    const confirmMock = vi.mocked(api.confirmPlan);
    confirmMock.mockResolvedValue({ plan: { ...saved, estado: "confirmado" } });

    render(<MyPlansPage />);
    expect(await screen.findByTestId("plan-status-badge")).toHaveTextContent("Borrador");

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
    expect(screen.getByRole("status")).toHaveTextContent("Plan confirmado");
  });

  it("shows an error and keeps the draft when confirming fails", async () => {
    listPlans.mockResolvedValue({ plans: [saved] });
    const { ApiError } = await import("../api/client");
    vi.mocked(api.confirmPlan).mockRejectedValue(new ApiError(409, "El plan ya está confirmado"));

    render(<MyPlansPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Confirmar plan" }));
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Confirmar" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("El plan ya está confirmado");
    expect(screen.getByTestId("plan-status-badge")).toHaveTextContent("Borrador");
  });

  it("deletes a plan from the actions menu after confirmation", async () => {
    listPlans.mockResolvedValue({ plans: [saved] });
    const deleteMock = vi.mocked(api.deletePlan);
    deleteMock.mockResolvedValue({ message: "Plan eliminado" });

    render(<MyPlansPage />);
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
    listPlans.mockResolvedValue({ plans: [saved] });
    const { ApiError } = await import("../api/client");
    createPlan.mockRejectedValue(new ApiError(400, "inválido", { dueDate: "Ingresa una fecha válida" }));
    render(<MyPlansPage />);
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
    listPlans.mockResolvedValue({ plans: [] });
    render(<MyPlansPage />);
    await screen.findByText(/todavía no tienes planes/i);
    await userEvent.click(screen.getByRole("button", { name: "Nuevo plan" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByLabelText("ID del plan")).not.toBeInTheDocument();
    expect(createPlan).not.toHaveBeenCalled();
  });

  it("edits a plan through the edit dialog and updates the card", async () => {
    listPlans.mockResolvedValue({ plans: [saved] });
    const updateMock = vi.mocked(api.updatePlan);
    const updatedPlan: Plan = {
      ...saved,
      titulo: "Cena modificada",
      description: "Cena de grupo modificada",
      dueDate: "2026-12-25",
    };
    updateMock.mockResolvedValue({ plan: updatedPlan });

    render(<MyPlansPage />);
    await screen.findByRole("article");

    await userEvent.click(screen.getByRole("button", { name: "Más acciones" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Editar" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Editar plan");
    expect(screen.getByLabelText("Título")).toHaveValue("Cena de grupo");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Cena de grupo con amigos");
    expect(screen.getByLabelText("Fecha límite")).toHaveValue("2026-12-24");

    await userEvent.clear(screen.getByLabelText("Título"));
    await userEvent.type(screen.getByLabelText("Título"), "Cena modificada");
    await userEvent.clear(screen.getByLabelText("Descripción"));
    await userEvent.type(screen.getByLabelText("Descripción"), "Cena de grupo modificada");
    await userEvent.clear(screen.getByLabelText("Fecha límite"));
    await userEvent.type(screen.getByLabelText("Fecha límite"), "2026-12-25");

    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(updateMock).toHaveBeenCalledWith(saved.id, {
      titulo: "Cena modificada",
      description: "Cena de grupo modificada",
      dueDate: "2026-12-25",
    });
    expect(await screen.findByRole("article")).toHaveTextContent("Cena de grupo modificada");
    expect(screen.getByRole("status")).toHaveTextContent("Plan actualizado");
  });

  it("cancels a confirmed plan through the cancel dialog", async () => {
    const confirmedPlan: Plan = { ...saved, estado: "confirmado" };
    listPlans.mockResolvedValue({ plans: [confirmedPlan] });
    const cancelMock = vi.mocked(api.cancelPlan);
    cancelMock.mockResolvedValue({ plan: { ...confirmedPlan, estado: "cancelado" } });

    render(<MyPlansPage />);
    await screen.findByRole("article");

    await userEvent.click(screen.getByRole("button", { name: "Cancelar plan" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("¿Cancelar este plan?");

    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar plan" }));

    expect(cancelMock).toHaveBeenCalledWith(confirmedPlan.id);
    await waitFor(() =>
      expect(screen.getByTestId("plan-status-badge")).toHaveTextContent("Cancelado"),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Plan cancelado");
  });

  it("shows caution warning when editing a confirmed plan", async () => {
    const confirmedPlan: Plan = { ...saved, estado: "confirmado" };
    listPlans.mockResolvedValue({ plans: [confirmedPlan] });

    render(<MyPlansPage />);
    await screen.findByRole("article");

    await userEvent.click(screen.getByRole("button", { name: "Más acciones" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Editar" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Editar plan");
    expect(screen.getByRole("note")).toHaveTextContent("Este plan ya está confirmado");
  });

  it("filters plans by search title and shows empty message when no plan matches", async () => {
    listPlans.mockResolvedValue({ plans: [saved] });
    render(<MyPlansPage />);
    await screen.findByRole("article");

    const searchInput = screen.getByLabelText("Buscar planes por título");
    await userEvent.type(searchInput, "Playa");

    // Empty state should appear
    expect(
      screen.getByText("No existen planes con estas características"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();

    // Reset filters restores the card
    await userEvent.click(screen.getByRole("button", { name: "Restablecer filtros" }));
    expect(await screen.findByRole("article")).toBeInTheDocument();
    expect(searchInput).toHaveValue("");
  });
});
