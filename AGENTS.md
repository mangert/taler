# Repository Guidelines

## Project Structure & Module Organization

This repository begins with the product specification in `project_fullstack_app.md`. The planned deliverable is a personal-finance tracker with a REST API, responsive client, and PostgreSQL or SQLite storage. Keep components in top-level directories such as `frontend/`, `backend/`, and `database/` (or backend migrations). Place tests beside covered code or in each component's `tests/`. Store CI workflows in `.github/workflows/` and container definitions at the root.

Maintain `ARCHITECTURE.md` before implementation, `README.md` for setup, and `REPORT.md` throughout development to record decisions and lessons learned.

## Build, Test, and Development Commands

The stack is not scaffolded yet, so do not assume a package manager or framework. Once selected, document exact commands in `README.md` and expose consistent root-level scripts. The required end-to-end entry point is:

```sh
docker compose up
```

This must start the frontend, backend, and database with realistic seed data. Also document commands for linting, tests, migrations, and seeding; CI must run lint and tests.

## Coding Style & Naming Conventions

Use the chosen language's standard formatter and linter, commit their configuration, and run them before review. Prefer two-space indentation for JSON/YAML and formatter defaults elsewhere. Use descriptive English names: `PascalCase` for types/components, `camelCase` for functions and variables, and `kebab-case` for route paths. Keep API DTOs, validation, and database models separate.

## Testing Guidelines

Provide at least 10 unit or integration tests. Cover CRUD validation, user data isolation, filters and pagination, CSV import/export, budgets, recurring transactions, currency handling, and audit logging. Name tests after observable behavior (for example, `rejects transactions owned by another user`). Tests must be deterministic and create or reset their own data.

## Commit & Pull Request Guidelines

There is no existing commit history to infer a convention from. Use short, imperative, scoped messages such as `feat(api): add transaction filters` or `test(auth): verify tenant isolation`. Keep commits focused and build the project incrementally. Pull requests should explain the change, testing performed, configuration or migration impact, and linked issue. Include screenshots for dashboard or responsive UI changes and update API documentation when endpoints change.

## Security & Configuration

Never commit secrets or production credentials. Provide `.env.example`, validate required settings at startup, hash passwords, and enforce JWT authorization and per-user ownership on every protected API operation.
