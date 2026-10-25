# VYLNT project instructions

- Read `PLAN.md` before changing the project.
- Update `PLAN.md` with every project change: completed work, remaining work, validation results, and limitations. Do not mark untested behavior as verified.
- Use VYLNT consistently as the product name.
- Keep detection rules pure and shared between browser and future CLI consumers.
- Collect minimal metadata. Never persist cookie values, credentials, request bodies, or page text. Strip query strings, fragments, and URL credentials from stored evidence.
- Distinguish configuration warnings from proven vulnerabilities. Do not claim ML accuracy or blockchain verification without measured implementation evidence.
- Default to localhost access and explicitly requested permissions for additional sites.
