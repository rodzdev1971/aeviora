import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { therapyMedications } from "../../src/util/therapyResearch.js";

test("therapy navigation renders medication lists, sourced detail pages, and unavailable topics in both languages", async () => {
  const vite = await createServer({ configFile: false, envDir: false, plugins: [react()], optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, ws: false }, appType: "custom" });
  try {
    const { renderTherapy } = await vite.ssrLoadModule("/server/tests/fixtures/therapyRender.jsx");
    assert.match(renderTherapy("/therapies"), /href="\/therapies\/longevity-assessment"/);
    const list = renderTherapy("/therapies/longevity-assessment");
    assert.deepEqual(therapyMedications["longevity-assessment"].map((item) => item.name), ["Metformin", "Glutathione", "Rapamycin", "NAD+"]);
    for (const medication of therapyMedications["longevity-assessment"]) {
      const path = `/therapies/longevity-assessment/${medication.id}`;
      assert.ok(list.includes(`href="${path}"`));
      for (const language of ["en", "es"]) {
        const html = renderTherapy(path, language);
        assert.ok(html.includes(medication.name));
        assert.ok(html.includes(medication.conclusion[language]));
        assert.ok(html.includes(medication.regulatory[language]));
        assert.ok(html.includes(medication.safetySource.url.replaceAll("&", "&amp;")));
        for (const study of medication.studies) assert.ok(html.includes(study.url));
        assert.match(html, /href="\/therapies\/longevity-assessment"/);
        assert.match(html, /<\/svg><div[^>]*><img[^>]*alt="Aeviora Wellness logo"/);
        assert.ok([...html.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].every(([svg]) => !svg.includes("Aeviora")), "branding stays outside the bottle");
      }
    }
    assert.match(renderTherapy("/therapies/hormone-optimization"), /No medication guides for this topic yet/);
    assert.match(renderTherapy("/therapies/unknown"), /Topic not found/);
    assert.match(renderTherapy("/therapies/longevity-assessment/unknown"), /Topic not found/);
    assert.match(renderTherapy("/therapies/hormone-optimization/metformin"), /Topic not found/);
  } finally { await vite.close(); }
});
