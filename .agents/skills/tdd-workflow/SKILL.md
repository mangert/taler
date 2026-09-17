---
name: tdd-workflow
description: Develop or change observable Taler behavior through test-first cycles using Jest and Supertest for the backend or Vitest and Testing Library for the frontend. Use for features, bug fixes, API endpoints, UI interactions, and behavior-preserving refactoring. Do not use for documentation-only changes, formatting, generated Prisma migrations, or configuration without application behavior.
---

# TDD Workflow

Apply this workflow to the smallest observable behavior affected by the task.

## Choose the test boundary

- Use Jest unit tests for isolated backend business rules and services.
- Use Supertest for every new or changed API endpoint.
- Use Vitest and Testing Library for frontend behavior visible to the user.
- Prefer assertions on public behavior over implementation details.
- For a bug fix, reproduce the defect with a regression test before changing production code when feasible.
- For a behavior-preserving refactor, establish passing characterization tests first; a deliberately failing test is not required.

## Red

1. Add one focused test describing the next behavior.
2. Run the narrowest relevant test command.
3. Confirm that the test fails for the expected missing or incorrect behavior.
4. If it passes immediately, determine whether the behavior already exists or the test is insufficient.

Do not change production code before obtaining meaningful evidence from the test.

## Green

1. Implement the smallest production change that satisfies the test.
2. Follow TypeScript strict mode and do not introduce `any`.
3. Run the focused test again and confirm it passes.
4. Avoid unrelated cleanup or additional behavior during this step.

## Refactor

1. Improve names, structure, duplication, or boundaries without changing behavior.
2. Keep tests green throughout the refactor.
3. Run the directly related test suite after each meaningful change.

## Project-specific checks

For backend endpoint tests, cover the relevant HTTP status, response contract, validation, authentication, ownership isolation, and persisted side effects.

For frontend tests, interact through accessible roles, labels, and user actions. Cover loading, error, empty, and success states when relevant. Do not test MUI or React internals.

Tests must be deterministic and create or reset their own data. Never share mutable test state across cases.

If behavior requires a Prisma schema change, create a migration as required by `AGENTS.md`. Test the resulting application behavior; generated migration files themselves do not require a test-first cycle.

## Completion

After each cycle, report:

- the behavior covered;
- the test that failed before implementation;
- the focused test command and its result;
- any verification that could not be run.

Before committing, perform the project-wide checks required by `AGENTS.md`. Do not claim TDD was followed if the initial failure was not observed.
