// Curated educational content, not a prescribing or availability catalog.
// Keep each finding paired with its study design, limitations, and primary source.
const text = (en, es) => ({ en, es });
export const researchReviewedAt = "2026-10-14";
export const regulatorySources = {
  offLabel: { title: "FDA: Understanding off-label use", url: "https://www.fda.gov/understanding-unapproved-use-approved-drugs-label" },
  compounded: { title: "FDA: Risks of compounded drugs", url: "https://www.fda.gov/drugs/human-drug-compounding/understanding-risks-compounded-drugs" },
};

export const therapyMedications = {
  "longevity-assessment": [
    {
      id: "metformin", name: "Metformin", kind: "bottle", regulatoryType: "offLabel",
      category: text("Metabolic health research", "Investigación sobre salud metabólica"),
      intro: text("A prescription medicine for type 2 diabetes, also studied for its possible role in healthy aging.", "Un medicamento recetado para la diabetes tipo 2, también estudiado por su posible papel en el envejecimiento saludable."),
      regulatory: text("Metformin is FDA-approved for type 2 diabetes. Use for longevity or anti-aging is off-label: the FDA has not approved it for that purpose.", "La metformina está aprobada por la FDA para la diabetes tipo 2. Su uso para longevidad o antienvejecimiento está fuera de indicación (off-label): la FDA no lo ha aprobado para ese fin."),
      conclusion: text("Benefits for diabetes risk do not establish that metformin slows aging or extends life in healthy people. The studies below do not demonstrate a human longevity benefit.", "Los beneficios sobre el riesgo de diabetes no establecen que la metformina retrase el envejecimiento o prolongue la vida de personas sanas. Los estudios siguientes no demuestran un beneficio de longevidad humana."),
      studies: [
        { title: "Diabetes Prevention Program · 2002", design: text("Randomized trial in adults at high risk of diabetes", "Ensayo aleatorizado en adultos con alto riesgo de diabetes"),
          finding: text("Over about three years, metformin reduced diabetes incidence by 31% relative to placebo; intensive lifestyle changes reduced it by 58%.", "En aproximadamente tres años, la metformina redujo la incidencia de diabetes un 31% respecto al placebo; los cambios intensivos de estilo de vida la redujeron un 58%."),
          limitation: text("This studied diabetes prevention in a high-risk population, not lifespan extension in healthy adults.", "Se estudió la prevención de diabetes en una población de alto riesgo, no la prolongación de la vida de adultos sanos."),
          url: "https://www.niddk.nih.gov/about-niddk/research-areas/diabetes/diabetes-prevention-program-dpp" },
        { title: "MASTERS · 2019", design: text("Randomized trial · 94 adults aged 65+ · 14 weeks of resistance training", "Ensayo aleatorizado · 94 adultos de 65 años o más · 14 semanas de entrenamiento de fuerza"),
          finding: text("Participants taking metformin gained less lean body mass and thigh muscle mass than those taking placebo during training.", "Durante el entrenamiento, quienes tomaron metformina ganaron menos masa corporal magra y masa muscular del muslo que quienes tomaron placebo."),
          limitation: text("A short exercise study cannot determine lifespan effects. It highlights that potential benefits may come with tradeoffs.", "Un estudio corto de ejercicio no puede determinar efectos sobre la longevidad. Destaca que los posibles beneficios pueden tener contrapartidas."),
          url: "https://pubmed.ncbi.nlm.nih.gov/31557380/" },
      ],
      safety: text("Common effects include diarrhea and nausea. Vitamin B12 can fall with use. Rare but serious lactic acidosis is a labeled risk; kidney function, other medicines and alcohol use require clinical review.", "Los efectos frecuentes incluyen diarrea y náuseas. La vitamina B12 puede disminuir. La acidosis láctica, rara pero grave, es un riesgo advertido; la función renal, otros medicamentos y el consumo de alcohol requieren revisión clínica."),
      safetySource: { title: "Metformin prescribing information · DailyMed", url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=fc466c46-abaa-4675-aef2-4b1a1adfd912" },
    },
    {
      id: "glutathione", name: "Glutathione", kind: "vial", regulatoryType: "compounded",
      category: text("Antioxidant research", "Investigación sobre antioxidantes"),
      intro: text("An antioxidant made by the body. Studies of oral supplementation and injectable preparations must be considered separately.", "Un antioxidante producido por el cuerpo. Los estudios de suplementos orales y preparaciones inyectables deben considerarse por separado."),
      regulatory: text("Glutathione is not FDA-approved for longevity. Compounded glutathione injections are not FDA-approved products; describing them simply as off-label would not convey that distinction.", "El glutatión no está aprobado por la FDA para longevidad. Las inyecciones de glutatión de preparación magistral no son productos aprobados por la FDA; describirlas solo como off-label no comunica esa diferencia."),
      conclusion: text("Higher glutathione levels are a laboratory finding, not proof of longer life or improved long-term health. Oral results cannot establish the benefits or safety of injections.", "Los niveles más altos de glutatión son un hallazgo de laboratorio, no una prueba de vida más larga ni de mejor salud a largo plazo. Los resultados orales no establecen beneficios ni seguridad de las inyecciones."),
      studies: [
        { title: "Richie et al. · 2015", design: text("Randomized, placebo-controlled trial · 54 adults · 6 months · oral glutathione", "Ensayo aleatorizado con placebo · 54 adultos · 6 meses · glutatión oral"),
          finding: text("Oral supplementation increased glutathione levels in several measured blood and cell compartments; levels returned toward baseline after stopping.", "La suplementación oral aumentó los niveles de glutatión en varios compartimentos sanguíneos y celulares medidos; los niveles volvieron hacia los valores iniciales al suspenderla."),
          limitation: text("The study measured biomarkers, not lifespan, and did not evaluate IV or injectable glutathione.", "El estudio midió biomarcadores, no longevidad, y no evaluó glutatión intravenoso ni inyectable."),
          url: "https://pubmed.ncbi.nlm.nih.gov/24791752/" },
      ],
      safety: text("FDA has warned about excessive bacterial endotoxins in glutathione ingredients used for sterile injections. Contamination can cause serious reactions. Product quality and route of administration matter; oral findings do not establish injection safety.", "La FDA ha advertido sobre niveles excesivos de endotoxinas bacterianas en ingredientes de glutatión usados en inyecciones estériles. La contaminación puede causar reacciones graves. La calidad y la vía de administración importan; los hallazgos orales no establecen la seguridad de las inyecciones."),
      safetySource: { title: "FDA: Glutathione injectable safety concerns", url: "https://www.fda.gov/drugs/human-drug-compounding/fda-highlights-concerns-using-dietary-ingredient-glutathione-compound-sterile-injectables" },
    },
    {
      id: "rapamycin", name: "Rapamycin", kind: "bottle", regulatoryType: "offLabel",
      category: text("mTOR and aging research", "Investigación sobre mTOR y envejecimiento"),
      intro: text("Also called sirolimus, this prescription medicine affects mTOR signaling.", "También llamado sirolimus, este medicamento recetado afecta la señalización mTOR."),
      regulatory: text("Rapamune (sirolimus) has FDA-approved uses, including prevention of kidney transplant rejection and treatment of lymphangioleiomyomatosis. Longevity use is off-label, not FDA-approved. Compounded versions are not FDA-approved products.", "Rapamune (sirolimus) tiene usos aprobados por la FDA, como prevenir el rechazo de trasplantes renales y tratar la linfangioleiomiomatosis. Su uso para longevidad es off-label, no aprobado por la FDA. Las versiones magistrales no son productos aprobados por la FDA."),
      conclusion: text("Human lifespan benefits remain unproven. This trial cannot exclude uncommon or long-term harms.", "Los beneficios para la longevidad humana siguen sin demostrarse. Este ensayo no descarta daños infrecuentes o a largo plazo."),
      studies: [
        { title: "PEARL · 2025", design: text("Randomized, placebo-controlled trial · 48 weeks · 114 completers analyzed", "Ensayo aleatorizado con placebo · 48 semanas · 114 participantes que completaron el estudio analizados"),
          finding: text("Visceral fat, the primary outcome, did not improve significantly. Some secondary outcomes improved in small subgroups; adverse-event counts were similar.", "La grasa visceral, el resultado principal, no mejoró significativamente. Algunos resultados secundarios mejoraron en subgrupos pequeños; los eventos adversos fueron similares."),
          limitation: text("Small subgroups, excluded dropouts, reduced formulation absorption and sponsor-affiliated authors limit interpretation. Lifespan was not measured.", "Subgrupos pequeños, abandonos excluidos, menor absorción y autores vinculados al patrocinador limitan la interpretación. No se midió longevidad."),
          url: "https://www.aging-us.com/article/206235/text" },
      ],
      safety: text("Sirolimus carries warnings for increased susceptibility to infection and certain cancers with immunosuppression. Mouth sores, elevated lipids, impaired wound healing and drug interactions are concerns. Monitoring and a clinician's risk assessment are essential.", "El sirolimus advierte sobre mayor susceptibilidad a infecciones y ciertos cánceres con la inmunosupresión. Las llagas bucales, lípidos elevados, cicatrización deficiente e interacciones son preocupaciones. Son esenciales el seguimiento y la evaluación clínica de riesgos."),
      safetySource: { title: "Rapamune prescribing information · Pfizer", url: "https://labeling.pfizer.com/showlabeling.aspx?id=139" },
    },
    {
      id: "nad-plus", name: "NAD+", kind: "vial", regulatoryType: "compounded",
      category: text("Cellular metabolism research", "Investigación sobre metabolismo celular"),
      intro: text("Nicotinamide adenine dinucleotide participates in cellular energy metabolism. Infusions differ from oral precursors NR and NMN.", "El dinucleótido de nicotinamida y adenina participa en el metabolismo energético celular. Las infusiones difieren de precursores orales NR y NMN."),
      regulatory: text("NAD+ infusions are not FDA-approved for longevity or anti-aging. Compounded NAD+ injections are not FDA-approved products, which is different from off-label use of an approved drug.", "Las infusiones de NAD+ no están aprobadas por la FDA para longevidad o antienvejecimiento. Las inyecciones magistrales de NAD+ no son productos aprobados por la FDA, a diferencia del uso off-label de un medicamento aprobado."),
      conclusion: text("Metabolite changes do not prove rejuvenation or longer life. Precursor studies cannot establish infusion benefits.", "Los cambios de metabolitos no prueban rejuvenecimiento ni vida más larga. Los estudios de precursores no establecen beneficios de las infusiones."),
      studies: [
        { title: "Grant et al. · 2019", design: text("Pilot study · 11 men · 8 received NAD+ and 3 saline · 6-hour infusion", "Estudio piloto · 11 hombres · 8 recibieron NAD+ y 3 solución salina · infusión de 6 horas"),
          finding: text("Blood and urine measurements documented how infused NAD+ was processed.", "Las mediciones sanguíneas y urinarias documentaron cómo se procesaba el NAD+ administrado."),
          limitation: text("Small, short metabolic study; no longevity or long-term safety outcomes. Some authors had wellness-industry affiliations.", "Estudio metabólico pequeño y breve; sin resultados de longevidad ni seguridad a largo plazo. Algunos autores tenían vínculos con la industria del bienestar."),
          url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6751327/" },
      ],
      safety: text("FDA has received reports of severe chills, shaking, vomiting and fatigue after NAD+ injections, sometimes requiring medical treatment. These reactions were consistent with excessive endotoxins; sterile product quality is a critical concern.", "La FDA ha recibido informes de escalofríos intensos, temblores, vómitos y fatiga después de inyecciones de NAD+, a veces con necesidad de atención médica. Las reacciones eran compatibles con exceso de endotoxinas; la calidad estéril es fundamental."),
      safetySource: { title: "FDA: Ingredients suitable for sterile compounding", url: "https://www.fda.gov/drugs/human-drug-compounding/fda-reminds-compounders-use-ingredients-suitable-sterile-compounding" },
    },
  ],
};
