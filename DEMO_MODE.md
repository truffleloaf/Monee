# Monee prototype mode

The sign-in and sign-up screens are demonstration flows only. They do not create accounts, verify identities, or protect data. Any valid email and non-empty sign-in password opens the demo. Sign-up checks name, email, password length, and confirmation, then discards every form value. No password or account identifier is stored or sent.

The simulator keeps one shared financial workspace in this browser using local storage. Demo sign-in does not create a separate profile, and signing out does not erase the workspace. Use sample values only; do not enter sensitive financial information.

## Run locally

1. Install dependencies with `pnpm install` (or `npm install`).
2. Start the app with `pnpm dev` (or `npm run dev`).
3. Open [http://localhost:3000](http://localhost:3000).

Open **Sign in** or **Start the demo** from the navigation. Try the form validation, submit to enter Financial Health, then use **Sign out** in the navigation. Exchange, Future Lab, and Financial Health are also directly accessible without a demo session.

## Before a real deployment

Replace demo mode with a backend-managed identity provider and server-verified sessions. Store each user's profile and financial assumptions in a database with per-user authorization policies. Never treat the browser demo-session marker as authentication, and do not collect real passwords until a real auth provider is configured.

## Money Hub wallet limits

The Money Hub wallet is a simulated ledger stored in this browser's local storage. It supports integer minor-unit amounts, starting balances, income, expenses, transfers, simulated conversions, and correction/deletion with balance recalculation. It does not connect to a bank, execute payments, or sync between browsers. Demo sign-in does not partition data between people, so do not enter sensitive personal financial information.

An optional scenario explanation can use Gemini when `GEMINI_API_KEY` is configured on the server. Without the key, Monee uses its deterministic explanation. The Gemini route sends only aggregate scenario totals and dates, not transaction descriptions or identity data. The free tier has model-specific quotas and can be unavailable; Monee does not switch to a paid model.

Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` only if you want the optional Gemini explanation. Use a Google AI Studio key on the free tier; Monee pins the request to one model, rate-limits the route, and falls back to deterministic calculations when the key is absent, quota is exhausted, or Gemini is unavailable. Free-tier requests may be used by Google to improve products, so only aggregate scenario values are sent.
