# Therapy research explorer

The signed-in dashboard's **Explore therapy topics** action opens a topic list.
Topic links lead to `/therapies/:topicId`; medication links lead to
`/therapies/:topicId/:medicationId`. These routes use the existing authentication
guard and dashboard layout. The public home-page questionnaire is unchanged.

The first collection is `longevity-assessment`: Metformin, Glutathione, Rapamycin,
and NAD+. Other existing topics show an explicit empty state. Unknown topics,
medications, or mismatched topic/medication URLs show a recovery link.

Edit `src/util/therapyResearch.js` to maintain the English/Spanish summaries,
study designs, limitations, safety notes, and primary-source URLs. Topic names
and contact information remain in `src/util/constants.jsx`. Each medication is
educational content, not a prescribing, pricing, or inventory record. No therapy
selections are saved to an account and no dosing instructions are provided.

The pages distinguish longevity use of approved metformin/sirolimus products
(off-label) from unapproved compounded glutathione/NAD+ products. Do not imply
that a biomarker change demonstrates longer life, that oral research establishes
injection benefits, or that precursor research establishes direct NAD+ benefits.
The source-review date is an editorial date, not a claim of clinician approval.
Have the practice's clinician review content before publishing clinical changes.

`MedicationIllustration.jsx` renders a responsive SVG bottle/vial and the existing
Aeviora logo as a separate adjacent image. No brand, dose, manufacturer claim,
or actual product availability is printed on the bottle. The bottle has only the
medication name; its accessible image description identifies it as illustrative.
There is no visible illustration stamp or caption beneath the image.

Research and conclusions lead the detail page. FDA/off-label and safety content
remains visible in a smaller, readable section after the studies. Metformin
features the 2024 Cell primate study discussed by Parsemus in August 2025, plus
selected 2026 human trials. Distinguish publication dates from coverage dates,
and animal findings or biomarker changes from demonstrated human lifespan gains.

Verification: `node --test server/tests/therapyResearch.test.js` checks both
languages, all four detail routes, source links, separate logo placement, empty
topics, and invalid or mismatched routes using Vite SSR without a database.
