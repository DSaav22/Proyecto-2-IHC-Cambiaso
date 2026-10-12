import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { INITIAL_PLAN_FILTERS } from "../../lib/planFilters";
import { PlanFiltersBar } from "./PlanFiltersBar";

describe("PlanFiltersBar", () => {
  it("renders search input, status select and date select", () => {
    render(
      <PlanFiltersBar
        criteria={INITIAL_PLAN_FILTERS}
        onChange={vi.fn()}
        onReset={vi.fn()}
        totalCount={5}
        filteredCount={5}
      />,
    );

    expect(screen.getByLabelText("Buscar planes por título")).toBeInTheDocument();
    expect(screen.getByLabelText("Filtrar por estado")).toBeInTheDocument();
    expect(screen.getByLabelText("Filtrar por fecha límite")).toBeInTheDocument();
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
        filteredCount={5}
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
        filteredCount={5}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Filtrar por estado"), "confirmado");
    expect(onChange).toHaveBeenCalledWith({
      ...INITIAL_PLAN_FILTERS,
      status: "confirmado",
    });

    await userEvent.selectOptions(screen.getByLabelText("Filtrar por fecha límite"), "next7");
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
        filteredCount={2}
      />,
    );

    expect(screen.getByText(/Filtros activos:/i)).toBeInTheDocument();
    expect(screen.getByText(/«Fiesta»/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar filtro de estado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar filtro de fecha" })).toBeInTheDocument();
    expect(screen.getByText("Mostrando 2 de 10 planes")).toBeInTheDocument();

    // Click remove title filter
    await userEvent.click(screen.getByRole("button", { name: "Quitar filtro de título" }));
    expect(onChange).toHaveBeenCalledWith({
      query: "",
      status: "confirmado",
      dateRange: "next7",
    });

    // Click global reset
    await userEvent.click(screen.getByRole("button", { name: "Quitar filtros" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
