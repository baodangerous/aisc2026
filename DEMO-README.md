# GoldenMinutes standalone demo

This branch adds a standalone local-only demo workspace at `/demo/index.html`.

## Run as a separate copy on macOS

Open Terminal:

```bash
cd ~/Downloads
git clone --branch demo/standalone-workspace --single-branch https://github.com/baodangerous/aisc2026.git GoldenMinutes-Demo
cd GoldenMinutes-Demo
npm install
npm run dev -- --port 3001
```

Open http://localhost:3001/demo/index.html

## Included

- Preloaded local records for AED/resources, products, community posts, organizations, demo users, orders and facilities.
- Fake role selection: Admin, Manager, Staff, Viewer.
- Search, status filter, sorting, add/edit/delete, image file selection with preview, and reset-to-seed.
- Data is stored in this browser's localStorage. Demo orders do not trigger payment; records are not written to Supabase.
- Product images reuse the repository's local product assets.

## Important

All people, locations, orders and records on this page are fictitious demonstration data. Do not use them for emergency navigation or treat them as verified AED/facility locations. The role selector is a UI demo, not a production authentication/security system.

The existing `main` branch is unchanged by this demo commit.
