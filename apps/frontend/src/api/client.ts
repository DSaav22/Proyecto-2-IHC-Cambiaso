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
  createPlan: (input: PlanInput) => post<{ plan: Plan }>("/plans", input),
  joinPlan: (code: string) => post<{ plan: Plan }>("/plans/join", { code }),
  updatePlan: (id: string, input: PlanInput) => put<{ plan: Plan }>(`/plans/${id}`, input),
  confirmPlan: (id: string) => post<{ plan: Plan }>(`/plans/${id}/confirm`),
  cancelPlan: (id: string) => post<{ plan: Plan }>(`/plans/${id}/cancel`),
  deletePlan: (id: string) => del<{ message: string }>(`/plans/${id}`),
  leavePlan: (id: string) => post<{ message: string }>(`/plans/${id}/leave`),
};
