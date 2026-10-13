import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import type { PlansStore } from "./plans.js";

const mocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: mocks.sendMail })) },
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: { user: { findUnique: mocks.findUnique, update: mocks.update } },
}));

const plansStore: PlansStore = {
  list: async () => [],
  create: async () => {
    throw new Error("unused");
  },
  joinByCode: async () => {
    throw new Error("unused");
  },
  update: async () => null,
  confirm: async () => null,
  cancel: async () => null,
  delete: async () => false,
};
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("POST /api/auth/recover", () => {
  const app = createApp({ plansStore });

  beforeEach(() => {
    mocks.sendMail.mockReset().mockResolvedValue({ messageId: "1" });
    mocks.update.mockReset().mockResolvedValue({});
    mocks.findUnique.mockReset();
  });

  it("emails the token to an existing user and never exposes it in the response", async () => {
    mocks.findUnique.mockResolvedValue({ id: "u1", email: "ana@x.com" });
    const res = await request(app).post("/api/auth/recover").send({ email: "ana@x.com" });
    await flush();

    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual(["message"]);
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
    const { to, text } = mocks.sendMail.mock.calls[0][0] as { to: string; text: string };
    expect(to).toBe("ana@x.com");
    const stored = mocks.update.mock.calls[0][0].data.resetTokenHash as string;
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    expect(text).not.toContain(stored);
    expect(text).toMatch(/token=[0-9a-f]{48}/);
  });

  it("returns the same 200 response and sends nothing for an unknown email", async () => {
    mocks.findUnique.mockResolvedValueOnce({ id: "u1", email: "ana@x.com" });
    const known = await request(app).post("/api/auth/recover").send({ email: "ana@x.com" });
    mocks.sendMail.mockClear();
    mocks.findUnique.mockResolvedValueOnce(null);
    const unknown = await request(app).post("/api/auth/recover").send({ email: "ghost@x.com" });
    await flush();

    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("still responds 200 when the SMTP server fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findUnique.mockResolvedValue({ id: "u1", email: "ana@x.com" });
    mocks.sendMail.mockRejectedValue(new Error("SMTP down"));
    const res = await request(app).post("/api/auth/recover").send({ email: "ana@x.com" });
    await flush();

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("token");
    log.mockRestore();
  });

  it("rejects an invalid body with 400 and sends no email", async () => {
    const res = await request(app).post("/api/auth/recover").send({ email: "nope" });
    expect(res.status).toBe(400);
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});
