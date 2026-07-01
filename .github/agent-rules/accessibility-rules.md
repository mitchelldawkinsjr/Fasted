# Accessibility Rules

## CI integration

Accessibility checks run in `.github/workflows/ci.yml` on every PR and push to `main` (required gate, Issue #65).

Optional manual rerun: `.github/workflows/a11y-audit.yml` (`workflow_dispatch` only — same axe + Playwright suite without full CI).

Tools: `a11y-audit/` package with axe-core via Playwright.

Failed CI/a11y runs upload JSON/MD reports as GitHub Actions artifacts for 3 days (`if: failure()` only).

## Expectations

- Interactive elements need accessible names (`aria-label`, visible text, or `aria-labelledby`)
- Modals use `aria-modal="true"` and focus management
- Form inputs have associated labels
- Color contrast meets WCAG AA for text and controls
- Keyboard navigation works for primary flows

## Review checklist

- [ ] New buttons/links have discernible text or aria-label
- [ ] Modal focus trap and escape behavior
- [ ] No `onClick` on non-interactive elements without keyboard equivalent
- [ ] Images/icons decorative or have alt text

## Commands

```bash
npm run build && npm run preview -- --host 127.0.0.1 --port 4173
cd a11y-audit && npm run audit:after && npm run test:a11y
```

Reports: `a11y-audit/report-*.json`, `a11y-audit/summary-*.json`.
