import { describe, expect, it } from "vitest";
import { parseEvent } from "./analytics";

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

  it("acepta un error con un motivo de la lista fija", () => {
    expect(parseEvent({ event: "retiro_bloqueado", props: { motivo: "deuda_pendiente" } })).toEqual({
      event: "retiro_bloqueado",
      props: { motivo: "deuda_pendiente" },
    });
  });

  it("rechaza un motivo que no está en la lista", () => {
    expect(parseEvent({ event: "union_fallida", props: { motivo: "me equivoqué de código" } })).toBeNull();
  });

  it("rechaza un evento que no está en la lista", () => {
    expect(parseEvent({ event: "boton_clic", props: {} })).toBeNull();
  });

  it("rechaza datos personales en las propiedades", () => {
    expect(
      parseEvent({ event: "plan_creacion_iniciada", props: { email: "ana@gmail.com" } }),
    ).toBeNull();
    expect(parseEvent({ event: "busqueda_sin_resultados", props: { filtro: "texto", q: "cena" } })).toBeNull();
  });
});
