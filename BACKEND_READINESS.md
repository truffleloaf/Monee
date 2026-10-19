# Backend readiness

This checkout currently has no Supabase client dependency, Supabase helpers, middleware, schema, or migrations. The sign-in flow is explicitly a local demo flow (`DEMO_MODE.md`); it is not a verified identity and cannot provide a trustworthy `auth.uid()`.

For that reason, the wallet in this prototype is local-only. No server route accepts financial writes, no data is isolated by authenticated user, and no RLS guarantee exists. Do not deploy it as a real financial application or enter sensitive financial data.

Before connecting a database, configure a real Supabase project and server-verified sessions. Then add migrations for user-owned wallet accounts, integer-minor-unit ledger entries, budgets, scheduled payments, saved scenarios, and preferences. Enforce RLS on every user-owned table with `auth.uid() = user_id`; route multi-currency ledger writes through a database transaction/RPC that validates both accounts and prevents an overdraft atomically. Keep a single transfer/conversion row with both legs so balance views cannot count the same operation twice. Derive balances from the ledger, and test the policies using two separate authenticated users before enabling persistence.

The optional Gemini feature requires `GEMINI_API_KEY` in the server environment only. It is not required to run the application. No Supabase variables or migrations are required for the local prototype.
