import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./routes";

const auth = vi.hoisted(() => ({
  value: { user: null as null | { name: string }, loading: false, logout: async () => {} },
}));
vi.mock("./AuthContext", () => ({ useAuth: () => auth.value }));

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={["/mis-planes"]}>
      <Routes>
        <Route path="/login" element={<p>Pantalla de login</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/mis-planes" element={<p>Contenido protegido</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe("ProtectedRoute", () => {
  beforeEach(() => {
    auth.value = { user: null, loading: false, logout: async () => {} };
  });

  it("redirects visitors to login without any navbar", () => {
    renderAt();
    expect(screen.getByText("Pantalla de login")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Perfil de/ })).not.toBeInTheDocument();
  });

  it("renders the navbar around authenticated content", () => {
    auth.value = { user: { name: "Ana" }, loading: false, logout: async () => {} };
    renderAt();
    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mis datos de Ana" })).toHaveAttribute("href", "/mis-datos");
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  });

  it("logs out and navigates to login from the navbar", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    auth.value = { user: { name: "Ana" }, loading: false, logout };
    renderAt();
    const { default: userEvent } = await import("@testing-library/user-event");
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Pantalla de login")).toBeInTheDocument();
  });

  it("keeps the profile link labelled for Mis datos without an avatar img role", () => {
    auth.value = { user: { name: "Ana" }, loading: false, logout: async () => {} };
    renderAt();
    expect(screen.getByRole("link", { name: "Mis datos de Ana" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Perfil de/ })).not.toBeInTheDocument();
  });
});
