---
name: OpenAPI spec edit pattern
description: How to safely add paths and schemas to the openapi.yaml without breaking YAML nesting
---

## Rule
Never raw-append to openapi.yaml with `cat >>`. The file structure is:
```
paths:          ← lines ~36 to components line
  /foo: ...
components:
  schemas:
    Foo: ...    ← end of file
```
Appending at EOF places content inside `components/schemas:`, not at `paths:` level.

## How to apply
Use a Python script to:
1. Read all original lines
2. Find the `components:` line index
3. Inject new paths BEFORE `components:`
4. Append new schemas at the end of the file (they land correctly inside `components/schemas:` already at the end)

**Why:** The `components:` keyword marks the boundary. Paths before it, schemas inside it. Raw append always ends up inside components, breaking both paths and schema placement.

## Also: $ref to components/parameters
Do NOT use `$ref: "#/components/parameters/orgId"` unless you've defined it in `components/parameters:`. This section doesn't exist in this project. Use inline:
```yaml
- { name: orgId, in: path, required: true, schema: { type: integer } }
```
