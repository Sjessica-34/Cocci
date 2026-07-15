---
name: inert boolean attribute React
description: React JSX typing for the `inert` attribute — use boolean, not empty string
---

React's JSX type for `inert` is `boolean | undefined`. Using `""` (empty string) compiles in some places but fails TypeScript in others and triggers a React runtime warning.

**Rule:** Always use `inert={condition || undefined}` — evaluates to `true | undefined`.

**Why:** `inert={condition ? "" : undefined}` triggers TS2322 ("string not assignable to boolean | undefined") and the React warning "Received an empty string for a boolean attribute".

**How to apply:** Any time you add `inert` to a JSX element for read-only / group-scope patterns.
