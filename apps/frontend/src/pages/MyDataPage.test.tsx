import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "../api/client";
import MyDataPage from "./MyDataPage";

const clearUser = vi.fn();
const navigate = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ clearUser }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    api: {
      getAccountData: vi.fn(),
      getAccountCsv: vi.fn(),
      deleteAccount: vi.fn(),
      trackEvent: vi.fn(),
    },
  };
});

describe("MyDataPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getAccountData).mockResolvedValue({
      exportedAt: "2026-11-15T12:00:00.000Z",
      user: { name: "Ana", email: "ana@planazo.com", createdAt: "2026-01-01T00:00:00.000Z" },
      plansOwned: [],
      plansJoined: [],
    });
    vi.mocked(api.trackEvent).mockResolvedValue({ ok: true });
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() });
  });

  it("muestra nombre y correo", async () => {
    render(<MemoryRouter><MyDataPage /></MemoryRouter>);
    expect(await screen.findByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("ana@planazo.com")).toBeInTheDocument();
  });

  it("tiene los dos botones de descarga iguales", async () => {
    render(<MemoryRouter><MyDataPage /></MemoryRouter>);
    const json = await screen.findByRole("button", { name: "Descargar JSON" });
    const csv = screen.getByRole("button", { name: "Descargar CSV" });
    expect(json.className).toBe(csv.className);
  });

  it("confirma con Mantener y Eliminar del mismo tamaño", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><MyDataPage /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Eliminar mi cuenta" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: "Mantener mi cuenta" }).className).toContain("min-h-11");
    expect(within(dialog).getByRole("button", { name: "Eliminar mi cuenta" }).className).toContain("min-h-11");
  });

  it("muestra el motivo si la regla bloquea", async () => {
    const user = userEvent.setup();
    vi.mocked(api.deleteAccount).mockRejectedValue(
      new ApiError(409, "Organizás 1 plan abierto. Cancelalo antes de eliminar tu cuenta.", {}, "planes_abiertos"),
    );
    render(<MemoryRouter><MyDataPage /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Eliminar mi cuenta" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar mi cuenta" }));
    expect(await within(dialog).findByText(/plan abierto/)).toBeInTheDocument();
    expect(api.trackEvent).toHaveBeenCalledWith("eliminacion_bloqueada", { motivo: "planes_abiertos" });
  });

  it("sale al login si se elimina bien", async () => {
    const user = userEvent.setup();
    vi.mocked(api.deleteAccount).mockResolvedValue({ message: "Tu cuenta fue eliminada." });
    render(<MemoryRouter><MyDataPage /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Eliminar mi cuenta" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar mi cuenta" }));
    await waitFor(() => expect(clearUser).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith("/login", { replace: true });
  });
});
