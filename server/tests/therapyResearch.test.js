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
        assert.ok(html.indexOf('id="research-studies"') < html.indexOf('id="regulatory-heading"'), "research precedes regulatory details");
        assert.ok(!html.includes("<figcaption"));
        assert.ok(!html.includes(">ILLUSTRATION<") && !html.includes(">ILUSTRACIÓN<"));
        if (medication.featuredStudy) {
          assert.ok(html.includes(medication.featuredStudy.coverage.url));
          assert.ok(html.includes(medication.featuredStudy.finding[language]));
        }
        assert.ok(html.includes(medication.safetySource.url.replaceAll("&", "&amp;")));
        for (const study of medication.studies) assert.ok(html.includes(study.url));
        if (medication.introSource) assert.ok(html.includes(medication.introSource.url));
        for (const source of medication.furtherReading || []) assert.ok(html.includes(source.url));
        if (medication.id === "nad-plus") {
          assert.ok(html.includes(language === "es" ? "Frasco ilustrativo de NAD+" : "Illustrative NAD+ bottle"));
          assert.ok(html.includes(language === "es" ? "Vial inyectable ilustrativo de NAD+" : "Illustrative NAD+ injection vial"));
          assert.equal((html.match(/viewBox="0 0 210 280"/g) || []).length, 2);
          assert.ok(html.includes("29599478") && html.includes("33888596") && html.includes("27127236") && html.includes("25730862"));
          assert.ok(html.includes(language === "es" ? "NR oral" : "oral NR"));
          assert.ok(html.includes(language === "es" ? "Estudio animal" : "Animal study"));
          assert.ok(html.includes(medication.reviewedAt));
        }
        assert.match(html, /href="\/therapies\/longevity-assessment"/);
        assert.match(html, /<figure\b[\s\S]*?<img[^>]*alt="Aeviora Wellness logo"[\s\S]*?<\/figure>/);
        assert.ok([...html.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].every(([svg]) => !svg.includes("Aeviora")), "branding stays outside the bottle");
      }
    }
    assert.match(renderTherapy("/therapies/hormone-optimization"), /No medication guides for this topic yet/);
    assert.match(renderTherapy("/therapies/unknown"), /Topic not found/);
    assert.match(renderTherapy("/therapies/longevity-assessment/unknown"), /Topic not found/);
    assert.match(renderTherapy("/therapies/hormone-optimization/metformin"), /Topic not found/);
    assert.match(renderTherapy("/therapies"), /type="search"/);
    for (const [query, expected] of [
      ["  METFOR  ", "/therapies/longevity-assessment/metformin"],
      ["metformina", "/therapies/longevity-assessment/metformin"],
      ["glutation", "/therapies/longevity-assessment/glutathione"],
      ["Glutatión", "/therapies/longevity-assessment/glutathione"],
      ["rapamicina", "/therapies/longevity-assessment/rapamycin"],
      ["sirolimus", "/therapies/longevity-assessment/rapamycin"],
      ["NAD+", "/therapies/longevity-assessment/nad-plus"],
      ["nicotinamide adenine", "/therapies/longevity-assessment/nad-plus"],
      ["hormone", "/therapies/hormone-optimization"],
      ["optimizacion hormonal", "/therapies/hormone-optimization"],
      ["glp1", "/therapies/glp1-program"],
    ]) {
      for (const language of ["en", "es"]) {
        const html = renderTherapy(`/therapies?q=${encodeURIComponent(query)}`, language);
        assert.ok(html.includes(`href="${expected}"`), `${language}: ${query} finds its guide or topic`);
        assert.ok(html.includes(language === "es" ? "Resultados de búsqueda" : "Search results"));
      }
    }
    const nadSearch = renderTherapy("/therapies?q=nad");
    assert.ok(nadSearch.includes('href="/therapies/nad-iv-therapy"'));
    assert.ok(nadSearch.includes('href="/therapies/longevity-assessment/nad-plus"'));
    assert.ok(!nadSearch.includes('href="/therapies/longevity-assessment/metformin"'));
    const topicSearch = renderTherapy("/therapies/hormone-optimization?q=glut");
    assert.ok(topicSearch.includes('href="/therapies/longevity-assessment/glutathione"'), "topic-page search covers the whole library");
    assert.ok(!topicSearch.includes("No medication guides for this topic yet"));
    for (const query of ["no-such-medication-xyz", "+++", '<img src=x onerror="alert(1)">']) {
      const html = renderTherapy(`/therapies?q=${encodeURIComponent(query)}`);
      assert.ok(html.includes("No medications or topics match that name"));
      assert.ok(!html.includes('<img src=x'), "search text is escaped");
    }
    const cleared = renderTherapy("/therapies?q=");
    assert.ok(!cleared.includes('id="therapy-search-results"'));
    assert.ok(cleared.includes('href="/therapies/hormone-optimization"'));
    assert.ok(!renderTherapy("/therapies/longevity-assessment/metformin").includes('id="therapy-search"'), "search stays on browsing pages");
  } finally { await vite.close(); }
});
