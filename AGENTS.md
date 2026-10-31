# AGENTS.md

Ledgerly is a pnpm monorepo: an Expo mobile bookkeeping app, an Express API, and shared OpenAPI-generated clients.

## Workspace map

- `artifacts/mobile` — Expo Router app. Nearly all ledger state lives in `contexts/FinanceContext.tsx` (AsyncStorage local-first, optional cloud sync).
- `artifacts/api-server` — Express 5 API mounted at `/api`. Routes: health, AI assistant, finance workspace sync, currency rates.
- `artifacts/mockup-sandbox` — standalone Vite/React UI preview, not part of the shipped app.
- `lib/api-spec` — OpenAPI source and Orval config.
- `lib/api-client-react`, `lib/api-zod` — committed generated clients/schemas. Do not hand-edit `src/generated/**`.
- `lib/db` — Drizzle/Postgres schema; exports a single JSONB `finance_workspaces` table.

Trust package manifests over prose: mobile currently uses Expo 58, RN 0.88, TypeScript 6.0.3.

## Commands

- Install only with pnpm: `pnpm install` (root `preinstall` rejects npm/yarn). On Windows use `pnpm install --ignore-scripts` because `preinstall` requires `sh`.
- Full verification: `pnpm run typecheck` then `pnpm run build` from root. `typecheck` builds `lib/*` references first, then artifacts/scripts.
- There is no lint or test script in this repo. Do not invent one; typecheck/build are the verification path.
- API dev: set `PORT` and `DATABASE_URL`, then `pnpm --filter @workspace/api-server run dev`. It rebuilds and starts `dist` (no hot reload), so restart after changes.
- Mobile dev: `pnpm --filter @workspace/mobile run dev` is Replit-specific (requires `REPLIT_EXPO_DEV_DOMAIN`, `REPLIT_DEV_DOMAIN`, `PORT`, and Clerk env). For plain local Expo, run `pnpm --filter @workspace/mobile exec expo start`.
- Repo scripts assume a Unix-like shell (`sh -c`, `export`). In PowerShell, set env vars with `$env:NAME=...`; the inline `NAME=value command` form in docs only works in bash/Git Bash.
- Mobile static build: `EXPO_PUBLIC_DOMAIN=localhost pnpm --filter @workspace/mobile run build`. It starts Metro on 8081, writes `artifacts/mobile/static-build/`, and produces Expo Go manifests, not a native app-store binary. Serve it with `pnpm --filter @workspace/mobile run serve` (default port 3000).
- DB schema push: `pnpm --filter @workspace/db run push` (needs `DATABASE_URL`). `push-force` is destructive.
- API codegen: edit `lib/api-spec/openapi.yaml`, then `pnpm --filter @workspace/api-spec run codegen`. This regenerates both client and Zod packages and runs root lib typecheck. Keep the spec title `Api`; changing it breaks generated import paths.
- Windows builds: `pnpm-workspace.yaml` removes non-Linux optional binaries. Typecheck works, but esbuild-based codegen/API builds may need `ESBUILD_BINARY_PATH` set to a matching `@esbuild/win32-x64` binary; Vite builds also need `@rollup/rollup-win32-x64-msvc`.

## API and runtime gotchas

- Express routes are defined without `/api` (e.g. `/healthz`); the router is mounted at `/api`, so the public path is `/api/healthz`.
- Importing `@workspace/db` throws without `DATABASE_URL`. The API server imports it through the finance route, so it will not boot without a database even for health/AI-only work.
- The API production artifact expects port `8080`; `replit.md` says 5000. The server actually requires `PORT` to be set explicitly.
- Mobile API calls use `EXPO_PUBLIC_DOMAIN` as `https://<domain>` (see `app/_layout.tsx`); the generated client already prefixes paths with `/api`.
- Clerk is mandatory in mobile: missing `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` shows a fallback screen. Production API needs `CLERK_SECRET_KEY`; `/api/__clerk` is a production-only Clerk proxy.
- AI is free and keyless: the API proxies only consent-approved aggregates to Pollinations (`POLLINATIONS_BASE_URL`, optional `POLLINATIONS_MODEL`, default `openai-fast`). Never add provider keys or `EXPO_PUBLIC_*` secrets. Anonymous Pollinations text allows one request per 30s per IP and returns 402 with `Retry-After`; the route maps that to 429.

## Product/data invariants

- Ledger state is local-first. Cloud sync strips receipt URIs (`cloudSafeState`) and reattaches local receipts; conflicts use the workspace `revision` and return 409.
- AI requests require explicit consent and may contain only the question, country/currency, and aggregate totals. Never send receipts, transaction descriptions, client names, or identifiers; do not persist chat history by default.
- Ethiopia is the first market, but country/currency choice is broad. Do not present unverified tax rules as compliance. Changing currency is a label change unless an explicit conversion flow is added; never silently convert existing amounts.
- Preserve these boundaries when touching localization, invoices/tax, sync, or AI features. Rationale lives in `.agents/memory/localization-and-ai-boundaries.md`.

## Conventions

- TypeScript is strict (`tsconfig.base.json`, mobile `tsconfig.json`); no unused-local or lint enforcement, so keep changes disciplined.
- Prettier is installed but has no config or script; match surrounding style rather than reformatting.
- Generated API code is committed. If you change the OpenAPI contract, update the spec and run codegen; do not patch generated files directly.
