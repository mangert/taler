---
name: api-design
description: Design or change Taler REST API contracts implemented with NestJS, Prisma, and Swagger. Use for endpoints, DTOs, validation, filtering, pagination, authentication, ownership isolation, audit behavior, and OpenAPI changes. Do not use for frontend-only work or backend refactoring that leaves the public API unchanged.
---

# API Design

Design the observable contract before implementing it. Preserve existing conventions unless the task explicitly requires a breaking change.

## Define the contract

For every endpoint, determine:

- HTTP method and route;
- authentication requirement;
- path, query, and body inputs;
- success status and response DTO;
- validation and domain errors;
- ownership rules;
- database and audit side effects;
- Supertest acceptance cases.

Use plural resource names and `kebab-case` routes. Prefer standard HTTP methods over action-style endpoints. Use `PATCH` for partial updates and introduce `PUT` only for complete replacement.

Default status codes:

- `200` for successful reads and updates;
- `201` for resource creation;
- `204` for deletion without a response body;
- `400` for invalid input;
- `401` for missing or invalid authentication;
- `403` for an authenticated user lacking permission;
- `404` for missing resources, including resources owned by another user;
- `409` for state or uniqueness conflicts.

## DTO and validation boundaries

Create separate request, query, and response DTOs. Do not expose Prisma models directly.

Use `class-validator` and `class-transformer` for server-side validation and explicit query conversion. Reject unknown fields through the project validation pipe. Distinguish omitted optional values from explicit `null`.

Never expose password hashes, internal ownership fields, or implementation-only audit data.

Use stable string enum values. Represent timestamps as ISO 8601 strings and document timezone semantics. Represent monetary amounts and exchange rates as decimal strings at the API boundary to avoid binary floating-point loss; use uppercase ISO 4217 currency codes.

## Collections

Use a consistent paginated response:

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Validate positive page values and enforce a centralized maximum page size. Apply a deterministic default sort with a unique tie-breaker.

Allow documented filters to be combined. Validate ranges such as `minAmount <= maxAmount` and `dateFrom <= dateTo`. CSV export must apply the same filter semantics as the transaction list.

## Authentication and ownership

Obtain the current user identifier from the verified JWT context. Never trust an owner identifier supplied in a protected request DTO.

Set ownership server-side on creation. Scope every protected Prisma read, update, and delete by both resource identifier and current user. Validate that referenced categories, budgets, or related records belong to the same user.

Do not reveal whether another user’s resource exists; return `404` for ownership-scoped lookups.

## Transactions and audit

When a transaction or budget mutation requires an audit entry, perform the domain mutation and audit write in one Prisma transaction.

Capture the previous state before updates or deletion and the resulting state after creation or update. Store serializable snapshots without secrets or unrelated internal data.

## Errors and documentation

Use NestJS HTTP exceptions and one documented error shape. If the project has no established shape, use:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": []
}
```

Keep `code` stable for client handling. Do not expose stack traces, SQL details, or internal exception messages.

Document authentication, parameters, DTOs, responses, errors, and representative examples with `@nestjs/swagger`. When a contract changes, update Swagger/OpenAPI and generated or shared client types in the same task.

## Implementation handoff

Use `tdd-workflow` when implementing the contract. Every new or changed endpoint requires a Supertest test covering its successful path and relevant validation, authentication, ownership, and side-effect cases.

Report the final route contract, ownership behavior, documentation updates, and executed tests. Do not describe an endpoint as complete while its Swagger contract or required Supertest coverage is missing.
