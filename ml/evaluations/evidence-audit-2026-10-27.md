# VYLNT remaining-category evidence audit

Development-only diagnostics. No training, test prediction or release promotion.

Schema: `vynlt-evidence-v3`. Dataset: `ce1c886f13d151e027bb9e2971cabb5dba4486e80f802dce7922cdd7628689a0`.

| Category | Distinct inputs | Opposed labels | Review-required inputs | Missing development classes |
|---|---:|---:|---:|---|
| HDR-001 | 10 | 1 | 1 | train: contextual; validation: contextual |
| HDR-002 | 8 | 1 | 1 | train: contextual; validation: contextual |
| HDR-003 | 9 | 1 | 1 | train: contextual; validation: contextual |
| CK-001 | 9 | 1 | 1 | train: contextual; validation: contextual |
| CK-002 | 18 | 17 | 17 | train: change-warranted; validation: change-warranted; validation: contextual |
| CK-003 | 9 | 1 | 1 | train: contextual; validation: contextual |
| NET-001 | 10 | 1 | 1 | train: contextual; validation: contextual |
| JS-002 | 132 | 1 | 4 | None (not qualification) |

## Evidence needed

- **HDR-001:** HTTPS/subdomain compatibility and HSTS preload are not established by the response header.
- **HDR-002:** Whether cross-origin embedding is intentional is not observable from framing headers.
- **HDR-003:** Meta policies, effective script restrictions and application compatibility need observable evidence; no exploitability inference.
- **CK-001:** Cookie purpose is unknown; names and lifetime are not authentication evidence.
- **CK-002:** Cookie purpose and legitimate JavaScript access requirements are unknown.
- **CK-003:** Legitimate cross-site flows and CSRF protections are unknown.
- **NET-001:** Request failure alone does not identify blocking, upgrade behaviour or absence of a recommended change.
- **JS-002:** Existing controlled qualification is separate from development-data readiness; preserve its frozen release.

Class presence is necessary, not sufficient for qualification.
Counts deduplicate numeric inputs; repeated families/resources do not inflate them.
Conflict diagnostics use training/validation only; test labels never select features or thresholds.
Absence of a recorded conflict does not prove application intent is observable.
