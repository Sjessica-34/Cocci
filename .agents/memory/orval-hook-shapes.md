---
name: Orval mutation hook shapes
description: Correct call signature for Orval-generated mutation hooks in this project
---

## Rule
Orval-generated mutations take **flat** path params + data, not a nested `params` object.

## Correct pattern
```ts
// POST /organizations/:orgId/actions/plan
await addToPlan({ orgId, data: { libraryActionId: 1 } });

// PATCH /organizations/:orgId/actions/plan/:actionId
await updateItem({ orgId, actionId: item.id, data: { isChecked: true } });

// DELETE /organizations/:orgId/actions/plan/:actionId
await deleteItem({ orgId, actionId: item.id });
```

## Wrong pattern (TS2353)
```ts
// WRONG — 'params' does not exist
await addToPlan({ params: { orgId }, data: { ... } });
await updateItem({ params: { orgId, actionId }, data: { ... } });
```

**Why:** Orval flattens path parameters directly into the mutation variable type, derived from the operationId parameter names in the OpenAPI spec. The `params` wrapper doesn't exist.
