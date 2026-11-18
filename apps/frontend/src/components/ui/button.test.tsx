import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders the default primary variant", () => {
    render(<Button>Unirme</Button>);
    const button = screen.getByRole("button", { name: "Unirme" });
    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("text-primary-foreground");
  });

  it("uses destructive-foreground instead of a fixed white class", () => {
    render(<Button variant="destructive">Eliminar</Button>);
    const button = screen.getByRole("button", { name: "Eliminar" });
    expect(button.className).toContain("text-destructive-foreground");
    expect(button.className).not.toContain("text-white");
  });

  it("marks the control as busy while pending", () => {
    render(<Button pending>Enviando</Button>);
    const button = screen.getByRole("button", { name: "Enviando" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-pending", "true");
  });

  it("keeps outline and secondary variants on tokens", () => {
    const { rerender } = render(<Button variant="outline">Cancelar</Button>);
    expect(screen.getByRole("button", { name: "Cancelar" }).className).toContain(
      "border-input",
    );
    rerender(<Button variant="secondary">Volver</Button>);
    expect(screen.getByRole("button", { name: "Volver" }).className).toContain(
      "bg-secondary",
    );
  });
});
