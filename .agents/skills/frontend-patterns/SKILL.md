---
name: frontend-patterns
description: Build or change Taler frontend features using React, Vite, TypeScript, React Router, TanStack Query, React Hook Form, Zod, MUI, and Recharts. Use for pages, components, forms, API integration, tables, dashboards, responsive behavior, and accessibility. Do not use for backend-only changes or general repository verification.
---

# Frontend Patterns

Preserve established project conventions. Before implementing a feature, inspect its API contract, existing query keys, shared components, theme, routing, and nearby tests.

## Structure

Organize code by responsibility:

- `src/app/` for providers, routing, theme, and application setup;
- `src/pages/` for route-level composition;
- `src/features/<feature>/` for feature components, hooks, schemas, and transformations;
- `src/shared/api/` for the typed HTTP client;
- `src/shared/ui/` for reusable presentation components;
- `src/shared/lib/` for framework-independent utilities.

Keep route components focused on composition. Do not move feature-specific code into `shared` until it has a genuine reusable consumer.

Avoid importing private implementation details between features. Prefer explicit public exports.

## Server and client state

Use TanStack Query for all server-owned state. Do not fetch data directly inside UI components and do not copy query results into local state.

Define stable query-key factories per feature. Include every active filter, pagination value, and user-dependent parameter in the key.

Use:

- URL search parameters for shareable filters, sorting, and pagination;
- component state for temporary UI state;
- React Hook Form for form state;
- context only for stable cross-cutting concerns such as authentication or theme.

After mutations, update or invalidate the narrowest affected queries. Handle pending, error, empty, and success states explicitly.

Use the shared typed API client and types derived from the OpenAPI contract. Treat caught errors and untrusted payloads as `unknown` and narrow them before use. Keep authentication and error normalization inside the API layer rather than individual components.

Keep monetary values as decimal strings at transport and form boundaries. Do not use binary floating-point arithmetic for financial calculations.

## Forms

Use React Hook Form with a Zod schema and infer the form type from that schema. Client validation improves feedback but never replaces server validation.

Keep editable numeric values as strings until they cross a validated boundary. Define date and timezone conversions explicitly.

Map server validation errors to the relevant fields when possible and show a form-level message for non-field errors. Disable duplicate submission while a mutation is pending.

Every field must have an accessible label and associated error text. Move focus to the first invalid field or error summary when practical.

## Components and MUI

Prefer small components with one clear responsibility, but do not split components solely to reduce line count. Separate data orchestration from reusable presentation when that boundary improves testing or reuse.

Use MUI theme tokens and responsive breakpoints instead of scattered hard-coded colors, spacing, or media queries. Build mobile-first layouts.

Tables and lists must provide:

- loading feedback;
- recoverable error feedback;
- an intentional empty state;
- pagination and filter state;
- a usable mobile representation.

Use stable domain identifiers as React keys; never use an array index when items can be reordered or changed.

Dialogs must have descriptive titles, predictable focus behavior, keyboard operation, and clear destructive-action confirmation.

## Charts

Transform API data before passing it to Recharts. Keep chart components presentational and independent of fetching.

Use responsive containers, consistent currency and date formatting, readable legends and tooltips, and an explicit no-data state. Provide a textual summary or equivalent accessible representation for information conveyed by a chart.

Do not hide domain calculations inside tooltip or rendering callbacks.

## Testing

Use `tdd-workflow` for observable frontend behavior.

Test through accessible roles, labels, text, and user actions with Vitest and Testing Library. Avoid assertions on React state, MUI internals, CSS class names, or large snapshots.

Create a fresh QueryClient for each test and disable retries unless retry behavior is under test. Render components through a shared test helper that provides the same router, theme, and query contexts as the application.

Mock the API at the established network or client boundary. Cover relevant loading, error, empty, and success states, plus form validation and mutation outcomes.

## Completion

Report the implemented user behavior, API contract used, responsive and accessibility considerations, and executed tests. Do not describe a frontend feature as complete if its error, loading, or empty state is missing where applicable.
