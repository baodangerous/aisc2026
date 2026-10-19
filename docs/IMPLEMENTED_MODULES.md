# GoldenMinutes — module rollout notes

## Implemented in the application

- Nationwide facility discovery and public coverage/AED summaries use the configured live data source; fixture facilities remain isolated to explicit demo mode.
- Organization dashboards show the available data scope and privacy suppression rules. Organization training events support creation, member registration, capacity checks, calendar export, and meeting details.
- Storefronts support organization brands, public product catalogs, inventory-aware cart checkout, buyer order history, and seller fulfillment steps after a paid order. Price and inventory are checked in a database transaction; clients cannot mark an order paid.
- Emergency support requests require confirmation that 115 was called. GPS sharing is optional and separately consented. Authorized responders can accept the request and open an expiring private video room when Daily is configured. Calls are limited to two participants and recording is disabled by default.

## Required deployment steps

1. Apply migrations in filename order, including `202610200001_organization_training_events.sql` and `202610200002_storefront_and_remote_support.sql`.
2. Add `DAILY_API_KEY` as a server-only Vercel environment variable. Assign `volunteer` or `clinical_reviewer` in trusted Supabase `app_metadata` only after operational identity and scope checks. Without the API key and an authorized responder account, remote requests queue but cannot become video calls.
3. Choose and contract a payment gateway for the merchant(s), then implement its signed checkout and verified server callback. Orders currently remain `pending_payment`; this build does not collect money or claim payment success. Store payouts, tax invoices, shipping labels, returns, and refunds are not automated.
4. Configure an email/SMS/push delivery provider and opt-in policies before sending training reminders. Training events are persisted and can be exported to a calendar; no outbound notifications are sent yet.
5. Configure a scheduled cleanup for unpaid orders if unattended inventory reservations need to be released exactly at expiry. A later checkout also releases expired reservations.

## Security and operations

- Never put `DAILY_API_KEY`, Supabase service-role credentials, or payment secrets in `VITE_*` variables.
- The app does not record remote calls. Do not enable provider recording without an approved consent and retention policy.
- Public facility data is reference information; verify availability by calling 115 during an emergency.
