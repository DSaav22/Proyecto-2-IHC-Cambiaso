import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JoinPlanDialog } from "./JoinPlanDialog";

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  onJoin: vi.fn().mockResolvedValue({ ok: true }),
};

describe("JoinPlanDialog", () => {
  it("renders title, description, input and actions when open", () => {
    render(<JoinPlanDialog {...baseProps} />);
    expect(screen.getByRole("dialog", { name: "Unirse a un plan" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Código del plan/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unirse al plan" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
  });

  it("shows an error and prevents submit when the code is empty", async () => {
    const onJoin = vi.fn();
    render(<JoinPlanDialog {...baseProps} onJoin={onJoin} />);

    await userEvent.click(screen.getByRole("button", { name: "Unirse al plan" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa el código del plan.");
    expect(onJoin).not.toHaveBeenCalled();
  });

  it("submits the trimmed uppercase code and calls onJoin", async () => {
    const onJoin = vi.fn().mockResolvedValue({ ok: true });
    const onOpenChange = vi.fn();
    render(<JoinPlanDialog {...baseProps} onJoin={onJoin} onOpenChange={onOpenChange} />);

    const input = screen.getByLabelText(/Código del plan/i);
    await userEvent.type(input, " plz-abc123 ");
    await userEvent.click(screen.getByRole("button", { name: "Unirse al plan" }));

    expect(onJoin).toHaveBeenCalledWith("PLZ-ABC123");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("displays server error message when onJoin fails", async () => {
    const onJoin = vi.fn().mockResolvedValue({
      ok: false,
      message: "Plan no encontrado con este código",
      fieldErrors: {},
    });
    render(<JoinPlanDialog {...baseProps} onJoin={onJoin} />);

    const input = screen.getByLabelText(/Código del plan/i);
    await userEvent.type(input, "PLZ-WRONG");
    await userEvent.click(screen.getByRole("button", { name: "Unirse al plan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Plan no encontrado con este código");
  });

  it("requests closing when Cancel button is clicked", async () => {
    const onOpenChange = vi.fn();
    render(<JoinPlanDialog {...baseProps} onOpenChange={onOpenChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
