---
name: Router-level auth middleware leaking across unrelated routes
description: A path-unscoped router.use(requireAuth, ...) inside one sub-router can 401 every request in the whole API, including unrelated and public routes, if that sub-router is mounted at root before others.
---

# Router-level auth middleware leaking across unrelated routes

`admin.ts` had `router.use(requireAuth, requireSuperAdmin)` with no path argument, then was mounted in `routes/index.ts` via `router.use(adminRouter)` (root-mounted, no `/admin` prefix — its own routes already embed `/admin/...` in each path).

Because `router.use()` middleware with no path matches every request that flows through that router, and it terminates the chain with `res.status(401)` instead of calling `next()`, it intercepted **every** request reaching that point in the middleware chain — not just `/admin/*` — including unrelated protected routes for non-superadmins and any newly added public (no-auth) routes mounted later, and even totally nonexistent paths (which returned 401 instead of 404).

**Why:** Express `Router.use(mw)` without an explicit path applies to all requests dispatched to that router instance; it doesn't matter that the router's own `.get/.post` handlers are prefixed with `/admin` internally — the blanket `.use()` middleware still runs first for anything reaching that router in the chain.

**How to apply:** When adding a blanket auth/role gate inside a sub-router, always scope it explicitly: `router.use("/admin", requireAuth, requireSuperAdmin)`. When debugging mysterious 401s on new routes (especially intentionally-public ones), test with `curl` against a definitely-nonexistent path on the same server — if that also 401s instead of 404ing, an earlier-mounted router's unscoped `.use()` gate is swallowing everything downstream.
