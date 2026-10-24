# Finish M4 GitHub enforcement

Code is published on `codex/m4-security-gate`. The connected integration denies pull-request creation and branch-protection administration (403 Resource not accessible by integration). GitHub currently reports main unprotected and no rulesets. This file is an account-owner checklist, not a claim that enforcement is active.

## Review the implementation

Open [the comparison against main](https://github.com/faizsaleem8/Vylnt/compare/main...codex/m4-security-gate?expand=1) and create a pull request for the implementation. Review the diff and hosted checks. The deliberately insecure intermediate commit is followed by a fix; the branch tip must use `"mode":"secure"` in the controlled app before it is accepted.

The core feature is demonstrated by actual fresh-commit runs, not by imported report labels. A new pull request will run the workflow on its merge revision as well as ordinary pushed revisions. Do not merge a failing/unfinished integration just to remove a warning.

## Protect main

In [repository branch settings](https://github.com/faizsaleem8/Vylnt/settings/branches), create or update protection for `main`:

1. Require pull requests before merging.
2. Require approvals and code-owner review for protected gate/workflow files. Dismiss stale approvals after new commits. `.github/CODEOWNERS` names `@faizsaleem8`; maintainers must review ownership and ensure an eligible reviewer exists. A PR author cannot approve their own PR.
3. Require the exact check **VYNLT security gate**, selecting GitHub Actions as its source where the UI offers that option.
4. Require branches to be up to date before merging.
5. Enforce protection for administrators / disallow bypass of those settings, where supported. Keep force pushes and branch deletions disabled.
6. Review and save the rule. Do not silently replace existing restrictions or add bypass actors.

The optional local hook can then be installed with `npm.cmd run gate:install-hook` after building the reviewed tool. Hook installation is explicit; it is not automatically imposed on this working repository by the implementation. Other branches need their committed `.vynlt/gate.json` too. The shared source checkout used for the tool must remain at its installed path.

## Verify enforcement, not just scan results

After the integration is reviewed and available on the protected base, create a disposable demo PR changing only the controlled application's `security.json` to insecure. A developer can intentionally bypass the local hook for this named demonstration branch using `git push --no-verify`; the required GitHub check must still fail and GitHub must visibly refuse merging into main. Do not disable protection to demonstrate a successful merge.

Commit the secure fix on that PR, wait for its new required check and any required review/up-to-date checks. Confirm merge eligibility with the corrected code. Record PR URLs, revision SHAs, check runs and actual protection settings in M4_BUILD_PLAN.md. Prefer closing the demonstration PR without merging if it produces no necessary source change. User/maintainer approval is needed for review and any cloud administration this integration cannot perform.

The earlier pushed failing/fixed revisions prove hosted scan behavior only; they do not prove a blocked merge until this protected-PR demonstration is completed. M4 remains open until that evidence exists. Repository administrators ultimately control these policies.
