# Reusing the VYLNT gate in another npm repository

Use the following workflow after committing your `.vynlt/gate.json`. The VYLNT tooling is pinned to implementation commit `c1d3ba308a6a85d964b27e270d8382d0b1ffc527`, whose dedicated security workflow passed on GitHub. Review that revision before adopting it; update to a newer reviewed full commit SHA when needed, never a moving branch.

```yaml
name: VYLNT website security
on: [push, pull_request]
permissions:
  contents: read
jobs:
  security-gate:
    name: VYLNT security gate
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
        with:
          path: website
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/checkout@v4
        with:
          repository: faizsaleem8/Vylnt
          ref: c1d3ba308a6a85d964b27e270d8382d0b1ffc527
          path: vylnt-tool
          persist-credentials: false
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci --include=optional
        working-directory: vylnt-tool
      - run: npm run build
        working-directory: vylnt-tool
      - run: npx playwright install-deps chromium
        working-directory: vylnt-tool
      - run: npm run setup:browser
        working-directory: vylnt-tool
      - run: node vylnt-tool/dist/cli/gate.js --repo website --commit "$GITHUB_SHA" --output reports/gate
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: vylnt-gate-${{ github.sha }}
          path: website/reports/gate/
          retention-days: 7
```

Configure the website repository's own required checks and CODEOWNERS. Protect all files capable of weakening its gate, including configuration and workflow/tool pins. The separate checkout prevents a website contribution from changing the VYLNT scanner itself, but application/runtime scanning cannot prove that a website is secure or prevent a repository administrator from changing policy. No arbitrary external URL or old extension report is accepted as the build being evaluated.
