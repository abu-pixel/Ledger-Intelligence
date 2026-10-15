# Ledgerly - Mobile Bookkeeping App

Ledgerly is a React Native & Expo mobile bookkeeping application for freelancers and small businesses to record transactions, manage invoices, monitor cash flow reports, and consult an AI accounting assistant.

## Run & Operate

- `pnpm --filter @workspace/mobile run dev` — run Expo development server
- `EXPO_PUBLIC_DOMAIN=localhost pnpm --filter @workspace/mobile run build` — build static Expo Go mobile bundles
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all workspace packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env (optional for AI assistant): `OPENAI_API_KEY` — OpenAI API key for accounting guidance endpoint

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: React Native 0.86, Expo Go 57, Expo Router, React Native Reanimated, Expo Image Picker, Async Storage
- Backend API: Express 5, TanStack React Query, Orval OpenAPI client generator
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: Expo Metro Static Export & esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/app/` — Expo Router screens (`(tabs)/index.tsx`, `activity.tsx`, `invoices.tsx`, `reports.tsx`, `insights.tsx`, `assistant.tsx`, `settings.tsx`)
- `artifacts/mobile/components/` — Reusable UI surfaces (`FinanceUI.tsx`), input modals (`Composers.tsx`), error boundary (`ErrorBoundary.tsx`)
- `artifacts/mobile/contexts/FinanceContext.tsx` — App state management, ledger calculations, and local persistence via AsyncStorage
- `artifacts/mobile/lib/localization.ts` — Country options, currency formatting, and date formatting
- `artifacts/api-server/` — Express API server hosting health and AI assistant proxy routes
- `lib/api-spec/` — OpenAPI spec and Orval client configuration

## Architecture decisions

- **Local-first Persistence**: Ledger transactions and invoice state are stored locally via `AsyncStorage`, enabling fully offline usage with zero latency.
- **Aggregated AI Context**: The AI Assistant receives only safe financial aggregates (country, currency, total cash, monthly income/expense totals) to preserve privacy and prevent sharing raw transaction or receipt data.
- **Flexible Country & Currency Setup**: Users can set their country, books currency, and VAT reference percentage independently without forced conversions.

## Product Capabilities

- **Income & Expense Entry**: Record both incoming cash sales/retainers and outgoing expenses with category tags and receipt photos.
- **Transaction Search & Filtering**: Filter by transaction type (money in vs money out), search by keywords, and delete entries.
- **Invoice Tracking**: Create customer invoices, track due dates, mark as paid, share invoice summaries, or delete invoices.
- **Cash Flow Reporting**: Visual bar charts comparing 6-month cash inflows and outflows alongside category spending breakdowns.
- **CSV Data Export**: Export entire ledger history to CSV format directly from Settings or Reports screens.
- **Theme Customization**: 5 themes (Forest, Ocean, Plum, Sunset, Midnight) supporting light/dark adaptive modes.
