---
name: verification-loop
description: Verify Taler changes with fresh, relevant evidence before declaring work complete, handing it off, or preparing a commit. Use after implementation, bug fixes, refactoring, dependency updates, migrations, configuration, or infrastructure changes. Do not use for planning-only work or during an unfinished TDD red phase.
---

# Verification Loop

Do not claim that work is complete, correct, tested, or ready to commit without fresh verification from the current working tree.

Choose checks in proportion to the change. Run focused checks first, then broader project gates.

## Inspect the change

Start with:

1. Review `git status --short`.
2. Review the relevant diff, including staged and unstaged changes.
3. Inspect untracked files that belong to the task.
4. Run `git diff --check` where applicable.
5. Confirm that unrelated user changes are not included or modified.

Check the implementation against the user request, `AGENTS.md`, and the relevant project skill. Look for incomplete paths, debug code, accidental generated files, secrets, and missing documentation.

## Discover available commands

Read the root and affected package scripts before running checks. Prefer documented root-level commands.

Do not invent a script that is not present. If an expected command has not been configured, report that fact and run the closest available targeted check.

Do not install tools, start external services, mutate a database, or change configuration solely to make verification possible unless that action is already within the task scope.

## Run focused verification

Select checks based on the affected area:

- Backend behavior: run the narrowest relevant Jest or Supertest test.
- API contract: verify DTO validation, expected status codes, ownership isolation, Swagger metadata, and generated or shared client types.
- Frontend behavior: run the relevant Vitest or Testing Library tests.
- User-facing UI: verify loading, error, empty, and success states; perform a browser smoke check when the application can be run.
- Responsive UI: inspect at least one desktop and one mobile viewport when layout changed.
- Prisma schema or queries: confirm that a correctly named migration exists, then run the available Prisma validation and relevant integration tests.
- Dependency changes: verify the manifest and lockfile remain synchronized.
- Docker or Compose changes: run `docker compose config`; build or start the affected services when required by the task.
- Documentation-only changes: check the diff, formatting, paths, links, and documented commands.

Do not run destructive migrations against user data. Use a disposable test database only when the project provides one. Do not stop containers with `docker compose down` without the required confirmation.

## Run project gates

After focused checks pass, run the available broader checks appropriate to the change:

1. Type checking.
2. Linting.
3. Full test suite.
4. Production build.
5. Docker Compose startup or smoke verification when infrastructure or integration behavior changed.

Before a commit, always run the root commands required by `AGENTS.md`:

- `npm run lint`
- `npm run test`

Also run typecheck and build when their scripts exist and the change can affect compilation or bundling.

A successful process with zero discovered tests is not evidence that expected tests passed. Inspect summaries and warnings, not only the exit code.

## Handle failures

When a check fails:

1. Determine whether the cause is the implementation, an existing unrelated failure, or the environment.
2. Fix failures caused by the task when the fix remains in scope.
3. Re-run the exact failing check.
4. Re-run any broader check invalidated by the fix.

Do not weaken assertions, remove tests, suppress errors, or skip required gates merely to obtain a passing result.

If verification is blocked, record the exact command, failure, and missing prerequisite. Do not describe an unexecuted check as passed.

## Freshness requirement

Verification evidence becomes stale when relevant files change. After any fix, re-run the affected checks before reporting completion.

Do not rely on results from an earlier commit, another branch, CI run, or previous session unless explicitly reporting them as historical information.

## Report evidence

In the final handoff, state:

- checks executed and their outcomes;
- relevant test counts or build results;
- checks not run and the reason;
- remaining warnings, risks, or blockers;
- whether unrelated working-tree changes were preserved.

Do not commit or push unless the user requested it. Do not say “all checks pass” when only a subset was run.
