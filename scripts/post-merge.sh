#!/bin/bash
set -euo pipefail

pnpm install --frozen-lockfile

# Do not run `drizzle-kit push` from this non-interactive hook. Depending on
# schema drift, Drizzle may request permission to truncate tables, and forcing
# that prompt would risk data loss. Schema-changing tasks must provide and run
# an explicit, idempotent migration instead.
