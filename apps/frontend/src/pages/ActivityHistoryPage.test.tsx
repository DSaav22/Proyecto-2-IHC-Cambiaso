import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import type { ActivityEvent } from "../api/client";
import ActivityHistoryPage from "./ActivityHistoryPage";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return { ...actual, api: { getActivity: vi.fn() } };
});

const getActivity = vi.mocked(api.getActivity);

const confirmed: ActivityEvent = {
  id: "a1",
  action: "confirmed",
  planId: "p1",
  planTitle: "Cumpleaños",
  previousState: "pendiente",
  newState: "confirmado",
  planEstado: "confirmado",
  actorName: "Ana",
  createdAt: new Date(Date.now() - 15 * 60_000).toISOString(),
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <ActivityHistoryPage />
    </MemoryRouter>,
  );

describe("ActivityHistoryPage", () => {
  beforeEach(() => {
    getActivity.mockReset();
    getActivity.mockResolvedValue({ activities: [] });
  });

  it("renders the 4 dimensions of an activity card", async () => {
    getActivity.mockResolvedValue({ activities: [confirmed] });
    renderPage();
    expect(await screen.findByText("Plan confirmado")).toBeInTheDocument();
    expect(screen.getByText("Hace 15 min")).toBeInTheDocument();
    expect(screen.getByTestId("activity-status-badge")).toHaveTextContent("Confirmado");
    const link = screen.getByRole("link", { name: "Cumpleaños" });
    expect(link).toHaveAttribute("href", "/mis-planes");
  });

  it("shows the empty state with a primary CTA to create a plan", async () => {
    renderPage();
    expect(await screen.findByText("Todavía no tenés actividad registrada")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: "Crear un plan" });
    expect(cta).toHaveAttribute("href", "/mis-planes");
  });

  it("offers exactly 4 thematic chips with Todos selected first", async () => {
    renderPage();
    await screen.findByText("Todavía no tenés actividad registrada");
    const chips = screen.getAllByRole("button", { pressed: undefined }).filter((b) => b.hasAttribute("aria-pressed"));
    expect(chips.map((c) => c.textContent)).toEqual(["Todos", "Estados", "Creaciones", "Participación"]);
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
    expect(getActivity).toHaveBeenCalledWith("todos", expect.anything());
  });

  it("selecting a chip reloads with that filter and highlights it", async () => {
    renderPage();
    await screen.findByText("Todavía no tenés actividad registrada");
    await userEvent.click(screen.getByRole("button", { name: "Estados" }));
    await waitFor(() => expect(getActivity).toHaveBeenLastCalledWith("estados", expect.anything()));
    expect(screen.getByRole("button", { name: "Estados" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps touch targets at least 44px high (Fitts)", async () => {
    renderPage();
    await screen.findByText("Todavía no tenés actividad registrada");
    for (const name of ["Todos", "Estados", "Creaciones", "Participación"]) {
      expect(screen.getByRole("button", { name }).className).toContain("min-h-11");
    }
    expect(screen.getByRole("link", { name: "Crear un plan" }).className).toContain("min-h-11");
  });

  it("shows an error message when loading fails", async () => {
    getActivity.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(/No se pudo/);
  });
});
