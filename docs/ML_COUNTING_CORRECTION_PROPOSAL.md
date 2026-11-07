# Proposed ML-Q counting correction

Status: approved by the user on 6 November 2026. Development preparation and
candidate weighting/calibration are implemented. Fresh-holdout evaluation and
qualified runtime integration under the new protocol remain open.
Existing datasets retain their original interpretation and artifacts.

## Problem

The approved plan excludes numeric inputs already observed in development.
The native candidate additionally credits at most one example for a family,
category and cause, even when relevant target attributes differ.

These two restrictions make collection ineffective for compact categorical
inputs. An independently collected observation can have the same numeric
representation as an earlier application. The existing registered cause
catalogue has an optimistic 144-credit ceiling across its eight/four split.
The seven categories require at least 630 development credits.

## Proposed observation unit

Count an independently executed native application scenario with a distinct
relevant target-evidence variant within its family.

- Deduplicate repeated runs, renamed resources, cookie names, URLs and unrelated
  page changes within the family.
- Define and register a category-specific material feature projection before
  collecting. Attribute changes must be meaningful to that category's supported
  assessment or compatibility checks.
- Keep related applications, forks, templates and reused security implementations
  in one family and one partition.
- Permit equal feature vectors from independent families. Record their overlap
  and independently verified provenance.
- Preserve all conflicting or unknown outcomes. Equal inputs with incompatible
  supported labels require review or abstention.
- Weight and report family clusters explicitly. Repeated observations cannot
  increase a family's weight or manufacture additional families.

## Evaluation protocol

Freeze a new experiment before collection or fitting under this protocol.
Retain existing registrations, datasets, models and evaluation reports.

Use eight training and four validation families. Select parameters, calibration
and thresholds using training and validation only. Each class/category still
requires 30 training and 15 validation observations across at least three
families per partition.

Select and freeze the holdout after candidate freezing, using at least ten
eligible new families and 30 examples per class/category, each class represented
across at least three families. Existing source identities, previous holdout
applications and reused implementations remain excluded. Audit equal numeric
inputs across partitions as feature overlap. Exclude reused source observations,
scenario captures and provenance.

Write the exclusive evaluation marker before prediction. Run one evaluation per
registered frozen candidate. Publish ordinary and family-clustered uncertainty
intervals, numeric overlap, confusion counts, family counts and tested scope.

## Required quality gates

- Precision at least 90 percent.
- Recall at least 95 percent.
- Non-abstention coverage at least 50 percent.
- Zero high/critical actionable examples classified contextual.
- Zero insufficient-evidence contextual de-emphasis.
- Precision above the rule-only comparator and recall within five percentage
  points of the comparator.
- The existing independent test, archived-report and runtime/export acceptance.

Passing remains an outcome to measure. Categories that fail their evaluation
continue in experimental review mode.

## Approval record

The user approved changing the numeric-input exclusion requirement in ML-Q
Stage E and the native candidate's cause-only representative filter. The
existing strict corpus has 18 eligible observations. New counts must be
published under a separately registered counting policy.

## Implemented development protocol and measured result

7 November continuation: the separately registered native preference cohort
credits **42** cases, including the first contextual Secure/HttpOnly examples.
The initial approved recount below remains preserved at 38 and the strict
protocol at 18. All seven remain unready for fitting; the minimum current
development deficit is 588. [Current data and source scope](ML_REGISTERED_DATASETS.md).

`ml/project_material_policy.json` freezes a category-specific target projection.
`packages/ml/project-material-context.ts` and `ml/project_material.py` implement
the same canonical hash contract. Identifiers and background rows cannot create
credits. Conflicting supported labels abstain. Unknown observations remain in
the audit without fitting weight. Model and logistic losses, scaling/checkpoint
selection and calibration use equal-family weights within each category/class.

The separate adoption command verifies installation receipts, original source
roles, signed evidence and scan linkage before deriving new contexts. Source
captures keep their original registration; the counting adoption is registered
before preparation. No historical capture is retrospectively labelled.

`.local/native-material-registration-02` and `.local/ml-q-material-datasets-002`
credit **38 existing cases**, while an archived preflight still credits 18.
Forty rows remain uncertain and 51 material repeats were removed. This changes
counting, not observations, model quality or category release status.

Seventy-two relevant TypeScript tests across seven files, 72 Python ML tests,
type checking and the production build passed. Executed cross-language hashing
agrees. Actual copied
artifacts with altered labels, claimed readiness, policy or registration fail
authentication. All count/family gates still apply and candidate creation is
refused. No seven-category model has been fitted or evaluated.

Future stages must add the material protocol to fresh-holdout registration,
evaluation, family-clustered uncertainty and qualified runtime abstention.
The existing strict evaluator rejects these new dataset fields. It cannot be
used to silently qualify this protocol. The current collectors still lack
important native contexts; the corrected counting rules alone do not produce
the remaining 592 development examples.
