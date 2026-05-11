# Fuzz / property-based tests

These tests use [fast-check](https://github.com/dubzzz/fast-check) to generate
hundreds of randomized inputs per test. Unlike regular unit tests
(input → expected output), property-based tests assert _invariants_ that must
hold for **every** input fast-check generates:

- "for any non-empty input, the output is also non-empty"
- "for any string `s`, `sanitize(decode(s))` never contains `@import`"
- "for any non-loopback `http://` URL, `normalizeGuardRoomEndpoint` returns ''"

### Why this exists

Code coverage measures _"did this line run during the test?"_. It does **not**
measure _"did the test feed it the input that triggers the bug?"_. Several
bugs found in the audit (e.g. `splitTextSmart('   '.repeat(20), 10) → []`,
prototype-chain UID match, CSS-escape bypass) had 100% line coverage but no
test ever fed the offending input. fast-check generates those inputs for you.

### Running

```bash
bun run test:fuzz                    # all fuzz tests, default 100 runs each
FAST_CHECK_NUM_RUNS=2000 bun run test:fuzz  # heavier per-property runs
```

CI runs these on every PR (default 100 runs per property) and weekly with
10 000 runs per property — see `.github/workflows/fuzz-and-soak.yml`.

### When fast-check finds a counter-example

fast-check prints the **shrunk** input that fails (the smallest case that
still triggers the bug) plus a `seed` and `path`. To reproduce locally:

```ts
fc.assert(prop, { seed: 1234567890, path: '0:0:1' })
```

Add the failing case as a fixed unit test in the corresponding non-fuzz file
so it's permanent regression coverage, then fix the bug.

### Adding a new fuzz target

Good targets:

1. **Pure functions over user input** — sanitizers, parsers, validators,
   normalizers, splitters
2. **Type-guard / coercion functions** — anything that defends against
   "what if the network returned junk"
3. **Algorithm functions with invariants** — sorts, dedups, mergers,
   rate-limit windows

Bad targets:

- Functions that hit the network / DOM / GM storage (use regular unit tests
  with DI hooks)
- Functions whose "correctness" depends on external state
