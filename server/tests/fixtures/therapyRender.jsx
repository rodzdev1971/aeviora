import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import TherapyExplorer from "../../../src/pages/TherapyExplorer.jsx";
import { setLanguage } from "../../../src/i18n/language.js";

export function renderTherapy(path, language = "en") {
  setLanguage(language);
  return renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/therapies" element={<TherapyExplorer />} />
    <Route path="/therapies/:topicId" element={<TherapyExplorer />} />
    <Route path="/therapies/:topicId/:medicationId" element={<TherapyExplorer />} />
  </Routes></MemoryRouter>);
}
