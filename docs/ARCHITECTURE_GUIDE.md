# Architecture Guide

This repo uses a **feature-first** folder structure.

## High-level map

- `src/features/<feature>/...`
  - Feature-owned UI, hooks, services, and (optionally) feature-local tests.
- `src/pages/*`
  - Thin route wrappers that re-export the corresponding feature page.
- `src/components/*`
  - Shared UI and app-level components used by multiple features (layout, shared widgets).
  - `src/components/ui/*` is the shared UI kit.
- `src/hooks/*`
  - Cross-feature hooks (auth, subscription, theme, generic infra hooks).
- `src/services/*`
  - Cross-feature services (analytics, test runner, editor bounds, etc.).
- `src/shared/*`
  - Shared “app infrastructure” (e.g. notification service, shared queries) that is not feature-owned.
- `src/types/*`
  - Cross-feature shared types.

## What goes where (rules of thumb)

### 1) Creating a new feature
Create a folder:

- `src/features/<feature>/`

Common subfolders:

- `src/features/<feature>/components/`
- `src/features/<feature>/hooks/`
- `src/features/<feature>/services/`
- `src/features/<feature>/types/` (only if types are feature-private)

Feature pages:

- `src/features/<feature>/<Feature>Page.tsx` (or `<Feature>HubPage.tsx`, `<Feature>SolverPage.tsx`, etc.)

Then create a thin wrapper route:

- `src/pages/<Feature>.tsx` that simply `export { default } from "@/features/<feature>/<...>";`

### 2) Creating a new component
Decide ownership first:

- **Feature-owned component**: put it in `src/features/<feature>/components/`.
  - Examples: Survey steps, System Design canvas UI, Behavioral interview UI.
- **Shared component** (reused by multiple features): put it in `src/components/`.
  - Examples: `Sidebar`, `ConfirmDialog`, shared editor/diagram components.
- **UI primitives** (buttons, dialog, tabs, etc.): keep in `src/components/ui/`.

### 3) Creating a new hook

- **Feature-specific behavior/data**: `src/features/<feature>/hooks/`.
- **Cross-feature / infrastructure** (auth, subscription, theme, localStorage helpers, etc.): `src/hooks/`.

### 4) Creating a new service

- **Feature-specific persistence/integration**: `src/features/<feature>/services/`.
- **Cross-feature infrastructure**: `src/services/`.

### 5) Shared utilities and types

- If multiple features use it:
  - Types: `src/types/*`
  - Utilities: `src/lib/*` or `src/utils/*`
  - Shared services: `src/shared/*` or `src/services/*` depending on responsibility

## Import boundaries (recommended)

- Features can import from:
  - `@/components/*` (shared UI)
  - `@/components/ui/*`
  - `@/hooks/*` (cross-feature)
  - `@/services/*` (cross-feature)
  - `@/shared/*`, `@/types/*`, `@/utils/*`, `@/lib/*`
  - Their own feature code: `@/features/<feature>/*`

- Shared code (`src/components`, `src/hooks`, `src/services`) should **avoid** importing from feature folders when possible.
  - Exception: “shared dashboard widgets” may currently import feature hooks (e.g. `useProblems`). If these are actually dashboard-owned, prefer moving them under `src/features/dashboard/components/*`.

## Testing conventions

This repo currently uses a **mixed** approach:

### A) Centralized test folders (current common pattern)

- Shared hooks: `src/hooks/__tests__/*`
- Shared services: `src/services/__tests__/*`
- Shared components: `src/components/__tests__/*`

This works well for cross-feature code.

### B) Co-located tests (recommended for new feature code)

For feature-owned code, prefer co-location:

- `src/features/<feature>/components/__tests__/*`
- `src/features/<feature>/hooks/__tests__/*`
- `src/features/<feature>/services/__tests__/*`

Example already in repo:

- `src/features/survey/components/steps/__tests__/PaywallStep.test.tsx`

### Suggested rule going forward

- **If the code is feature-owned**: co-locate tests under that feature.
- **If the code is shared cross-feature**: keep tests in the centralized `src/<area>/__tests__` folders.
- Avoid testing `src/pages/*` wrappers; test the feature pages instead.

## Known follow-up opportunities (optional cleanups)

These are not required for correctness, but they improve “clean architecture”:

- **Dashboard widgets in `src/components/*`**
  - Several dashboard-centric components in `src/components` import feature hooks (e.g. `useProblems`). Consider moving them into `src/features/dashboard/components/*`.
- **Admin access logic duplication**
  - `ADMIN_EMAILS` is duplicated in `Sidebar` and `AdminRoute`. Consider extracting to a single module (e.g. `src/features/admin/constants.ts` or `src/shared/auth/adminAccess.ts`).

## Quick checklist when adding code

- Is it feature-owned?
  - Yes -> `src/features/<feature>/...`
  - No -> shared folders (`src/components`, `src/hooks`, `src/services`, `src/shared`)
- Does it need a route?
  - Add `src/pages/<RouteName>.tsx` wrapper
- Does it need tests?
  - Feature-owned -> co-locate under the feature
  - Shared -> keep in centralized `__tests__` folder
