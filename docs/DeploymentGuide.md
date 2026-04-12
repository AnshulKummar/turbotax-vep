# Deployment Guide — TurboTax VEP Sprint 2 Demo

Short, copy-pasteable reference for deploying the Sprint 2 public demo to
Vercel + Neon and verifying it after every production push.

## Prerequisites

- Vercel account with the `turbotax-vep` project created and linked to the
  GitHub repo `AnshulKummar/turbotax-vep`
- Neon Postgres project with a production database and a `DATABASE_URL`
  connection string (Vercel env var)
- Optional: `ANTHROPIC_API_KEY` env var — only read when
  `RECORD_CASSETTES=1` is set, which is NOT the case in production. The
  public demo runs entirely off the committed cassette.

## Deploy

```bash
# From the repo root, on the branch you want to ship
git push origin main        # auto-deploys the preview
vercel --prod               # promotes the current preview to prod
```

Run `npm run db:migrate` against the production `DATABASE_URL` before the
first prod deploy (or after any migration lands on `main`).

## Post-deploy smoke test

Run this checklist after every production deploy. It takes about 90
seconds end-to-end.

- [ ] `GET /` — landing page renders, both CTAs visible ("Try the demo"
      and "Read the PRD"), disclaimer banner present
- [ ] Click "Try the demo" → `/intake` — form renders with all 10 goals
      selectable (`GOAL_IDS` from `src/lib/goals/taxonomy.ts`)
- [ ] On `/intake` submit a valid 3-goal payload
      (e.g. `maximize_refund` / `minimize_audit_risk` /
      `optimize_next_year` at ranks 1/2/3 and weights 5/3/2) →
      redirects to `/workbench?intake=<id>`
- [ ] `/workbench?intake=<id>` — Mitchell return customer name appears
      in the header, goal dashboard shows the three submitted goals,
      recommendation list is non-empty, "What you're looking at"
      `<details>` element is visible at the top, disclaimer banner is
      visible, footer credit + GitHub link are visible
- [ ] Try a second intake with a different goal mix
      (e.g. `minimize_audit_risk` / `plan_life_event` / `simplify_filing`
      at ranks 1/2/3 and weights 5/3/2) — confirm the top-5 recommendation
      ordering on `/workbench` differs from the first run
- [ ] Hit `POST /api/intake` 21 times from the same IP via `curl`:

      ```bash
      URL=https://<your-vercel-url>/api/intake
      for i in $(seq 1 21); do
        curl -s -o /dev/null -w "%{http_code}\n" -X POST "$URL" \
          -H "content-type: application/json" \
          -d '{"goals":[{"id":"maximize_refund","rank":1,"weight":5},{"id":"minimize_audit_risk","rank":2,"weight":3},{"id":"optimize_next_year","rank":3,"weight":2}]}'
      done
      ```

      Expect 20 × `201` followed by `429` on the 21st response, with a
      `Retry-After` header.
- [ ] Disclaimer banner ("Synthetic data only — please don't enter real
      personal information. This is a portfolio prototype.") is present
      on `/`, `/intake`, and `/workbench`
- [ ] Footer credit ("Built by Anshul Kummar") and GitHub link are
      visible on `/`, `/intake`, and `/workbench`

## Rollback

If the smoke test fails, roll back in the Vercel dashboard
(Deployments → previous → "Promote to Production"). Neon does not need
rollback unless a migration is involved.

## End-to-end test (non-prod)

The Vitest integration test `tests/integration/sprint2-e2e.test.ts`
exercises the same flow in-process against the pglite test DB. Run it
locally before shipping:

```bash
npm test -- tests/integration/sprint2-e2e.test.ts
```

Once a live URL exists, a follow-up HTTP smoke-test script can be added
under `scripts/` that hits the real URL with the same assertions.
