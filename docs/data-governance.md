# Data governance

## Provenance

Every training record must retain a stable `id`, `version`, `scenario_group_id`, `source_ids`, review status, and creation timestamp. `data/v1/manifest.json` is the release index and stores the SHA-256 checksum for the v1 aggregate.

The legacy demo set is archived for audit comparison. It must not be used for model or safety evaluation.

## Lifecycle

1. Draft data is generated or collected with provenance.
2. A reviewer checks safety content and metadata.
3. Approved records are included in a versioned release and checksum manifest.
4. Superseded releases are archived, never silently overwritten.
5. Deletion requests must remove personal data through the privacy workflow; synthetic records remain auditable.

## Privacy and k-anonymity

Pilot exports must remove direct identifiers, use coarse geohashes, and suppress groups smaller than the configured k threshold before publication. Synthetic incident data is labeled as simulated and must never be presented as a verified AED or real emergency location.

## Access control

All new public-schema tables must enable RLS and have policies matching their ownership or organization scope. Admin mutations require an auditable actor, reason, and target record. Service-role credentials are server-only and must never be bundled into the client.

## Release evidence

Use `pnpm lint && pnpm test && pnpm build`, then attach dataset audit, evaluation, RLS, and offline-sync test output to the release record. Human approvals and pilot consent cannot be inferred from automated tests.
