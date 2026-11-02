# GoPay Gateway Next.js Architecture & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `dashboard-gopay-api-gateway` into a modular, production-grade Next.js 16 App Router application with canonical type definitions, clean client service abstractions, accessible UI components, and a real-time GoPay monitoring & QRIS simulation dashboard.

**Architecture:** Implement Screaming / Feature-Driven architecture separating domain features (`features/`), typed client services (`services/`), canonical DTO contracts (`types/`), and reusable UI primitives (`components/`). Adhere to Next.js 16 App Router standards with strict server/client boundary separation and zero native browser dialogs.

**Tech Stack:** Next.js 16.4.3 (Turbopack, App Router), React 19.3.0, Tailwind CSS v4, TypeScript 5.9, Axios.

**Spec:** `docs/superpowers/plans/2026-11-02-nextjs-architecture-dashboard.md` (based on `nextjs-architecture` skill).

## Global Constraints

- Must run clean with Next.js 16.4.3 Turbopack without dynamic require bundling crashes.
- Never use native `window.alert()` or `window.confirm()`; use accessible modal components.
- Do not re-export route segment configuration constants like `dynamic = 'force-dynamic'`; keep them inline in each route file.
- Support manual dark/light mode with Tailwind CSS v4 via `@custom-variant dark (&:where(.dark, .dark *));`.
- Prevent FOUC and hydration mismatches via `suppressHydrationWarning` and head theme script.

## Review Focus

1. **Dark/Light Mode Sync:** Toggling theme must correctly persist in `localStorage` and apply `.dark` to `<html>` without causing React hydration mismatches.
2. **Type Safety & No `any` Leakage:** Route handlers and client services must use explicit DTO interfaces from `@/types`.
3. **CJS Bundling Isolation:** `login.js` must be ignored by ESLint and never bundled into client chunks.
4. **Clean API Fetch Failures:** `api-client.ts` must return structured `ApiError` instances when backend endpoints return non-200 or network drops.
5. **Dynamic QRIS & Payment Verification:** QRIS simulator must generate valid dynamic EMVCo payloads with CRC16 and verify status against `/api/check-payment`.

---

### Task 1: Clean Up Linter & Configure Tailwind v4 Theme Rules

**Files:**
- Modify: `dashboard-gopay-api-gateway/eslint.config.mjs`
- Modify: `dashboard-gopay-api-gateway/src/app/globals.css`
- Modify: `dashboard-gopay-api-gateway/src/app/layout.tsx`

**Interfaces:**
- Produces: Clean ESLint configuration ignoring `login.js`, manual dark mode support via Tailwind v4 `@custom-variant`, and hydrated theme script in root layout.

- [ ] **Step 1: Update `eslint.config.mjs` to ignore `login.js` and build artifacts**
- [ ] **Step 2: Update `globals.css` with `@custom-variant dark (&:where(.dark, .dark *));`**
- [ ] **Step 3: Update `layout.tsx` with theme initialization script and `suppressHydrationWarning`**
- [ ] **Step 4: Run linter and verify 0 errors from `login.js`**
- [ ] **Step 5: Commit changes**

---

### Task 2: Define Canonical TypeScript Interfaces & DTO Contracts (`src/types/`)

**Files:**
- Create: `dashboard-gopay-api-gateway/src/types/gateway.ts`
- Create: `dashboard-gopay-api-gateway/src/types/transaction.ts`
- Create: `dashboard-gopay-api-gateway/src/types/api.ts`
- Create: `dashboard-gopay-api-gateway/src/types/index.ts`
- Modify: `dashboard-gopay-api-gateway/src/lib/gateway-state.ts`
- Modify: `dashboard-gopay-api-gateway/src/lib/auth.ts`
- Modify: `dashboard-gopay-api-gateway/src/lib/gopay-api.ts`
- Modify: `dashboard-gopay-api-gateway/src/app/check-payment/route.ts`

**Interfaces:**
- Produces: Shared TypeScript types (`QrisItem`, `ClaimItem`, `ActivityLogItem`, `GatewayState`, `GojekTransaction`, `NormalizedTransaction`, `ApiResponse<T>`, `CreateQrisRequest`, etc.).
- Eliminates: `any` types in `gateway-state.ts`, `auth.ts`, `gopay-api.ts`, and `check-payment/route.ts`.

