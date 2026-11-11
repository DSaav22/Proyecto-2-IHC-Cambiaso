export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export type PlanStatus = "pendiente" | "confirmado" | "cancelado";

export interface Plan {
  id: string;
  titulo: string;
  description: string;
  /** Calendar date as YYYY-MM-DD. */
  dueDate: string;
  estado: PlanStatus;
  createdAt: string;
  shareCode?: string;
  isOwner?: boolean;
  ownerName?: string;
}

export type PlanDateFilter = "today" | "next7" | "next30" | "overdue";

export interface PlanListParams {
  q?: string;
  estado?: PlanStatus;
  fecha?: PlanDateFilter;
  /** Local calendar date as YYYY-MM-DD used by the server for date ranges. */
  today?: string;
}

export interface PlanSummary {
  total: number;
  overdue: number;
  /** Earliest non-cancelled due date from today on, as YYYY-MM-DD, or null. */
  nextDueDate: string | null;
}

export interface PlansResponse {
  plans: Plan[];
  summary: PlanSummary;
}

export interface PlanInput {
  titulo: string;
  description: string;
  dueDate: string;
}

export type ActivityAction = "created" | "confirmed" | "cancelled" | "edited" | "joined" | "left";

export type ActivityFilter = "todos" | "estados" | "creaciones" | "participacion";

export interface ActivityEvent {
  id: string;
  action: ActivityAction;
  planId: string | null;
  planTitle: string;
  previousState: PlanStatus | null;
  newState: PlanStatus | null;
  /** Current state of the plan; null when the plan no longer exists. */
  planEstado: PlanStatus | null;
  actorName: string;
  createdAt: string;
}

export interface ActivityResponse {
  activities: ActivityEvent[];
}

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch (error) {
    // A caller-initiated abort is not a connectivity failure: let it propagate.
    if (init.signal?.aborted) throw error;
    throw new ApiError(0, "No se pudo conectar con el servidor. Inténtalo de nuevo.");
  }

  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
    errors?: Record<string, string>;
  } & T;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.message ?? "Ocurrió un error inesperado.",
      data.errors ?? {},
    );
  }
  return data;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

const put = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) });

const del = <T>(path: string) => request<T>(path, { method: "DELETE" });

