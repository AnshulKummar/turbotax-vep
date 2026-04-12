# Deployment Guide — TurboTax VEP Sprint 3 Demo

Short, copy-pasteable reference for deploying the Sprint 3 public demo to
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

### Sprint 3 customer-to-expert flow (primary path)

- [ ] `GET /` — landing page renders, dual CTAs visible ("Try the
      customer flow" + "Skip to expert view"), disclaimer banner present
- [ ] Click "Try the customer flow" → `/start` loads
- [ ] Fill in a synthetic name, select a filing status, pick 4 documents,
      click "Continue to goals"
- [ ] Select 3 goals with rank/weight, click "Connect me with my expert"
- [ ] Handoff screen shows "Connecting you to Alex, your tax expert..."
      and auto-redirects to `/workbench?intake=<id>&section=brief`
- [ ] Expert view: left nav visible (6 sections), Brief section shows
      customer name, filing status, AGI band, goals, and selected documents
- [ ] Click "Recommendations" in left nav — section switches, recs visible
- [ ] Click "Accept recommendations" — synthetic success toast appears
- [ ] Navigate through all 6 sections via left nav (Brief, Goals,
      Documents, Pre-work, Recommendations, Audit)
- [ ] Verify disclaimer banner is present on `/start`, `/handoff`, and
      `/workbench`

### Quick expert view (skip customer flow)

- [ ] `GET /workbench` (no intake param) — loads with default Mitchell
      goals, Brief section, left nav functional
- [ ] Recommendations section shows goal-fit scores

### Legacy intake (Sprint 2 backward compat)

- [ ] `GET /intake` — form renders with all 10 goals selectable
- [ ] Submit a valid 3-goal payload → redirects to
      `/workbench?intake=<id>` — recommendations render correctly

### Rate limiting

- [ ] Hit `POST /api/intake` 21 times from the same IP via `curl`:

      ```bash
      URL=https://<your-vercel-url>/api/intake
      for i in $(seq 1 21); do
        curl -s -o /dev/null -w "%{http_code}\n" -X POST "$URL" \
          -H "content-type: application/json" \
          -d '{"goals":[{"id":"maximize_refund","rank":1,"weight":5},{"id":"minimize_audit_risk","rank":2,"weight":3},{"id":"optimize_next_year","rank":3,"weight":2}]}'
      done
      ```

      Expect 20 x `201` followed by `429` on the 21st response, with a
      `Retry-After` header.

### Disclaimer + footer

- [ ] Disclaimer banner ("Synthetic data only...") present on `/`,
      `/start`, `/handoff`, `/intake`, and `/workbench`
- [ ] Footer credit ("Built by Anshul Kummar") and GitHub link visible
      on `/`, `/start`, `/handoff`, `/intake`, and `/workbench`

## Rollback

If the smoke test fails, roll back in the Vercel dashboard
(Deployments → previous → "Promote to Production"). Neon does not need
rollback unless a migration is involved.

## End-to-end tests (non-prod)

The Vitest integration tests exercise the demo flows in-process against
the pglite test DB. Run them locally before shipping:

```bash
# Sprint 2 flow (legacy intake → workbench)
npm test -- tests/integration/sprint2-e2e.test.ts

# Sprint 3 flow (customer metadata + goals → workbench)
npm test -- tests/integration/sprint3-e2e.test.ts

# All tests
npm test
```

Once a live URL exists, a follow-up HTTP smoke-test script can be added
under `scripts/` that hits the real URL with the same assertions.