- [ ] **Step 1: Write type definitions in `src/types/`**
- [ ] **Step 2: Refactor `gateway-state.ts` to import types from `@/types`**
- [ ] **Step 3: Refactor `auth.ts` and `gopay-api.ts` with strict typing**
- [ ] **Step 4: Refactor `check-payment/route.ts` to eliminate `any` and type query/body parsing**
- [ ] **Step 5: Verify type check with `npx tsc --noEmit`**
- [ ] **Step 6: Commit changes**

---

### Task 3: Client Service Layer & Typed API Wrapper (`src/services/`)

**Files:**
- Create: `dashboard-gopay-api-gateway/src/lib/utils.ts`
- Create: `dashboard-gopay-api-gateway/src/services/api-client.ts`
- Create: `dashboard-gopay-api-gateway/src/services/gateway.service.ts`
- Create: `dashboard-gopay-api-gateway/src/services/index.ts`

**Interfaces:**
- Produces: `formatRupiah()`, `formatDate()`, `ApiError`, `apiFetch<T>`, and `GatewayService` methods (`getHealth()`, `getLogs()`, `getTokenStatus()`, `getTransactions()`, `createQris()`, `checkPayment()`).

- [ ] **Step 1: Implement `src/lib/utils.ts` (formatting and classNames helper)**
- [ ] **Step 2: Implement `src/services/api-client.ts` with structured error handling**
- [ ] **Step 3: Implement `src/services/gateway.service.ts` with typed methods**
- [ ] **Step 4: Export barrel from `src/services/index.ts`**
- [ ] **Step 5: Verify types and compilation with `npx tsc --noEmit`**
- [ ] **Step 6: Commit changes**

---

### Task 4: Shared UI Primitives & Layout Shell (`src/components/`)

**Files:**
- Create: `dashboard-gopay-api-gateway/src/components/ui/Button.tsx`
- Create: `dashboard-gopay-api-gateway/src/components/ui/Badge.tsx`
- Create: `dashboard-gopay-api-gateway/src/components/ui/Card.tsx`
- Create: `dashboard-gopay-api-gateway/src/components/ui/Input.tsx`
- Create: `dashboard-gopay-api-gateway/src/components/common/AlertModal.tsx`
- Create: `dashboard-gopay-api-gateway/src/components/layout/ThemeToggle.tsx`
- Create: `dashboard-gopay-api-gateway/src/components/layout/Header.tsx`

**Interfaces:**
- Produces: Reusable UI design system elements, dark mode toggle button, accessible non-blocking modal, and global dashboard header.

- [ ] **Step 1: Create UI primitives (`Button`, `Badge`, `Card`, `Input`)**
- [ ] **Step 2: Create `AlertModal` with semantic themes (`warning`, `danger`, `info`, `success`)**
- [ ] **Step 3: Create `ThemeToggle` and `Header` layout components**
- [ ] **Step 4: Verify component rendering and types with `npx tsc --noEmit`**
- [ ] **Step 5: Commit changes**

---

### Task 5: Domain Feature Modules & Dashboard Composition Root

**Files:**
- Create: `dashboard-gopay-api-gateway/src/features/session/components/TokenStatusCard.tsx`
- Create: `dashboard-gopay-api-gateway/src/features/transactions/components/TransactionFeed.tsx`
- Create: `dashboard-gopay-api-gateway/src/features/qris/components/QrisGenerator.tsx`
- Create: `dashboard-gopay-api-gateway/src/features/monitoring/components/ActivityLogsTerminal.tsx`
- Create: `dashboard-gopay-api-gateway/src/features/index.ts`
- Modify: `dashboard-gopay-api-gateway/src/app/page.tsx`

**Interfaces:**
- Produces: Live dashboard composition with token status card, transaction feed, dynamic QRIS simulation generator, and real-time activity log viewer.

- [ ] **Step 1: Implement `TokenStatusCard` for monitoring GoPay account & session token**
- [ ] **Step 2: Implement `TransactionFeed` with auto-polling & search/filter**
- [ ] **Step 3: Implement `QrisGenerator` with dynamic QRIS generation & live payment status check**
- [ ] **Step 4: Implement `ActivityLogsTerminal` for watching real-time gateway operations**
- [ ] **Step 5: Compose `src/app/page.tsx` as lightweight root (< 150 lines)**
- [ ] **Step 6: Run full verification: `npx tsc --noEmit`, `npm run lint`, and `npm run build`**
- [ ] **Step 7: Commit changes**
