# GoldenMinutes Design System

This document and `src/styles/design-system.css` are the shared visual reference for all routes. Reuse the tokens and primitives instead of inventing a new palette per feature.

## Brand and semantic color
- **Primary blue** (`--color-primary`, #1849A9): navigation, informative actions, links and focus.
- **Emergency red** (`--color-danger`, #B42318): urgent actions such as calling 115; do not use for ordinary CTAs.
- **Success green** (`--color-success`, #067647): verified, completed and safe-state indicators.
- **Amber**: warnings, pending review and prospective/unverified partners.
- **Neutral surfaces**: white cards on a light gray page; keep body text high-contrast.

## Typography and layout
- Be Vietnam Pro for Vietnamese body/headings; use tabular numerals for timers, BPM and metrics.
- Mobile-first; tap targets at least 44px, form inputs at least 16px, visible keyboard focus and reduced-motion support.
- Shared page max width: `--gm-content-width`; use generous section spacing and a consistent card radius.

## Reusable classes
- `.gm-page`: centered responsive page container.
- `.gm-section`: consistent section layout.
- `.gm-eyebrow`: small uppercase section label.
- `.gm-card` / `.gm-card--interactive`: surface, border, radius and restrained shadow.
- `.gm-button`, `.gm-button--primary`, `.gm-button--secondary`, `.gm-button--emergency`: button variants.
- `.gm-status--proposal`, `.gm-status--verified`, `.gm-status--info`: status chips. Use `proposal` until a partner is formally verified.

## Emergency UX rules
1. Keep call 115 available and visually distinct from non-emergency actions.
2. Do not suggest GoldenMinutes replaces emergency dispatch or professional care.
3. Require explicit consent before sharing location or a support request.
4. Never label a hospital, driver, volunteer, ETA, dispatch vehicle or partner as verified/active without authoritative current data.
5. Use clear pending/accepted/declined/completed states; do not imply a video room exists until the server returns credentials.

## Partner page content rules
- 1Life, Grab and MoMo are prospective collaboration targets in the demo, not confirmed partners.
- Do not use partner logos or claim live APIs, wallet flows, driver dispatch, hospital integrations or official 115 integration without written approval and an implemented integration.
- Initial revenue should focus on B2B training, institutional drills, CSR sponsorship with transparent impact reporting and vetted training equipment. Emergency calling and essential emergency guidance must not be paywalled.
