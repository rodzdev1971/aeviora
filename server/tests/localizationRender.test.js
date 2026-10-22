import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

test("public and admin screens render translated text with stable routes and fields", async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { location: { search: "", hash: "" }, history: { replaceState() {} } };
  const vite = await createServer({ configFile: false, envDir: false, plugins: [react()], optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: "custom" });
  try {
    const { renderScreen, apiRequest, renderReferralShare } = await vite.ssrLoadModule("/server/tests/fixtures/localizationRender.jsx");
    const cases = {
      Home: ["Make wellness part of your everyday life.", "Haz del bienestar parte de tu vida diaria."],
      Login: ["Account Login", "Acceso a la cuenta"],
      Register: ["Create your free account", "Crea tu cuenta gratuita"],
      PasswordRecovery: ["Recover your account", "Recupera tu cuenta"],
      EmailVerification: ["Request a verification link", "Solicitar un enlace de verificación"],
      AccountTerms: ["Account Terms of Use", "Términos de uso de la cuenta"],
      AccountPrivacy: ["Account Privacy Policy", "Política de privacidad de la cuenta"],
      AdminFees: ["Fee catalogs", "Catálogos de tarifas"],
      AdminBenefits: ["Aeviora benefits", "Beneficios de Aeviora"],
      AdminMemberships: ["Membership plans", "Planes de membresía"],
      AdminEmailTemplates: ["Email templates", "Plantillas de correo"],
      Directory: ["Patient &amp; User Directory", "Directorio de pacientes y usuarios"],
      DashboardLayout: ["Membership plans", "Planes de membresía"],
      Appointments: ["Book an appointment", "Reservar una cita"],
      AdminAppointments: ["Providers &amp; appointments", "Profesionales y citas"],
      AdminMetrics: ["Metrics &amp; notifications", "Métricas y notificaciones"],
      Referrals: ["Referral rewards", "Bonos por referidos"],
      AdminReferrals: ["Affiliates &amp; referral coupons", "Afiliados y cupones de referido"],
      AdminFormLinks: ["Form links &amp; QR codes", "Enlaces de formularios y códigos QR"],
      AvailabilityRemoval: ["Remove availability", "Eliminar disponibilidad"],
    };
    for (const [name, [english, spanish]] of Object.entries(cases)) {
      const en = renderScreen(name, "en"), es = renderScreen(name, "es");
      assert.ok(en.includes(english), `${name}: English heading`);
      assert.ok(es.includes(spanish), `${name}: Spanish heading`);
      assert.ok(!es.includes(english), `${name}: heading switches`);
      const attributes = (html) => [...html.matchAll(/(?:href|name|id|htmlFor|for)="([^"]*)"/g)].map((match) => match[0]);
      assert.deepEqual(attributes(es), attributes(en), `${name}: routes and field identifiers are unchanged`);
      assert.equal(renderScreen(name, "en"), en, `${name}: switching back restores English`);
    }
    assert.ok(renderScreen("AdminEmailTemplates", "en").includes("Saved form links &amp; QR codes"), "the templates editor includes the saved-form selector");
    assert.ok(renderScreen("AdminEmailTemplates", "es").includes("Enlaces y códigos QR guardados"));
    for (const token of ["{{appointmentDate}}", "{{appointmentTime}}", "{{providerName}}"]) assert.ok(renderScreen("AdminEmailTemplates", "en").includes(token), "appointment placeholders are documented in the template editor");
    for (const language of ["en", "es"]) {
      const html = renderReferralShare(language);
      assert.ok(html.includes(language === "en" ? "Copy message" : "Copiar mensaje"));
      assert.ok(html.includes(language === "en" ? "Share by SMS" : "Compartir por SMS"));
      assert.ok(html.includes(language === "en" ? "Share by email" : "Compartir por correo"));
      assert.match(html, /<textarea[^>]*readOnly/);
      assert.ok(html.includes("10%") && html.includes("AEV-SYNTHETIC"));
      assert.ok(html.includes('href="mailto:?subject='));
    }
    globalThis.window.location.hash = "#" + "a".repeat(64);
    assert.match(renderScreen("EmailVerification", "en"), /Verify my email/);
    assert.match(renderScreen("EmailVerification", "es"), /Verificar mi correo/);
    globalThis.window.location.hash = "";
    const previousFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url, options) => {
        assert.equal(url, "/api/payments/checkout-session");
        assert.equal(options.headers.get("Accept-Language"), "es");
        assert.equal(options.headers.get("Content-Type"), "application/json");
        assert.equal(options.credentials, "include");
        assert.equal(options.body, '{"planId":"synthetic"}');
        return { ok: true, json: async () => ({ message: "synthetic" }) };
      };
      renderScreen("Home", "es");
      await apiRequest("/api/payments/checkout-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"planId":"synthetic"}' });
    } finally { globalThis.fetch = previousFetch; }
  } finally { globalThis.window = previousWindow; await vite.close(); }
});