export const api = {
  me: () => request<{ user: PublicUser }>("/auth/me"),
  login: (email: string, password: string) =>
    post<{ user: PublicUser }>("/auth/login", { email, password }),
  register: (name: string, email: string, password: string) =>
    post<{ user: PublicUser }>("/auth/register", { name, email, password }),
  logout: () => post<{ message: string }>("/auth/logout"),
  recover: (email: string) => post<{ message: string; token?: string }>("/auth/recover", { email }),
  recoverConfirm: (email: string, token: string, newPassword: string) =>
    post<{ message: string }>("/auth/recover/confirm", { email, token, newPassword }),
  listPlans: (params: PlanListParams = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    const qs = query.toString();
    return request<PlansResponse>(qs ? `/plans?${qs}` : "/plans", { signal });
  },
  getActivity: (filter: ActivityFilter = "todos", signal?: AbortSignal) =>
    request<ActivityResponse>(`/plans/activity?tipo=${encodeURIComponent(filter)}`, { signal }),
  createPlan: (input: PlanInput) => post<{ plan: Plan }>("/plans", input),
  joinPlan: (code: string) => post<{ plan: Plan }>("/plans/join", { code }),
  updatePlan: (id: string, input: PlanInput) => put<{ plan: Plan }>(`/plans/${id}`, input),
  confirmPlan: (id: string) => post<{ plan: Plan }>(`/plans/${id}/confirm`),
  cancelPlan: (id: string) => post<{ plan: Plan }>(`/plans/${id}/cancel`),
  deletePlan: (id: string) => del<{ message: string }>(`/plans/${id}`),
  leavePlan: (id: string) => post<{ message: string }>(`/plans/${id}/leave`),
  getCoordination: (planId: string) => request<CoordinationBoard>(`/plans/${planId}/coordination`),
  inviteToPlan: (planId: string, email: string) =>
    post<CoordinationBoard>(`/plans/${planId}/invite`, { email }),
  addPlanOption: (planId: string, kind: "fecha" | "lugar", label: string) =>
    post<CoordinationBoard>(`/plans/${planId}/options`, { kind, label }),
  votePlanOption: (planId: string, optionId: string) =>
    post<CoordinationBoard>(`/plans/${planId}/votes`, { optionId }),
  removePlanVote: (planId: string, optionId: string) =>
    del<CoordinationBoard>(`/plans/${planId}/votes/${optionId}`),
  closePlanVoting: (planId: string) => post<CoordinationBoard>(`/plans/${planId}/voting/close`),
  decidePlanVoting: (
    planId: string,
    decision: { dateOptionId?: string; placeOptionId?: string; reason?: string },
  ) => post<CoordinationBoard>(`/plans/${planId}/voting/decision`, decision),
  getExpenses: (planId: string) => request<ExpensesBoard>(`/plans/${planId}/expenses`),
  addExpense: (planId: string, input: ExpenseInput) =>
    post<ExpensesBoard>(`/plans/${planId}/expenses`, input),
  registerPayment: (planId: string, input: { toUserId: string; amount: string }) =>
    post<ExpensesBoard>(`/plans/${planId}/payments`, input),
  confirmPayment: (planId: string, paymentId: string) =>
    post<ExpensesBoard>(`/plans/${planId}/payments/${paymentId}/confirm`),
  rejectPayment: (planId: string, paymentId: string, reason: string) =>
    post<ExpensesBoard>(`/plans/${planId}/payments/${paymentId}/reject`, { reason }),
  trackEvent: <E extends AnalyticsEventName>(event: E, props: AnalyticsEventProps[E]) =>
    post<{ ok: true }>("/analytics/events", { event, props }),
  getAnalyticsSummary: () => request<AnalyticsSummary>("/analytics/summary"),
};

export interface AnalyticsEventProps {
  plan_creacion_iniciada: Record<string, never>;
  plan_confirmado: { via: "boton" | "votacion" };
}

export type AnalyticsEventName = keyof AnalyticsEventProps;

export interface AnalyticsSummary {
  counts: Record<AnalyticsEventName, number>;
  completionRate: number;
  recent: { id: string; event: string; props: Record<string, string>; createdAt: string }[];
}

export type SplitMode = "igual" | "personalizado";
export type PaymentStatus = "pendiente" | "confirmado" | "rechazado";

/** Amounts travel as typed Bs text ("120,50"); the server converts them to cents. */
export interface ExpenseInput {
  description: string;
  amount: string;
  paidById: string;
  splitMode: SplitMode;
  participantIds?: string[];
  shares?: { userId: string; amount: string }[];
}

export interface ExpensesBoard {
  meId: string;
  participants: {
    id: string;
    name: string;
    role: "Creador" | "Participante";
    /** Positive: the group owes this person. Negative: this person owes. */
    balanceCents: number;
  }[];
  expenses: {
    id: string;
    description: string;
    amountCents: number;
    splitMode: SplitMode;
    paidBy: { id: string; name: string };
    shares: { userId: string; name: string; amountCents: number }[];
    createdAt: string;
  }[];
  payments: {
    id: string;
    from: { id: string; name: string };
    to: { id: string; name: string };
    amountCents: number;
    status: PaymentStatus;
    rejectReason: string | null;
    createdAt: string;
  }[];
}

export interface CoordinationBoard {
  votingClosed: boolean;
  decision?: {
    dateOption: { id: string; label: string } | null;
    placeOption: { id: string; label: string } | null;
    reason: string | null;
    decidedAt: string;
    decidedBy: { id: string; name: string } | null;
  } | null;
  participants: { name: string; role: "Creador" | "Participante" }[];
  options: {
    id: string;
    kind: string;
    label: string;
    authorName: string;
    votes: number;
    mine: boolean;
  }[];
}
