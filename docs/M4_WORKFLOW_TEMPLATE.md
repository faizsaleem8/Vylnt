# Reusing the VYNLT gate in another npm repository

Use the following workflow after committing your `.vynlt/gate.json`. Replace `REVIEWED_VYNLT_COMMIT_SHA` with the full 40-character commit SHA of the reviewed, tested M4 tool release. Do not use a moving branch for the tooling checkout. This is a template, not an executable workflow until that pin is replaced.

```yaml
name: VYNLT website security
on: [push, pull_request]
permissions:
  contents: read
jobs:
  security-gate:
    name: VYNLT security gate
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
          ref: REVIEWED_VYNLT_COMMIT_SHA
          path: vynlt-tool
          persist-credentials: false
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci --include=optional
        working-directory: vynlt-tool
      - run: npm run build
        working-directory: vynlt-tool
      - run: npx playwright install-deps chromium
        working-directory: vynlt-tool
      - run: npm run setup:browser
        working-directory: vynlt-tool
      - run: node vynlt-tool/dist/cli/gate.js --repo website --commit "$GITHUB_SHA" --output reports/gate
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: vynlt-gate-${{ github.sha }}
          path: website/reports/gate/
          retention-days: 7
```

Configure the website repository's own required checks and CODEOWNERS. Protect all files capable of weakening its gate, including configuration and workflow/tool pins. The separate checkout prevents a website contribution from changing the VYNLT scanner itself, but application/runtime scanning cannot prove that a website is secure or prevent a repository administrator from changing policy. No arbitrary external URL or old extension report is accepted as the build being evaluated.
