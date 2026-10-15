# Ledgerly

Ledgerly is a mobile bookkeeping and cash-flow management application built with **React Native**, **Expo Go**, and **TypeScript**. It helps small business owners, freelancers, and entrepreneurs track daily income and expenses, manage customer invoices, view financial reports, and consult an AI accounting assistant.

---

## Key Features

- **Dashboard & Cash Management**: Track available cash balance, monthly income, and monthly expenses at a glance.
- **Income & Expense Tracking**: Record incoming revenues (sales, retainers, consulting) and outgoing expenses (supplies, payroll, software) with optional receipt photo attachments.
- **Transaction Search & Filtering**: Search transactions by keyword and filter by money-in vs money-out. Delete mistaken entries with confirmation.
- **Invoice Management**: Create invoices with custom due dates, track open/paid status, mark invoices as paid, share summaries, or delete invoices.
- **Financial Reports & Cash Flow**: Visualize monthly cash-flow trends with interactive bar charts and category spending breakdowns.
- **CSV Data Export**: Export complete transaction history to CSV format for accounting software or tax filing.
- **Multi-Country & Currency Customization**: Select active country, local books currency, VAT reference rates, and UI themes (Forest, Ocean, Plum, Sunset, Midnight).
- **AI Accounting Assistant**: Optional AI assistant endpoint integrating OpenAI for general bookkeeping guidance based on ledger aggregates.

---

## Architecture & Project Structure

The project is structured as a `pnpm` monorepo containing:

```
├── artifacts/
│   ├── mobile/             # React Native / Expo Go mobile app
│   │   ├── app/            # Expo Router screens ((tabs)/index, activity, invoices, reports, insights, assistant, settings)
│   │   ├── components/     # UI components (FinanceUI, Composers, ErrorBoundary)
│   │   ├── contexts/       # FinanceContext (State & Async Persistence)
│   │   └── lib/            # Localization & Currency utilities
│   ├── api-server/         # Node.js / Express backend server for AI assistant & status endpoints
│   └── mockup-sandbox/    # UI mockup web preview sandbox
├── lib/
│   ├── api-client-react/   # React Query API client hooks generated from OpenAPI spec
│   ├── api-spec/           # OpenAPI specification & Orval codegen
│   ├── api-zod/            # Zod validation schemas
│   └── db/                 # PostgreSQL / Drizzle ORM database schemas
└── replit.md               # Replit project guide & environment configuration
```

---

## Getting Started

### Prerequisites
- Node.js 24+
- pnpm 10+

### Installation

Install dependencies across all workspace packages:

```bash
pnpm install
```

### Development Commands

Run the Expo development server:
```bash
pnpm --filter @workspace/mobile run dev
```

Run the Express API server:
```bash
pnpm --filter @workspace/api-server run dev
```

### Type Checking & Building

Run type checks across all workspace projects:
```bash
pnpm run typecheck
```

Build the mobile app and server artifacts:
```bash
pnpm run build
```

To build static Expo Go bundles for deployment:
```bash
EXPO_PUBLIC_DOMAIN=localhost pnpm --filter @workspace/mobile run build
```

---

## Tech Stack

- **Framework**: React Native, Expo Go (~57.0), Expo Router
- **Language**: TypeScript 5.9
- **State Management**: React Context with `@react-native-async-storage/async-storage`
- **Networking**: TanStack Query (`@tanstack/react-query`)
- **Backend API**: Node.js, Express 5, Orval OpenAPI codegen
- **UI Components**: `@expo/vector-icons`, `expo-haptics`, `expo-image-picker`, `expo-blur`
