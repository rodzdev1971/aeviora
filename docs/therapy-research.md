# Therapy research explorer

The signed-in dashboard's **Explore therapy topics** action opens a topic list.
Topic links lead to `/therapies/:topicId`; medication links lead to
`/therapies/:topicId/:medicationId`. These routes use the existing authentication
guard and dashboard layout. The public home-page questionnaire is unchanged.

The first collection is `longevity-assessment`: Metformin, Glutathione, Rapamycin,
and NAD+. Other existing topics show an explicit empty state. Unknown topics,
medications, or mismatched topic/medication URLs show a recovery link.

The explorer's topic list and topic pages include **Search medications and topics**.
Results update while typing, cover the entire library, and link directly to topic
overviews and medication guides. Matching ignores case, accents and punctuation,
supports partial names, and includes English/Spanish topic labels and medication
aliases maintained in `therapyResearch.js`. The `q` URL parameter preserves the
search when returning from a guide; typing replaces the current history entry.
**Clear** restores normal browsing and returns focus to the search box. No-match
results provide guidance without suggesting unavailable medication guides.

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

NAD+ uses an amber bottle and a smaller clear-glass injection vial with a metal
crimp cap and visible rubber stopper, each with a distinct accessible description.
The pair scales together on a shared baseline, with the vial in front on the
right and separate branding centered below. Its expanded English/Spanish guide describes energy metabolism,
DNA repair, NAD-dependent sirtuins, and tissue-specific age-related NAD changes.
Primary-source cards cover the Martens 2018 oral-NR trial, Yoshino 2021 oral-NMN
trial, Zhang 2016 mouse study, Zhu 2015 human brain study, and the existing
Grant 2019 infusion pilot. Preserve their route, population, outcome and evidence
limitations. The user's linked mechanistic review supports the introduction;
MIT, Vail Health and Cleveland Clinic are separately labeled background reading.
The supplied NPR link could not be retrieved and is not used as evidence.

Research and conclusions lead the detail page. FDA/off-label and safety content
remains visible in a smaller, readable section after the studies. Metformin
features the 2024 Cell primate study discussed by Parsemus in August 2025, plus
selected 2026 human trials. Distinguish publication dates from coverage dates,
and animal findings or biomarker changes from demonstrated human lifespan gains.

Verification: `node --test server/tests/therapyResearch.test.js` checks both
languages, all four detail routes, source links, separate logo placement, empty
topics, and invalid or mismatched routes using Vite SSR without a database.
