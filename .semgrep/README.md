# Repo-local Semgrep rules

This directory holds project-specific Semgrep rules that the public rule
packs (`p/security-audit`, `p/javascript`, `p/typescript`,
`p/owasp-top-ten`) don't cover. Anything dropped in here is picked up
automatically by `.github/workflows/semgrep.yml` because `semgrep ci`
walks the working tree and applies any `*.yml` / `*.yaml` rule files it
finds outside of `node_modules` / `dist`.

Use this for:

- "Don't use the bare `fetch()` global" rules (we route everything
  through `gm-fetch.ts` for CORS reasons — see `src/lib/gm-fetch.ts`).
- "Don't import from `localStorage`" rules (we persist via `gm-signal`
  exclusively — see `src/lib/gm-signal.ts`).
- "GM_xmlhttpRequest must always pass `signal`" — userscript timeout
  hygiene; see the audit-fix history in `src/lib/gm-fetch.ts`.
- Any one-off pattern you spot in code review and want to gate
  permanently.

Each rule file follows the standard Semgrep rule schema. Quick template:

```yaml
rules:
  - id: no-bare-fetch
    languages: [typescript]
    severity: ERROR
    message: |
      Use gmFetch() from src/lib/gm-fetch.ts instead of bare fetch().
      Bare fetch() bypasses GM_xmlhttpRequest and breaks on cross-origin
      requests in Tampermonkey/Violentmonkey.
    pattern: fetch($URL, ...)
    paths:
      include:
        - src/lib/**
      exclude:
        - src/lib/gm-fetch.ts # the wrapper itself
```

Test a rule locally:

```bash
docker run --rm -v "$PWD:/src" semgrep/semgrep \
  semgrep --config=.semgrep src/
```

(or `bunx --bun semgrep` if you've installed Semgrep locally — usually
slower than the container.)
