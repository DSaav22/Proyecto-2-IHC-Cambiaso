import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { INITIAL_PLAN_FILTERS, type PlanFilterCriteria } from "../../lib/planFilters";
import { PlanFiltersBar } from "./PlanFiltersBar";

/** Stateful host so removed chips actually disappear, as they do in the page. */
function Harness({ initial }: { initial: PlanFilterCriteria }) {
  const [criteria, setCriteria] = useState(initial);
  return (
    <PlanFiltersBar
      criteria={criteria}
      onChange={setCriteria}
      onReset={() => setCriteria(INITIAL_PLAN_FILTERS)}
      totalCount={9}
      resultCount={3}
    />
  );
}

const ALL_ACTIVE: PlanFilterCriteria = { query: "Fiesta", status: "confirmado", dateRange: "next7" };

describe("PlanFiltersBar", () => {
  it("renders search input, status select and date select", () => {
    render(
      <PlanFiltersBar
        criteria={INITIAL_PLAN_FILTERS}
        onChange={vi.fn()}
        onReset={vi.fn()}
        totalCount={5}
        resultCount={5}
      />,
    );

    expect(screen.getByLabelText("Buscar planes por título")).toBeInTheDocument();
    expect(screen.getByLabelText("Estado")).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha límite")).toBeInTheDocument();
    expect(screen.queryByText(/Filtros activos:/i)).not.toBeInTheDocument();
  });

  it("calls onChange when typing in the search input", async () => {
    const onChange = vi.fn();
    render(
      <PlanFiltersBar
        criteria={INITIAL_PLAN_FILTERS}
        onChange={onChange}
        onReset={vi.fn()}
        totalCount={5}
        resultCount={5}
      />,
    );

    const input = screen.getByLabelText("Buscar planes por título");
    await userEvent.type(input, "Cena");

    expect(onChange).toHaveBeenCalled();
  });

  it("calls onChange when selecting status or date range", async () => {
    const onChange = vi.fn();
    render(
      <PlanFiltersBar
        criteria={INITIAL_PLAN_FILTERS}
        onChange={onChange}
        onReset={vi.fn()}
        totalCount={5}
        resultCount={5}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Estado"), "confirmado");
    expect(onChange).toHaveBeenCalledWith({
      ...INITIAL_PLAN_FILTERS,
      status: "confirmado",
    });

    await userEvent.selectOptions(screen.getByLabelText("Fecha límite"), "next7");
    expect(onChange).toHaveBeenCalledWith({
      ...INITIAL_PLAN_FILTERS,
      dateRange: "next7",
    });
  });

  it("displays active filter tags with individual removal controls and global reset button", async () => {
    const onChange = vi.fn();
    const onReset = vi.fn();

    render(
      <PlanFiltersBar
        criteria={{
          query: "Fiesta",
          status: "confirmado",
          dateRange: "next7",
        }}
        onChange={onChange}
        onReset={onReset}
        totalCount={10}
        resultCount={2}
      />,
    );

    expect(screen.getByText(/Filtros activos:/i)).toBeInTheDocument();
    expect(screen.getByText(/«Fiesta»/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar filtro de estado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar filtro de fecha" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 2 de 10 planes");

    // Click remove title filter
    await userEvent.click(screen.getByRole("button", { name: "Quitar filtro de título" }));
    expect(onChange).toHaveBeenCalledWith({
      query: "",
      status: "confirmado",
      dateRange: "next7",
    });

    // Click global reset
    await userEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("labels the selects with visible text and no conflicting aria-label", () => {
    render(
      <PlanFiltersBar
        criteria={INITIAL_PLAN_FILTERS}
        onChange={vi.fn()}
        onReset={vi.fn()}
        totalCount={5}
        resultCount={5}
      />,
    );

    for (const name of ["Estado", "Fecha límite"]) {
      const select = screen.getByRole("combobox", { name });
      expect(select).not.toHaveAttribute("aria-label");
      expect(screen.getByText(name, { selector: "label" })).toBeVisible();
    }
  });

  it("builds select options from the shared status and date label maps", () => {
    render(
      <PlanFiltersBar
        criteria={INITIAL_PLAN_FILTERS}
        onChange={vi.fn()}
        onReset={vi.fn()}
        totalCount={5}
        resultCount={5}
      />,
    );

    const statuses = within(screen.getByLabelText("Estado")).getAllByRole("option");
    expect(statuses.map((o) => o.textContent)).toEqual([
      "Todos los estados",
      "Pendiente",
      "Confirmado",
      "Cancelado",
    ]);
    const dates = within(screen.getByLabelText("Fecha límite")).getAllByRole("option");
    expect(dates.map((o) => o.textContent)).toEqual([
      "Cualquier fecha",
      "Hoy",
      "Próximos 7 días",
      "Próximos 30 días",
      "Vencidos",
    ]);
  });

  it("announces the result count politely, also when no filter is active", () => {
    const { rerender } = render(
      <PlanFiltersBar
        criteria={INITIAL_PLAN_FILTERS}
        onChange={vi.fn()}
        onReset={vi.fn()}
        totalCount={7}
        resultCount={7}
      />,
    );

    const live = screen.getByRole("status");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveTextContent("Mostrando 7 de 7 planes");

    rerender(
      <PlanFiltersBar
        criteria={{ ...INITIAL_PLAN_FILTERS, status: "cancelado" }}
        onChange={vi.fn()}
        onReset={vi.fn()}
        totalCount={7}
        resultCount={2}
      />,
    );
    expect(screen.getByRole("status")).toBe(live);
    expect(live).toHaveTextContent("Mostrando 2 de 7 planes");
  });

  it("moves focus to the matching control after removing one of several chips", async () => {
    render(<Harness initial={ALL_ACTIVE} />);

    await userEvent.click(screen.getByRole("button", { name: "Quitar filtro de estado" }));
    expect(screen.getByLabelText("Estado")).toHaveFocus();
    expect(screen.getByLabelText("Estado")).toHaveValue("all");

    await userEvent.click(screen.getByRole("button", { name: "Quitar filtro de fecha" }));
    expect(screen.getByLabelText("Fecha límite")).toHaveFocus();
    expect(screen.getByLabelText("Fecha límite")).toHaveValue("all");
    expect(screen.getByRole("button", { name: "Quitar filtro de título" })).toBeInTheDocument();
  });

  it("moves focus to the search input after removing the last chip", async () => {
    render(<Harness initial={{ ...INITIAL_PLAN_FILTERS, dateRange: "overdue" }} />);

    await userEvent.click(screen.getByRole("button", { name: "Quitar filtro de fecha" }));

    expect(screen.queryByText(/Filtros activos:/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Buscar planes por título")).toHaveFocus();
  });

  it("moves focus to the search input after removing the title chip or clearing all", async () => {
    render(<Harness initial={ALL_ACTIVE} />);

    await userEvent.click(screen.getByRole("button", { name: "Quitar filtro de título" }));
    expect(screen.getByLabelText("Buscar planes por título")).toHaveFocus();

    await userEvent.click(screen.getByLabelText("Estado"));
    await userEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByLabelText("Buscar planes por título")).toHaveFocus();
    expect(screen.queryByText(/Filtros activos:/i)).not.toBeInTheDocument();
  });

  it("gives every chip remove control and the clear-search control a 44px target", () => {
    render(<Harness initial={ALL_ACTIVE} />);

    for (const name of [
      "Quitar filtro de título",
      "Quitar filtro de estado",
      "Quitar filtro de fecha",
      "Limpiar búsqueda",
    ]) {
      const button = screen.getByRole("button", { name });
      expect(button).toHaveClass("size-11");
    }
  });

  it("uses a stacked mobile layout with wrapping chips and no horizontal overflow", () => {
    render(<Harness initial={ALL_ACTIVE} />);

    const selects = screen.getByLabelText("Estado").closest("div[class*='grid-cols-1']");
    expect(selects).toHaveClass("grid", "grid-cols-1", "sm:grid-cols-2");
    expect(screen.getByLabelText("Estado")).toHaveClass("w-full");
    const chips = screen.getByText(/Filtros activos:/i).parentElement;
    expect(chips).toHaveClass("flex-wrap");
    expect(screen.getByRole("region", { name: /filtros y búsqueda/i })).toHaveClass("min-w-0");
  });
});
