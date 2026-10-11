import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Plan } from "../../api/client";
import { PlanList } from "./PlanList";

const plan = (name: string, dueDate: string): Plan => ({
  id: `3f2a9c1e-0000-4000-8000-${name.padStart(12, "0")}`,
  titulo: `Plan ${name}`,
  description: `Descripción de ${name}`,
  dueDate,
  estado: "borrador",
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("PlanList", () => {
  it("renders a card per plan with description and Spanish date, without exposing the id", () => {
    const item = plan("PLAN-001", "2026-12-24");
    render(<PlanList plans={[item]} />);
    const card = screen.getByRole("article");
    expect(card).not.toHaveTextContent("3f2a9c1e");
    expect(within(card).queryByTitle(item.id)).not.toBeInTheDocument();
    expect(within(card).getByText("Descripción de PLAN-001")).toBeInTheDocument();
    expect(within(card).getByText("24 de diciembre de 2026")).toBeInTheDocument();
  });

  it("does not shift the date across time zones (1 January stays 1 January)", () => {
    render(<PlanList plans={[plan("NY", "2026-01-01")]} />);
    expect(screen.getByText("1 de enero de 2026")).toBeInTheDocument();
  });

  it("keeps the order it receives", () => {
    render(<PlanList plans={[plan("A", "2026-01-01"), plan("B", "2026-02-01")]} />);
    const cards = screen.getAllByRole("article").map((a) => a.textContent);
    expect(cards[0]).toContain("Descripción de A");
    expect(cards[1]).toContain("Descripción de B");
  });

  it("shows an empty-state message when there are no plans", () => {
    render(<PlanList plans={[]} />);
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText(/todavía no tienes planes/i)).toBeInTheDocument();
  });

  it("forwards the confirm action of a card with its plan id", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const item = plan("A", "2026-01-01");
    render(<PlanList plans={[item]} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar plan" }));
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Confirmar" }),
    );
    expect(onConfirm).toHaveBeenCalledWith(item.id);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("forwards the delete action of a card with its plan id", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const item = plan("A", "2026-01-01");
    render(<PlanList plans={[item]} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole("button", { name: "Más acciones" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Eliminar" }));
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Eliminar" }),
    );
    expect(onDelete).toHaveBeenCalledWith(item.id);
  });
});
