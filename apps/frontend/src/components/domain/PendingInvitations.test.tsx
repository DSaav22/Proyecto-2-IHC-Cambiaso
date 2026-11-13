import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PlanInvitation } from "../../api/client";
import { PendingInvitations } from "./PendingInvitations";

const invitation: PlanInvitation = {
  id: "inv-1",
  plan: {
    titulo: "Cena de cumpleaños",
    description: "En casa de Ana",
    dueDate: "2026-11-20",
    ownerName: "Ana",
  },
};

function renderInvitations(overrides: Partial<Parameters<typeof PendingInvitations>[0]> = {}) {
  const props = { invitations: [invitation], onAccept: vi.fn(), onDecline: vi.fn(), ...overrides };
  render(<PendingInvitations {...props} />);
  return props;
}

describe("PendingInvitations", () => {
  it("shows what the plan is and what joining means before deciding", () => {
    renderInvitations();
    const section = screen.getByRole("region", { name: "Invitaciones pendientes" });

    expect(section).toHaveTextContent("Cena de cumpleaños");
    expect(section).toHaveTextContent("En casa de Ana");
    expect(section).toHaveTextContent("Organiza: Ana");
    expect(section).toHaveTextContent("podrán incluirte en los gastos del plan");
  });

  it("gives accepting and declining the same size and style", () => {
    renderInvitations();

    const accept = screen.getByRole("button", { name: "Unirme al plan" });
    const decline = screen.getByRole("button", { name: "Rechazar" });
    expect(accept.className).toBe(decline.className);
  });

  it("accepts with a single click", async () => {
    const props = renderInvitations();

    await userEvent.click(screen.getByRole("button", { name: "Unirme al plan" }));

    expect(props.onAccept).toHaveBeenCalledWith(invitation);
    expect(props.onDecline).not.toHaveBeenCalled();
  });

  it("declines with a single click", async () => {
    const props = renderInvitations();

    await userEvent.click(screen.getByRole("button", { name: "Rechazar" }));

    expect(props.onDecline).toHaveBeenCalledWith(invitation);
    expect(props.onAccept).not.toHaveBeenCalled();
  });

  it("renders nothing when there are no invitations", () => {
    const { container } = render(
      <PendingInvitations invitations={[]} onAccept={vi.fn()} onDecline={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
