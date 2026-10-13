import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Plan } from "../../api/client";
import { PlanCard } from "./PlanCard";

const basePlan: Plan = {
  id: "3f2a9c1e-7b4d-4e8a-9c21-5d6e7f8a9b0c",
  titulo: "Cena de equipo",
  description: "Cena de fin de año en restaurante",
  dueDate: "2026-12-24",
  estado: "borrador",
  createdAt: "2026-01-01T00:00:00.000Z",
};
const confirmed: Plan = { ...basePlan, estado: "confirmado" };
const cancelled: Plan = { ...basePlan, estado: "cancelado" };

async function openMenu() {
  await userEvent.click(screen.getByRole("button", { name: "Más acciones" }));
}

describe("PlanCard - state", () => {
  it("shows a text 'Borrador' badge and the confirm and cancel buttons for a draft", () => {
    render(<PlanCard plan={basePlan} />);
    expect(screen.getByTestId("plan-status-badge")).toHaveTextContent("Borrador");
    expect(screen.getByTestId("plan-status-badge")).toHaveAttribute("data-status", "borrador");
    expect(screen.getByRole("button", { name: "Confirmar plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar plan" })).toBeInTheDocument();
  });

  it("shows a 'Confirmado' badge with a check icon and a cancel button", () => {
    render(<PlanCard plan={confirmed} />);
    const badge = screen.getByTestId("plan-status-badge");
    expect(badge).toHaveTextContent("Confirmado");
    expect(badge.querySelector("svg")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Confirmar plan" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar plan" })).toBeInTheDocument();
  });

  it("shows a 'Cancelado' badge and neither confirm nor cancel button for cancelled plan", () => {
    render(<PlanCard plan={cancelled} />);
    const badge = screen.getByTestId("plan-status-badge");
    expect(badge).toHaveTextContent("Cancelado");
    expect(badge).toHaveAttribute("data-status", "cancelado");
    expect(screen.queryByRole("button", { name: "Confirmar plan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar plan" })).not.toBeInTheDocument();
  });

  it("does not render a state select", () => {
    render(<PlanCard plan={basePlan} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renders plan title as a heading and description as body text", () => {
    render(<PlanCard plan={basePlan} />);
    const heading = screen.getByRole("heading", { level: 3, name: "Cena de equipo" });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText("Cena de fin de año en restaurante")).toBeInTheDocument();
  });
});

