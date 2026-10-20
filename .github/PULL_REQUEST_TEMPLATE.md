<!--
Thanks for contributing to GameHub! Keep the description short and focused on
what changed and why. See CONTRIBUTING.md for the full guidelines.
-->

## What does this PR do?

<!-- One or two sentences. Link the issue it closes, e.g. "Closes #42". -->

## Why?

<!-- The problem this solves. -->

## How?

<!-- The approach you took. Skip this section for trivial changes. -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that changes existing behaviour)
- [ ] Refactor (no functional change)
- [ ] Documentation
- [ ] Build / tooling

## Checklist

- [ ] `npm run lint` passes
- [ ] `npm test` passes (API + socket suites)
- [ ] The app still builds (`npm run build`)
- [ ] New API routes are covered by `scripts/smoke-test.mjs`
- [ ] New Socket.io events are covered by `scripts/socket-test.mjs` and documented in the README
- [ ] Database schema changes are accompanied by an updated `db/custom.db` and `scripts/seed.ts`
- [ ] Documentation updated where relevant
