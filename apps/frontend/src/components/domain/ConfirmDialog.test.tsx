import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  title: "¿Confirmar plan?",
  description: "Cena de grupo no volverá a pendiente.",
  confirmLabel: "Confirmar",
  onConfirm: vi.fn(),
};

describe("ConfirmDialog", () => {
  it("renders title, description and both actions when open", () => {
    render(<ConfirmDialog {...baseProps} />);
    expect(screen.getByRole("alertdialog", { name: "¿Confirmar plan?" })).toBeInTheDocument();
    expect(screen.getByText("Cena de grupo no volverá a pendiente.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
  });

  it("renders a custom cancel label when cancelLabel is specified", () => {
    render(<ConfirmDialog {...baseProps} cancelLabel="Mantener plan" />);
    expect(screen.getByRole("button", { name: "Mantener plan" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    render(<ConfirmDialog {...baseProps} open={false} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("calls onConfirm when the user accepts", async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("requests closing without confirming when the user cancels", async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("disables both actions and shows the pending label while pending", () => {
    render(<ConfirmDialog {...baseProps} pending pendingLabel="Confirmando…" />);
    expect(screen.getByRole("button", { name: "Confirmando…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });

  it("renders the error inside an alert region when an error is provided", () => {
    render(<ConfirmDialog {...baseProps} error="No se pudo cancelar el plan." />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("No se pudo cancelar el plan.");
    expect(screen.getByRole("alertdialog")).toContainElement(alert);
  });

  it("renders no alert when the error is null or undefined", () => {
    const { rerender } = render(<ConfirmDialog {...baseProps} error={null} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    rerender(<ConfirmDialog {...baseProps} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("removes the alert when the parent clears the error", () => {
    const { rerender } = render(<ConfirmDialog {...baseProps} error="Falló" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    rerender(<ConfirmDialog {...baseProps} error={null} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the accept button disabled while pending even if an error is shown", () => {
    render(<ConfirmDialog {...baseProps} error="Falló" pending pendingLabel="Confirmando…" />);
    expect(screen.getByRole("button", { name: "Confirmando…" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Falló");
  });

  it("uses the destructive style for destructive confirmations", () => {
    render(<ConfirmDialog {...baseProps} confirmLabel="Eliminar" destructive />);
    expect(screen.getByRole("button", { name: "Eliminar" }).className).toContain("bg-destructive");
  });
});
