# VYNLT evidence-v2 evaluation record

Date: 2026-10-21. **No category is approved. The shipped release uses evidence-summary mode.**

## Controlled suite and failed training experiment

The expanded localhost suite passed 32 scenario/network assertions across eight generated template families. Preparation produced 29 distinct family/context/label rows after removing three repeated rows. The frozen split audit found nine input variants with conflicting or insufficient-evidence labels. There are zero independently reviewed application targets; annotation agreement is unavailable, not 100%.

| Category | Change-required labels | Contextual labels | Needs-review labels |
|---|---:|---:|---:|
| HDR-001 | 2 | 1 | 1 |
| HDR-002 | 1 | 1 | 1 |
| HDR-003 | 1 | 1 | 1 |
| CK-001 | 1 | 1 | 1 |
| CK-002 | 1 | 1 | 1 |
| CK-003 | 1 | 1 | 1 |
| NET-001 | 2 | 1 | 1 |
| JS-002 | 3 | 1 | 2 |

These are controlled specification labels, not measured real-world security outcomes. The independent network oracle verifies configuration facts and resource outcomes. It does not establish that a cookie is a real authentication mechanism, prove compensating defences or certify contextual safety.

Training refused both the initial and expanded cohorts because training/validation did not retain both classes after the conflict/uncertainty audit. This is the expected safe outcome; the labels were not changed to manufacture separability. Private audit/split/failure records are under `.local/ml-controlled/` and are not shipped. Reproduce the suite and preparation with the developer workflow and a stable private dataset key.

No security precision, recall, coverage or uncertainty interval is reported for a model trained on this cohort: no eligible candidate was fitted. No frozen security test set was consumed to tune thresholds. Candidate mechanics tests use a clearly identified numeric fixture; their PyTorch/TypeScript parity tolerance is 1e-6 and their fabricated labels/metrics establish no security quality.

## Release gates still open

At least ten held-out application families overall; each approved category needs 30 change-required and 30 contextual test contexts, each class across three families; precision >=90%, recall >=95%, non-abstention coverage >=50%; no high/critical actionable contextual misclassification; precision improvement over rule-only with recall within five percentage points; published intervals and independently reviewed application scope. The present cohort cannot satisfy these gates.

Next data work belongs to VYNLT developers: independently verify more application configurations, retain related templates in one family, review evidence/labels with independent reviewers, audit disagreements and freeze the expanded split before fitting. Users are never asked to prepare training data. Context that the scanner cannot observe continues to require abstention.
