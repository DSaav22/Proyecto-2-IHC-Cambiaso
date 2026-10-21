import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Navbar } from "./Navbar";

const renderNavbar = (props: Partial<Parameters<typeof Navbar>[0]> = {}) =>
  render(
    <MemoryRouter>
      <Navbar name="Ana" onLogout={() => {}} {...props} />
    </MemoryRouter>,
  );

describe("Navbar", () => {
  it("shows the Planazo mark", () => {
    renderNavbar();
    expect(screen.getByRole("link", { name: "Planazo" })).toBeInTheDocument();
  });

  it("makes the mark and brand name one single link to /mis-planes", () => {
    renderNavbar();
    const brand = screen.getByRole("link", { name: "Planazo" });
    expect(brand).toHaveAttribute("href", "/mis-planes");
    expect(brand).toHaveTextContent("Planazo");
  });

  it("has no second link to the same destination", () => {
    renderNavbar();
    const links = screen.getAllByRole("link");
    expect(links.filter((link) => link.getAttribute("href") === "/mis-planes")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Mis planes" })).not.toBeInTheDocument();
  });

  it("exposes the user name in the profile icon accessible name", () => {
    renderNavbar({ name: "Ana Pérez" });
    expect(screen.getByRole("img", { name: "Perfil de Ana Pérez" })).toBeInTheDocument();
  });

  it("calls the logout handler on click", async () => {
    const onLogout = vi.fn();
    renderNavbar({ onLogout });
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("disables the logout button while pending", () => {
    renderNavbar({ pending: true });
    expect(screen.getByRole("button", { name: "Cerrando…" })).toBeDisabled();
  });

  it("keeps targets at least 44px high", () => {
    renderNavbar();
    expect(screen.getByRole("button", { name: "Cerrar sesión" }).className).toContain("min-h-11");
  });

  it("links to /historial with a target at least 44px high (Fitts)", () => {
    renderNavbar();
    const link = screen.getByRole("link", { name: "Historial" });
    expect(link).toHaveAttribute("href", "/historial");
    expect(link.className).toContain("min-h-11");
  });
});
