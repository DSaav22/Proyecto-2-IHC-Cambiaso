import { describe, expect, it } from "vitest";
import { completionRate, parseEvent } from "./analytics";

describe("parseEvent", () => {
  it("acepta plan_creacion_iniciada sin propiedades", () => {
    expect(parseEvent({ event: "plan_creacion_iniciada", props: {} })).toEqual({
      event: "plan_creacion_iniciada",
      props: {},
    });
  });

  it("acepta plan_confirmado con la vía", () => {
    expect(parseEvent({ event: "plan_confirmado", props: { via: "boton" } })).toEqual({
      event: "plan_confirmado",
      props: { via: "boton" },
    });
  });

  it("rechaza un evento que no está en la lista", () => {
    expect(parseEvent({ event: "boton_clic", props: {} })).toBeNull();
  });

  it("rechaza datos personales en las propiedades", () => {
    expect(
      parseEvent({ event: "plan_creacion_iniciada", props: { email: "ana@gmail.com" } }),
    ).toBeNull();
  });
});

describe("completionRate", () => {
  it("calcula el porcentaje que termina", () => {
    expect(completionRate(8, 5)).toBe(63);
    expect(completionRate(0, 0)).toBe(0);
  });
});
