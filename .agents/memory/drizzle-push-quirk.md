---
name: Drizzle push interactive prompt quirk
description: drizzle-kit push can block on a phantom unique-constraint truncate prompt for an unrelated table, even from a non-interactive shell.
---

`drizzle-kit push` sometimes proposes recreating/truncating a unique constraint on a table that was NOT touched by the current schema change (e.g. editing `organizations`/`exercises` triggers a prompt about `issue_ratings`'s unique constraint). It then fails with "Interactive prompts require a TTY terminal" because the sandbox shell has no TTY, and `--force`/piped `y` do not bypass it.

**Why:** This looks like a stale/false-positive diff from drizzle-kit's introspection, not a real pending change caused by your edit.

**How to apply:** Don't fight the prompt. Apply the actual intended DDL (new columns, indexes, etc.) directly via `psql "$DATABASE_URL" -c "..."`, verify with `\d <table>`, and skip `drizzle-kit push` for that run. Re-run `pnpm run typecheck:libs` afterward so Drizzle's generated types match the DB.
