import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "./client";

const fetchMock = vi.fn();

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

const emptyList = { plans: [], summary: { total: 0, overdue: 0, nextDueDate: null } };

describe("api.listPlans", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests /api/plans without a query string when no params are given", async () => {
    fetchMock.mockResolvedValue(jsonResponse(emptyList));
    await api.listPlans();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/plans");
  });

  it("serializes provided params and omits empty ones", async () => {
    fetchMock.mockResolvedValue(jsonResponse(emptyList));
    await api.listPlans({ q: "cena", estado: "pendiente", fecha: undefined, today: "2026-06-15" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/plans?q=cena&estado=pendiente&today=2026-06-15");

    await api.listPlans({ q: "", today: "2026-06-15" });
    expect(fetchMock.mock.calls[1][0]).toBe("/api/plans?today=2026-06-15");
  });

  it("encodes special characters in q", async () => {
    fetchMock.mockResolvedValue(jsonResponse(emptyList));
    await api.listPlans({ q: "100% & más" });
    const url = new URL(fetchMock.mock.calls[0][0] as string, "http://localhost");
    expect(url.searchParams.get("q")).toBe("100% & más");
  });

  it("returns plans together with the summary", async () => {
    const body = { plans: [], summary: { total: 3, overdue: 1, nextDueDate: "2026-06-20" } };
    fetchMock.mockResolvedValue(jsonResponse(body));
    await expect(api.listPlans()).resolves.toEqual(body);
  });

  it("forwards the abort signal to fetch", async () => {
    fetchMock.mockResolvedValue(jsonResponse(emptyList));
    const controller = new AbortController();
    await api.listPlans({}, controller.signal);
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });

  it("rethrows the abort error instead of mapping it to ApiError(0)", async () => {
    const controller = new AbortController();
    const abortError = new DOMException("Aborted", "AbortError");
    fetchMock.mockImplementation(async () => {
      controller.abort();
      throw abortError;
    });
    const error = await api.listPlans({}, controller.signal).catch((e: unknown) => e);
    expect(error).toBe(abortError);
    expect(error).not.toBeInstanceOf(ApiError);
  });

  it("still maps network failures to ApiError(0)", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await api.listPlans().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
  });

  it("maps 400 responses to ApiError with field errors", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Parámetros de búsqueda inválidos", errors: { estado: "inválido" } }, 400),
    );
    const error = await api.listPlans({ estado: "pendiente" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).fieldErrors).toEqual({ estado: "inválido" });
  });
});