describe("PlanCard - confirm flow", () => {
  it("opens a dialog naming the plan and sends nothing until accepted", async () => {
    const onConfirm = vi.fn();
    render(<PlanCard plan={basePlan} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar plan" }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Cena de equipo");
    expect(dialog).toHaveTextContent(/no podrá volver a borrador/i);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm with the plan id when the user accepts", async () => {
    const onConfirm = vi.fn().mockResolvedValue({ ok: true });
    render(<PlanCard plan={basePlan} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar plan" }));
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Confirmar" }),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(basePlan.id);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("does not call onConfirm when the user cancels", async () => {
    const onConfirm = vi.fn();
    render(<PlanCard plan={basePlan} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar plan" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("disables the accept button while the request is pending", async () => {
    let finish: () => void = () => {};
    const onConfirm = vi.fn(() => new Promise<{ ok: true }>((resolve) => (finish = () => resolve({ ok: true }))));
    render(<PlanCard plan={basePlan} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar plan" }));
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Confirmar" }),
    );
    expect(await screen.findByRole("button", { name: "Confirmando…" })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });
});

describe("PlanCard - cancel flow", () => {
  it("opens a dialog naming the plan and sends nothing until accepted", async () => {
    const onCancel = vi.fn();
    render(<PlanCard plan={confirmed} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar plan" }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Cena de equipo");
    expect(dialog).toHaveTextContent(/pasará a Cancelado/i);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("allows cancelling a draft plan", async () => {
    const onCancel = vi.fn().mockResolvedValue({ ok: true });
    render(<PlanCard plan={basePlan} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar plan" }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Cena de equipo");
    expect(dialog).toHaveTextContent(/pasará a Cancelado/i);

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancelar plan" }),
    );
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith(basePlan.id);
  });

  it("calls onCancel with the plan id when the user accepts", async () => {
    const onCancel = vi.fn().mockResolvedValue({ ok: true });
    render(<PlanCard plan={confirmed} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar plan" }));
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar plan" }),
    );
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith(confirmed.id);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("keeps the dialog open and shows an inline alert when cancelling fails", async () => {
    const onCancel = vi.fn().mockResolvedValue({ ok: false, message: "No se pudo cancelar el plan." });
    render(<PlanCard plan={confirmed} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar plan" }));
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar plan" }),
    );

    const dialog = await screen.findByRole("alertdialog");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("No se pudo cancelar el plan.");
    expect(within(dialog).getByRole("button", { name: "Cancelar plan" })).toBeEnabled();
  });

  it("allows retrying after a failure and closes once the retry succeeds", async () => {
    const onCancel = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: "Sin conexión" })
      .mockResolvedValueOnce({ ok: true });
    render(<PlanCard plan={confirmed} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar plan" }));
    const accept = () =>
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar plan" });
    await userEvent.click(accept());
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin conexión");

    await userEvent.click(accept());
    expect(onCancel).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("clears the previous error when the dialog is dismissed and reopened", async () => {
    const onCancel = vi.fn().mockResolvedValue({ ok: false, message: "Sin conexión" });
    render(<PlanCard plan={confirmed} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar plan" }));
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar plan" }),
    );
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Cancelar plan" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("PlanCard - blocked action notes", () => {
  const pastDraft: Plan = { ...basePlan, dueDate: "2020-01-01" };

  it("explains to the owner that a cancelled plan cannot be edited or confirmed", () => {
    render(<PlanCard plan={cancelled} />);
    expect(screen.getByRole("note")).toHaveTextContent(
      "Este plan está cancelado: no se puede editar ni confirmar. Puedes eliminarlo desde «Más acciones».",
    );
  });

  it("explains to a guest that only the creator can edit, confirm or cancel", () => {
    render(<PlanCard plan={{ ...basePlan, isOwner: false }} />);
    expect(screen.getByRole("note")).toHaveTextContent(
      "Solo lectura: solo el creador puede editar, confirmar o cancelar este plan.",
    );
  });

  it("shows no note on an active owner card", () => {
    const { rerender } = render(<PlanCard plan={basePlan} />);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    rerender(<PlanCard plan={confirmed} />);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("does not show overdue wording for a cancelled plan", () => {
    render(<PlanCard plan={{ ...cancelled, dueDate: "2020-01-01" }} />);
    expect(screen.queryByText(/Venció/)).not.toBeInTheDocument();
  });

  it("still shows overdue wording for a pending past plan", () => {
    render(<PlanCard plan={pastDraft} />);
    expect(screen.getByText(/Venció hace/)).toBeInTheDocument();
  });
});

describe("PlanCard - actions menu", () => {
  it("has no standalone delete button and exposes an accessible menu button", () => {
    render(<PlanCard plan={basePlan} />);
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Más acciones" }).className).toContain("size-11");
  });

  it("shows 'Editar' and calls onEdit when clicked", async () => {
    const onEdit = vi.fn();
    render(<PlanCard plan={basePlan} onEdit={onEdit} />);
    await openMenu();
    const editItem = await screen.findByRole("menuitem", { name: "Editar" });
    await userEvent.click(editItem);
    expect(onEdit).toHaveBeenCalledWith(basePlan);
  });

  it("does not show 'Editar' item in menu for cancelled plan", async () => {
    render(<PlanCard plan={cancelled} />);
    await openMenu();
    expect(screen.queryByRole("menuitem", { name: "Editar" })).not.toBeInTheDocument();
    expect(await screen.findByRole("menuitem", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("applies dimmed styling and preserves original date on cancelled plan", () => {
    const { container } = render(<PlanCard plan={cancelled} />);
    const article = container.querySelector("article");
    expect(article?.className).toContain("opacity-75");
    expect(screen.getByText("24 de diciembre de 2026")).toBeInTheDocument();
  });

  it("shows a destructive 'Eliminar' item when the menu opens for draft plan", async () => {
    render(<PlanCard plan={basePlan} />);
    await openMenu();
    const item = await screen.findByRole("menuitem", { name: "Eliminar" });
    expect(item.className).toContain("text-destructive");
  });

  it("closes the menu with Escape and returns focus to the trigger", async () => {
    render(<PlanCard plan={basePlan} />);
    await openMenu();
    await screen.findByRole("menuitem", { name: "Eliminar" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menuitem")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Más acciones" })).toHaveFocus();
  });

  it("asks for confirmation naming the plan before deleting a draft", async () => {
    const onDelete = vi.fn().mockResolvedValue({ ok: true });
    render(<PlanCard plan={basePlan} onDelete={onDelete} />);
    await openMenu();
    await userEvent.click(await screen.findByRole("menuitem", { name: "Eliminar" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Cena de equipo");
    expect(onDelete).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(basePlan.id);
  });

  it("disables 'Eliminar' and explains restriction for confirmed plan", async () => {
    render(<PlanCard plan={confirmed} />);
    await openMenu();
    const item = await screen.findByRole("menuitem", { name: "Eliminar" });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Debes cancelar el plan antes de eliminarlo")).toBeInTheDocument();
  });

  it("keeps the plan when the delete dialog is cancelled", async () => {
    const onDelete = vi.fn();
    render(<PlanCard plan={basePlan} onDelete={onDelete} />);
    await openMenu();
    await userEvent.click(await screen.findByRole("menuitem", { name: "Eliminar" }));
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar" }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  describe("ownership & guest read-only view", () => {
    it("renders 'Creador' badge, share code, and copy button when isOwner is true", () => {
      render(<PlanCard plan={{ ...basePlan, isOwner: true, shareCode: "PLZ-ABC123" }} />);
      expect(screen.getByText("Creador")).toBeInTheDocument();
      expect(screen.getByText("PLZ-ABC123")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Copiar código" })).toBeInTheDocument();
    });

    it("renders 'Invitado' badge and owner name when isOwner is false", () => {
      render(
        <PlanCard
          plan={{
            ...basePlan,
            isOwner: false,
            ownerName: "Carlos Gómez",
          }}
        />,
      );
      expect(screen.getByTestId("guest-badge")).toHaveTextContent("Invitado");
      expect(screen.getByText(/Creado por:/i)).toBeInTheDocument();
      expect(screen.getByText("Carlos Gómez")).toBeInTheDocument();
    });

    it("does not render actions menu for a guest", () => {
      render(<PlanCard plan={{ ...basePlan, isOwner: false }} />);
      expect(screen.queryByRole("button", { name: "Más acciones" })).not.toBeInTheDocument();
    });

    it("does not render confirm button for guest and shows read-only indicator", () => {
      render(<PlanCard plan={{ ...basePlan, estado: "borrador", isOwner: false }} />);
      expect(screen.queryByRole("button", { name: "Confirmar plan" })).not.toBeInTheDocument();
      expect(screen.getByRole("note")).toHaveTextContent(/^Solo lectura/);
    });
  });
});
