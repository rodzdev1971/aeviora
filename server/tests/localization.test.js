import test from "node:test";
import assert from "node:assert/strict";
import spanish from "../../src/i18n/es.json" with { type: "json" };
import { translate, setLanguage, getLanguage, getLocale, subscribeLanguage, LANGUAGE_KEY } from "../../src/i18n/language.js";
import { discountText } from "../../src/i18n/discountText.js";

test("Spanish translations preserve placeholders and unknown/user-authored content", () => {
  for (const [source, translated] of Object.entries(spanish)) {
    assert.ok(translated.trim(), source);
    const slots = (value) => [...value.matchAll(/\{\{\w+\}\}/g)].map((match) => match[0]).sort();
    assert.deepEqual(slots(translated), slots(source), source);
    assert.equal(translate(source, "en"), source);
  }
  assert.equal(translate("  Sign up for free ", "es"), "  Regístrate gratis ");
  assert.equal(translate("50% off selected services", "es"), "50% de descuento en servicios seleccionados");
  assert.equal(translate("María Example", "es"), "María Example");
  assert.equal(translate("Custom provider description", "es"), "Custom provider description");
  assert.equal(translate(50, "es"), 50);
  const payload = { name: "Free", amount: 50 };
  assert.equal(translate(payload, "es"), payload);
  const reference = "bce34599-4958-4fcd-9592-f8e4e4194a9f";
  assert.equal(translate(`Stripe could not calculate this upgrade for the current subscription. Contact support with the error reference below. Reference: ${reference}`, "es"), `Stripe no pudo calcular la mejora para la suscripción actual. Contacta a soporte con la referencia del error. Referencia: ${reference}`);
});

test("language preference persists, notifies subscribers and safely handles blocked storage", (t) => {
  const storage = globalThis.localStorage;
  t.after(() => { globalThis.localStorage = storage; setLanguage("en"); });
  const values = new Map();
  globalThis.localStorage = { setItem: (key, value) => values.set(key, value) };
  let notifications = 0;
  const unsubscribe = subscribeLanguage(() => notifications++);
  setLanguage("es");
  assert.equal(getLanguage(), "es");
  assert.equal(getLocale(), "es-US");
  assert.equal(values.get(LANGUAGE_KEY), "es");
  setLanguage("untrusted");
  assert.equal(getLanguage(), "es");
  assert.equal(notifications, 1);
  globalThis.localStorage = { setItem: () => { throw new Error("Storage blocked"); } };
  assert.doesNotThrow(() => setLanguage("en"));
  assert.equal(getLocale(), "en-US");
  unsubscribe();
});

test("discount eligibility descriptions translate without modifying pricing rules", () => {
  const discount = { percent: 20, laboratoryFees: { mode: "allExcept", feeIds: ["excluded"] }, diagnosticFees: { mode: "selected", feeIds: ["included"] } };
  const before = JSON.stringify(discount);
  setLanguage("es");
  assert.equal(discountText(discount), "20% de descuento en todos los servicios de laboratorio excepto 1 exclusión y 1 servicio de diagnóstico seleccionado");
  assert.equal(JSON.stringify(discount), before);
  setLanguage("en");
  assert.match(discountText(discount), /20% discount on/);
});
